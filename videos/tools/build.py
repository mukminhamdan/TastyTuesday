#!/usr/bin/env python3
"""Compile an edit plan (videos/plans/<name>.json) into a HyperFrames project.

The plan lists source ranges in playback order plus captions, graphics and SFX
anchored to clip ids. This script writes index.html (cuts + SFX),
compositions/graphics.html (hook, menu cards, chips, outro) and
compositions/captions.html (one caption track), and edl.json for review.

Usage: python3 build.py plans/reel.json videos/reel --audio path/to/audio16k.wav
"""
import argparse, json, math, os, re, shutil
from html import escape

import numpy as np
import soundfile as sf

W, H = 1080, 1920
FPS = 30
GSAP = os.environ.get("GSAP_JS", os.path.join(os.path.dirname(os.path.abspath(__file__)), "vendor", "gsap.min.js"))
SFX_DIR = os.path.expanduser("~/.claude/skills/media-use/audio/assets/sfx")
SFX_LEN = {"whoosh": 0.57, "whoosh-short": 0.57, "whoosh-cinematic": 5.5, "pop": 0.72,
           "click-soft": 0.37, "click": 0.37, "chime": 2.5, "sparkle": 1.8, "ping": 1.32,
           "impact-bass-1": 2.1, "impact-bass-2": 2.6, "riser": 10.0, "notification": 2.4,
           "glitch-3": 3.1, "key-press": 0.43, "typing": 1.54}
GRAPHIC_SFX = {"hook": ("impact-bass-1", 0.55), "menu": ("whoosh", 0.6), "chip": ("pop", 0.5),
               "outro": ("chime", 0.5)}


class Energy:
    """20 ms RMS envelope of the 16 kHz mono mix, used to snap cuts and time words."""

    def __init__(self, wav):
        a, sr = sf.read(wav, dtype="float32")
        hop = sr // 50
        n = len(a) // hop
        self.rms = np.sqrt((a[: n * hop].reshape(n, hop) ** 2).mean(1) + 1e-12)
        self.db = 20 * np.log10(self.rms)

    def idx(self, t):
        return max(0, min(len(self.rms) - 1, int(round(t * 50))))

    def snap(self, t, win):
        lo, hi = self.idx(t - win), self.idx(t + win)
        return (lo + int(np.argmin(self.rms[lo : hi + 1]))) / 50.0

    def voiced(self, a, b):
        seg = self.db[self.idx(a) : self.idx(b) + 1]
        if len(seg) == 0:
            return np.array([])
        thr = max(np.percentile(seg, 30), seg.max() - 30)
        return seg > thr


def syllables(word):
    return max(1, len(re.findall(r"[aeiouAEIOU]+", word))) + (0.4 if re.search(r"\d", word) else 0)


def time_words(text, a, b, energy):
    """Spread words over the voiced frames of [a, b] by syllable weight."""
    words = text.split()
    if not words:
        return []
    v = energy.voiced(a, b)
    frames = np.nonzero(v)[0] if len(v) and v.any() else np.arange(max(1, int((b - a) * 50)))
    weights = np.array([syllables(w) for w in words], float)
    edges = np.concatenate([[0], np.cumsum(weights) / weights.sum()])
    out = []
    for i, w in enumerate(words):
        f0 = frames[min(len(frames) - 1, int(edges[i] * (len(frames) - 1)))]
        f1 = frames[min(len(frames) - 1, int(edges[i + 1] * (len(frames) - 1)))]
        out.append({"w": w, "s": a + f0 / 50.0, "e": a + max(f1, f0 + 8) / 50.0})
    return out


def group_words(words, max_words=3, max_chars=18):
    groups, cur = [], []
    for w in words:
        cur.append(w)
        txt = " ".join(x["w"] for x in cur)
        if len(cur) >= max_words or len(txt) >= max_chars or re.search(r"[.,!?]$", w["w"]):
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    return groups


def fmt(x):
    return f"{x:.4f}".rstrip("0").rstrip(".")


def build(plan, outdir, energy):
    clips, t = [], 0.0
    for c in plan["clips"]:
        a, b = c["in"], c["out"]
        if c.get("snap", True):
            a, b = energy.snap(a, 0.12), energy.snap(b, 0.12)
        rate = c.get("rate", 1.0)
        frames = max(1, round((b - a) / rate * FPS))  # whole frames, so cuts never overlap
        dur = frames / FPS
        clips.append({**c, "in": round(a, 3), "out": round(a + dur * rate, 3), "start": round(t, 4), "dur": round(dur, 4), "rate": rate})
        t += dur
    total = round(t, 4)
    by_id = {c["id"]: c for c in clips}

    def at(ref, offset=0.0):
        c = by_id.get(ref) or by_id[f"{ref}.0"]  # a range split into pieces is addressed by its first piece
        return round(c["start"] + offset, 3)

    # ---------- captions ----------
    cap_groups = []
    for c in clips:
        if not c.get("text"):
            continue
        ws = time_words(c["text"], c["in"], c["out"], energy)
        for w in ws:  # source time -> output time
            w["s"] = c["start"] + (w["s"] - c["in"]) / c["rate"]
            w["e"] = min(c["start"] + c["dur"], c["start"] + (w["e"] - c["in"]) / c["rate"])
        for g in group_words(ws):
            cap_groups.append({"s": g[0]["s"], "e": g[-1]["e"], "clip_end": c["start"] + c["dur"],
                               "words": [{"w": x["w"], "s": round(x["s"], 3), "e": round(x["e"], 3)} for x in g]})
    for i, g in enumerate(cap_groups):
        nxt = cap_groups[i + 1]["s"] if i + 1 < len(cap_groups) else total
        g["e"] = round(min(nxt, g["clip_end"], g["e"] + 0.5), 3)
        g["s"] = round(g["s"], 3)
        del g["clip_end"]
    hidden = [(at(g["clip"], g.get("offset", 0)), at(g["clip"], g.get("offset", 0)) + g["dur"])
              for g in plan.get("graphics", []) if g["type"] in ("hook", "outro")]
    cap_groups = [g for g in cap_groups if not any(h0 - 0.05 <= g["s"] < h1 for h0, h1 in hidden)]

    # ---------- graphics + sfx ----------
    graphics, sfx = [], []
    for g in plan.get("graphics", []):
        start = at(g["clip"], g.get("offset", 0))
        graphics.append({**g, "start": start})
        if g["type"] in GRAPHIC_SFX and g.get("sfx", True):
            name, vol = GRAPHIC_SFX[g["type"]]
            sfx.append({"name": g.get("sfx_name", name), "t": start + g.get("sfx_offset", 0), "vol": g.get("sfx_vol", vol)})
    for s in plan.get("sfx", []):
        sfx.append({"name": s["name"], "t": at(s["clip"], s.get("offset", 0)), "vol": s.get("vol", 0.5)})

    write_index(plan, clips, sfx, total, outdir)
    write_graphics(graphics, total, outdir)
    write_captions(cap_groups, total, outdir)
    os.makedirs(os.path.join(outdir, "assets", "sfx"), exist_ok=True)
    os.makedirs(os.path.join(outdir, "assets", "vendor"), exist_ok=True)
    shutil.copy(GSAP, os.path.join(outdir, "assets", "vendor", "gsap.min.js"))
    for s in {x["name"] for x in sfx}:
        shutil.copy(os.path.join(SFX_DIR, s + ".mp3"), os.path.join(outdir, "assets", "sfx", s + ".mp3"))
    edl = {"total": total, "clips": [{k: c[k] for k in ("id", "in", "out", "start", "dur")} for c in clips],
           "captions": cap_groups, "sfx": sfx,
           "graphics": [{"type": g["type"], "start": g["start"], "dur": g["dur"]} for g in graphics]}
    json.dump(edl, open(os.path.join(outdir, "edl.json"), "w"), indent=1, ensure_ascii=False)
    return edl


# Source frame: 720x1280 with 40 px black bars left/right; the live app's guest
# thumbnails sit in a strip from x=528 to the right edge.
SRC_W, SRC_H, BAR, STRIP_X = 720, 1280, 40, 528


def geometry(c, plan):
    """Return (mode, flip, k, left, top) placing the source frame on the 1080x1920 canvas.

    tight: crop to the clean area left of the guest strip (zooms in).
    wide:  only drop the black bars; the guest strip is covered by a patch.
    flip:  mirror a selfie-camera shot so logos read correctly.
    """
    mode = c.get("mode", plan.get("mode", "tight"))
    flip = c.get("flip", False)
    vis_w = (STRIP_X - BAR) if mode == "tight" else (SRC_W - 2 * BAR)
    k = W / vis_w
    if mode == "tight":
        left = (STRIP_X - SRC_W) * k if flip else -BAR * k
    else:
        left = -BAR * k
    top = -c.get("oy", 0.5) * (SRC_H * k - H)
    return mode, flip, k, left, top


def write_index(plan, clips, sfx, total, outdir):
    vids, cam_js, auds = [], [], []
    patches = {}  # one blurred wrapper per patch geometry, shared by every clip that uses it
    for i, c in enumerate(clips):
        mode, flip, k, left, top = geometry(c, plan)
        vw, vh = SRC_W * k, SRC_H * k
        geo = f"left:{fmt(left)}px;top:{fmt(top)}px;width:{fmt(vw)}px;height:{fmt(vh)}px" + (";transform:scaleX(-1)" if flip else "")
        rate = f' data-playback-rate="{fmt(c["rate"])}"' if c["rate"] != 1 else ""
        vis_in = c.get("visual", c["in"])
        timing = (f'data-start="{fmt(c["start"])}" data-duration="{fmt(c["dur"] - 0.0005)}" data-media-start="{fmt(vis_in)}"{rate}')
        fades = 'data-fade-in="0.04" data-fade-out="0.04"'
        if "visual" in c:
            # B-roll: picture from another moment, sound from the clip's own range.
            sound = 'muted'
            auds.append(f'      <audio id="a{i:03d}" src="{plan["source_audio"]}" data-start="{fmt(c["start"])}" data-duration="{fmt(c["dur"] - 0.0005)}" '
                        f'data-media-start="{fmt(c["in"])}"{rate} data-track-index="4" {fades} data-volume="{fmt(c.get("vol", 1))}"></audio>')
        else:
            sound = f'{fades} data-volume="{fmt(c.get("vol", 1))}" data-has-audio="true"'
        vids.append(
            f'        <video id="v{i:03d}" class="clip shot" src="{plan["source"]}" {timing} data-track-index="0" '
            f'{sound} playsinline data-layout-allow-overflow style="{geo}"></video>')
        if mode == "wide":
            # Cover the guest strip with a blurred mirror of the picture next to it,
            # so the seam continues the shot instead of showing the guests.
            y0, y1 = c.get("patch", [520, 1190])
            py, ph = y0 * k + top, (y1 - y0) * k
            if not flip:
                seam = STRIP_X * k + left - 30
                box, inner, side = (seam, W - seam), (seam - left - vw), "right"
                inner_t = "scaleX(-1)"
            else:
                seam = (SRC_W - BAR - STRIP_X) * k + 30
                box, inner, side = (0, seam), (2 * seam - left - vw), "left"
                inner_t = "none"
            key = (fmt(box[0]), fmt(py), fmt(box[1]), fmt(ph), side)
            patches.setdefault(key, []).append(
                f'<video id="p{i:03d}" class="clip" src="{plan["source"]}" {timing.replace(f'data-duration="{fmt(c["dur"] - 0.0005)}"', f'data-duration="{fmt(c["dur"] - 0.001)}"')} data-track-index="0" muted playsinline data-layout-allow-overflow '
                f'style="position:absolute;left:{fmt(inner)}px;top:{fmt(top - py)}px;width:{fmt(vw)}px;height:{fmt(vh)}px;transform:{inner_t}"></video>')
        fx, fy = c.get("focus", [0.5, 0.45])
        cam_js.append(f'      tl.set("#cam", {{ scale: 1, transformOrigin: "{fmt(fx * 100)}% {fmt(fy * 100)}%" }}, {fmt(c["start"])});')
        if "push" in c:
            p0, p1 = c["push"]
            cam_js.append(f'      tl.fromTo("#cam", {{ scale: {p0} }}, {{ scale: {p1}, duration: {fmt(c["dur"])}, ease: "none", immediateRender: false }}, {fmt(c["start"])});')
        for p in c.get("punch", []):
            rel, sc = p[0], p[1]
            cam_js.append(f'      tl.to("#cam", {{ scale: {sc}, duration: 0.22, ease: "power3.out" }}, {fmt(c["start"] + rel)});')
    for (x, y, w, h, side), inner_vids in patches.items():
        vids.append(f'        <div class="patch {side}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px" data-layout-allow-overflow>'
                    + "".join(inner_vids) + "</div>")
    lanes = {}  # track index -> end time, so overlapping SFX sit on separate lanes
    for j, s in enumerate(sorted(sfx, key=lambda x: x["t"])):
        dur = min(SFX_LEN.get(s["name"], 1.0), max(0.1, total - s["t"]))
        lane = next((ln for ln, end in sorted(lanes.items()) if end <= s["t"]), None)
        if lane is None:
            lane = 3 if not lanes else max(lanes) + (2 if max(lanes) == 3 else 1)
        lanes[lane] = s["t"] + dur
        auds.append(f'      <audio id="sfx{j:03d}" src="assets/sfx/{s["name"]}.mp3" data-start="{fmt(max(0, s["t"]))}" '
                    f'data-duration="{fmt(dur)}" data-track-index="{lane}" data-volume="{fmt(s["vol"])}"></audio>')
    html = f"""<!doctype html>
<html lang="ms">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={W}, height={H}" />
    <title>{escape(plan.get("title", plan["id"]))}</title>
    <script src="assets/vendor/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: {W}px; height: {H}px; overflow: hidden; background: #1c120c; }}
      #root {{ position: relative; width: 100%; height: 100%; overflow: hidden; background: #1c120c; }}
      #cam {{ position: absolute; inset: 0; overflow: hidden; }}
      .shot {{ position: absolute; object-fit: fill; }}
      .patch {{ position: absolute; overflow: hidden; filter: blur(18px); }}
      .patch.right {{ -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 60px), linear-gradient(180deg, transparent 0, #000 60px, #000 calc(100% - 60px), transparent 100%); -webkit-mask-composite: source-in;
        mask-image: linear-gradient(90deg, transparent 0, #000 60px), linear-gradient(180deg, transparent 0, #000 60px, #000 calc(100% - 60px), transparent 100%); mask-composite: intersect; }}
      .patch.left {{ -webkit-mask-image: linear-gradient(270deg, transparent 0, #000 60px), linear-gradient(180deg, transparent 0, #000 60px, #000 calc(100% - 60px), transparent 100%); -webkit-mask-composite: source-in;
        mask-image: linear-gradient(270deg, transparent 0, #000 60px), linear-gradient(180deg, transparent 0, #000 60px, #000 calc(100% - 60px), transparent 100%); mask-composite: intersect; }}
      .patch video {{ object-fit: fill; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{fmt(total)}" data-width="{W}" data-height="{H}">
      <div id="cam">
{chr(10).join(vids)}
      </div>
      <div id="graphics" data-composition-id="graphics" data-composition-src="compositions/graphics.html" data-start="0" data-duration="{fmt(total)}" data-track-index="1" data-track-kind="graphics" data-width="{W}" data-height="{H}"></div>
      <div id="captions" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="{fmt(total)}" data-track-index="2" data-track-kind="captions" data-width="{W}" data-height="{H}"></div>
{chr(10).join(auds)}
    </div>
    <script>
      const tl = gsap.timeline({{ paused: true }});
{chr(10).join(cam_js)}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""
    open(os.path.join(outdir, "index.html"), "w").write(html)


GFX_CSS = """
      #root { position: absolute; inset: 0; overflow: hidden; font-family: "Archivo Black", sans-serif; }
      .g { position: absolute; opacity: 0; will-change: transform, opacity; }
      .mono { font-family: "Space Mono", monospace; font-weight: 700; }
      /* hook */
      .hook { inset: 0; }
      .hook .shade { position: absolute; inset: 0; background: radial-gradient(120% 70% at 50% 40%, rgba(28,18,12,0.15) 0%, rgba(28,18,12,0.78) 100%); }
      .hook .stack { position: absolute; left: 108px; right: 108px; top: 470px; display: flex; flex-direction: column; align-items: flex-start; gap: 18px; }
      .hook .kicker { background: #e8442e; color: #fff4e6; font-size: 30px; letter-spacing: 0.08em; padding: 12px 22px; border-radius: 8px; }
      .hook .line { display: block; color: #fff4e6; font-size: 112px; line-height: 0.98; letter-spacing: -0.03em; text-transform: uppercase; text-shadow: 0 6px 0 rgba(28,18,12,0.55); }
      .hook .line.hi { color: #2b1a12; background: #ffc93c; padding: 6px 22px 2px; border-radius: 10px; text-shadow: none; }
      /* menu card */
      .menu { left: 72px; top: 250px; display: flex; align-items: stretch; gap: 0; }
      .menu .num { width: 150px; background: #e8442e; color: #fff4e6; font-size: 76px; display: flex; align-items: center; justify-content: center; border-radius: 18px 0 0 18px; }
      .menu .card { background: rgba(43,26,18,0.94); border-radius: 0 18px 18px 0; padding: 22px 36px 24px 30px; border-left: 6px solid #ffc93c; }
      .menu .label { color: #ffc93c; font-size: 26px; letter-spacing: 0.12em; }
      .menu .title { color: #fff4e6; font-size: 74px; line-height: 1.0; letter-spacing: -0.03em; text-transform: uppercase; margin-top: 6px; }
      .menu .by { color: #f6d9bf; font-size: 28px; margin-top: 10px; }
      /* chip */
      .chip { display: flex; align-items: center; gap: 16px; background: #fff4e6; color: #2b1a12; border: 5px solid #2b1a12; border-radius: 999px; padding: 14px 34px 14px 18px; font-size: 38px; box-shadow: 0 8px 0 #2b1a12; }
      .chip .dot { width: 44px; height: 44px; border-radius: 50%; background: #e8442e; color: #fff4e6; font-size: 26px; display: flex; align-items: center; justify-content: center; }
      .chip .txt { font-family: "Space Mono", monospace; font-weight: 700; letter-spacing: 0.02em; }
      /* flash */
      .flash { inset: 0; background: #fff4e6; }
      /* outro */
      .outro { inset: 0; background: rgba(28,18,12,0.72); }
      .outro .stack { position: absolute; left: 108px; right: 108px; top: 560px; display: flex; flex-direction: column; align-items: center; gap: 26px; text-align: center; }
      .outro .kicker { color: #ffc93c; font-size: 32px; letter-spacing: 0.14em; }
      .outro .big { color: #fff4e6; font-size: 128px; line-height: 0.95; letter-spacing: -0.03em; text-transform: uppercase; }
      .outro .big .red { color: #ff7a5c; }
      .outro .cta { background: #e8442e; color: #fff4e6; font-size: 44px; padding: 20px 40px; border-radius: 999px; text-transform: uppercase; }
      .outro .rule { width: 0; height: 6px; background: #ffc93c; border-radius: 3px; }
"""


def write_graphics(graphics, total, outdir):
    els, js = [], []
    for i, g in enumerate(graphics):
        gid, s, d = f"g{i:02d}", g["start"], g["dur"]
        e = s + d
        if g["type"] == "hook":
            lines = "".join(f'<span class="line{" hi" if j == g.get("hi", -1) else ""}" id="{gid}l{j}">{escape(l)}</span>'
                            for j, l in enumerate(g["lines"]))
            els.append(f'<div class="g hook" id="{gid}"><div class="shade"></div><div class="stack">'
                       f'<div class="kicker mono" id="{gid}k">{escape(g["kicker"])}</div>{lines}</div></div>')
            js.append(f'tl.fromTo("#{gid}", {{opacity:0}}, {{opacity:1, duration:0.12}}, {fmt(s)});')
            js.append(f'tl.fromTo("#{gid}k", {{y:-30, opacity:0}}, {{y:0, opacity:1, duration:0.3, ease:"power3.out"}}, {fmt(s)});')
            for j in range(len(g["lines"])):
                js.append(f'tl.fromTo("#{gid}l{j}", {{scale:1.6, opacity:0, rotation:{-4 if j % 2 else 3}}}, '
                          f'{{scale:1, opacity:1, rotation:0, duration:0.32, ease:"back.out(2.2)"}}, {fmt(s + 0.12 + j * 0.22)});')
            js.append(f'tl.to("#{gid}", {{opacity:0, duration:0.25, ease:"power2.in"}}, {fmt(e - 0.25)});')
        elif g["type"] == "menu":
            els.append(f'<div class="g menu" id="{gid}"><div class="num" id="{gid}n">{escape(g["num"])}</div>'
                       f'<div class="card" id="{gid}c"><div class="label mono">{escape(g.get("label", "MENU PETANG"))}</div>'
                       f'<div class="title">{escape(g["title"])}</div><div class="by mono">{escape(g["by"])}</div></div></div>')
            js.append(f'tl.fromTo("#{gid}", {{opacity:0}}, {{opacity:1, duration:0.1}}, {fmt(s)});')
            js.append(f'tl.fromTo("#{gid}n", {{scale:0, rotation:-25}}, {{scale:1, rotation:0, duration:0.4, ease:"back.out(2.4)"}}, {fmt(s)});')
            js.append(f'tl.fromTo("#{gid}c", {{clipPath:"inset(0 100% 0 0)", x:-40}}, {{clipPath:"inset(0 0% 0 0)", x:0, duration:0.5, ease:"power4.out"}}, {fmt(s + 0.12)});')
            js.append(f'tl.to("#{gid}", {{y:-40, opacity:0, duration:0.3, ease:"power2.in"}}, {fmt(e - 0.3)});')
        elif g["type"] == "chip":
            pos = g.get("pos", "tr")
            style = {"tr": "right:72px; top:300px;", "tl": "left:72px; top:300px;", "mr": "right:72px; top:760px;",
                     "ml": "left:72px; top:760px;", "c": "left:50%; top:820px;"}[pos]
            xp = ' data-center="1"' if pos == "c" else ""
            els.append(f'<div class="g chip" id="{gid}" style="{style}"{xp}><div class="dot">{escape(g.get("icon", "✓"))}</div>'
                       f'<div class="txt">{escape(g["text"])}</div></div>')
            base = '{xPercent:-50, ' if pos == "c" else "{"
            js.append(f'tl.fromTo("#{gid}", {base}scale:0.3, opacity:0, rotation:-6}}, {base}scale:1, opacity:1, rotation:0, duration:0.38, ease:"back.out(2.6)"}}, {fmt(s)});')
            js.append(f'tl.to("#{gid}", {{scale:0.6, opacity:0, duration:0.22, ease:"power2.in"}}, {fmt(e - 0.22)});')
        elif g["type"] == "flash":
            els.append(f'<div class="g flash" id="{gid}"></div>')
            js.append(f'tl.fromTo("#{gid}", {{opacity:0}}, {{opacity:0.9, duration:{fmt(d / 2)}, ease:"power2.out"}}, {fmt(s)});')
            js.append(f'tl.to("#{gid}", {{opacity:0, duration:{fmt(d / 2)}, ease:"power2.in"}}, {fmt(s + d / 2)});')
        elif g["type"] == "outro":
            big = escape(g["big"]).replace("[", '<span class="red">').replace("]", "</span>")
            els.append(f'<div class="g outro" id="{gid}"><div class="stack"><div class="kicker mono" id="{gid}k">{escape(g["kicker"])}</div>'
                       f'<div class="big" id="{gid}b">{big}</div><div class="rule" id="{gid}r"></div>'
                       f'<div class="cta" id="{gid}c">{escape(g["cta"])}</div></div></div>')
            js.append(f'tl.fromTo("#{gid}", {{opacity:0}}, {{opacity:1, duration:0.3}}, {fmt(s)});')
            js.append(f'tl.fromTo("#{gid}k", {{y:30, opacity:0}}, {{y:0, opacity:1, duration:0.4, ease:"power3.out"}}, {fmt(s + 0.1)});')
            js.append(f'tl.fromTo("#{gid}b", {{scale:1.4, opacity:0}}, {{scale:1, opacity:1, duration:0.45, ease:"back.out(1.8)"}}, {fmt(s + 0.2)});')
            js.append(f'tl.fromTo("#{gid}r", {{width:0}}, {{width:420, duration:0.5, ease:"power3.inOut"}}, {fmt(s + 0.45)});')
            js.append(f'tl.fromTo("#{gid}c", {{y:40, opacity:0}}, {{y:0, opacity:1, duration:0.4, ease:"power3.out"}}, {fmt(s + 0.7)});')
            js.append(f'tl.fromTo("#{gid}c", {{scale:1}}, {{scale:1.06, duration:0.5, ease:"sine.inOut", yoyo:true, repeat:{max(1, int((d - 1.3) / 0.5))}}}, {fmt(s + 1.2)});')
    html = f"""<!doctype html>
<html lang="ms">
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>{GFX_CSS}      </style>
      <div id="root" data-composition-id="graphics" data-width="{W}" data-height="{H}">
        {(chr(10) + "        ").join(els)}
      </div>
      <script>
        const tl = gsap.timeline({{ paused: true }});
        {(chr(10) + "        ").join(js)}
        tl.set({{}}, {{}}, {fmt(total)});
        window.__timelines["graphics"] = tl;
      </script>
    </template>
  </body>
</html>
"""
    os.makedirs(os.path.join(outdir, "compositions"), exist_ok=True)
    open(os.path.join(outdir, "compositions", "graphics.html"), "w").write(html)


def write_captions(groups, total, outdir):
    html_groups = []
    for i, g in enumerate(groups):
        words = "".join(f'<span class="w">{escape(w["w"])}</span>' for w in g["words"])
        html_groups.append(f'<div class="cg" id="cg{i:03d}">{words}</div>')
    data = json.dumps([[g["s"], g["e"], [[w["s"], w["e"]] for w in g["words"]]] for g in groups])
    html = f"""<!doctype html>
<html lang="ms">
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>
        #root {{ position: absolute; inset: 0; pointer-events: none; }}
        .cg {{ position: absolute; left: 108px; right: 108px; top: 1240px; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 4px 20px; opacity: 0;
               font-family: "Archivo Black", sans-serif; font-size: 76px; line-height: 1.08; text-transform: uppercase; letter-spacing: -0.01em; text-align: center; }}
        .w {{ display: inline-block; color: #fff8ee; -webkit-text-stroke: 14px #2b1a12; paint-order: stroke fill; text-shadow: 0 7px 0 rgba(28,18,12,0.6); transform-origin: 50% 60%; }}
        .w.on {{ color: #ffc93c; }}
      </style>
      <div id="root" data-composition-id="captions" data-width="{W}" data-height="{H}">
        {(chr(10) + "        ").join(html_groups)}
      </div>
      <script>
        const G = {data};
        const groups = Array.from(document.querySelectorAll("#root .cg"));
        const words = groups.map((g) => Array.from(g.querySelectorAll(".w")));
        const driver = {{ t: 0 }};
        function paint(t) {{
          for (let i = 0; i < G.length; i++) {{
            const [s, e, ws] = G[i];
            const live = t >= s && t < e;
            groups[i].style.opacity = live ? 1 : 0;
            if (!live) continue;
            const pop = Math.min(1, (t - s) / 0.12);
            groups[i].style.transform = `translateY(${{(1 - pop) * 26}}px) scale(${{0.9 + 0.1 * pop}})`;
            for (let j = 0; j < ws.length; j++) {{
              const on = t >= ws[j][0] && (j === ws.length - 1 || t < ws[j + 1][0]);
              const el = words[i][j];
              el.classList.toggle("on", on);
              el.style.transform = on ? "scale(1.1)" : "scale(1)";
            }}
          }}
        }}
        const tl = gsap.timeline({{ paused: true }});
        tl.fromTo(driver, {{ t: 0 }}, {{ t: {fmt(total)}, duration: {fmt(total)}, ease: "none", onUpdate: () => paint(driver.t) }}, 0);
        window.__timelines["captions"] = tl;
      </script>
    </template>
  </body>
</html>
"""
    open(os.path.join(outdir, "compositions", "captions.html"), "w").write(html)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("plan")
    ap.add_argument("outdir")
    ap.add_argument("--audio", required=True, help="16 kHz mono WAV of the source")
    a = ap.parse_args()
    edl = build(json.load(open(a.plan)), a.outdir, Energy(a.audio))
    print(f"built {a.outdir}: {len(edl['clips'])} clips, {len(edl['captions'])} caption groups, "
          f"{len(edl['sfx'])} sfx, total {edl['total']:.2f}s")
