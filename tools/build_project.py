#!/usr/bin/env python3
"""Build a HyperFrames project for one short from an EDL and the source footage.

    python3 tools/build_project.py edits/01-ikan-parang [--src /path/VID.mp4] [--no-media]

The EDL (edl.json) lists source ranges in seconds. This script:
  * cuts the ranges into assets/selects.mp4 (upscaled 1080x2160, GOP 1 s,
    voice cleaned and loudness-normalised) - the only re-encode of the footage,
  * writes index.html with one <video> clip per range (jump cuts + punch-ins),
  * writes compositions/captions.html (karaoke captions from the transcript) and
    compositions/overlays.html (hook, tip cards, joke punches, end card),
  * places sound effects and the music bed.
Colour grading is applied afterwards with `hyperframes media-treatment`
(see tools/grade.sh) so it stays editable in Studio.
"""
import argparse
import html
import json
import os
import re
import shutil
import subprocess
import sys

FPS = 30
W, H = 1080, 1920
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRANSCRIPT = os.path.join(ROOT, "edits", "transcript.json")
VAD = os.path.join(ROOT, "edits", "vad.json")  # Silero speech spans of the source
SFX_DIR = "/opt/node22/lib/node_modules/hyperframes/dist/skills/media-use/audio/assets/sfx"
DEFAULT_SRC = "/home/user/src_video/VID.mp4"
GSAP_SRC = os.path.join(ROOT, "assets", "vendor", "gsap.min.js")  # gsap@3.14.2, vendored: renders run offline

# Brand: warm cream, ink, turmeric (masak lemak) and chilli.
INK = "#17130F"
CREAM = "#FFF6E6"
TURMERIC = "#FFC23D"
CHILLI = "#E8452C"
LEAF = "#5FA36A"

# Where each sound effect peaks after its start (from `hyperframes audio`).
SFX_HIT = {"pop": 0.11, "whoosh": 0.065, "whoosh-short": 0.065, "click-soft": 0.045,
           "sparkle": 0.02, "impact-bass-1": 0.045, "whoosh-cinematic": 0.9, "ping": 0.02}
SFX_LEN = {"pop": 0.72, "whoosh": 0.574, "whoosh-short": 0.574, "click-soft": 0.365, "sparkle": 1.8,
           "impact-bass-1": 2.11, "whoosh-cinematic": 5.54, "ping": 1.32}
SFX_VOL = {"pop": 0.7, "whoosh": 0.35, "whoosh-short": 0.3, "click-soft": 0.8,
           "sparkle": 0.22, "impact-bass-1": 0.18, "whoosh-cinematic": 0.3, "ping": 0.35}


def fr(t):
    return round(t * FPS) / FPS


def span(t0, t1):
    """data-start/data-duration strings whose sum is exactly the next clip's start."""
    a, b = round(t0 * 1000), round(t1 * 1000)
    return f"{a / 1000:.3f}", f"{(b - a) / 1000:.3f}"


def esc(s):
    return html.escape(s, quote=True)


# ---------------------------------------------------------------- timeline

def tighten(a0, a1, vad, mids, gap=0.5):
    """Split a range at pauses longer than `gap` and trim dead air at its ends.
    A pause only counts when the VAD hears nothing and no transcript word lies wholly inside it."""
    speech = [(max(a0, x), min(a1, y)) for x, y in vad if y > a0 and x < a1]
    if not speech:
        return [(a0, a1)]
    quiet = lambda x, y: not any(x < ws and we < y for ws, we in mids)
    cuts, lo = [], a0
    if speech[0][0] - a0 > 0.4 and quiet(a0, speech[0][0] - 0.1):
        lo = speech[0][0] - 0.12
    for (x0, x1), (y0, y1) in zip(speech, speech[1:]):
        if y0 - x1 > gap and quiet(x1 + 0.1, y0 - 0.1):
            cuts.append((lo, x1 + 0.12))
            lo = y0 - 0.1
    hi = a1
    if a1 - speech[-1][1] > 0.45 and quiet(speech[-1][1] + 0.1, a1):
        hi = speech[-1][1] + 0.18
    cuts.append((lo, hi))
    return [(x, y) for x, y in cuts if y - x > 0.25]


def plan(edl, vad, words):
    """Lay the EDL out end to end. Each segment becomes one or more clips
    (pauses inside it are cut out). Returns segments, clips, the pieces that
    make up selects.mp4 and the video length."""
    mids = words
    segs, clips, t = [], [], 0.0
    zoom_toggle = False
    for i, seg in enumerate(edl["segments"]):
        lcut = "audio" in seg  # L-cut: picture from s, sound from another range
        a0, a1 = seg["audio"] if lcut else (seg["s"], seg["e"])
        v_off = seg["s"] - a0
        ranges = [(a0, a1)] if seg.get("tight") is False else tighten(a0, a1, vad, mids)
        s = dict(seg, idx=i, a0=a0, a1=a1, start=fr(t), clips=[])
        for b0, b1 in ranges:
            zoom = seg.get("zoom")
            if zoom is None:
                zoom = 1.1 if zoom_toggle else 1.0
                zoom_toggle = not zoom_toggle
            c = dict(idx=len(clips), seg=i, a0=b0, dur=fr(b1 - b0), v0=b0 + v_off, lcut=lcut,
                     start=fr(t), zoom=zoom, ox=seg.get("ox", 50), oy=seg.get("oy", 46),
                     warm=seg.get("warm", 1930 <= b0 + v_off <= 3010))
            clips.append(c)
            s["clips"].append(c)
            t += c["dur"]
        s["dur"] = fr(t - s["start"])
        segs.append(s)
    pieces, off = [], 0.0
    for c in clips:
        c["vmedia"] = fr(off)
        pieces.append((c["v0"], c["dur"]))
        off += c["dur"]
        if c["lcut"]:
            c["amedia"] = fr(off)
            pieces.append((c["a0"], c["dur"]))
            off += c["dur"]
    return segs, clips, pieces, fr(t)


def build_selects(pieces, src, out_dir):
    """One ffmpeg pass: seek each range, upscale, clean voice, concat."""
    args = ["ffmpeg", "-v", "error", "-y"]
    for s, d in pieces:
        args += ["-ss", f"{s:.3f}", "-t", f"{d:.4f}", "-i", src]
    fc = []
    for k, (_, d) in enumerate(pieces):
        fc.append(f"[{k}:v]fps={FPS},scale=1080:2160:flags=lanczos,unsharp=5:5:0.6:5:5:0.0,"
                  f"trim=duration={d:.4f},setpts=PTS-STARTPTS[v{k}]")
        fc.append(f"[{k}:a]aresample=48000,atrim=duration={d:.4f},apad=whole_dur={d:.4f},"
                  f"asetpts=PTS-STARTPTS[a{k}]")
    fc.append("".join(f"[v{k}][a{k}]" for k in range(len(pieces))) +
              f"concat=n={len(pieces)}:v=1:a=1[vc][ac]")
    fc.append("[ac]highpass=f=80,afftdn=nf=-28,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120,"
              "loudnorm=I=-16:TP=-1.5:LRA=9,aresample=48000[ao]")
    out = os.path.join(out_dir, "assets", "selects.mp4")
    args += ["-filter_complex", ";".join(fc), "-map", "[vc]", "-map", "[ao]",
             "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-g", str(FPS),
             "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709",
             "-colorspace", "bt709", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", out]
    subprocess.run(args, check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", out, "-vn", "-c:a", "copy",
                    os.path.join(out_dir, "assets", "selects-audio.m4a")], check=True)


# ---------------------------------------------------------------- captions

def load_words():  # (start, end) of every transcript word
    words = []
    for seg in json.load(open(TRANSCRIPT)):
        for w in seg["words"]:
            words.append((w["s"], w["e"]))
    return words


def align(seg, words):
    """Caption words for one segment with their source times."""
    cap = seg.get("cap", "").split()
    if not cap:
        return []
    a0, a1 = seg["a0"], seg["a1"]
    found = [(s, e) for s, e in words if s >= a0 - 0.08 and s < a1 - 0.05]
    if len(found) == len(cap):
        times = found
    else:
        lo = found[0][0] if found else a0 + 0.05
        hi = found[-1][1] if found else a1 - 0.05
        weights = [len(re.sub(r"\W", "", c)) + 1 for c in cap]
        total, acc, times = sum(weights), 0, []
        for wt in weights:
            s = lo + (hi - lo) * acc / total
            acc += wt
            times.append((s, lo + (hi - lo) * acc / total))
    return [(c, max(a0, min(s, a1 - 0.05)), max(min(s, a1 - 0.05) + 0.08, min(e, a1)))
            for c, (s, e) in zip(cap, times)]


def to_out(seg, t):
    """Source time -> output time through the segment's clips."""
    for c in seg["clips"]:
        if t < c["a0"] + c["dur"]:
            return c["start"] + max(0.0, t - c["a0"])
    last = seg["clips"][-1]
    return last["start"] + last["dur"]


def group(words, seg_end, max_words=4):
    groups, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        nxt = words[i + 1] if i + 1 < len(words) else None
        brk = (len(cur) >= max_words or re.search(r"[.,!?]$", w[0]) or nxt is None
               or nxt[1] - w[2] > 0.35 or sum(len(x[0]) for x in cur) > 17)
        if brk:
            groups.append(cur)
            cur = []
    timed = []
    for k, g in enumerate(groups):
        start = max(0.0, g[0][1] - 0.06)
        end = g[-1][2] + 0.25
        if k + 1 < len(groups):
            end = min(end, groups[k + 1][0][1] - 0.06)
        end = min(end, seg_end)
        end = max(end, start + 0.4)
        timed.append((start, end, g))
    return timed


def captions_html(segs, words, total, cid, stop_at):
    all_groups = []
    for seg in segs:
        if seg.get("nocap"):
            continue
        ws = [(w, to_out(seg, a), to_out(seg, b)) for w, a, b in align(seg, words)]
        all_groups += group(ws, seg["start"] + seg["dur"])
    # never overlap: one group on screen at a time
    clean = []
    for k, (s, e, g) in enumerate(all_groups):
        if k + 1 < len(all_groups):
            e = min(e, all_groups[k + 1][0])
        if s >= stop_at:
            continue
        e = min(e, stop_at)
        clean.append((fr(s), fr(e), g))
    hl = []
    tl = []
    for k, (s, e, g) in enumerate(clean):
        spans = []
        for j, (w, ws_, we) in enumerate(g):
            wid = f"cw{k}-{j}"
            spans.append(f'<span class="w" id="{wid}">{esc(w)}</span>')
            tl.append(f'tl.set("#{wid}", {{ color: "{TURMERIC}", scale: 1.06 }}, {max(s, ws_):.3f});')
            nxt = g[j + 1][1] if j + 1 < len(g) else e
            if j + 1 < len(g):
                tl.append(f'tl.set("#{wid}", {{ color: "#FFFFFF", scale: 1 }}, {nxt:.3f});')
        hl.append(f'      <div class="cg" id="cg{k}"><div class="cg-in">{" ".join(spans)}</div></div>')
        tl.append(f'tl.fromTo("#cg{k}", {{ opacity: 0, y: 18, scale: 0.96 }}, '
                  f'{{ opacity: 1, y: 0, scale: 1, duration: 0.16, ease: "power3.out" }}, {s:.3f});')
        tl.append(f'tl.to("#cg{k}", {{ opacity: 0, duration: 0.08, ease: "power2.in" }}, {max(s + 0.2, e - 0.08):.3f});')
        tl.append(f'tl.set("#cg{k}", {{ visibility: "hidden" }}, {e:.3f});')
    return f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    .cg {{
      position: absolute; left: 0; right: 0; top: 1210px;
      display: flex; justify-content: center; opacity: 0; overflow: visible;
    }}
    .cg-in {{
      max-width: 900px; text-align: center; line-height: 1.12;
      font-family: "Poppins", sans-serif; font-weight: 800; font-size: 66px;
      color: #FFFFFF; letter-spacing: -0.01em; text-transform: uppercase;
      -webkit-text-stroke: 10px rgba(16, 12, 8, 0.92); paint-order: stroke fill;
      text-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
    }}
    .w {{ display: inline-block; margin: 0 0.13em; transform-origin: 50% 70%; }}
  </style>
  <div id="root" data-composition-id="{cid}" data-width="{W}" data-height="{H}">
{chr(10).join(hl)}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    {chr(10) + "    ".join(tl)}
    window.__timelines["{cid}"] = tl;
  </script>
</template>
"""


# ---------------------------------------------------------------- overlays

def seg_time(segs, ref):
    """ref -> output seconds. ref is [segment index, seconds into it] or
    {"src": source seconds}, which follows the word through the cuts."""
    if isinstance(ref, dict):
        t = ref["src"]
        for seg in segs:
            if seg["a0"] - 0.05 <= t <= seg["a1"] + 0.05:
                return fr(to_out(seg, t))
        raise ValueError(f"source time {t} is not in any segment")
    i, off = ref
    return fr(segs[i]["start"] + min(off, max(0.0, segs[i]["dur"] - 0.2)))


def overlays_html(edl, segs, total, cid, sfx):
    items, tl = [], []
    end_card = None
    # cards and chips share the top band with the hook title: they wait for it
    hook_end = max((seg_time(segs, o["at"]) + o.get("dur", 2.5) for o in edl.get("overlays", [])
                    if o["type"] == "hook"), default=0.0)
    end_t0 = total
    timed = []
    for n, ov in enumerate(edl.get("overlays", [])):
        if ov["type"] == "end":
            end_card = (ov, f"end{n}")
            end_t0 = fr(total - ov.get("dur", 3.0))
            continue
        t0 = seg_time(segs, ov["at"])
        t1 = fr(min(t0 + ov.get("dur", 2.5), total))
        if ov["type"] in ("card", "chip") and t0 < hook_end:
            t0 = fr(hook_end + 0.1)
            t1 = max(t1, fr(t0 + 1.8))
        timed.append([n, ov, t0, t1])
    # one card (top band) and one punch (centre) at a time; nothing over the end card
    for band in (("card", "chip"), ("punch",)):
        same = sorted((x for x in timed if x[1]["type"] in band), key=lambda x: x[2])
        for a, b in zip(same, same[1:]):
            a[3] = min(a[3], fr(b[2] - 0.05))
    for x in timed:
        x[3] = min(x[3], end_t0)
    for n, ov, t0, t1 in timed:
        kind = ov["type"]
        oid = f"{kind}{n}"
        if t1 - t0 < 0.5:
            continue
        if kind == "hook":
            words = ov["title"].split()
            spans = " ".join(f'<span class="hw" id="{oid}-w{j}">{esc(w)}</span>' for j, w in enumerate(words))
            accent = ov.get("accent")
            if accent is not None:
                spans = spans.replace(f'id="{oid}-w{accent}"', f'id="{oid}-w{accent}" data-accent="1"')
            items.append(f'''    <div class="clip ov" id="{oid}" data-start="{t0:.3f}" data-duration="{t1 - t0:.3f}" data-track-index="0">
      <div class="hook" id="{oid}-in">
        <div class="kicker" id="{oid}-k">{esc(ov.get("kicker", "TASTY TUESDAY"))}</div>
        <div class="hook-title">{spans}</div>
      </div>
    </div>''')
            tl.append(f'tl.fromTo("#{oid}-k", {{ opacity: 0, y: 16 }}, {{ opacity: 1, y: 0, duration: 0.4, ease: "expo.out" }}, 0.0 + {t0:.3f});')
            for j in range(len(words)):
                tl.append(f'tl.fromTo("#{oid}-w{j}", {{ opacity: 0, filter: "blur(10px)", y: 10 }}, '
                          f'{{ opacity: 1, filter: "blur(0px)", y: 0, duration: 0.22, ease: "power4.out" }}, {t0 + 0.12 + j * 0.08:.3f});')
            tl.append(f'tl.to("#{oid}-in", {{ opacity: 0, filter: "blur(8px)", duration: 0.22, ease: "power2.in" }}, {t1 - 0.24:.3f});')
            sfx.append(("whoosh-short", t0 + 0.12))
        elif kind == "card":
            color = {"tip": TURMERIC, "step": LEAF, "info": CREAM}.get(ov.get("tone", "tip"), TURMERIC)
            items.append(f'''    <div class="clip ov" id="{oid}" data-start="{t0:.3f}" data-duration="{t1 - t0:.3f}" data-track-index="1">
      <div class="card" id="{oid}-in">
        <div class="pill" style="background:{color}">{esc(ov["label"])}</div>
        <div class="card-text">{esc(ov["text"])}</div>
      </div>
    </div>''')
            tl.append(f'tl.fromTo("#{oid}-in", {{ opacity: 0, y: -40, scale: 0.94 }}, '
                      f'{{ opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "expo.out" }}, {t0:.3f});')
            tl.append(f'tl.to("#{oid}-in", {{ opacity: 0, y: -24, duration: 0.28, ease: "power3.in" }}, {t1 - 0.3:.3f});')
            sfx.append(("pop" if ov.get("tone", "tip") == "tip" else "click-soft", t0 + 0.05))
        elif kind == "punch":
            rot = ov.get("rot", -4)
            color = ov.get("color", TURMERIC)
            items.append(f'''    <div class="clip ov" id="{oid}" data-start="{t0:.3f}" data-duration="{t1 - t0:.3f}" data-track-index="2">
      <div class="punch-wrap" style="top:{ov.get("y", 640)}px">
        <div class="punch" id="{oid}-in" style="color:{color}">{esc(ov["text"])}</div>
      </div>
    </div>''')
            tl.append(f'tl.fromTo("#{oid}-in", {{ opacity: 0, scale: 0.4, rotation: {rot - 8} }}, '
                      f'{{ opacity: 1, scale: 1, rotation: {rot}, duration: 0.42, ease: "back.out(1.7)" }}, {t0:.3f});')
            tl.append(f'tl.to("#{oid}-in", {{ opacity: 0, scale: 1.12, filter: "blur(6px)", duration: 0.2, ease: "power3.in" }}, {t1 - 0.22:.3f});')
            sfx.append((ov.get("sfx", "pop"), t0 + 0.04))
        elif kind == "chip":
            items.append(f'''    <div class="clip ov" id="{oid}" data-start="{t0:.3f}" data-duration="{t1 - t0:.3f}" data-track-index="1">
      <div class="chip" id="{oid}-in"><span class="dot"></span>{esc(ov["text"])}</div>
    </div>''')
            tl.append(f'tl.fromTo("#{oid}-in", {{ opacity: 0, x: -60 }}, {{ opacity: 1, x: 0, duration: 0.45, ease: "expo.out" }}, {t0:.3f});')
            tl.append(f'tl.to("#{oid}-in", {{ opacity: 0, x: -30, duration: 0.25, ease: "power3.in" }}, {t1 - 0.27:.3f});')
            sfx.append(("click-soft", t0 + 0.05))
    # step progress bar for recipe videos
    steps = edl.get("progress")
    if steps:
        items.append(f'''    <div class="clip ov" id="prog" data-start="0" data-duration="{total:.3f}" data-track-index="3">
      <div class="prog"><div class="prog-fill" id="prog-fill"></div></div>
    </div>''')
        tl.append(f'tl.fromTo("#prog-fill", {{ scaleX: 0 }}, {{ scaleX: 0, duration: 0.01 }}, 0);')
        for ref, frac in steps:
            tl.append(f'tl.to("#prog-fill", {{ scaleX: {frac}, duration: 0.5, ease: "power2.inOut" }}, {seg_time(segs, ref):.3f});')
    if end_card:
        ov, oid = end_card
        t0 = fr(total - ov.get("dur", 3.0))
        items.append(f'''    <div class="clip ov" id="{oid}" data-start="{t0:.3f}" data-duration="{total - t0:.3f}" data-track-index="4">
      <div class="end" id="{oid}-bg"></div>
      <div class="end-in">
        <div class="end-k" id="{oid}-k">TASTY TUESDAY</div>
        <div class="end-t" id="{oid}-t">{esc(ov["title"])}</div>
        <div class="end-rule" id="{oid}-r"></div>
        <div class="end-cta" id="{oid}-c">{esc(ov.get("cta", "Follow untuk resepi Makcik seterusnya"))}</div>
      </div>
    </div>''')
        tl.append(f'tl.fromTo("#{oid}-bg", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.5, ease: "power2.inOut" }}, {t0:.3f});')
        tl.append(f'tl.fromTo("#{oid}-k", {{ opacity: 0, y: 14 }}, {{ opacity: 1, y: 0, duration: 0.5, ease: "expo.out" }}, {t0 + 0.35:.3f});')
        tl.append(f'tl.fromTo("#{oid}-t", {{ opacity: 0, filter: "blur(10px)" }}, {{ opacity: 1, filter: "blur(0px)", duration: 0.45, ease: "power4.out" }}, {t0 + 0.5:.3f});')
        tl.append(f'tl.fromTo("#{oid}-r", {{ scaleX: 0 }}, {{ scaleX: 1, duration: 0.6, ease: "expo.out" }}, {t0 + 0.8:.3f});')
        tl.append(f'tl.fromTo("#{oid}-c", {{ opacity: 0, y: 16 }}, {{ opacity: 1, y: 0, duration: 0.5, ease: "expo.out" }}, {t0 + 1.0:.3f});')
        sfx.append(("whoosh", t0 + 0.3))
    return f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; pointer-events: none; }}
    .ov {{ position: absolute; inset: 0; overflow: visible; }}
    .hook {{ position: absolute; left: 70px; right: 70px; top: 240px; text-align: center; }}
    .kicker {{
      display: inline-block; font-family: "Poppins", sans-serif; font-weight: 700; font-size: 28px;
      letter-spacing: 0.28em; color: {INK}; background: {TURMERIC}; padding: 10px 22px 10px 28px;
      border-radius: 999px; margin-bottom: 26px;
    }}
    .hook-title {{
      font-family: "Playfair Display", serif; font-weight: 800; font-size: 92px; line-height: 1.04;
      color: {CREAM}; letter-spacing: -0.015em;
      text-shadow: 0 4px 28px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.5);
    }}
    .hw {{ display: inline-block; }}
    .hw[data-accent] {{ color: {TURMERIC}; font-style: italic; }}
    .card {{
      position: absolute; left: 60px; right: 60px; top: 230px; padding: 30px 36px 34px;
      background: rgba(18, 14, 10, 0.80); border: 1px solid rgba(255, 246, 230, 0.16);
      border-radius: 34px; box-shadow: 0 18px 50px rgba(0,0,0,0.35);
    }}
    .pill {{
      display: inline-block; font-family: "Poppins", sans-serif; font-weight: 800; font-size: 30px;
      letter-spacing: 0.2em; color: {INK}; padding: 8px 18px 8px 22px; border-radius: 999px; margin-bottom: 16px;
    }}
    .card-text {{
      font-family: "Poppins", sans-serif; font-weight: 700; font-size: 50px; line-height: 1.16; color: {CREAM};
    }}
    .punch-wrap {{ position: absolute; left: 0; right: 0; display: flex; justify-content: center; }}
    .punch {{
      font-family: "Archivo Black", sans-serif; font-size: 112px; line-height: 0.98; text-align: center;
      max-width: 940px; text-transform: uppercase;
      -webkit-text-stroke: 14px {INK}; paint-order: stroke fill;
      text-shadow: 0 10px 0 {INK}, 0 18px 40px rgba(0,0,0,0.45);
    }}
    .chip {{
      position: absolute; left: 60px; top: 200px; display: flex; align-items: center; gap: 16px;
      font-family: "Poppins", sans-serif; font-weight: 700; font-size: 38px; color: {INK};
      background: {CREAM}; padding: 16px 30px 16px 24px; border-radius: 999px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }}
    .dot {{ width: 18px; height: 18px; border-radius: 50%; background: {CHILLI}; display: inline-block; }}
    .prog {{
      position: absolute; left: 60px; right: 60px; top: 178px; height: 8px; border-radius: 8px;
      background: rgba(255, 246, 230, 0.28); overflow: hidden;
    }}
    .prog-fill {{ width: 100%; height: 100%; background: {TURMERIC}; transform-origin: 0 50%; }}
    .end {{ position: absolute; inset: 0; background: {INK}; }}
    .end-in {{ position: absolute; left: 80px; right: 80px; top: 640px; text-align: center; }}
    .end-k {{
      font-family: "Poppins", sans-serif; font-weight: 700; font-size: 34px; letter-spacing: 0.34em;
      color: {TURMERIC}; margin-bottom: 30px;
    }}
    .end-t {{
      font-family: "Playfair Display", serif; font-weight: 800; font-style: italic; font-size: 96px;
      line-height: 1.04; color: {CREAM};
    }}
    .end-rule {{ width: 220px; height: 6px; background: {CHILLI}; margin: 46px auto 40px; border-radius: 6px; }}
    .end-cta {{ font-family: "Poppins", sans-serif; font-weight: 600; font-size: 40px; color: rgba(255,246,230,0.86); }}
  </style>
  <div id="root" data-composition-id="{cid}" data-width="{W}" data-height="{H}">
{chr(10).join(items)}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    {chr(10) + "    ".join(tl)}
    window.__timelines["{cid}"] = tl;
  </script>
</template>
"""


# ---------------------------------------------------------------- root

def index_html(edl, segs, clips, total, sfx, music):
    vids, tl = [], []
    for s in clips:
        # the grill element lights the kitchen orange from ~32 min on
        warm = " warm" if s["warm"] else ""
        ds, dd = span(s["start"], s["start"] + s["dur"])
        attrs = 'muted playsinline' if s["lcut"] else 'playsinline data-has-audio="true" data-fade-in="0.04" data-fade-out="0.04"'
        vids.append(f'        <video id="c{s["idx"]}" class="clip cam{warm}" src="assets/selects.mp4" '
                    f'data-start="{ds}" data-duration="{dd}" '
                    f'data-media-start="{s["vmedia"]:.3f}" data-track-index="0" {attrs}></video>')
        origin = f'{s["ox"]}% {s["oy"]}%'
        tl.append(f'tl.set("#cam", {{ scale: {s["zoom"]}, transformOrigin: "{origin}" }}, {s["start"]:.3f});')
    auds = []
    for s in clips:
        if s["lcut"]:
            ds, dd = span(s["start"], s["start"] + s["dur"])
            auds.append(f'    <audio id="v{s["idx"]}" class="clip" src="assets/selects-audio.m4a" data-start="{ds}" '
                        f'data-duration="{dd}" data-media-start="{s["amedia"]:.3f}" data-volume="1" '
                        f'data-fade-in="0.04" data-fade-out="0.04" data-track-index="5"></audio>')
    for k, (name, t) in enumerate(sorted(sfx, key=lambda x: x[1])):
        st = fr(max(0.0, t + 1 / FPS - SFX_HIT.get(name, 0)))
        auds.append(f'    <audio id="sfx{k}" class="clip" src="assets/sfx/{name}.mp3" data-start="{st:.3f}" '
                    f'data-duration="{SFX_LEN[name]}" data-volume="{SFX_VOL.get(name, 0.4)}" data-track-index="{6 + k % 2}"></audio>')
    if edl.get("shakes"):
        tl.append('tl.set("#shake", { x: 0, rotation: 0 }, 0);')
    for k, (ref, amp) in enumerate(edl.get("shakes", [])):
        t0 = seg_time(segs, ref)
        tl.append(f'tl.to("#shake", {{ keyframes: [{{ x: {-14 * amp}, rotation: {-0.6 * amp}, duration: 0.05 }}, '
                  f'{{ x: {12 * amp}, rotation: {0.5 * amp}, duration: 0.06 }}, {{ x: {-7 * amp}, rotation: {-0.25 * amp}, duration: 0.06 }}, '
                  f'{{ x: 0, rotation: 0, duration: 0.08 }}], ease: "none" }}, {t0:.3f});')
    if music:
        name, vol = music
        auds.append(f'    <audio id="bgm" class="clip" src="assets/bgm/{name}.m4a" data-start="0" data-duration="{total:.3f}" '
                    f'data-volume="{vol}" data-fade-in="0.6" data-fade-out="1.5" data-track-index="8"></audio>')
    return f"""<!doctype html>
<html lang="ms">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={W}, height={H}" />
    <title>{esc(edl["title"])}</title>
    <script src="assets/vendor/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: {W}px; height: {H}px; overflow: hidden; background: #000; }}
      #root {{ position: relative; width: 100%; height: 100%; overflow: hidden; }}
      #bg {{ position: absolute; inset: 0; background: #0d0b09; }}
      #shake, #cam {{ position: absolute; inset: 0; transform-origin: 50% 46%; }}
      video.cam {{ position: absolute; left: 0; top: 0; width: {W}px; height: {H}px; object-fit: cover; }}
      .layer {{ z-index: 2; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total:.3f}" data-width="{W}" data-height="{H}">
      <div id="bg"></div>
      <div id="shake">
      <div id="cam">
{chr(10).join(vids)}
      </div>
      </div>
      <div id="captions" class="layer" data-composition-id="captions" data-composition-src="compositions/captions.html"
        data-start="0" data-duration="{total:.3f}" data-width="{W}" data-height="{H}" data-track-index="2" data-track-kind="captions"></div>
      <div id="overlays" class="layer" data-composition-id="overlays" data-composition-src="compositions/overlays.html"
        data-start="0" data-duration="{total:.3f}" data-width="{W}" data-height="{H}" data-track-index="3" data-track-kind="graphics"></div>
{chr(10).join(auds)}
    </div>
    <script>
      const tl = gsap.timeline({{ paused: true }});
      {chr(10) + "      ".join(tl)}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("project")
    ap.add_argument("--src", default=DEFAULT_SRC)
    ap.add_argument("--no-media", action="store_true", help="only rewrite the HTML")
    a = ap.parse_args()
    proj = os.path.abspath(a.project)
    edl = json.load(open(os.path.join(proj, "edl.json")))
    words = load_words()
    vad = json.load(open(VAD))
    segs, clips, pieces, vid_total = plan(edl, vad, words)
    end = next((o for o in edl.get("overlays", []) if o["type"] == "end"), None)
    total = fr(vid_total + (end.get("extend", 1.5) if end else 0))
    os.makedirs(os.path.join(proj, "compositions"), exist_ok=True)
    os.makedirs(os.path.join(proj, "assets", "sfx"), exist_ok=True)
    os.makedirs(os.path.join(proj, "assets", "vendor"), exist_ok=True)
    shutil.copy(GSAP_SRC, os.path.join(proj, "assets", "vendor", "gsap.min.js"))
    if not a.no_media:
        build_selects(pieces, a.src, proj)
    sfx = []
    stop = total - (end.get("dur", 3.0) if end else 0) + 0.3
    open(os.path.join(proj, "compositions", "captions.html"), "w").write(
        captions_html(segs, words, total, "captions", stop))
    open(os.path.join(proj, "compositions", "overlays.html"), "w").write(
        overlays_html(edl, segs, total, "overlays", sfx))
    for name, t in edl.get("sfx", []):
        sfx.append((name, seg_time(segs, t)))
    for name, _ in sfx:
        shutil.copy(os.path.join(SFX_DIR, f"{name}.mp3"), os.path.join(proj, "assets", "sfx", f"{name}.mp3"))
    music = None
    if edl.get("music"):
        m = edl["music"]
        bgm_src = os.path.join(ROOT, "assets", "bgm", f"{m['name']}.m4a")
        if os.path.exists(bgm_src):
            os.makedirs(os.path.join(proj, "assets", "bgm"), exist_ok=True)
            shutil.copy(bgm_src, os.path.join(proj, "assets", "bgm", f"{m['name']}.m4a"))
            music = (m["name"], m.get("volume", 0.1))
    open(os.path.join(proj, "index.html"), "w").write(index_html(edl, segs, clips, total, sfx, music))
    meta = {"id": os.path.basename(proj), "name": edl["title"]}
    json.dump(meta, open(os.path.join(proj, "meta.json"), "w"), indent=2)
    print(f"{os.path.basename(proj)}: {len(segs)} segments, {len(clips)} clips, {total:.1f}s")


if __name__ == "__main__":
    main()
