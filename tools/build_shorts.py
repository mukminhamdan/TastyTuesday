#!/usr/bin/env python3
"""Build one HyperFrames project per short from edits/shorts.json.

Each short is an edit decision list in SOURCE time (seconds into the original
93-minute call recording). This script:
  * tightens every kept segment by cutting internal silences (word gaps),
  * maps source time -> short timeline time,
  * extracts a small CFR proxy of the source window(s) the short uses,
  * writes shorts/<slug>/index.html (video clips + captions + overlays + SFX).

Usage: python3 tools/build_shorts.py [slug ...] [--no-footage]
"""
import html
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.environ.get("TT_SOURCE", "/home/user/src/video.mp4")
TRANSCRIPT = os.path.join(ROOT, "edits", "transcript.jsonl")
EDL = os.path.join(ROOT, "edits", "shorts.json")
SFX_DIR = os.path.join(ROOT, "shared", "sfx")
HF_VERSION = "0.8.181"

W, H = 1080, 1920
# The call grid (main tile + side tiles) inside the 720x1280 recording.
# Showing the whole grid keeps whoever is talking on screen; the tile layout
# changes as people join/leave but the grid box itself stays put.
TILE_X, TILE_Y, TILE_W, TILE_H = 8, 312, 704, 656
STAGE_X, STAGE_Y, STAGE_W = 24, 300, 1032
SCALE = STAGE_W / TILE_W  # 1.4659
STAGE_H = round(TILE_H * SCALE)  # 962

GAP_CUT = 0.65  # word gaps longer than this become jump cuts
PAD_IN, PAD_OUT = 0.12, 0.22

SFX_DUR = {
    "pop": 0.72, "whoosh": 0.57, "whoosh-short": 0.57, "chime": 2.54, "ping": 1.32,
    "sparkle": 1.8, "impact-bass-1": 2.1, "error": 1.62, "click-soft": 0.37,
    "boing": 0.94, "ding": 1.44,
}
SFX_VOL = {"impact-bass-1": 0.45, "whoosh": 0.4, "whoosh-short": 0.35, "error": 0.35,
           "chime": 0.35, "sparkle": 0.35, "boing": 0.5, "ding": 0.35, "pop": 0.5,
           "ping": 0.35, "click-soft": 0.5}


def load_words():
    words = []
    with open(TRANSCRIPT) as f:
        for line in f:
            seg = json.loads(line)
            for w in seg["words"]:
                t = w["w"].strip()
                if t:
                    words.append({"w": t, "s": w["s"], "e": w["e"]})
    words.sort(key=lambda w: w["s"])
    return words


def words_in(words, a, b):
    return [w for w in words if w["s"] >= a - 0.05 and w["e"] <= b + 0.05]


def tighten(seg, words):
    """Split one authored segment into sub-ranges with long silences removed."""
    a, b = seg["in"], seg["out"]
    if seg.get("raw"):
        return [(a, b)]
    ws = words_in(words, a, b)
    if not ws:
        return [(a, b)]
    out = []
    start = max(a, ws[0]["s"] - PAD_IN)
    for i in range(len(ws) - 1):
        if ws[i + 1]["s"] - ws[i]["e"] > GAP_CUT:
            out.append((start, min(b, ws[i]["e"] + PAD_OUT)))
            start = max(a, ws[i + 1]["s"] - PAD_IN)
    out.append((start, min(b, ws[-1]["e"] + PAD_OUT)))
    return [(x, y) for x, y in out if y - x > 0.25]


def retime_caption(text, ws, a, b):
    """Spread corrected caption words over the original word timings."""
    toks = text.split()
    if not toks:
        return []
    if ws and len(ws) == len(toks):
        return [{"w": t, "s": w["s"], "e": w["e"]} for t, w in zip(toks, ws)]
    s0 = ws[0]["s"] if ws else a
    e0 = ws[-1]["e"] if ws else b
    weights = [max(2, len(t)) for t in toks]
    total = sum(weights)
    out, t = [], s0
    for tok, wt in zip(toks, weights):
        d = (e0 - s0) * wt / total
        out.append({"w": tok, "s": t, "e": t + d})
        t += d
    return out


class Mapper:
    def __init__(self, ranges):
        self.ranges = []  # (src_a, src_b, tl_a)
        t = 0.0
        for a, b in ranges:
            self.ranges.append((a, b, t))
            t += b - a
        self.duration = t

    def tl(self, src):
        """Map a source time to timeline time (nearest kept moment)."""
        best = None
        for a, b, t in self.ranges:
            if a <= src <= b:
                return t + (src - a)
            d = min(abs(src - a), abs(src - b))
            cand = t if src < a else t + (b - a)
            if best is None or d < best[0]:
                best = (d, cand)
        return best[1] if best else 0.0


def esc(s):
    return html.escape(s, quote=True)


def group_captions(cwords, max_words=3, max_chars=18):
    groups, cur = [], []
    for w in cwords:
        brk = False
        if cur:
            gap = w["s"] - cur[-1]["e"]
            chars = sum(len(x["w"]) + 1 for x in cur) + len(w["w"])
            if len(cur) >= max_words or chars > max_chars or gap > 0.35:
                brk = True
            if re.search(r"[.?!,]$", cur[-1]["w"]) or w.get("seg") != cur[-1].get("seg"):
                brk = True
        if brk:
            groups.append(cur)
            cur = []
        cur.append(w)
    if cur:
        groups.append(cur)
    out = []
    for i, g in enumerate(groups):
        start = g[0]["s"]
        end = g[-1]["e"] + 0.25
        if i + 1 < len(groups):
            end = min(end, groups[i + 1][0]["s"])
        out.append({"start": start, "end": max(end, start + 0.3), "words": g})
    return out


def footage_name(a, b):
    return f"src-{a:08.2f}-{b:08.2f}.mp4"


def extract_footage(slug, windows, outdir):
    os.makedirs(outdir, exist_ok=True)
    wanted = {footage_name(a, b) for a, b in windows}
    for f in os.listdir(outdir):
        if f not in wanted:
            os.remove(os.path.join(outdir, f))  # stale window from an older cut
    for a, b in windows:
        dst = os.path.join(outdir, footage_name(a, b))
        if os.path.exists(dst):
            continue
        cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{a:.3f}", "-i", SOURCE, "-t", f"{b - a:.3f}",
               "-vf", "fps=30", "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-g", "15",
               "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k", "-ar", "48000",
               "-movflags", "+faststart", dst]
        subprocess.run(cmd, check=True)


def build(short, words, footage=True):
    slug = short["slug"]
    proj = os.path.join(ROOT, "shorts", slug)
    os.makedirs(os.path.join(proj, "assets", "sfx"), exist_ok=True)

    # 1. Ranges (authored order), tightened.
    ranges, seg_of_range = [], []
    for si, seg in enumerate(short["segments"]):
        for r in tighten(seg, words):
            ranges.append(r)
            seg_of_range.append(si)
    m = Mapper(ranges)
    outro = short.get("outro", 2.2)
    dur = round(m.duration + outro, 2)

    # 2. Source windows -> proxy files (cluster ranges within 90s).
    spans = sorted(ranges)
    windows = []
    for a, b in spans:
        if windows and a - windows[-1][1] < 90:
            windows[-1][1] = max(windows[-1][1], b)
        else:
            windows.append([a, b])
    windows = [(max(0, a - 1.0), b + 1.0) for a, b in windows]

    def window_for(a):
        for i, (wa, wb) in enumerate(windows):
            if wa <= a <= wb:
                return i, wa
        raise ValueError(a)

    if footage:
        extract_footage(slug, windows, os.path.join(proj, "assets", "footage"))

    # 3. Video clips. Alternate a subtle punch-in on every jump cut.
    videos, cuts = [], []
    for i, (a, b) in enumerate(ranges):
        wi, wa = window_for(a)
        t = m.ranges[i][2]
        videos.append(
            f'<video id="v{i}" class="clip src" src="assets/footage/{footage_name(*windows[wi])}" '
            f'data-start="{t:.3f}" data-duration="{b - a:.3f}" data-media-start="{a - wa:.3f}" '
            f'data-track-index="0" playsinline data-has-audio="true"></video>'
        )
        if i > 0:
            cuts.append(round(t, 3))
    last_i = len(ranges) - 1
    a, b = ranges[-1]
    wi, wa = window_for(a)
    # Outro: freeze-ish tail of the last shot under the end card (muted).
    videos.append(
        f'<video id="v-tail" class="clip src" src="assets/footage/{footage_name(*windows[wi])}" '
        f'data-start="{m.duration:.3f}" data-duration="{outro:.3f}" '
        f'data-media-start="{min(b - wa, windows[wi][1] - wa - outro - 0.05):.3f}" '
        f'data-track-index="1" playsinline muted></video>'
    )

    # 4. Captions (corrected text per segment, retimed onto source words).
    cap_words = []
    for si, seg in enumerate(short["segments"]):
        if seg.get("nocap"):
            continue
        ws = words_in(words, seg["in"], seg["out"])
        if "cap" in seg:
            cw = retime_caption(seg["cap"], ws, seg["in"], seg["out"])
        else:
            cw = [dict(w) for w in ws]
        for w in cw:
            mid = (w["s"] + w["e"]) / 2
            if not any(ra <= mid <= rb for ra, rb in [ranges[k] for k in range(len(ranges)) if seg_of_range[k] == si]):
                continue
            ts, te = m.tl(w["s"]), m.tl(w["e"])
            if te <= ts:
                te = ts + 0.12
            cap_words.append({"w": w["w"], "s": ts, "e": te, "seg": si})
    cap_words.sort(key=lambda w: w["s"])
    emph = set(x.lower() for x in short.get("emphasis", []))
    groups = group_captions(cap_words)
    cap_html, cap_js = [], []
    for gi, g in enumerate(groups):
        spans_ = []
        for wi_, w in enumerate(g["words"]):
            word = w["w"]
            cls = "w"
            if re.sub(r"[^\w]", "", word.lower()) in emph:
                cls += " em"
            spans_.append(f'<span class="{cls}" id="cw{gi}_{wi_}">{esc(word)}</span>')
        cap_html.append(
            f'<div class="capg" id="cg{gi}">{" ".join(spans_)}</div>'
        )
        cap_js.append({"s": round(g["start"], 3), "e": round(g["end"], 3),
                       "w": [[round(w["s"], 3), round(w["e"], 3)] for w in g["words"]]})

    # 5. Overlays + SFX.
    ov_html, ov_js, sfx = [], [], []

    def add_sfx(name, t, vol=None):
        sfx.append((name, max(0, t), vol if vol is not None else SFX_VOL.get(name, 0.4)))

    hook = short.get("hook")
    if hook:
        hd = hook.get("dur", 2.6)
        ov_html.append(
            f'<div id="hook" class="clip ov" data-start="0" data-duration="{hd}" data-track-index="3">'
            f'<div class="hook-in"><div class="hook-kicker">{esc(hook.get("kicker", ""))}</div>'
            f'<div class="hook-title">{"".join(f"<span class=hl style=\'font-size:{min(92, round(820 / (len(x) * 0.78)))}px\'>{esc(x)}</span>" for x in hook["lines"])}</div></div></div>'
        )
        ov_js.append({"type": "hook", "id": "hook", "s": 0, "d": hd})
        add_sfx("impact-bass-1", 0.02)
        add_sfx("whoosh", hd - 0.35)

    for oi, ov in enumerate(short.get("overlays", [])):
        t = round(m.tl(ov["at"]), 3)
        d = ov.get("dur", 2.6)
        if t + d > m.duration:
            d = max(1.0, m.duration - t)
        oid = f"ov{oi}"
        typ = ov["type"]
        if typ == "tip":
            inner = (f'<div class="tip-card"><div class="tip-badge">{esc(ov.get("badge", "TIP"))}</div>'
                     f'<div class="tip-text">{esc(ov["text"])}</div></div>')
            add_sfx("ding", t)
        elif typ == "stat":
            inner = (f'<div class="stat-card"><div class="stat-num">{esc(ov["text"])}</div>'
                     f'<div class="stat-sub">{esc(ov.get("sub", ""))}</div></div>')
            add_sfx("ping", t)
        elif typ == "joke":
            inner = f'<div class="joke"><span>{esc(ov["text"])}</span></div>'
            add_sfx(ov.get("sfx", "boing"), t)
        elif typ == "label":
            inner = f'<div class="label"><span class="dot"></span>{esc(ov["text"])}</div>'
            add_sfx("pop", t)
        elif typ == "zoom":
            inner = ""
            if ov.get("sfx"):
                add_sfx(ov["sfx"], t)
        else:
            raise ValueError(typ)
        pos = ov.get("pos", "top")
        if typ != "zoom":
            ov_html.append(
                f'<div id="{oid}" class="clip ov pos-{pos}" data-start="{t}" data-duration="{d}" '
                f'data-track-index="{4 + oi % 3}">{inner}</div>'
            )
        ov_js.append({"type": typ, "id": oid, "s": t, "d": d, "scale": ov.get("scale", 1.28),
                      "ox": ov.get("ox", 35), "oy": ov.get("oy", 50)})

    # End card
    end = short.get("end", {"line1": "TASTY TUESDAY", "line2": "Masak sama-sama, gelak sama-sama"})
    ov_html.append(
        f'<div id="endcard" class="clip ov" data-start="{m.duration:.3f}" data-duration="{outro:.3f}" data-track-index="7">'
        f'<div class="end-in" data-layout-allow-occlusion><div class="end-l1">{esc(end["line1"])}</div><div class="end-l2">{esc(end["line2"])}</div></div></div>'
    )
    add_sfx("sparkle", m.duration + 0.1)

    sfx_html = []
    used = set()
    for k, (name, t, vol) in enumerate(sorted(sfx, key=lambda x: x[1])):
        d = min(SFX_DUR[name], dur - t)
        if d <= 0.05:
            continue
        used.add(name)
        sfx_html.append(
            f'<audio id="sfx{k}" src="assets/sfx/{name}.mp3" data-start="{t:.3f}" data-duration="{d:.3f}" '
            f'data-track-index="{20 + k % 4}" data-volume="{vol}"></audio>'
        )
    os.makedirs(os.path.join(proj, "assets", "vendor"), exist_ok=True)
    shutil.copy(os.path.join(ROOT, "shared", "vendor", "gsap.min.js"), os.path.join(proj, "assets", "vendor", "gsap.min.js"))
    for name in used:
        shutil.copy(os.path.join(SFX_DIR, f"{name}.mp3"), os.path.join(proj, "assets", "sfx", f"{name}.mp3"))

    data = {"cuts": cuts, "caps": cap_js, "ovs": ov_js, "dur": dur, "main": m.duration,
            "zoomEvery": short.get("zoom_every", True)}
    title = short["title"]
    page = TEMPLATE
    for k, v in {
        "__TITLE__": esc(title),
        "__DUR__": f"{dur}",
        "__STAGE_Y__": str(STAGE_Y),
        "__STAGE_X__": str(STAGE_X),
        "__STAGE_W__": str(STAGE_W),
        "__STAGE_H__": str(STAGE_H),
        "__VW__": f"{720 * SCALE:.2f}",
        "__VH__": f"{1280 * SCALE:.2f}",
        "__VX__": f"{-TILE_X * SCALE:.2f}",
        "__VY__": f"{-TILE_Y * SCALE:.2f}",
        "__EPISODE__": re.sub(r"(\S+-\S+)", r'<span class="nb">\1</span>', esc(short.get("episode", ""))),
        "__VIDEOS__": "\n        ".join(videos),
        "__CAPS__": "\n      ".join(cap_html),
        "__OVERLAYS__": "\n    ".join(ov_html),
        "__SFX__": "\n    ".join(sfx_html),
        "__DATA__": json.dumps(data, ensure_ascii=False),
    }.items():
        page = page.replace(k, v)
    with open(os.path.join(proj, "index.html"), "w") as f:
        f.write(page)

    with open(os.path.join(proj, "hyperframes.json"), "w") as f:
        json.dump({"$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
                   "registry": "https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry",
                   "paths": {"blocks": "compositions", "components": "compositions/components", "assets": "assets"},
                   "media": {"autoProxy": True}}, f, indent=2)
    with open(os.path.join(proj, "package.json"), "w") as f:
        json.dump({"name": slug, "private": True, "type": "module", "scripts": {
            "dev": f"npx --yes hyperframes@{HF_VERSION} preview",
            "check": f"npx --yes hyperframes@{HF_VERSION} check",
            "render": f"npx --yes hyperframes@{HF_VERSION} render"}}, f, indent=2)
    with open(os.path.join(proj, "meta.json"), "w") as f:
        json.dump({"id": slug, "name": title}, f, indent=2)
    edl_out = {"ranges": [[round(a, 3), round(b, 3)] for a, b in ranges], "windows": windows,
               "duration": dur}
    with open(os.path.join(proj, "cutlist.json"), "w") as f:
        json.dump(edl_out, f, indent=1)
    print(f"{slug}: {len(ranges)} clips, {dur:.1f}s, {len(groups)} caption groups, {len(sfx_html)} sfx")


TEMPLATE = r"""<!doctype html>
<html lang="ms">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>__TITLE__</title>
    <script src="assets/vendor/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #fff1d6; }
      :root {
        --cream: #fff1d6; --ink: #2a170c; --tomato: #e4402b; --yolk: #ffcf33; --leaf: #1f7a45; --blue: #3a4fd8;
      }
      #root { width: 100%; height: 100%; position: relative; overflow: hidden; font-family: Montserrat, sans-serif; background: var(--cream); }
      /* background */
      .bg-dots { position: absolute; inset: 0; background-image: radial-gradient(#e9cf9f 3px, transparent 3.5px); background-size: 46px 46px; opacity: .55; }
      .header { position: absolute; left: 44px; right: 44px; top: 46px; height: 220px; }
      .brand { display: flex; align-items: center; justify-content: space-between; }
      .brand-pill { background: var(--tomato); color: #fff8ec; font-family: "Archivo Black", sans-serif; font-size: 34px; letter-spacing: .03em; padding: 12px 24px 10px; border-radius: 999px; transform: rotate(-2deg); box-shadow: 0 6px 0 #9e2516; }
      .live { display: flex; align-items: center; gap: 12px; font-weight: 800; font-size: 26px; color: var(--ink); background: #fff8ec; border: 4px solid var(--ink); padding: 8px 20px; border-radius: 999px; }
      .live i { width: 16px; height: 16px; border-radius: 50%; background: var(--tomato); display: block; }
      .headline { margin-top: 26px; font-family: "Archivo Black", sans-serif; font-size: 60px; line-height: 1.05; color: var(--ink); text-transform: uppercase; }
      .headline .nb { white-space: nowrap; }
      .headline span { background: linear-gradient(transparent 58%, var(--yolk) 58%, var(--yolk) 92%, transparent 92%); }
      /* stage: the call grid, framed */
      .stage-frame { position: absolute; left: __STAGE_X__px; top: __STAGE_Y__px; width: __STAGE_W__px; height: __STAGE_H__px; border-radius: 30px; background: var(--ink); box-shadow: 0 0 0 7px var(--ink), 0 18px 0 7px rgba(42,23,12,.9); }
      .stage { position: absolute; left: __STAGE_X__px; top: __STAGE_Y__px; width: __STAGE_W__px; height: __STAGE_H__px; overflow: hidden; border-radius: 30px; background: #000; }
      .cam { position: absolute; inset: 0; transform-origin: 35% 50%; }
      .src { position: absolute; left: __VX__px; top: __VY__px; width: __VW__px; height: __VH__px; object-fit: fill; }
      .footer { position: absolute; left: 0; width: 1080px; top: 1800px; height: 80px; display: flex; align-items: center; justify-content: center; }
      .footer-txt { font-family: "Archivo Black", sans-serif; font-size: 30px; color: var(--ink); opacity: .55; letter-spacing: .08em; }
      .progress-track { position: absolute; left: 60px; width: 960px; top: 1776px; height: 12px; border-radius: 999px; background: rgba(42,23,12,.12); overflow: hidden; }
      .progress { position: absolute; left: 0; top: 0; height: 12px; width: 960px; background: var(--tomato); transform-origin: 0 50%; border-radius: 999px; }
      /* captions: under the call grid, on the cream */
      .caps { position: absolute; left: 0; width: 1080px; top: 1318px; height: 330px; }
      .capg { position: absolute; left: 60px; right: 120px; top: 0; text-align: center; font-family: "Archivo Black", sans-serif; font-size: 96px; line-height: 1.1; color: var(--ink); text-transform: uppercase; opacity: 0; }
      .capg .w { display: inline-block; padding: 0 6px; border-radius: 12px; }
      .capg .w.em { background: var(--yolk); }
      /* overlays */
      .ov { position: absolute; inset: 0; pointer-events: none; }
      .hook-in { position: absolute; left: 60px; right: 60px; top: 520px; display: flex; flex-direction: column; align-items: center; gap: 18px; }
      .hook-kicker { background: var(--ink); color: var(--yolk); font-weight: 900; font-size: 34px; letter-spacing: .12em; padding: 10px 24px; border-radius: 12px; text-transform: uppercase; }
      .hook-title { display: flex; flex-direction: column; align-items: center; gap: 10px; }
      .hook-title .hl { display: block; background: var(--yolk); color: var(--ink); font-family: "Archivo Black", sans-serif; font-size: 92px; line-height: 1; padding: 16px 30px 10px; border-radius: 18px; text-transform: uppercase; box-shadow: 0 10px 0 var(--ink); text-align: center; }
      .hook-title .hl.long { font-size: 74px; }
      .hook-title .hl:nth-child(2) { background: var(--tomato); color: #fff8ec; }
      .pos-top .tip-card, .pos-top .stat-card, .pos-top .label { top: 340px; }
      .pos-mid .tip-card, .pos-mid .stat-card, .pos-mid .label { top: 700px; }
      .pos-low .tip-card, .pos-low .stat-card, .pos-low .label { top: 1060px; }
      .tip-card { position: absolute; left: 44px; right: 44px; display: flex; align-items: stretch; background: #fff8ec; border: 6px solid var(--ink); border-radius: 26px; box-shadow: 0 12px 0 var(--ink); overflow: hidden; }
      .tip-badge { background: var(--leaf); color: #fff8ec; font-family: "Archivo Black", sans-serif; font-size: 40px; display: flex; align-items: center; padding: 0 26px; letter-spacing: .04em; }
      .tip-text { padding: 22px 26px; font-weight: 800; font-size: 46px; line-height: 1.12; color: var(--ink); }
      .stat-card { position: absolute; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; }
      .stat-num { font-family: "Archivo Black", sans-serif; font-size: 150px; line-height: 1; color: var(--yolk); -webkit-text-stroke: 16px var(--ink); paint-order: stroke fill; text-shadow: 0 12px 0 var(--ink); }
      .stat-sub { margin-top: 14px; background: var(--ink); color: #fff8ec; font-weight: 900; font-size: 40px; padding: 10px 26px; border-radius: 14px; text-transform: uppercase; letter-spacing: .06em; }
      .joke { position: absolute; left: 0; right: 0; top: 640px; display: flex; justify-content: center; }
      .joke span { display: block; background: var(--tomato); color: #fff8ec; font-family: "Archivo Black", sans-serif; font-size: 74px; padding: 16px 30px 10px; border-radius: 20px; border: 6px solid var(--ink); box-shadow: 0 12px 0 var(--ink); text-transform: uppercase; transform: rotate(-5deg); text-align: center; max-width: 840px; line-height: 1.05; }
      .pos-low .joke { top: 1040px; }
      .pos-top .joke { top: 380px; }
      .label { position: absolute; left: 44px; display: flex; align-items: center; gap: 16px; background: var(--ink); color: #fff8ec; font-weight: 900; font-size: 42px; padding: 16px 30px; border-radius: 999px; }
      .label .dot { width: 20px; height: 20px; border-radius: 50%; background: var(--yolk); display: block; }
      .end-in { position: absolute; left: 0; right: 0; top: 0; bottom: 0; background: rgba(255,241,214,.94); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 26px; }
      .end-l1 { background: var(--tomato); color: #fff8ec; font-family: "Archivo Black", sans-serif; font-size: 104px; padding: 22px 44px 14px; border-radius: 999px; box-shadow: 0 12px 0 #9e2516; transform: rotate(-3deg); }
      .end-l2 { font-weight: 900; font-size: 48px; color: var(--ink); text-align: center; max-width: 900px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="__DUR__" data-width="1080" data-height="1920">
      <div class="bg-dots"></div>
      <div class="header">
        <div class="brand"><div class="brand-pill">TASTY TUESDAY</div><div class="live"><i id="live-dot"></i>LIVE MASAK</div></div>
        <div class="headline"><span>__EPISODE__</span></div>
      </div>
      <div class="stage-frame"></div>
      <div class="stage">
        <div class="cam" id="cam" data-layout-allow-overflow>
        __VIDEOS__
        </div>
      </div>
      <div class="progress-track"><div class="progress" id="progress"></div></div>
      <div class="footer"><div class="footer-txt">#TASTYTUESDAY</div></div>
      <div class="caps" id="caps">
      __CAPS__
      </div>
    __OVERLAYS__
    __SFX__
    </div>
    <script>
      const D = __DATA__;
      const tl = gsap.timeline({ paused: true });
      // progress bar + live dot
      tl.fromTo("#progress", { scaleX: 0 }, { scaleX: 1, duration: D.main, ease: "none" }, 0);
      tl.fromTo("#live-dot", { opacity: 1 }, { opacity: 0.25, duration: 0.6, repeat: Math.max(0, Math.floor(D.dur / 0.6) - 1), yoyo: true, ease: "sine.inOut" }, 0);
      // jump-cut punch-ins: alternate framing on every cut so cuts read as edits
      let zoomed = false;
      if (D.zoomEvery) {
        D.cuts.forEach((t) => { zoomed = !zoomed; tl.set("#cam", { scale: zoomed ? 1.08 : 1 }, t); });
      }
      // captions: pop in, karaoke highlight, hard kill
      D.caps.forEach((g, gi) => {
        const el = "#cg" + gi;
        tl.fromTo(el, { opacity: 0, scale: 0.82, y: 18 }, { opacity: 1, scale: 1, y: 0, duration: 0.14, ease: "back.out(2.2)" }, g.s);
        g.w.forEach((w, wi) => {
          const wid = "#cw" + gi + "_" + wi;
          const isEm = document.querySelector(wid).classList.contains("em");
          tl.fromTo(wid, { scale: 1 }, { scale: 1.12, color: "#c2301b", duration: 0.08, ease: "power2.out", immediateRender: false }, w[0]);
          tl.to(wid, { scale: 1, duration: 0.12, ease: "power2.out" }, w[0] + 0.08);
        });
        tl.to(el, { opacity: 0, duration: 0.06 }, g.e - 0.06);
        tl.set(el, { opacity: 0, visibility: "hidden" }, g.e);
      });
      // overlays
      D.ovs.forEach((o) => {
        const sel = "#" + o.id;
        if (o.type === "hook") {
          tl.fromTo(sel + " .hook-kicker", { y: -24 }, { y: 0, duration: 0.3, ease: "power3.out" }, o.s);
          tl.fromTo(sel + " .hl", { scale: 1.45, rotation: -6 }, { scale: 1, rotation: 0, duration: 0.34, ease: "back.out(1.8)", stagger: 0.12 }, o.s);
          tl.to(sel + " .hook-in", { y: -60, opacity: 0, duration: 0.3, ease: "power2.in" }, o.s + o.d - 0.32);
        } else if (o.type === "tip") {
          tl.fromTo(sel + " .tip-card", { x: -1100 }, { x: 0, duration: 0.42, ease: "power4.out" }, o.s);
          tl.fromTo(sel + " .tip-badge", { scale: 0.6 }, { scale: 1, duration: 0.3, ease: "back.out(3)" }, o.s + 0.25);
          tl.to(sel + " .tip-card", { x: 1100, duration: 0.3, ease: "power3.in" }, o.s + o.d - 0.3);
        } else if (o.type === "stat") {
          tl.fromTo(sel + " .stat-num", { scale: 0.2, opacity: 0, rotation: -10 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.4, ease: "back.out(2.4)" }, o.s);
          tl.fromTo(sel + " .stat-sub", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power3.out" }, o.s + 0.2);
          tl.to(sel + " .stat-card", { scale: 0.6, opacity: 0, duration: 0.25, ease: "power2.in" }, o.s + o.d - 0.25);
        } else if (o.type === "joke") {
          tl.fromTo(sel + " .joke span", { scale: 0, rotation: 12 }, { scale: 1, rotation: -5, duration: 0.45, ease: "elastic.out(1, 0.45)" }, o.s);
          tl.to(sel + " .joke span", { scale: 1.06, duration: 0.25, yoyo: true, repeat: 3, ease: "sine.inOut" }, o.s + 0.45);
          tl.to(sel + " .joke span", { scale: 0, opacity: 0, duration: 0.2, ease: "power2.in" }, o.s + o.d - 0.2);
          tl.set("#cam", { transformOrigin: o.ox + "% " + o.oy + "%" }, o.s);
          tl.fromTo("#cam", { scale: 1 }, { scale: o.scale, duration: 0.18, ease: "power3.out", immediateRender: false }, o.s);
          tl.to("#cam", { scale: 1, duration: 0.25, ease: "power2.inOut" }, o.s + o.d - 0.25);
          tl.set("#cam", { transformOrigin: "35% 50%" }, o.s + o.d);
        } else if (o.type === "label") {
          tl.fromTo(sel + " .label", { x: -700 }, { x: 0, duration: 0.4, ease: "power4.out" }, o.s);
          tl.to(sel + " .label", { x: -700, duration: 0.3, ease: "power3.in" }, o.s + o.d - 0.3);
        } else if (o.type === "zoom") {
          tl.set("#cam", { transformOrigin: o.ox + "% " + o.oy + "%" }, o.s);
          tl.fromTo("#cam", { scale: 1 }, { scale: o.scale, duration: 0.2, ease: "power3.out", immediateRender: false }, o.s);
          tl.to("#cam", { scale: 1, duration: 0.3, ease: "power2.inOut" }, o.s + o.d - 0.3);
          tl.set("#cam", { transformOrigin: "35% 50%" }, o.s + o.d);
        }
      });
      // end card
      tl.fromTo("#endcard .end-in", { opacity: 0 }, { opacity: 1, duration: 0.3 }, D.main);
      tl.fromTo("#endcard .end-l1", { scale: 0, rotation: 10 }, { scale: 1, rotation: -3, duration: 0.5, ease: "back.out(2)" }, D.main + 0.1);
      tl.fromTo("#endcard .end-l2", { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power3.out" }, D.main + 0.35);
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
"""


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    footage = "--no-footage" not in sys.argv
    words = load_words()
    shorts = json.load(open(EDL))["shorts"]
    for s in shorts:
        if args and s["slug"] not in args:
            continue
        build(s, words, footage)


if __name__ == "__main__":
    main()
