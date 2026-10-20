#!/usr/bin/env python3
"""Build one HyperFrames short from a clip spec + the live transcript.

Usage: build_short.py <spec.json> [--source live.mp4] [--transcript transcript.json]

The spec lists kept source ranges (seconds in the original live) and timed
events (tips, joke stickers, zooms, sfx) also in source seconds. This script
maps everything onto the cut timeline, cuts the media the composition needs,
and writes shorts/<id>/index.html.
"""
import argparse, html, json, os, re, shutil, subprocess, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX_LIB = os.path.join(REPO, "tools", "sfx")
W, H = 1080, 1920
SRC_SCALE = 1.5  # 720x1280 live -> 1080x1920 canvas
HANDLE = 1.0     # seconds of media handle around each extracted range
CLIP_FADE = 0.03

SFX_VOL = {"pop": 0.35, "whoosh": 0.3, "whoosh-short": 0.3, "ding": 0.3, "boing": 0.4,
           "impact-bass-1": 0.45, "sparkle": 0.3, "chime": 0.3, "ping": 0.3,
           "click-soft": 0.3, "slide-down": 0.35, "notification": 0.3, "riser": 0.25}


def sh(cmd):
    subprocess.run(cmd, check=True)


def media_duration(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "csv=p=0", path], capture_output=True, text=True, check=True)
    return float(out.stdout.strip())


class Timeline:
    """Maps source seconds onto the cut (output) timeline."""

    def __init__(self, segments):
        self.segs = []
        t = 0.0
        for s, e in segments:
            self.segs.append((s, e, t))
            t += e - s
        self.duration = round(t, 3)

    def to_out(self, src, clamp=True):
        for s, e, o in self.segs:
            if s - 1e-6 <= src <= e + 1e-6:
                return round(o + (src - s), 3)
        if not clamp:
            return None
        # snap to the next kept segment start (event authored inside a cut)
        for s, e, o in self.segs:
            if src < s:
                return round(o, 3)
        return self.duration

    def seg_index(self, src):
        for i, (s, e, _) in enumerate(self.segs):
            if s - 1e-6 <= src <= e + 1e-6:
                return i
        return None

    def cut_points(self):
        return [round(o, 3) for (_, _, o) in self.segs[1:]]


def snap_segments(segments, audio_path, pre=0.3, post=0.35):
    """Nudge each cut to the quietest 20ms frame nearby so cuts land between words."""
    if not audio_path or not os.path.exists(audio_path):
        return segments
    import wave
    import numpy as np
    w = wave.open(audio_path)
    sr = w.getframerate()

    def rms_min(a, b):
        a = max(0.0, a)
        w.setpos(int(a * sr))
        x = np.frombuffer(w.readframes(int((b - a) * sr)), dtype=np.int16).astype(np.float32)
        hop = int(0.02 * sr)
        n = len(x) // hop
        if n < 2:
            return a
        e = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(axis=1))
        return a + (int(np.argmin(e)) + 0.5) * hop / sr

    out = []
    for s, e in segments:
        out.append((round(rms_min(s - pre, s + 0.08), 3), round(rms_min(e - 0.08, e + post), 3)))
    return out


def merge_ranges(segments, gap=20.0):
    ranges = []
    for s, e in sorted(segments):
        if ranges and s - ranges[-1][1] < gap:
            ranges[-1][1] = max(ranges[-1][1], e)
        else:
            ranges.append([s, e])
    return [(max(0.0, s - HANDLE), e + HANDLE) for s, e in ranges]


def extract_ranges(source, ranges, assets):
    files = []
    for i, (s, e) in enumerate(ranges):
        out = os.path.join(assets, f"src_{i}.mp4")
        files.append((s, e, f"assets/src_{i}.mp4"))
        stamp = out + ".range"
        want = f"{s:.3f}-{e:.3f}"
        if os.path.exists(out) and os.path.exists(stamp) and open(stamp).read() == want:
            continue
        sh(["ffmpeg", "-v", "error", "-y", "-ss", f"{s:.3f}", "-t", f"{e - s:.3f}", "-i", source,
            "-vf", "fps=30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "21",
            "-g", "15", "-pix_fmt", "yuv420p",
            "-af", "highpass=f=70,loudnorm=I=-15:TP=-1.5:LRA=9", "-ar", "48000",
            "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out])
        open(stamp, "w").write(want)
    return files


def build_captions(words, tl, fixes, max_words=3, max_chars=16, gap=0.32):
    """Group transcript words that fall inside kept segments into caption groups."""
    kept = []
    for w in words:
        mid = (w["s"] + w["e"]) / 2
        o = tl.to_out(mid, clamp=False)
        if o is None:
            continue
        text = w["w"].strip()
        if not text:
            continue
        seg = tl.seg_index(mid)
        if text.startswith("-") and kept and kept[-1]["g"] == seg:
            # whisper splits reduplication ("berumur -umur"); glue it back onto the previous word
            kept[-1]["t"] += text
            continue
        s = tl.to_out(max(w["s"], mid - 0.5), clamp=False)
        e = tl.to_out(min(w["e"], mid + 0.5), clamp=False)
        s = o if s is None else s
        e = o if e is None else e
        kept.append({"t": text, "s": min(s, o), "e": max(e, o + 0.05), "g": seg})
    for k in kept:
        for a, b in fixes.items():
            k["t"] = re.sub(a, b, k["t"], flags=re.IGNORECASE)
    kept = [k for k in kept if k["t"].strip()]
    # segments can be reordered, so group in cut-timeline order and never across a cut
    kept.sort(key=lambda k: k["s"])

    groups, cur = [], []
    for k in kept:
        if cur:
            chars = sum(len(x["t"]) + 1 for x in cur) + len(k["t"])
            if (len(cur) >= max_words or chars > max_chars or k["s"] - cur[-1]["e"] > gap or k["g"] != cur[-1]["g"]
                    or re.search(r"[.?!,]$", cur[-1]["t"])):
                groups.append(cur)
                cur = []
        cur.append(k)
    if cur:
        groups.append(cur)

    out = []
    for i, g in enumerate(groups):
        start = g[0]["s"]
        nxt = groups[i + 1][0]["s"] if i + 1 < len(groups) else tl.duration
        end = min(max(g[-1]["e"] + 0.25, start + 0.6), nxt, tl.duration)
        out.append({"start": round(start, 3), "end": round(end, 3),
                    "words": [{"t": re.sub(r"[.,]$", "", x["t"]).upper(), "s": round(x["s"], 3)} for x in g]})
    return out


def esc(s):
    return html.escape(s, quote=True)


def build(spec_path, source, transcript_path):
    spec = json.load(open(spec_path))
    cid = spec["id"]
    proj = os.path.join(REPO, "shorts", cid)
    if not os.path.exists(os.path.join(proj, "hyperframes.json")):
        os.makedirs(os.path.dirname(proj), exist_ok=True)
        sh(["npx", "--yes", "hyperframes@0.8.175", "init", proj, "--non-interactive", "--example", "blank",
            "--resolution", "portrait", "--skill", "general-video"])
    assets = os.path.join(proj, "assets")
    os.makedirs(os.path.join(assets, "sfx"), exist_ok=True)

    segs = [tuple(x) for x in spec["segments"]]
    if spec.get("snap", True):
        segs = snap_segments(segs, os.environ.get("TT_AUDIO"))
    tl = Timeline(segs)
    files = extract_ranges(source, merge_ranges(segs), assets)

    def file_for(s, e):
        for fs, fe, rel in files:
            if fs - 1e-6 <= s and e <= fe + 1e-6:
                return rel, s - fs
        raise SystemExit(f"segment {s}-{e} outside extracted ranges")

    words = []
    for seg in json.load(open(transcript_path)):
        words.extend(seg.get("words", []))
    lo, hi = min(s for s, _ in segs) - 2, max(e for _, e in segs) + 2
    words = [w for w in words if lo <= w["s"] <= hi]
    captions = build_captions(words, tl, spec.get("caption_fixes", {}))
    for ov in spec.get("caption_overrides", []):
        # replace caption groups inside [from,to] (source s) with hand-written text chunks
        a, b = tl.to_out(ov["from"]), tl.to_out(ov["to"])
        captions = [c for c in captions if c["end"] <= a or c["start"] >= b]
        chunks = ov["chunks"]
        step = (b - a) / len(chunks)
        for i, ch in enumerate(chunks):
            st = a + i * step
            ws = ch.upper().split()
            captions.append({"start": round(st, 3), "end": round(st + step, 3),
                             "words": [{"t": w, "s": round(st + j * step / len(ws), 3)} for j, w in enumerate(ws)]})
        captions.sort(key=lambda c: c["start"])

    crop_top, crop_bot = spec.get("crop", [290, 990])
    card_h = round((crop_bot - crop_top) * SRC_SCALE)
    card_top = spec.get("card_top", 400)
    vid_offset = -round(crop_top * SRC_SCALE)

    # ---- events -> output time
    events, sfx = [], []
    for ev in spec.get("events", []):
        e = dict(ev)
        e["at"] = tl.to_out(ev["t"])
        if ev["type"] in ("tip", "lol", "sticker", "zoom"):
            # overlays must clear out before the end call-to-action lands
            e["dur"] = round(max(1.0, min(ev.get("dur", 3), tl.duration - 3.1 - e["at"])), 3)
        if ev["type"] == "list":
            e["itemsAt"] = [tl.to_out(t) for t, _ in ev["items"]]
            e["end"] = tl.to_out(ev["until"]) if "until" in ev else tl.duration - 2.7
            e.setdefault("y", card_top + card_h - 70 - 92 * len(ev["items"]) - 40)
            for t in e["itemsAt"]:
                sfx.append({"name": "pop", "at": t, "vol": 0.3})
        events.append(e)
        snd = ev.get("sfx", {"tip": "ding", "lol": "boing", "sticker": "pop", "zoom": "whoosh-short"}.get(ev["type"]))
        if ev["type"] == "sfx":
            snd = ev["name"]
        if snd:
            sfx.append({"name": snd, "at": e["at"], "vol": ev.get("vol", SFX_VOL.get(snd, 0.3))})
    # hook slam + end CTA sounds
    sfx.append({"name": "impact-bass-1", "at": 0.05, "vol": 0.4})
    sfx.append({"name": "pop", "at": max(0, tl.duration - 2.6), "vol": 0.35})
    for cp in tl.cut_points():
        if spec.get("cut_whoosh", False):
            sfx.append({"name": "whoosh-short", "at": max(0, cp - 0.12), "vol": 0.15})

    # ---- media elements
    vids = []
    for i, (s, e, o) in enumerate(tl.segs):
        rel, ms = file_for(s, e)
        vids.append(
            f'<video id="seg-{i}" class="clip cam-video" src="{rel}" playsinline data-has-audio="true" '
            f'data-start="{o:.3f}" data-duration="{e - s:.3f}" data-media-start="{ms:.3f}" '
            f'data-fade-in="{CLIP_FADE}" data-fade-out="{CLIP_FADE}" data-track-index="0"></video>')
    auds = []
    for i, x in enumerate(sorted(sfx, key=lambda z: z["at"])):
        src = os.path.join(SFX_LIB, x["name"] + ".mp3")
        shutil.copy(src, os.path.join(assets, "sfx", x["name"] + ".mp3"))
        d = min(media_duration(src), tl.duration - x["at"])
        if d <= 0.05:
            continue
        auds.append(f'<audio id="sfx-{i}" src="assets/sfx/{x["name"]}.mp3" data-start="{x["at"]:.3f}" '
                    f'data-duration="{d:.3f}" data-volume="{x["vol"]}" data-track-index="{3 + i % 3}"></audio>')
    shutil.copy(os.path.join(REPO, "tools", "gsap.min.js"), os.path.join(assets, "gsap.min.js"))
    credits = os.path.join(SFX_LIB, "CREDITS.md")
    shutil.copy(credits, os.path.join(assets, "sfx", "CREDITS.md"))

    # ---- overlay markup
    tips, stickers, lists = [], [], []
    for i, e in enumerate(events):
        if e["type"] == "tip":
            tips.append(f'<div class="tip" id="tip-{i}" data-layout-allow-overflow><div class="tip-label">{esc(e.get("label", "TIP"))}</div>'
                        f'<div class="tip-text">{esc(e["text"])}</div></div>')
        elif e["type"] == "list":
            rows = "".join(f'<div class="li" id="li-{i}-{k}"><span class="li-dot"></span>{esc(txt)}</div>'
                           for k, (_, txt) in enumerate(e["items"]))
            lists.append(f'<div class="listcard" id="list-{i}" style="top:{e.get("y", 0)}px" data-layout-allow-overflow>'
                         f'<div class="tip-label">{esc(e.get("label", "RESEPI"))}</div>{rows}</div>')
        elif e["type"] in ("lol", "sticker"):
            emoji = f'<span class="emo">{esc(e["emoji"])}</span>' if e.get("emoji") else ""
            kind = "lol" if e["type"] == "lol" else "stk"
            stickers.append(f'<div class="sticker {kind}" id="stk-{i}" style="left:{e.get("x", 640)}px;top:{e.get("y", 980)}px">'
                            f'{emoji}<span class="stk-text">{esc(e.get("text", ""))}</span></div>')

    cap_html = []
    for gi, g in enumerate(captions):
        spans = "".join(f'<span class="w" id="cw-{gi}-{wi}">{esc(w["t"])}</span>' for wi, w in enumerate(g["words"]))
        cap_html.append(f'<div class="cg" id="cg-{gi}">{spans}</div>')

    hook_lines = "".join(f'<div class="hook-line">{esc(x)}</div>' for x in spec["hook"])
    data = {
        "duration": tl.duration, "cuts": tl.cut_points(), "captions": captions,
        "events": [{k: v for k, v in e.items() if k in ("type", "at", "dur", "scale", "origin", "itemsAt", "end")} | {"i": i}
                   for i, e in enumerate(events)],
        "hookHold": spec.get("hook_hold", 2.6),
        "punch": spec.get("cut_punch", True),
    }

    page = TEMPLATE
    for k, v in {
        "__DUR__": f"{tl.duration:.3f}",
        "__CARD_TOP__": str(card_top), "__CARD_H__": str(card_h), "__VID_OFF__": str(vid_offset),
        "__CAP_TOP__": str(spec.get("caption_top", card_top + card_h + 24)),
        "__TITLE__": esc(spec["title"]), "__KICKER__": esc(spec.get("kicker", "LIVE · SOURDOUGH")),
        "__HOOK__": hook_lines, "__VIDEOS__": "\n        ".join(vids), "__AUDIO__": "\n    ".join(auds),
        "__TIPS__": "\n    ".join(tips + lists), "__STICKERS__": "\n      ".join(stickers),
        "__CAPTIONS__": "\n      ".join(cap_html), "__CTA__": esc(spec.get("cta", "Follow untuk resepi seterusnya!")),
        "__DATA__": json.dumps(data, ensure_ascii=False),
    }.items():
        page = page.replace(k, v)
    open(os.path.join(proj, "index.html"), "w").write(page)
    shutil.copy(spec_path, os.path.join(proj, "clip-spec.json"))
    print(f"{cid}: {tl.duration:.1f}s, {len(tl.segs)} cuts, {len(captions)} caption groups, "
          f"{len(events)} events, {len(auds)} sfx")


TEMPLATE = r"""<!doctype html>
<html lang="ms" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="assets/gsap.min.js"></script>
    <style>
      @font-face { font-family: "Noto Color Emoji"; src: local("Noto Color Emoji"); }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #1c130d; }
      #root { width: 100%; height: 100%; position: relative; overflow: hidden;
        font-family: "Archivo Black", "Noto Color Emoji", sans-serif; color: #fff6e6; }
      .bg { position: absolute; inset: 0; background: #1c130d; overflow: hidden; }
      .glow { position: absolute; border-radius: 50%; filter: blur(60px); }
      .glow-a { width: 900px; height: 700px; left: -200px; top: -260px; background: rgba(255, 196, 61, 0.22); }
      .glow-b { width: 900px; height: 800px; right: -300px; bottom: -300px; background: rgba(232, 72, 44, 0.22); }
      .stripes { position: absolute; left: -200px; top: -200px; width: 1480px; height: 2320px;
        background: repeating-linear-gradient(135deg, rgba(255, 214, 120, 0.035) 0 40px, transparent 40px 120px); }

      .kicker { position: absolute; left: 0; right: 0; top: 150px; display: flex; justify-content: center; }
      .kicker-pill { display: flex; align-items: center; gap: 14px; padding: 10px 24px; border-radius: 40px;
        background: rgba(0, 0, 0, 0.35); border: 2px solid rgba(255, 214, 120, 0.45);
        font-family: "IBM Plex Mono", monospace; font-weight: 700; font-size: 26px; letter-spacing: 0.12em; color: #ffd678; }
      .live-dot { width: 16px; height: 16px; border-radius: 50%; background: #ff4b2b; display: block; }

      .title-zone { position: absolute; left: 60px; right: 60px; top: 215px; height: 165px;
        display: flex; align-items: center; justify-content: center; text-align: center; }
      .title { text-wrap: balance; font-size: 62px; line-height: 1.08; letter-spacing: -0.02em; color: #ffd23f;
        text-shadow: 0 5px 0 #7a2a12; max-width: 960px; }
      .hook { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center;
        justify-content: center; text-align: center; }
      .hook-line { font-size: 84px; line-height: 1.0; letter-spacing: -0.03em; color: #fff6e6;
        text-shadow: 0 6px 0 #c2361b; display: block; max-width: 1000px; }
      .hook-line:nth-child(2) { color: #ffd23f; text-shadow: 0 6px 0 #7a2a12; }

      .card { position: absolute; left: 0; width: 1080px; top: __CARD_TOP__px; height: __CARD_H__px;
        overflow: hidden; background: #000; }
      .punch, .zoom { position: absolute; left: 0; top: 0; width: 1080px; height: __CARD_H__px; transform-origin: 50% 45%; }
      .cam-video { position: absolute; left: 0; top: __VID_OFF__px; width: 1080px; height: 1920px; object-fit: cover; }
      .progress { position: absolute; left: 0; bottom: 0; width: 1080px; height: 8px; background: #ffd23f;
        transform-origin: 0% 50%; }

      .tip { position: absolute; left: 50px; right: 50px; top: 196px; min-height: 196px; padding: 26px 34px 30px;
        background: #fff6e6; border-radius: 28px; box-shadow: 0 10px 0 #c2361b; opacity: 0; }
      .tip-label { display: inline-block; padding: 6px 18px; border-radius: 12px; background: #e8482c; color: #fff6e6;
        font-family: "IBM Plex Mono", monospace; font-weight: 700; font-size: 28px; letter-spacing: 0.1em; }
      .tip-text { text-wrap: balance; margin-top: 14px; font-size: 50px; line-height: 1.1; letter-spacing: -0.02em; color: #2a1a10; }

      .listcard { position: absolute; left: 70px; right: 70px; padding: 22px 34px 26px; border-radius: 26px;
        background: rgba(255, 246, 230, 0.96); box-shadow: 0 10px 0 #c2361b; opacity: 0; }
      .li { display: flex; align-items: center; gap: 18px; margin-top: 14px; font-size: 54px; line-height: 1.12;
        letter-spacing: -0.02em; color: #2a1a10; opacity: 0; }
      .li-dot { display: block; width: 22px; height: 22px; border-radius: 50%; background: #e8482c; flex: none; }
      .sticker { position: absolute; display: flex; align-items: center; gap: 10px; padding: 14px 26px;
        border-radius: 22px; background: #ffd23f; color: #2a1a10; font-size: 58px; letter-spacing: -0.02em;
        box-shadow: 0 8px 0 #2a1a10; opacity: 0; white-space: nowrap; transform-origin: 50% 50%; }
      .sticker.stk { background: #fff6e6; }
      .emo { font-family: "Noto Color Emoji", sans-serif; font-size: 64px; line-height: 1; }

      .captions { position: absolute; left: 30px; right: 30px; top: __CAP_TOP__px; height: 190px; }
      .cg { position: absolute; left: 0; right: 0; top: 0; display: flex; flex-wrap: wrap; justify-content: center;
        align-content: flex-start; gap: 0 24px; text-align: center; opacity: 0; }
      .w { display: inline-block; font-size: 70px; line-height: 1.12; letter-spacing: -0.01em; color: #fff6e6;
        -webkit-text-stroke: 12px #1c130d; paint-order: stroke fill; text-shadow: 0 6px 0 rgba(0,0,0,0.5); }

      .cta { position: absolute; left: 0; right: 0; top: 230px; display: flex; justify-content: center; opacity: 0; }
      .cta-pill { padding: 26px 42px; border-radius: 26px; background: #e8482c; color: #fff6e6; font-size: 54px;
        letter-spacing: -0.02em; box-shadow: 0 10px 0 #7a2a12; text-align: center; max-width: 980px; text-wrap: balance; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="__DUR__" data-width="1080" data-height="1920">
      <div class="bg" id="bg">
        <div class="glow glow-a" id="glow-a" data-layout-allow-overflow></div>
        <div class="glow glow-b" id="glow-b" data-layout-allow-overflow></div>
        <div class="stripes" id="stripes" data-layout-allow-overflow></div>
      </div>

      <div class="kicker"><div class="kicker-pill" id="kicker"><span class="live-dot" id="live-dot"></span>__KICKER__</div></div>
      <div class="title-zone">
        <div class="hook" id="hook" data-layout-allow-overlap>__HOOK__</div>
        <div class="title" id="title" data-layout-allow-overlap>__TITLE__</div>
      </div>

      <div class="card" id="card">
        <div class="punch" id="punch" data-layout-allow-overflow><div class="zoom" id="zoom" data-layout-allow-overflow>
        __VIDEOS__
        </div></div>
        <div class="progress" id="progress"></div>
      </div>

      __STICKERS__

    __TIPS__

      <div class="captions" id="captions">
      __CAPTIONS__
      </div>

      <div class="cta" id="cta"><div class="cta-pill">__CTA__</div></div>

    __AUDIO__
    </div>
    <script>
      const D = __DATA__;
      const tl = gsap.timeline({ paused: true });
      const T = D.duration;

      // ambience: slow breathing glows + drifting ghost type
      tl.fromTo("#glow-a", { scale: 1 }, { scale: 1.15, duration: T / 2, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0);
      tl.fromTo("#glow-b", { scale: 1.1 }, { scale: 0.95, duration: T / 2, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0);
      tl.fromTo("#stripes", { x: 0, y: 0 }, { x: 120, y: -120, duration: T, ease: "none" }, 0);
      tl.fromTo("#live-dot", { opacity: 1 }, { opacity: 0.25, duration: 0.6, ease: "sine.inOut", yoyo: true,
        repeat: Math.max(0, Math.floor(T / 0.6) - 1) }, 0);
      tl.fromTo("#progress", { scaleX: 0 }, { scaleX: 1, duration: T, ease: "none" }, 0);

      // hook: lines slam in, hold, then hand over to the persistent title
      const lines = gsap.utils.toArray(".hook-line");
      // frame 0 doubles as the feed thumbnail, so everything starts readable and only settles
      lines.forEach((el, i) => {
        tl.fromTo(el, { scale: 1.18 }, { scale: 1, duration: 0.35, ease: "expo.out" }, i * 0.12);
      });
      tl.fromTo("#card", { y: 24 }, { y: 0, duration: 0.45, ease: "power3.out" }, 0);
      tl.to("#hook", { opacity: 0, y: -20, duration: 0.25, ease: "power2.in" }, D.hookHold);
      tl.fromTo("#title", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, D.hookHold + 0.15);

      // jump cuts: alternate a subtle punch so cuts read as intentional
      if (D.punch) {
        D.cuts.forEach((t, i) => {
          tl.set("#punch", { scale: i % 2 === 0 ? 1.06 : 1.0 }, t);
        });
      }

      // events
      let titleBusyUntil = 0;
      D.events.forEach((e) => {
        const dur = e.dur || 3;
        if (e.type === "tip") {
          const el = "#tip-" + e.i;
          tl.to("#title", { opacity: 0, duration: 0.15 }, e.at - 0.05);
          tl.fromTo(el, { x: -1100, opacity: 1, rotation: -3 }, { x: 0, rotation: -1, duration: 0.45, ease: "power3.out" }, e.at);
          tl.to(el, { x: 1100, rotation: 2, duration: 0.35, ease: "power2.in" }, e.at + dur);
          tl.set(el, { opacity: 0 }, e.at + dur + 0.36);
          tl.to("#title", { opacity: 1, duration: 0.25 }, e.at + dur + 0.3);
        } else if (e.type === "lol" || e.type === "sticker") {
          const el = "#stk-" + e.i;
          const rot = e.i % 2 === 0 ? -8 : 7;
          tl.fromTo(el, { scale: 0, opacity: 0, rotation: rot * 2 }, { scale: 1, opacity: 1, rotation: rot, duration: 0.3, ease: "power3.out" }, e.at);
          tl.to(el, { scale: 1.08, duration: 0.18, ease: "sine.inOut", yoyo: true, repeat: 1 }, e.at + 0.35);
          tl.to(el, { scale: 0.6, opacity: 0, duration: 0.2, ease: "power2.in" }, e.at + dur - 0.2);
          if (e.type === "lol") {
            tl.to("#zoom", { scale: 1.12, duration: 0.18, ease: "power3.out" }, e.at);
            tl.to("#zoom", { scale: 1.0, duration: 0.4, ease: "power2.inOut" }, e.at + Math.min(dur, 1.4));
          }
        } else if (e.type === "list") {
          const el = "#list-" + e.i;
          tl.fromTo(el, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, e.at);
          e.itemsAt.forEach((t, k) => {
            tl.fromTo("#li-" + e.i + "-" + k, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.25, ease: "power3.out" }, Math.max(e.at, t));
          });
          tl.to(el, { opacity: 0, y: 30, duration: 0.25, ease: "power2.in" }, e.end);
        } else if (e.type === "zoom") {
          tl.set("#zoom", { transformOrigin: e.origin || "50% 45%" }, e.at);
          tl.to("#zoom", { scale: e.scale || 1.3, duration: 0.35, ease: "power3.out" }, e.at);
          tl.to("#zoom", { scale: 1.0, duration: 0.4, ease: "power2.inOut" }, e.at + dur);
          tl.set("#zoom", { transformOrigin: "50% 45%" }, e.at + dur + 0.41);
        }
      });

      // karaoke captions: one group at a time, active word lights up
      D.captions.forEach((g, gi) => {
        const el = document.getElementById("cg-" + gi);
        if (!el) return;
        tl.fromTo(el, { opacity: 0, y: 18, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.12, ease: "power3.out" }, g.start);
        g.words.forEach((w, wi) => {
          const wel = "#cw-" + gi + "-" + wi;
          tl.fromTo(wel, { color: "#fff6e6", scale: 1 }, { color: "#ffd23f", scale: 1.1, duration: 0.08, ease: "power2.out" }, Math.max(g.start, w.s));
          if (wi < g.words.length - 1) tl.to(wel, { color: "#fff6e6", scale: 1, duration: 0.08 }, Math.max(g.start, g.words[wi + 1].s));
        });
        tl.to(el, { opacity: 0, duration: 0.08, ease: "power2.in" }, Math.max(g.start + 0.1, g.end - 0.08));
        tl.set(el, { opacity: 0, visibility: "hidden" }, g.end);
      });

      // end call-to-action
      tl.to("#title", { opacity: 0, duration: 0.15 }, T - 2.65);
      tl.fromTo("#cta", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.35, ease: "power3.out" }, T - 2.6);

      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("--source", default=os.environ.get("TT_SOURCE", os.path.join(REPO, "source", "live.mp4")))
    ap.add_argument("--transcript", default=os.path.join(REPO, "transcript", "transcript.json"))
    a = ap.parse_args()
    build(a.spec, a.source, a.transcript)
