#!/usr/bin/env python3
"""Build a HyperFrames project from an edit decision list (EDL).

    python3 tools/build.py edits/reels.json            # -> videos/reels/
    python3 tools/build.py edits/*.json

EDL shape (all times in SOURCE seconds unless noted):

{
  "id": "reels", "format": "vertical" | "landscape", "title": "...",
  "tighten": {"max_gap": 0.7, "pad": 0.12},        # cut dead air inside segments
  "captions": "karaoke" | "panel" | "none",
  "bgm": {"volume": 0.07} | null,
  "segments": [
    {"in": 120.0, "out": 131.5, "zoom": 1.0, "skip": [[125.0, 126.2]], "note": "..."},
    {"gfx": "intro", "dur": 4.0}                  # pure graphic beat, no footage
  ],
  "overlays": [
    {"type": "tip", "at": 128.2, "dur": 4, "title": "TIP", "text": "..."},  # at = source time
    {"type": "cta", "out_at": -6, "dur": 6}                                # out_at = output time (neg = from end)
  ]
}
"""
import html
import json
import math
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.environ.get("TT_SOURCE", "/home/user/media/raw/source.mp4")
FPS = 25.0

# ---------------------------------------------------------------- transcript

def load_words():
    data = json.load(open(os.path.join(ROOT, "data", "transcript.json")))
    fixes = json.load(open(os.path.join(ROOT, "data", "corrections.json")))
    word_fix = {k.lower(): v for k, v in fixes.get("words", {}).items()}
    at_fix = fixes.get("at", {})  # one-off fixes for a single word, keyed by its start time ("2425.68")
    words = []
    for seg in data:
        merged = []  # whisper splits reduplication ("Pocak", "-pocak"); join it back into one word
        for w in seg["words"]:
            txt = w["w"].strip()
            if not txt:
                continue
            if merged and txt.startswith("-") and not w["w"].startswith(" "):
                merged[-1] = {**merged[-1], "w": merged[-1]["w"].strip() + txt, "e": w["e"]}
            else:
                merged.append({**w, "w": txt})
        for w in merged:
            txt = w["w"]
            core = re.sub(r"[^\w'-]", "", txt).lower()
            if f"{w['s']:.2f}" in at_fix:
                txt = at_fix[f"{w['s']:.2f}"]
            elif core in word_fix:
                txt = re.sub(re.escape(re.sub(r"[^\w'-]", "", txt)), word_fix[core], txt, count=1)
            words.append({"s": w["s"], "e": w["e"], "w": txt})
    words.sort(key=lambda w: w["s"])
    # whisper sometimes stretches a word across the silence after it; cap word length
    for w in words:
        w["e"] = min(w["e"], w["s"] + max(0.9, 0.09 * len(w["w"])))
    return words, fixes.get("phrases", {})


def words_in(words, a, b):
    return [w for w in words if w["s"] >= a - 0.05 and w["e"] <= b + 0.05]


# ---------------------------------------------------------------- timeline

def clip_light(c):
    """Measure a clip's centre (guest strip excluded) and return a lutyuv filter that evens out exposure
    (gamma toward a mid-grey mean) and removes ~40% of its colour cast, keeping some of the kitchen's warmth."""
    import subprocess
    d = c["out"] - c["in"]
    r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{c['in']:.3f}", "-t", f"{min(d, 6):.3f}", "-i", SOURCE, "-an",
                        "-vf", "fps=2,crop=440:900:20:190,scale=110:-1,signalstats,metadata=print:file=-", "-f", "null", "-"],
                       capture_output=True, text=True).stdout
    vals = {"YAVG": [], "UAVG": [], "VAVG": []}
    for line in r.splitlines():
        for k in vals:
            if f".{k}=" in line:
                vals[k].append(float(line.split("=")[1]))
    if not vals["YAVG"]:
        return ""
    y, u, v = (sum(vals[k]) / len(vals[k]) for k in ("YAVG", "UAVG", "VAVG"))
    m = min(max((y - 16) / 219, 0.05), 0.95)
    g = min(max(math.log(0.47) / math.log(m), 0.72), 1.12)
    du = max(-5.0, min(5.0, -0.4 * (u - 128)))
    dv = max(-5.0, min(5.0, -0.4 * (v - 128)))
    return (f"lutyuv=y='clip(pow(max(val-16\\,0)/219\\,{g:.3f})*219+16\\,16\\,235)'"
            f":u='clip(val+{du:.2f}\\,16\\,240)':v='clip(val+{dv:.2f}\\,16\\,240)',")


# ffmpeg stand-in for the shared "premium" data-color-grading look (matched on frame stats against the
# WebGL shader): slight black lift + gamma, +30% saturation, a touch warmer, soft vignette. Used for the
# long YouTube edit, where the software-rendered shader would multiply render time ~4x.
GRADE_BAKE = ("lutyuv=y='clip(16+pow(max(val-16\\,0)/219\\,0.95)*219*0.98+4\\,16\\,235)',eq=saturation=1.3,"
              "lutyuv=u='clip(val+1.4\\,16\\,240)':v='clip(val+2.0\\,16\\,240)',vignette=angle=PI/9,")


def prerender_cuts(clips, pdir, light=False, bake=False):
    """Join the kept source ranges into assets/edit.mp4: video segments re-encoded and concatenated,
    audio cut as PCM (sample exact, 40 ms edge fades, per-clip gain) so A/V never drifts."""
    import hashlib, subprocess, tempfile
    from concurrent.futures import ThreadPoolExecutor
    key = hashlib.sha1(json.dumps([[c["in"], c["out"], c["vol"]] for c in clips] + [light, 2] + (["bake"] if bake else [])).encode()).hexdigest()[:16]
    out = os.path.join(pdir, "assets", "edit.mp4")
    stamp = os.path.join(pdir, "assets", "edit.key")
    if os.path.exists(out) and os.path.exists(stamp) and open(stamp).read() == key:
        return
    tmp = tempfile.mkdtemp(prefix="tt-cuts-")

    def cut(k):
        c = clips[k]
        d = c["out"] - c["in"]
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{c['in']:.3f}", "-i", SOURCE, "-t", f"{d:.3f}", "-an",
                        "-vf", (clip_light(c) if light else "") + (GRADE_BAKE if bake else "") + "fps=25,setpts=PTS-STARTPTS", "-frames:v", str(round(d * FPS)),
                        "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", "-g", "25",
                        os.path.join(tmp, f"v{k:04d}.mp4")], check=True)
        fo = max(0.0, d - 0.04)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{c['in']:.3f}", "-i", SOURCE, "-t", f"{d:.3f}", "-vn",
                        "-af", f"volume={c['vol']},afade=t=in:d=0.04,afade=t=out:st={fo:.3f}:d=0.04,apad=whole_dur={d:.3f}",
                        "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", os.path.join(tmp, f"a{k:04d}.wav")], check=True)

    with ThreadPoolExecutor(4) as ex:
        list(ex.map(cut, range(len(clips))))
    with open(os.path.join(tmp, "v.txt"), "w") as f:
        f.writelines(f"file 'v{k:04d}.mp4'\n" for k in range(len(clips)))
    with open(os.path.join(tmp, "a.txt"), "w") as f:
        f.writelines(f"file 'a{k:04d}.wav'\n" for k in range(len(clips)))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", os.path.join(tmp, "v.txt"),
                    "-f", "concat", "-safe", "0", "-i", os.path.join(tmp, "a.txt"),
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                    "-movflags", "+faststart", out], check=True)
    open(stamp, "w").write(key)
    shutil.rmtree(tmp)


_alen = {}


def audio_len(path):
    if path not in _alen:
        import subprocess
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                             capture_output=True, text=True).stdout
        _alen[path] = float(out.strip())
    return _alen[path]


def frame(t):
    return round(t * FPS) / FPS


def build_clips(edl, words):
    """Return clip list [{in,out,start,zoom,origin}] and gfx beats."""
    tight = edl.get("tighten") or {}
    max_gap, pad = tight.get("max_gap"), tight.get("pad", 0.12)
    clips, beats, t = [], [], 0.0
    for si, seg in enumerate(edl["segments"]):
        if "gfx" in seg:
            beats.append({"gfx": seg["gfx"], "start": t, "dur": seg["dur"], **{k: v for k, v in seg.items() if k not in ("gfx", "dur")}})
            t += seg["dur"]
            continue
        a, b = seg["in"], seg["out"]
        cuts = [list(c) for c in seg.get("skip", [])]
        if max_gap and not seg.get("keep_pauses"):
            ws = words_in(words, a, b)
            if ws and ws[0]["s"] - a > max_gap and not seg.get("keep_head"):
                cuts.append([a, ws[0]["s"] - pad])
            for p, n in zip(ws, ws[1:]):
                if n["s"] - p["e"] > max_gap:
                    cuts.append([p["e"] + pad, n["s"] - pad])
            if ws and b - ws[-1]["e"] > max_gap and not seg.get("keep_tail"):
                cuts.append([ws[-1]["e"] + pad, b])
        cuts.sort()
        pieces, cur = [], a
        for c0, c1 in cuts:
            if c0 > cur:
                pieces.append([cur, c0])
            cur = max(cur, c1)
        if cur < b:
            pieces.append([cur, b])
        pieces = [p for p in pieces if p[1] - p[0] >= 0.3]
        base_zoom = seg.get("zoom", 1.0)
        for pi, (p0, p1) in enumerate(pieces):
            p0, p1 = frame(p0), frame(p1)
            z = base_zoom
            if pi % 2 == 1 and seg.get("jump_zoom", edl.get("jump_zoom", 1.1)):
                z = base_zoom * seg.get("jump_zoom", edl.get("jump_zoom", 1.1))
            clips.append({"in": p0, "out": p1, "start": frame(t), "zoom": z,
                          "origin": seg.get("origin", edl.get("origin", "50% 40%")), "seg": si,
                          "vol": seg.get("volume", edl.get("voice_volume", 0.85))})
            t = frame(t + (p1 - p0))
    return clips, beats, frame(t)


def src_to_out(clips, s):
    for c in clips:
        if c["in"] - 0.01 <= s <= c["out"] + 0.01:
            return c["start"] + (s - c["in"])
    # nearest following clip start (overlay anchored inside a removed gap)
    later = [c for c in clips if c["in"] > s]
    if later:
        nxt = min(later, key=lambda c: c["in"])
        if nxt["in"] - s < 3:
            return nxt["start"]
    earlier = [c for c in clips if c["out"] < s]
    if earlier:
        prv = max(earlier, key=lambda c: c["out"])
        if s - prv["out"] < 3:
            return prv["start"] + prv["out"] - prv["in"]
    return None


# ---------------------------------------------------------------- captions

def caption_groups(clips, words, phrases, fmt):
    out_words = []
    for c in clips:
        for w in words_in(words, c["in"], c["out"]):
            s = c["start"] + max(0, w["s"] - c["in"])
            e = c["start"] + min(c["out"], w["e"]) - c["in"]
            out_words.append({"s": s, "e": max(e, s + 0.08), "w": w["w"], "clip": id(c)})
    text = " ".join(w["w"] for w in out_words)
    del text
    max_words, max_chars = (3, 16) if fmt == "vertical" else (8, 44)
    groups, cur = [], []
    for w in out_words:
        brk = False
        if cur:
            gap = w["s"] - cur[-1]["e"]
            chars = sum(len(x["w"]) + 1 for x in cur) + len(w["w"])
            brk = (len(cur) >= max_words or chars > max_chars or gap > 0.45 or w["clip"] != cur[-1]["clip"]
                   or re.search(r"[.?!]$", cur[-1]["w"]))
        if brk:
            groups.append(cur)
            cur = []
        cur.append(w)
    if cur:
        groups.append(cur)
    res = []
    for g in groups:
        start = g[0]["s"]
        end = g[-1]["e"] + 0.15
        res.append({"start": start, "end": end, "words": g})
    for a, b in zip(res, res[1:]):
        a["end"] = min(a["end"], b["start"])
    return res


def clean_word(w):
    w = w.strip()
    w = re.sub(r"^[,.]+", "", w)
    return w


# ---------------------------------------------------------------- html bits

E = html.escape

FONTS = "font-family: Montserrat, 'Archivo Black', sans-serif;"
CSS_TOKENS = """
  --cream: #FFF3DF; --tomato: #E8402A; --mustard: #FFB81C; --cocoa: #2A1810;
  --leaf: #2F9E5B; --ink: #1B0F09; --white: #FFFFFF;
"""


def guard_js(js):
    """Skip tweens whose q('...') target is absent (optional kicker/sub lines) so GSAP never warns."""
    out = []
    for line in js.split("\n"):
        m = re.match(r"(\s*)tl\.\w+\((q\('[^']+'\))", line)
        out.append(f"{m.group(1)}{m.group(2)} && {line.strip()}" if m else line)
    return "\n".join(out)


def sub_comp(cid, w, h, css, body, js):
    js = guard_js(js)
    return f"""<!doctype html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <template>
      <style>
        #root {{ position: absolute; inset: 0; {CSS_TOKENS} {FONTS} }}
        {css}
      </style>
      <div id="root" data-composition-id="{cid}" data-width="{w}" data-height="{h}">
{body}
      </div>
      <script>
        (function () {{
          const tl = gsap.timeline({{ paused: true }});
          const q = (s) => document.querySelector('[data-composition-id="{cid}"] ' + s);
{js}
          window.__timelines["{cid}"] = tl;
        }})();
      </script>
    </template>
  </body>
</html>
"""


def badge_svg(kind):
    if kind == "tip":  # lightbulb
        return ('<svg viewBox="0 0 64 64" width="100%" height="100%"><circle cx="32" cy="26" r="16" fill="#FFB81C"/>'
                '<rect x="24" y="40" width="16" height="10" rx="3" fill="#2A1810"/><rect x="27" y="52" width="10" height="5" rx="2" fill="#2A1810"/>'
                '<path d="M26 26 q6 -8 12 0" stroke="#FFF3DF" stroke-width="3" fill="none" stroke-linecap="round"/></svg>')
    if kind == "pot":
        return ('<svg viewBox="0 0 64 64" width="100%" height="100%"><rect x="10" y="26" width="44" height="26" rx="8" fill="#E8402A"/>'
                '<rect x="6" y="20" width="52" height="8" rx="4" fill="#2A1810"/><rect x="28" y="12" width="8" height="8" rx="3" fill="#2A1810"/>'
                '<path d="M22 8 q-3 -5 0 -8 M32 6 q-3 -5 0 -8 M42 8 q-3 -5 0 -8" stroke="#FFB81C" stroke-width="3" fill="none" stroke-linecap="round"/></svg>')
    if kind == "burst":
        pts = []
        for i in range(24):
            r = 50 if i % 2 == 0 else 36
            a = math.pi * 2 * i / 24
            pts.append(f"{50 + r * math.cos(a):.1f},{50 + r * math.sin(a):.1f}")
        return f'<svg viewBox="0 0 100 100" width="100%" height="100%"><polygon points="{" ".join(pts)}" fill="#FFB81C" stroke="#2A1810" stroke-width="3"/></svg>'
    return ""


def ov_html(o, i, fmt, W, H):
    """Return (css, body, js) for an overlay sub-composition. Times are local to the overlay."""
    d = o["dur"]
    t = o["type"]
    out = max(d - 0.45, 0.5)
    V = fmt == "vertical"
    # landscape overlays live in the right-hand panel
    PX, PW = (0, W) if V else (720, 1120)

    if t == "hook":
        lines = o["text"]
        hl = o.get("highlight", "")
        words = []
        for wi, wd in enumerate(lines.split(" ")):
            cls = "hw hl" if hl and re.sub(r"\W", "", wd).lower() in [x.lower() for x in hl.split()] else "hw"
            words.append(f'<span class="{cls}">{E(wd)}</span>')
        top = o.get("y", 250 if V else 230)
        fs = o.get("size", 104 if V else 84)
        css = f"""
        .hook {{ position: absolute; left: {PX + 70}px; width: {PW - 140}px; top: {top}px; text-align: center; }}
        .kick {{ display: inline-block; background: var(--tomato); color: var(--cream); font-weight: 900; font-size: {40 if V else 34}px;
                 letter-spacing: 0.08em; padding: 12px 28px; border-radius: 999px; margin-bottom: 26px; text-transform: uppercase; }}
        .htext {{ font-family: 'Archivo Black', sans-serif; font-size: {fs}px; line-height: 1.02; color: var(--white);
                 letter-spacing: -0.02em; text-transform: uppercase; -webkit-text-stroke: 10px var(--cocoa); paint-order: stroke fill;
                 text-shadow: 0 10px 0 var(--cocoa); }}
        .hw {{ display: inline-block; margin: 0 0.12em; }}
        .hl {{ color: var(--mustard); }}"""
        body = f"""        <div class="hook">
          {'<div class="kick">' + E(o['kicker']) + '</div>' if o.get('kicker') else ''}
          <div class="htext">{''.join(words)}</div>
        </div>"""
        js = f"""          tl.fromTo(q('.kick'), {{ scale: 0.4, opacity: 0 }}, {{ scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2.5)' }}, 0);
          tl.fromTo(q('.htext').children, {{ y: 60, scale: 1.6, opacity: 0 }}, {{ y: 0, scale: 1, opacity: 1, duration: 0.28, ease: 'back.out(2)', stagger: 0.07 }}, 0.1);
          tl.to(q('.hook'), {{ opacity: 0, y: -40, duration: 0.3, ease: 'power2.in' }}, {out});"""
        return css, body, js

    if t in ("tip", "label", "fact"):
        icon = "tip" if t == "tip" else "pot"
        title = o.get("title", "TIP MASAK" if t == "tip" else "")
        top = o.get("y", 300 if V else 220)
        fs = o.get("size", 50 if V else 44)
        css = f"""
        .card {{ position: absolute; left: {PX + 60}px; width: {PW - 120}px; top: {top}px; background: var(--cream); border-radius: 34px;
                 border: 6px solid var(--cocoa); box-shadow: 0 14px 0 var(--cocoa); padding: 34px 40px 36px 150px; }}
        .icon {{ position: absolute; left: 26px; top: 28px; width: 100px; height: 100px; }}
        .ttl {{ display: inline-block; font-weight: 900; font-size: {30 if V else 28}px; letter-spacing: 0.1em; text-transform: uppercase;
                color: var(--cream); background: var(--tomato); padding: 8px 18px; border-radius: 999px; margin-bottom: 14px; }}
        .txt {{ font-weight: 800; font-size: {fs}px; line-height: 1.16; color: var(--ink); letter-spacing: -0.01em; }}
        .txt b {{ color: var(--tomato); font-weight: 900; }}"""
        txt = E(o["text"]).replace("[", "<b>").replace("]", "</b>")
        body = f"""        <div class="card">
          <div class="icon">{badge_svg(icon)}</div>
          {'<div class="ttl">' + E(title) + '</div>' if title else ''}
          <div class="txt">{txt}</div>
        </div>"""
        js = f"""          tl.fromTo(q('.card'), {{ x: -{W}, rotation: -4 }}, {{ x: 0, rotation: 0, duration: 0.5, ease: 'back.out(1.4)' }}, 0);
          tl.fromTo(q('.icon'), {{ scale: 0, rotation: -90 }}, {{ scale: 1, rotation: 0, duration: 0.4, ease: 'back.out(3)' }}, 0.3);
          tl.fromTo(q('.txt'), {{ opacity: 0, y: 16 }}, {{ opacity: 1, y: 0, duration: 0.3 }}, 0.4);
          tl.to(q('.icon'), {{ rotation: 8, duration: 0.5, yoyo: true, repeat: {max(1, int((out - 1) / 0.5))}, ease: 'sine.inOut' }}, 0.8);
          tl.to(q('.card'), {{ x: {W}, duration: 0.4, ease: 'power3.in' }}, {out});"""
        return css, body, js

    if t == "menu":
        num = o.get("num", "")
        apps = o.get("apps", [])
        top = o.get("y", 360 if V else 230)
        pills = "".join(f'<span class="pill p{k}">{E(a)}</span>' for k, a in enumerate(apps))
        css = f"""
        .menu {{ position: absolute; left: {PX + 60}px; width: {PW - 120}px; top: {top}px; text-align: center; }}
        .num {{ display: inline-block; font-family: 'Archivo Black', sans-serif; font-size: {44 if V else 40}px; color: var(--cocoa);
                background: var(--mustard); padding: 10px 34px; border-radius: 18px; border: 5px solid var(--cocoa); transform-origin: 50% 100%; }}
        .dish {{ margin-top: 22px; font-family: 'Archivo Black', sans-serif; font-size: {o.get('size', 112 if V else 96)}px; line-height: 0.98;
                 color: var(--cream); text-transform: uppercase; letter-spacing: -0.02em; -webkit-text-stroke: 12px var(--cocoa);
                 paint-order: stroke fill; text-shadow: 0 12px 0 var(--tomato); }}
        .pills {{ margin-top: 34px; }}
        .pill {{ display: inline-block; margin: 0 10px; font-weight: 900; font-size: {34 if V else 30}px; letter-spacing: 0.08em;
                 padding: 12px 26px; border-radius: 999px; border: 4px solid var(--cocoa); }}
        .p0 {{ background: var(--tomato); color: var(--cream); }}
        .p1 {{ background: var(--leaf); color: var(--cream); }}
        .p2 {{ background: var(--cream); color: var(--cocoa); }}"""
        body = f"""        <div class="menu">
          {'<div class="num">' + E(num) + '</div>' if num else ''}
          <div class="dish">{E(o['text'])}</div>
          <div class="pills">{pills}</div>
        </div>"""
        js = f"""          tl.fromTo(q('.num'), {{ scaleY: 0 }}, {{ scaleY: 1, duration: 0.3, ease: 'back.out(3)' }}, 0);
          tl.fromTo(q('.dish'), {{ scale: 2.2, opacity: 0, rotation: -6 }}, {{ scale: 1, opacity: 1, rotation: 0, duration: 0.4, ease: 'back.out(1.8)' }}, 0.15);
          tl.fromTo(q('.pills').children, {{ y: 50, opacity: 0 }}, {{ y: 0, opacity: 1, duration: 0.3, ease: 'back.out(2)', stagger: 0.12 }}, 0.5);
          tl.to(q('.menu'), {{ scale: 0.85, opacity: 0, duration: 0.35, ease: 'power2.in' }}, {out});"""
        return css, body, js

    if t == "joke":
        text = o.get("text", "HAHAHA")
        size = o.get("box", 430 if V else 380)
        x = o.get("x", (W - size) // 2 + (140 if V else 0) if V else PX + (PW - size) // 2)
        y = o.get("y", 560 if V else 220)
        css = f"""
        .stk {{ position: absolute; left: {x}px; top: {y}px; width: {size}px; height: {size}px; }}
        .burst {{ position: absolute; inset: 0; }}
        .jt {{ position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; text-align: center;
               font-family: 'Archivo Black', sans-serif; font-size: {o.get('size', 70 if V else 62)}px; line-height: 0.95; color: var(--tomato);
               -webkit-text-stroke: 6px var(--cocoa); paint-order: stroke fill; padding: 0 60px; text-transform: uppercase; }}"""
        body = f"""        <div class="stk">
          <div class="burst">{badge_svg('burst')}</div>
          <div class="jt">{E(text)}</div>
        </div>"""
        js = f"""          tl.fromTo(q('.stk'), {{ scale: 0, rotation: -25 }}, {{ scale: 1, rotation: -8, duration: 0.35, ease: 'back.out(3)' }}, 0);
          tl.to(q('.burst'), {{ rotation: 30, duration: {d}, ease: 'none' }}, 0);
          tl.to(q('.stk'), {{ scale: 1.08, duration: 0.18, yoyo: true, repeat: {max(1, int((out - 0.5) / 0.18)) // 2 * 2 + 1}, ease: 'sine.inOut' }}, 0.4);
          tl.to(q('.stk'), {{ scale: 0, rotation: 20, duration: 0.25, ease: 'back.in(2)' }}, {out + 0.1});"""
        return css, body, js

    if t == "lower":
        y = o.get("y", 1500 if V else 880)
        css = f"""
        .lt {{ position: absolute; left: {60 if V else 120}px; top: {y}px; }}
        .nm {{ display: inline-block; font-family: 'Archivo Black', sans-serif; font-size: {58 if V else 52}px; color: var(--cocoa);
               background: var(--mustard); padding: 12px 30px; border: 5px solid var(--cocoa); border-radius: 16px; }}
        .rl {{ display: block; width: fit-content; margin-top: 10px; margin-left: 24px; font-weight: 800; font-size: {34 if V else 30}px;
               color: var(--cream); background: var(--cocoa); padding: 8px 22px; border-radius: 12px; }}"""
        body = f"""        <div class="lt">
          <div class="nm">{E(o['name'])}</div>
          {'<div class="rl">' + E(o['role']) + '</div>' if o.get('role') else ''}
        </div>"""
        js = f"""          tl.fromTo(q('.nm'), {{ x: -700 }}, {{ x: 0, duration: 0.45, ease: 'power3.out' }}, 0);
          tl.fromTo(q('.rl'), {{ x: -700 }}, {{ x: 0, duration: 0.45, ease: 'power3.out' }}, 0.12);
          tl.to(q('.lt'), {{ x: -900, duration: 0.4, ease: 'power3.in' }}, {out});"""
        return css, body, js

    if t == "ingredients":
        items = o["items"]
        top = o.get("y", 260 if V else 200)
        fs = o.get("size", 44 if V else 34)
        css = f"""
        .ing {{ position: absolute; left: {PX + 60}px; width: {PW - 120}px; top: {top}px; background: var(--cream); border: 6px solid var(--cocoa);
                border-radius: 34px; box-shadow: 0 14px 0 var(--cocoa); padding: 30px 44px 34px; }}
        .ih {{ font-family: 'Archivo Black', sans-serif; font-size: {54 if V else 46}px; color: var(--tomato); margin-bottom: 14px; text-transform: uppercase; }}
        .it {{ display: flex; align-items: center; font-weight: 800; font-size: {fs}px; color: var(--ink); line-height: 1.25; margin: 8px 0; }}
        .ck {{ flex: 0 0 auto; width: {fs}px; height: {fs}px; border-radius: 10px; background: var(--leaf); margin-right: 20px; border: 4px solid var(--cocoa); }}"""
        lis = "".join(f'<div class="it"><span class="ck"></span><span>{E(x)}</span></div>' for x in items)
        body = f"""        <div class="ing">
          <div class="ih">{E(o.get('title', 'Bahan-bahan'))}</div>
          {lis}
        </div>"""
        js = f"""          tl.fromTo(q('.ing'), {{ y: -{H}, rotation: 3 }}, {{ y: 0, rotation: 0, duration: 0.5, ease: 'back.out(1.2)' }}, 0);
          tl.fromTo(q('.ing').querySelectorAll('.it'), {{ x: -60, opacity: 0 }}, {{ x: 0, opacity: 1, duration: 0.25, stagger: {min(0.35, 2.0 / max(1, len(items)))} }}, 0.45);
          tl.fromTo(q('.ing').querySelectorAll('.ck'), {{ scale: 0 }}, {{ scale: 1, duration: 0.2, ease: 'back.out(3)', stagger: {min(0.35, 2.0 / max(1, len(items)))} }}, 0.6);
          tl.to(q('.ing'), {{ y: {H}, duration: 0.45, ease: 'power3.in' }}, {out});"""
        return css, body, js

    if t == "chapter":
        top = o.get("y", 760 if V else 260)
        css = f"""
        .ch {{ position: absolute; left: {PX}px; width: {PW}px; top: {top}px; text-align: center; }}
        .band {{ display: inline-block; background: var(--tomato); padding: 24px 56px 28px; border: 6px solid var(--cocoa); border-radius: 24px;
                 box-shadow: 0 12px 0 var(--cocoa); transform-origin: 50% 50%; }}
        .cn {{ font-weight: 900; font-size: {32 if V else 30}px; letter-spacing: 0.14em; color: var(--cocoa); text-transform: uppercase; }}
        .ct {{ font-family: 'Archivo Black', sans-serif; font-size: {o.get('size', 82 if V else 74)}px; color: var(--cream); text-transform: uppercase; line-height: 1.02; }}"""
        body = f"""        <div class="ch"><div class="band">
          {'<div class="cn">' + E(o['kicker']) + '</div>' if o.get('kicker') else ''}
          <div class="ct">{E(o['text'])}</div>
        </div></div>"""
        js = f"""          tl.fromTo(q('.band'), {{ scaleX: 0 }}, {{ scaleX: 1, duration: 0.4, ease: 'power4.out' }}, 0);
          tl.fromTo(q('.ct'), {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.3 }}, 0.25);
          tl.fromTo(q('.cn'), {{ opacity: 0 }}, {{ opacity: 1, duration: 0.3 }}, 0.2);
          tl.to(q('.band'), {{ scaleX: 0, opacity: 0, duration: 0.35, ease: 'power3.in' }}, {out});"""
        return css, body, js

    if t == "reveal":  # "SIAP!" dish reveal with sparkles
        y = o.get("y", 380 if V else 260)
        css = f"""
        .rv {{ position: absolute; left: {PX}px; width: {PW}px; top: {y}px; text-align: center; }}
        .rt {{ display: inline-block; font-family: 'Archivo Black', sans-serif; font-size: {o.get('size', 150 if V else 120)}px; color: var(--mustard);
               -webkit-text-stroke: 14px var(--cocoa); paint-order: stroke fill; text-shadow: 0 14px 0 var(--tomato); text-transform: uppercase; }}
        .rs {{ display: block; margin-top: 16px; font-weight: 900; font-size: {44 if V else 40}px; color: var(--cream); }}
        .rs span {{ background: var(--cocoa); padding: 8px 22px; border-radius: 12px; }}
        .sp {{ position: absolute; width: 60px; height: 60px; }}"""
        sparks = "".join(
            f'<div class="sp" style="left:{PX + PW / 2 + 360 * math.cos(k * 1.3) - 30:.0f}px; top:{y + 110 + 170 * math.sin(k * 1.3) - 30:.0f}px">'
            f'<svg viewBox="0 0 20 20" width="60" height="60"><path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="#FFF3DF"/></svg></div>'
            for k in range(6))
        body = f"""        <div class="rv"><div class="rt">{E(o['text'])}</div>{'<span class="rs"><span>' + E(o['sub']) + '</span></span>' if o.get('sub') else ''}</div>
        {sparks}"""
        js = f"""          tl.fromTo(q('.rt'), {{ scale: 0, rotation: -12 }}, {{ scale: 1, rotation: -3, duration: 0.45, ease: 'back.out(2.6)' }}, 0);
          tl.fromTo(q('.rs'), {{ opacity: 0, y: 30 }}, {{ opacity: 1, y: 0, duration: 0.3 }}, 0.35);
          tl.fromTo(document.querySelectorAll('[data-composition-id="{{CID}}"] .sp'), {{ scale: 0, rotation: 0 }}, {{ scale: 1.2, rotation: 180, duration: 0.5, stagger: 0.07, ease: 'back.out(2)' }}, 0.2);
          tl.to(document.querySelectorAll('[data-composition-id="{{CID}}"] .sp'), {{ scale: 0, duration: 0.3, stagger: 0.05 }}, 1.4);
          tl.to(q('.rv'), {{ opacity: 0, scale: 0.8, duration: 0.3 }}, {out});"""
        return css, body, js

    if t == "now":  # persistent "sedang dimasak" card for the landscape panel
        apps = "".join(f'<span class="na n{k}">{E(a)}</span>' for k, a in enumerate(o.get("apps", [])))
        css = f"""
        .now {{ position: absolute; left: {PX + 40}px; width: {PW - 80}px; top: {o.get('y', 610)}px; height: 190px; border-radius: 28px;
                background: rgba(255,243,223,0.07); border: 3px solid rgba(255,243,223,0.18); padding: 24px 34px; }}
        .nk {{ font-weight: 900; font-size: 24px; letter-spacing: 0.14em; color: var(--mustard); text-transform: uppercase; }}
        .nt {{ margin-top: 6px; font-family: 'Archivo Black', sans-serif; font-size: 58px; line-height: 1; color: var(--cream); text-transform: uppercase; }}
        .nb {{ margin-top: 14px; }}
        .na {{ display: inline-block; margin-right: 10px; font-weight: 900; font-size: 22px; letter-spacing: 0.08em; padding: 6px 16px; border-radius: 999px; }}
        .n0 {{ background: var(--tomato); color: var(--cream); }}
        .n1 {{ background: var(--leaf); color: var(--cream); }}
        .n2 {{ background: var(--cream); color: var(--cocoa); }}"""
        body = f"""        <div class="now"><div class="nk">{E(o.get('kicker', 'Sedang dimasak'))}</div><div class="nt">{E(o['text'])}</div><div class="nb">{apps}</div></div>"""
        js = f"""          tl.fromTo(q('.now'), {{ x: 80, opacity: 0 }}, {{ x: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }}, 0.3);
          tl.to(q('.now'), {{ opacity: 0, duration: 0.3 }}, {max(d - 0.35, 0.6)});"""
        return css, body, js

    if t == "cta":
        css = f"""
        .cta {{ position: absolute; left: {PX + 60}px; width: {PW - 120}px; top: {o.get('y', 520 if V else 300)}px; text-align: center; }}
        .c1 {{ font-family: 'Archivo Black', sans-serif; font-size: {o.get('size', 84 if V else 72)}px; color: var(--cream); line-height: 1.02;
               -webkit-text-stroke: 10px var(--cocoa); paint-order: stroke fill; text-shadow: 0 10px 0 var(--tomato); text-transform: uppercase; }}
        .c2 {{ display: inline-block; margin-top: 30px; font-weight: 900; font-size: {44 if V else 38}px; color: var(--cocoa); background: var(--mustard);
               padding: 16px 36px; border-radius: 999px; border: 5px solid var(--cocoa); }}
        .c3 {{ margin-top: 22px; font-weight: 800; font-size: {36 if V else 32}px; color: var(--cream); }}
        .c3 span {{ background: var(--cocoa); padding: 6px 18px; border-radius: 10px; }}"""
        body = f"""        <div class="cta">
          <div class="c1">{E(o.get('text', 'Jumpa Selasa depan!'))}</div>
          <div class="c2">{E(o.get('button', 'FOLLOW + SHARE'))}</div>
          <div class="c3"><span>{E(o.get('sub', 'Tasty Tuesday · Live setiap Selasa'))}</span></div>
        </div>"""
        js = f"""          tl.fromTo(q('.c1'), {{ y: 80, opacity: 0 }}, {{ y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.8)' }}, 0);
          tl.fromTo(q('.c2'), {{ scale: 0 }}, {{ scale: 1, duration: 0.4, ease: 'back.out(3)' }}, 0.35);
          tl.to(q('.c2'), {{ scale: 1.08, duration: 0.35, yoyo: true, repeat: 5, ease: 'sine.inOut' }}, 0.9);
          tl.fromTo(q('.c3'), {{ opacity: 0 }}, {{ opacity: 1, duration: 0.4 }}, 0.6);"""
        return css, body, js

    raise ValueError(f"unknown overlay type {t}")


DEFAULT_SFX = {"hook": "impact-bass-1", "tip": "pop", "label": "pop", "fact": "pop", "menu": "whoosh",
               "joke": "boing", "lower": "whoosh-short", "ingredients": "pop", "chapter": "whoosh-cinematic",
               "reveal": "sparkle", "cta": "chime"}
SFX_VOL = {"impact-bass-1": 0.45, "impact-bass-2": 0.45, "pop": 0.55, "whoosh": 0.45, "whoosh-short": 0.4,
           "whoosh-cinematic": 0.4, "boing": 0.35, "sparkle": 0.45, "chime": 0.45, "ding": 0.35, "badumtss": 0.45,
           "click-soft": 0.5, "ping": 0.4, "riser": 0.3, "notification": 0.4}


# ---------------------------------------------------------------- gfx beats (full-frame cards)

def gfx_html(b, fmt, W, H):
    kind = b["gfx"]
    V = fmt == "vertical"
    if kind == "opening":  # supplied opening clip (vertical) shown full-frame over a blurred copy of itself
        css = """
        .obg { position: absolute; inset: 0; background: #EFE3CC; }
        #op-blur { position: absolute; inset: -80px; width: calc(100% + 160px); height: calc(100% + 160px); object-fit: cover; filter: blur(40px) brightness(0.95); }
        #op-main { position: absolute; top: 0; height: 100%; left: 50%; width: 608px; margin-left: -304px; object-fit: cover;
                   box-shadow: 0 0 80px rgba(42,24,16,0.35); }"""
        d = b["dur"]
        body = f"""        <div class="obg"></div>
        <video id="op-blur" class="clip" src="assets/opening.mp4" data-start="0" data-duration="{d:.3f}" data-media-start="0" data-track-index="0" muted playsinline></video>
        <video id="op-main" class="clip" src="assets/opening.mp4" data-start="0" data-duration="{d:.3f}" data-media-start="0" data-track-index="1" playsinline data-has-audio="true"></video>"""
        return css, body, ""
    if kind == "outro" and b.get("_logo"):  # branded end card: Tasty Tuesday logo + dish + follow
        l1, l2, l3 = b.get("l1", ""), b.get("l2", ""), b.get("l3", "FOLLOW + SHARE")
        css = f"""
        .bg {{ position: absolute; inset: 0; background: var(--cream); }}
        .dots {{ position: absolute; inset: -40px; background-image: radial-gradient(rgba(42,24,16,0.12) 3px, transparent 3.5px); background-size: 46px 46px; }}
        .ray {{ position: absolute; left: 50%; top: 560px; width: 1500px; height: 1500px; margin: -750px 0 0 -750px; border-radius: 50%;
                background: repeating-conic-gradient(rgba(255,184,28,0.22) 0deg 10deg, transparent 10deg 20deg); }}
        .logo {{ position: absolute; left: 50%; top: 170px; width: 780px; height: 780px; margin-left: -390px; border-radius: 50%;
                 box-shadow: 0 24px 60px rgba(42,24,16,0.25); }}
        .wrap {{ position: absolute; left: 60px; right: 60px; top: 1040px; text-align: center; }}
        .l1 {{ font-family: 'Archivo Black', sans-serif; font-size: 112px; line-height: 0.95; color: var(--tomato); -webkit-text-stroke: 10px var(--cocoa);
               paint-order: stroke fill; text-shadow: 0 10px 0 var(--cocoa); text-transform: uppercase; }}
        .l2 {{ margin-top: 26px; font-weight: 900; font-size: 44px; color: var(--cocoa); }}
        .l3 {{ display: inline-block; margin-top: 30px; font-weight: 900; font-size: 46px; letter-spacing: 0.1em; color: var(--cream);
               background: var(--cocoa); padding: 16px 40px; border-radius: 999px; }}"""
        body = f"""        <div class="bg"></div><div class="dots"></div><div class="ray" data-layout-allow-overflow></div>
        <img class="logo" src="assets/logo-round.png" alt="Tasty Tuesday" />
        <div class="wrap">{'<div class="l1">' + E(l1) + '</div>' if l1 else ''}{'<div class="l2">' + E(l2) + '</div>' if l2 else ''}<div><span class="l3">{E(l3)}</span></div></div>"""
        js = f"""          tl.fromTo(q('.ray'), {{ rotation: 0 }}, {{ rotation: 40, duration: {b['dur']}, ease: 'none' }}, 0);
          tl.fromTo(q('.logo'), {{ scale: 0.2, rotation: -30, opacity: 0 }}, {{ scale: 1, rotation: 0, opacity: 1, duration: 0.6, ease: 'back.out(1.7)' }}, 0.05);
          tl.to(q('.logo'), {{ scale: 1.04, duration: 0.4, yoyo: true, repeat: 1, ease: 'sine.inOut' }}, 1.6);
          tl.fromTo(q('.l1'), {{ y: 60, opacity: 0 }}, {{ y: 0, opacity: 1, duration: 0.4, ease: 'back.out(2)' }}, 0.45);
          tl.fromTo(q('.l2'), {{ opacity: 0 }}, {{ opacity: 1, duration: 0.3 }}, 0.7);
          tl.fromTo(q('.l3'), {{ scale: 0 }}, {{ scale: 1, duration: 0.35, ease: 'back.out(3)' }}, 0.9);"""
        return css, body, js
    if kind in ("intro", "outro", "title"):
        l1 = b.get("l1", "TASTY TUESDAY")
        l2 = b.get("l2", "Episod 3 · Better Together")
        l3 = b.get("l3", "COOVEN × THERMOMIX")
        css = f"""
        .bg {{ position: absolute; inset: 0; background: var(--tomato); }}
        .dots {{ position: absolute; inset: -40px; background-image: radial-gradient(var(--cocoa) 3px, transparent 3.5px);
                 background-size: 46px 46px; opacity: 0.18; }}
        .stripe {{ position: absolute; left: -10%; width: 120%; height: {H * 0.26:.0f}px; top: {H * 0.37:.0f}px; background: var(--mustard);
                   border-top: 10px solid var(--cocoa); border-bottom: 10px solid var(--cocoa); transform-origin: 50% 50%; }}
        .wrap {{ position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }}
        .l1 {{ font-family: 'Archivo Black', sans-serif; font-size: {150 if V else 170}px; line-height: 0.9; color: var(--cream);
               -webkit-text-stroke: 16px var(--cocoa); paint-order: stroke fill; text-shadow: 0 16px 0 var(--cocoa); letter-spacing: -0.02em; width: {W - 120}px; }}
        .l2 {{ margin-top: 40px; font-weight: 900; font-size: {44 if V else 56}px; color: var(--cream); text-shadow: 0 4px 0 var(--cocoa); }}
        .l3 {{ margin-top: 28px; display: inline-block; font-weight: 900; font-size: {44 if V else 42}px; letter-spacing: 0.12em; color: var(--cream);
               background: var(--cocoa); padding: 14px 34px; border-radius: 999px; }}"""
        body = f"""        <div class="bg"></div><div class="dots"></div><div class="stripe" data-layout-allow-overflow></div>
        <div class="wrap"><div class="l1">{E(l1)}</div><div class="l2">{E(l2)}</div><div><span class="l3">{E(l3)}</span></div></div>"""
        js = f"""          tl.fromTo(q('.bg'), {{ scale: 1.4 }}, {{ scale: 1, duration: 0.5, ease: 'power3.out' }}, 0);
          tl.fromTo(q('.stripe'), {{ scaleX: 0, rotation: -6 }}, {{ scaleX: 1, rotation: -6, duration: 0.5, ease: 'power4.out' }}, 0.1);
          tl.fromTo(q('.l1'), {{ scale: 2.5, opacity: 0 }}, {{ scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' }}, 0.25);
          tl.fromTo(q('.l2'), {{ y: 40, opacity: 0 }}, {{ y: 0, opacity: 1, duration: 0.35 }}, 0.6);
          tl.fromTo(q('.l3'), {{ scale: 0 }}, {{ scale: 1, duration: 0.35, ease: 'back.out(3)' }}, 0.85);
          tl.to(q('.dots'), {{ x: 46, y: 46, duration: {b['dur']}, ease: 'none' }}, 0);"""
        return css, body, js
    raise ValueError(kind)


# ---------------------------------------------------------------- stage (persistent frame / branding)

def stage_html(fmt, W, H, edl):
    if fmt == "vertical":
        css = """
        .bug { position: absolute; left: 40px; top: 70px; display: flex; align-items: center; gap: 12px; }
        .b1 { font-family: 'Archivo Black', sans-serif; font-size: 30px; color: var(--cream); background: var(--tomato); padding: 8px 18px;
              border-radius: 12px; border: 4px solid var(--cocoa); }
        .b2 { font-weight: 900; font-size: 26px; color: var(--cocoa); background: var(--mustard); padding: 8px 16px; border-radius: 12px; border: 4px solid var(--cocoa); }"""
        if edl.get("brand"):
            css += """
        .blogo { width: 132px; height: 132px; border-radius: 50%; box-shadow: 0 6px 18px rgba(0,0,0,0.35); }"""
            body = f"""        <div class="bug"><img class="blogo" src="assets/logo-round.png" alt="Tasty Tuesday" /><span class="b2">{E(edl.get('bug', 'EP 3'))}</span></div>"""
        else:
            body = f"""        <div class="bug"><span class="b1">TASTY TUESDAY</span><span class="b2">{E(edl.get('bug', 'EP 3'))}</span></div>"""
        js = """          tl.fromTo(q('.bug'), { x: -400 }, { x: 0, duration: 0.5, ease: 'power3.out' }, 0.3);"""
        return css, body, js
    css = """
        .bg { position: absolute; inset: 0; background: var(--cocoa); }
        .dots { position: absolute; inset: 0; background-image: radial-gradient(rgba(255,243,223,0.09) 3px, transparent 3.5px); background-size: 40px 40px; }
        .blob { position: absolute; width: 900px; height: 900px; left: -420px; bottom: -480px; border-radius: 50%; background: var(--tomato); opacity: 0.9; }
        .blob2 { position: absolute; width: 380px; height: 380px; right: 160px; top: -200px; border-radius: 50%; background: var(--mustard); opacity: 0.95; }
        .frame { position: absolute; left: 92px; top: 32px; width: 536px; height: 1016px; border-radius: 34px; border: 8px solid var(--mustard);
                 box-shadow: 0 0 0 8px var(--cocoa), 0 24px 60px rgba(0,0,0,0.5); }
        .hdr { position: absolute; left: 760px; top: 56px; }
        .h1 { font-family: 'Archivo Black', sans-serif; font-size: 64px; color: var(--cream); letter-spacing: -0.01em; line-height: 1; }
        .h2 { margin-top: 12px; display: flex; gap: 12px; }
        .h2 span { font-weight: 900; font-size: 26px; letter-spacing: 0.08em; padding: 8px 18px; border-radius: 999px; }
        .s1 { background: var(--mustard); color: var(--cocoa); }
        .s2 { background: var(--cream); color: var(--cocoa); }
        .live { position: absolute; left: 116px; top: 60px; font-weight: 900; font-size: 22px; letter-spacing: 0.12em; color: var(--cream);
                background: var(--tomato); padding: 6px 14px; border-radius: 8px; }"""
    body = f"""        <div class="bg"></div><div class="dots"></div><div class="blob" data-layout-allow-overflow></div><div class="blob2" data-layout-allow-overflow></div>
        <div class="frame"></div>
        <div class="hdr"><div class="h1">TASTY TUESDAY</div>
          <div class="h2"><span class="s1">EPISOD 3 · BETTER TOGETHER</span><span class="s2">COOVEN × THERMOMIX</span></div></div>"""
    js = """          tl.fromTo(q('.hdr'), { y: -200 }, { y: 0, duration: 0.6, ease: 'power3.out' }, 0);
          tl.fromTo(q('.blob'), { scale: 0.96 }, { scale: 1.04, duration: 6, yoyo: true, repeat: REPEATS, ease: 'sine.inOut' }, 0);""".replace("REPEATS", str(int(edl.get("_total", 60) / 6)))
    return css, body, js


def frame_overlay_html(fmt, W, H):
    """Live badge drawn over the footage in landscape (sits above the video)."""
    css = """
        .live { position: absolute; left: 124px; top: 64px; font-weight: 900; font-size: 22px; letter-spacing: 0.12em; color: var(--cream);
                background: var(--tomato); padding: 6px 14px; border-radius: 8px; border: 3px solid var(--cocoa); }"""
    body = """        <div class="live">● LIVE REPLAY</div>"""
    js = """          tl.fromTo(q('.live'), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0.5);"""
    return css, body, js


# ---------------------------------------------------------------- captions comp

def captions_html(groups, fmt, W, H, cid):
    V = fmt == "vertical"
    if V:
        css = """
        .cg { position: absolute; left: 60px; right: 60px; top: 1190px; text-align: center; opacity: 0; }
        .cw { display: inline-block; margin: 0 0.14em; font-weight: 900; font-size: 74px; line-height: 1.12; color: var(--white);
              -webkit-text-stroke: 12px var(--ink); paint-order: stroke fill; text-shadow: 0 6px 0 var(--ink); text-transform: uppercase; }
        .cw.on { color: var(--mustard); }"""
    else:
        css = """
        .cg { position: absolute; left: 760px; width: 1060px; top: 850px; height: 180px; display: flex; align-items: center; justify-content: flex-start;
              flex-wrap: wrap; align-content: center; opacity: 0; }
        .cw { display: inline-block; margin-right: 0.26em; font-weight: 800; font-size: 50px; line-height: 1.18; color: var(--cream); }
        .cw.on { color: var(--mustard); }"""
    body, js = [], []
    HL, BASE = "#FFB81C", ("#FFFFFF" if V else "#FFF3DF")
    for gi, g in enumerate(groups):
        spans = "".join(f'<span class="cw" id="{cid}-w{gi}-{wi}">{E(clean_word(w["w"]))}</span>' for wi, w in enumerate(g["words"]))
        body.append(f'        <div class="cg" id="{cid}-g{gi}">{spans}</div>')
        js.append(f"          tl.set('#{cid}-g{gi}', {{ opacity: 1 }}, {g['start']:.3f});")
        if V:
            js.append(f"          tl.fromTo('#{cid}-g{gi}', {{ scale: 0.86 }}, {{ scale: 1, duration: 0.12, ease: 'back.out(3)' }}, {g['start']:.3f});")
        for wi, w in enumerate(g["words"]):
            js.append(f"          tl.set('#{cid}-w{gi}-{wi}', {{ color: '{HL}' }}, {w['s']:.3f});")
            nxt = g["words"][wi + 1]["s"] if wi + 1 < len(g["words"]) else g["end"]
            js.append(f"          tl.set('#{cid}-w{gi}-{wi}', {{ color: '{BASE}' }}, {max(nxt, w['s'] + 0.04):.3f});")
        js.append(f"          tl.set('#{cid}-g{gi}', {{ opacity: 0 }}, {g['end']:.3f});")
    return css, "\n".join(body), "\n".join(js)


# ---------------------------------------------------------------- srt

def srt_time(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def write_srt(path, groups):
    with open(path, "w") as f:
        for i, g in enumerate(groups, 1):
            f.write(f"{i}\n{srt_time(g['start'])} --> {srt_time(g['end'])}\n{' '.join(clean_word(w['w']) for w in g['words'])}\n\n")


# ---------------------------------------------------------------- main

def build(edl_path):
    edl = json.load(open(edl_path))
    vid = edl["id"]
    fmt = edl.get("format", "vertical")
    W, H = (1080, 1920) if fmt == "vertical" else (1920, 1080)
    words, phrases = load_words()
    clips, beats, total = build_clips(edl, words)

    pdir = os.path.join(ROOT, "videos", vid)
    if os.path.isdir(os.path.join(pdir, "compositions")):
        shutil.rmtree(os.path.join(pdir, "compositions"))
    os.makedirs(os.path.join(pdir, "compositions"), exist_ok=True)
    os.makedirs(os.path.join(pdir, "assets", "sfx"), exist_ok=True)
    shutil.copy(os.path.join(ROOT, "shared", "gsap.min.js"), os.path.join(pdir, "assets", "gsap.min.js"))
    src_link = os.path.join(pdir, "assets", "source.mp4")
    if not os.path.lexists(src_link):
        os.symlink(SOURCE, src_link)

    used_sfx = set()
    comps = []  # (cid, start, dur, track, kind, html)
    audio = []  # (id, file, start, dur, vol, extra)

    # stage
    sc = "stage"
    edl["_total"] = total
    css, body, js = stage_html(fmt, W, H, edl)
    comps.append((sc, 0, total, 1, "graphics", sub_comp(sc, W, H, css, body, js)))

    # b-roll: muted cutaways laid over the talking footage (the speaker's audio keeps playing)
    brolls = []
    for i, o in enumerate(edl.get("overlays", [])):
        if o["type"] != "broll":
            continue
        st = src_to_out(clips, o["at"]) if "at" in o else o["out_at"]
        if st is None:
            continue
        brolls.append({"id": f"b{i:02d}", "start": frame(st), "dur": min(o["dur"], total - st), "src": o["src_in"]})

    # overlays
    for i, o in enumerate(edl.get("overlays", [])):
        if o["type"] == "broll":
            continue
        if "out_at" in o:
            st = o["out_at"] if o["out_at"] >= 0 else total + o["out_at"]
        else:
            st = src_to_out(clips, o["at"])
            if st is None:
                print(f"  ! overlay {i} ({o['type']}) at {o['at']} is outside the cut, skipped")
                continue
        st = frame(st)
        if "until" in o:
            en = src_to_out(clips, o["until"]) if o["until"] >= 0 else total + o["until"]
            o = {**o, "dur": (en or total) - st}
        dur = min(o.get("dur", 4), total - st)
        o = {**o, "dur": dur}
        cid = f"ov{i:02d}-{o['type']}"
        css, body, js = ov_html(o, i, fmt, W, H)
        js = js.replace("{CID}", cid)
        comps.append((cid, st, dur, 1 if o["type"] == "now" else 3, "graphics", sub_comp(cid, W, H, css, body, js)))
        sfx = o.get("sfx", DEFAULT_SFX.get(o["type"]))
        if sfx:  # "" = silent
            for k, s in enumerate(sfx.split("+")):
                used_sfx.add(s)
                audio.append((f"sfx-{i:02d}-{k}", f"assets/sfx/{s}.mp3", max(0, st + o.get("sfx_offset", 0)), None, SFX_VOL.get(s, 0.4), ""))
        if o.get("punch"):
            o["_start"] = st
    # gfx beats
    brand = edl.get("brand") or {}
    for k, b in enumerate(beats):
        cid = f"gfx{k:02d}-{b['gfx']}"
        b = {**b, "_logo": bool(brand.get("logo"))}
        css, body, js = gfx_html(b, fmt, W, H)
        comps.append((cid, b["start"], b["dur"], 4, "graphics", sub_comp(cid, W, H, css, body, js)))
        sfx = b.get("sfx", "impact-bass-2")
        if b["gfx"] == "outro" and brand.get("song"):
            sfx = ""  # the Tasty Tuesday jingle carries the end card
        for s in [x for x in sfx.split("+") if x]:
            used_sfx.add(s)
            audio.append((f"gfx-sfx-{k}-{s}", f"assets/sfx/{s}.mp3", b["start"] + (0.2 if s.startswith("impact") else 0), None, SFX_VOL.get(s, 0.45), ""))

    # captions
    groups = caption_groups(clips, words, phrases, fmt)
    write_srt(os.path.join(pdir, f"{vid}.srt"), groups)
    cap_mode = edl.get("captions", "karaoke" if fmt == "vertical" else "panel")
    if cap_mode != "none":
        # one caption track, split into ~40-group chunks so each file stays small
        CH = 24
        for k in range(0, len(groups), CH):
            chunk = groups[k:k + CH]
            c0 = 0 if k == 0 else frame(chunk[0]["start"] - 0.05)
            c1 = total if k + CH >= len(groups) else frame(groups[k + CH]["start"] - 0.05)
            local = [{**g, "start": g["start"] - c0, "end": g["end"] - c0,
                      "words": [{**w, "s": w["s"] - c0, "e": w["e"] - c0} for w in g["words"]]} for g in chunk]
            cid = f"captions-{k // CH:02d}"
            css, body, js = captions_html(local, fmt, W, H, cid)
            comps.append((cid, c0, c1 - c0, 2, "captions", sub_comp(cid, W, H, css, body, js)))

    if fmt == "landscape":
        css, body, js = frame_overlay_html(fmt, W, H)
        comps.append(("framebadge", 0, total, 5, "graphics", sub_comp("framebadge", W, H, css, body, js)))

    # brand assets
    for name, flag in (("logo-round.png", "logo"), ("tasty-tuesday-song.mp3", "song")):
        if brand.get(flag):
            shutil.copy(os.path.join(ROOT, "shared", "brand", name), os.path.join(pdir, "assets", name))
    if any(b["gfx"] == "opening" for b in beats):
        shutil.copy(os.path.join(ROOT, "shared", "brand", "youtube-opening.mp4"), os.path.join(pdir, "assets", "opening.mp4"))

    # music bed
    bgm = edl.get("bgm")
    if brand.get("song"):
        # Tasty Tuesday song: instrumental section (4.4-17.4 s) looped quietly under the talk,
        # then the sung "Tasty Tuesday!" hook (3.2 s into the song) lands 1.6 s into the end card.
        song = "assets/tasty-tuesday-song.mp3"
        outro = next((b for b in beats if b["gfx"] == "outro"), None)
        bed_end = outro["start"] if outro else total
        t0, n, LOOP = 0.0, 0, 13.0
        while t0 < bed_end - 0.5:
            d = min(LOOP, bed_end - t0)
            audio.append((f"bgm-song-{n}", song, t0, d, (bgm or {}).get("volume", 0.07),
                          f' data-media-start="4.4" data-fade-in="{0.8 if n == 0 else 0.3}" data-fade-out="{0.6 if t0 + d >= bed_end - 0.01 else 0.3}"'))
            t0 += d; n += 1
        if outro:
            audio.append(("jingle", song, outro["start"], outro["dur"], 0.9,
                          f' data-media-start="1.6" data-fade-out="0.5"'))
    elif bgm:
        used_sfx.add("bgm-kitchen")
        ranges = bgm.get("ranges", [[0, total]])
        for ri, (r0, r1) in enumerate(ranges):
            r0 = r0 if r0 >= 0 else total + r0
            r1 = r1 if r1 >= 0 else total + r1
            t0, n = r0, 0
            while t0 < r1 - 0.5:
                d = min(80.0, r1 - t0)
                fade_in = 1.5 if t0 == r0 else 0
                fade_out = 2.0 if t0 + d >= r1 - 0.01 else 0
                audio.append((f"bgm-{ri}-{n}", "assets/sfx/bgm-kitchen.mp3", t0, d, bgm.get("volume", 0.08),
                              f' data-fade-in="{fade_in}" data-fade-out="{fade_out}"'))
                t0 += d; n += 1

    for s in used_sfx:
        shutil.copy(os.path.join(ROOT, "shared", "sfx", f"{s}.mp3"), os.path.join(pdir, "assets", "sfx", f"{s}.mp3"))

    # write sub comps
    for cid, st, dur, tr, kind, src in comps:
        with open(os.path.join(pdir, "compositions", f"{cid}.html"), "w") as f:
            f.write(src)

    # ---- index.html
    if fmt == "vertical":
        cam_css = "#cam { position: absolute; inset: 0; overflow: hidden; z-index: 1; }"
    else:
        cam_css = ("#cam { position: absolute; left: 100px; top: 40px; width: 520px; height: 1000px; overflow: hidden; border-radius: 28px; z-index: 1; "
                   "background: #000; }")
    # All cuts are pre-joined into assets/edit.mp4 (frame/sample exact), so the page holds one <video>
    # per continuous run between graphic beats instead of hundreds of elements on the 1.6 GB source.
    prerender_cuts(clips, pdir, light=bool(edl.get("light")), bake=bool(edl.get("grade_bake")))
    grade_attr = (f" data-color-grading='{json.dumps(edl['grade'])}'"
                  if edl.get("grade") and not edl.get("grade_bake") else "")
    vids, run, off = [], [], 0.0
    for c in clips + [None]:
        if run and (c is None or abs(c["start"] - (run[-1]["start"] + run[-1]["out"] - run[-1]["in"])) > 0.02):
            st = run[0]["start"]
            dur = run[-1]["start"] + run[-1]["out"] - run[-1]["in"] - st
            vids.append(
                f'          <video id="run{len(vids):02d}" class="clip" src="assets/edit.mp4" data-start="{st:.3f}" '
                f'data-duration="{dur:.3f}" data-media-start="{off:.3f}" data-track-index="0" '
                f'playsinline data-has-audio="true"{grade_attr}></video>')
            off += dur
            run = []
        if c is not None:
            run.append(c)
    bvids = [
        f'        <video id="{b["id"]}" class="clip" src="assets/source.mp4" data-start="{b["start"]:.3f}" '
        f'data-duration="{b["dur"]:.3f}" data-media-start="{b["src"]:.3f}" data-track-index="1" muted playsinline{grade_attr}></video>'
        for b in brolls]
    hosts = []
    for cid, st, dur, tr, kind, _ in sorted(comps, key=lambda c: (c[3], c[1])):
        z = (0 if fmt == "landscape" else 3) if cid == "stage" else (4 if cid == "framebadge" else 2 + tr)
        hosts.append(
            f'      <div id="{cid}" data-composition-id="{cid}" data-composition-src="compositions/{cid}.html" '
            f'data-start="{st:.3f}" data-duration="{dur:.3f}" data-track-index="{tr}" data-track-kind="{kind}" '
            f'data-width="{W}" data-height="{H}" style="position:absolute;inset:0;z-index:{z}"></div>')
    auds = []
    lanes = {}  # track -> end time, so overlapping sfx land on separate lanes
    for aid, f, st, dur, v, extra in sorted(audio, key=lambda a: a[2]):
        dur = dur or min(audio_len(os.path.join(pdir, f)), total - st)
        pool = [6] if aid.startswith("bgm") else [5, 7, 8, 9, 10, 11]
        tr = next((t for t in pool if lanes.get(t, -1) <= st), pool[-1])
        lanes[tr] = st + dur
        auds.append(f'      <audio id="{aid}" src="{f}" data-start="{st:.3f}" data-duration="{dur:.3f}" data-track-index="{tr}" data-volume="{v}"{extra}></audio>')

    # camera zoom per clip (jump-cut punch) + joke punch-ins
    cam_js = []
    for k, c in enumerate(clips):
        cam_js.append(f"      tl.set('#zoom', {{ scale: {c['zoom']:.3f}, transformOrigin: '{c['origin']}' }}, {c['start']:.3f});")
    for o in edl.get("overlays", []):
        if o.get("punch") and "_start" in o:
            s, d = o["_start"], o["dur"]
            cam_js.append(f"      tl.fromTo('#punch', {{ scale: 1 }}, {{ scale: {o['punch']}, duration: 0.18, ease: 'power3.out' }}, {s:.3f});")
            cam_js.append(f"      tl.to('#punch', {{ scale: 1, duration: 0.3, ease: 'power2.inOut' }}, {s + d - 0.3:.3f});")

    index = f"""<!doctype html>
<html lang="ms" data-resolution="{'portrait' if fmt == 'vertical' else 'landscape'}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={W}, height={H}" />
    <title>{E(edl.get('title', vid))}</title>
    <script src="assets/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: {W}px; height: {H}px; overflow: hidden; background: #2A1810; }}
      #root {{ width: 100%; height: 100%; position: relative; overflow: hidden; }}
      {cam_css}
      #punch, #zoom {{ position: absolute; inset: 0; }}
      #cam video {{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total:.3f}" data-width="{W}" data-height="{H}">
      <div id="cam">
        <div id="punch"><div id="zoom">
{chr(10).join(vids)}
        </div></div>
{chr(10).join(bvids)}
      </div>
{chr(10).join(hosts)}
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
    with open(os.path.join(pdir, "index.html"), "w") as f:
        f.write(index)
    for name, content in [
        ("hyperframes.json", {"$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
                              "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
                              "paths": {"blocks": "compositions", "components": "compositions/components", "assets": "assets"},
                              "media": {"autoProxy": True}}),
        ("package.json", {"name": f"tt-ep03-{vid}", "private": True, "type": "module",
                          "scripts": {"dev": "npx --yes hyperframes@0.8.181 preview",
                                      "check": "npx --yes hyperframes@0.8.181 check",
                                      "render": "npx --yes hyperframes@0.8.181 render"}}),
        ("meta.json", {"id": f"tt-ep03-{vid}", "name": edl.get("title", vid)}),
    ]:
        with open(os.path.join(pdir, name), "w") as f:
            json.dump(content, f, indent=2)
            f.write("\n")
    # cut list for humans
    with open(os.path.join(pdir, "CUTLIST.md"), "w") as f:
        f.write(f"# {edl.get('title', vid)}\n\nDuration: {total:.1f}s ({total / 60:.1f} min), {len(clips)} clips\n\n| # | out start | source in | source out | len |\n|---|---|---|---|---|\n")
        for k, c in enumerate(clips):
            f.write(f"| {k} | {c['start']:.2f} | {c['in']:.2f} | {c['out']:.2f} | {c['out'] - c['in']:.2f} |\n")
    print(f"built {vid}: {total:.1f}s ({total / 60:.2f} min), {len(clips)} clips, {len(comps)} comps, {len(groups)} caption groups")
    return pdir


if __name__ == "__main__":
    for p in sys.argv[1:]:
        build(p)
