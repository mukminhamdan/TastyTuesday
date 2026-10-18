#!/usr/bin/env python3
"""Build one TikTok short as a HyperFrames project from an edit spec.

Usage: build_short.py <spec.json> <raw_source.mp4> <project_dir> [--skip-media]

The spec lists source ranges to keep (seconds in the raw live recording),
corrected caption phrases, overlays and SFX cues. All timing in the spec is
SOURCE time; this script maps it onto the cut timeline.

Media prep (ffmpeg): the kept ranges, plus a small handle, are pulled into one
loudness-normalised `assets/selects.mp4`. The word-level cuts themselves are
HyperFrames clips (`data-media-start` + `data-duration`) into that file.
"""
import html
import json
import math
import os
import shutil
import subprocess
import sys

W, H = 1080, 1920
FPS = 30
HANDLE = 0.6          # seconds of source kept around each coarse range in selects.mp4
SFX_DIR = os.path.expanduser("~/.claude/skills/media-use/audio/assets/sfx")
SFX_FILES = ["whoosh", "whoosh-short", "whoosh-cinematic", "pop", "chime", "ping", "sparkle",
             "impact-bass-1", "impact-bass-2", "riser", "click", "click-soft", "notification", "glitch-1", "error"]


def fdur(t, d):
    """Duration string that never runs past the next frame-snapped start."""
    end = round(t + d, 4)
    return f"{(math.floor((end - round(t, 4)) * 10000 + 1e-6) - 1) / 10000:.4f}"


def esc(s):
    return html.escape(s, quote=True)


# ---------------------------------------------------------------- timeline map
class TimeMap:
    """Maps source seconds onto the cut timeline built from kept ranges."""

    def __init__(self, keeps):
        self.keeps = []
        frames = 0
        for a, b in keeps:
            n = max(1, round((b - a) * FPS))   # snap every cut to the frame grid
            self.keeps.append((a, a + n / FPS, frames / FPS))
            frames += n
        self.duration = frames / FPS

    def to_tl(self, s, clamp=True, k=0):
        best = None
        for a, b, t in self.keeps[k:]:
            if a - 1e-6 <= s <= b + 1e-6:
                return t + (s - a)
            # nearest kept point, for cues that fall inside a removed gap
            d = a - s if s < a else s - b
            v = t if s < a else t + (b - a)
            if best is None or d < best[0]:
                best = (d, v)
        return best[1] if clamp else None


# ---------------------------------------------------------------- media prep
def coarse_ranges(keeps):
    out = []
    for a, b in sorted(keeps):
        a, b = max(0, a - HANDLE), b + HANDLE
        if out and a <= out[-1][1] + 1.0:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    for r in out:   # whole frames per range so concat offsets stay exact
        r[1] = r[0] + round((r[1] - r[0]) * FPS) / FPS
    return out


def build_selects(raw, coarse, out_path):
    """Pull each coarse range with a fast input seek, concat, then loudness-normalise once."""
    tmp = out_path + ".parts"
    os.makedirs(tmp, exist_ok=True)
    listing = []
    for i, (a, b) in enumerate(coarse):
        part = os.path.join(tmp, f"p{i:03d}.mov")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a:.3f}", "-i", raw, "-t", f"{b - a:.3f}",
                        "-vf", f"fps={FPS}", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-g", "15",
                        "-pix_fmt", "yuv420p", "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2", part],
                       check=True)
        listing.append(f"file '{os.path.basename(part)}'")
    starts, off = [], 0.0
    for i, (a, b) in enumerate(coarse):
        d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                  os.path.join(tmp, f"p{i:03d}.mov")], capture_output=True, text=True).stdout)
        starts.append([a, b, round(off, 6)])
        off += d
    with open(os.path.splitext(out_path)[0] + ".json", "w") as f:
        json.dump(starts, f)
    with open(os.path.join(tmp, "list.txt"), "w") as f:
        f.write("\n".join(listing) + "\n")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", os.path.join(tmp, "list.txt"),
                    "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000",
                    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", out_path], check=True)
    shutil.rmtree(tmp)


def selects_offset(index, s):
    """Source second -> second inside selects.mp4, using the measured part offsets."""
    for a, b, off in index:
        if a - 1e-6 <= s <= b + 1e-6:
            return off + (s - a)
    raise ValueError(f"source time {s} not inside selects")


# ---------------------------------------------------------------- captions
def phrase_words(phrase, words):
    """Assign per-word times to a corrected caption phrase.

    Uses the ASR word times when the corrected text has the same word count as
    the ASR words inside the phrase window; otherwise spreads the window by
    character length.
    """
    a, b = phrase["s"], phrase["e"]
    toks = phrase["t"].split()
    asr = [w for w in words if w["s"] >= a - 0.15 and w["e"] <= b + 0.15]
    if len(asr) == len(toks) and asr:
        return [(tok, max(a, w["s"]), min(b, w["e"])) for tok, w in zip(toks, asr)]
    total = sum(len(t) + 2 for t in toks)
    out, t = [], a
    for tok in toks:
        d = (b - a) * (len(tok) + 2) / total
        out.append((tok, t, t + d))
        t += d
    return out


def chunk(timed, max_words=3, max_chars=16):
    groups, cur = [], []
    for w in timed:
        txt = " ".join(x[0] for x in cur + [w])
        if cur and (len(cur) >= max_words or len(txt) > max_chars or w[1] - cur[-1][2] > 0.35):
            groups.append(cur)
            cur = []
        cur.append(w)
        if w[0].endswith((".", "?", "!", ",")):
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    return groups


# ---------------------------------------------------------------- html pieces
def overlay_html(o, i, t0, dur):
    kind = o["type"]
    base = f'id="ov{i}" class="clip ov ov-{kind}" data-start="{t0:.3f}" data-duration="{dur:.3f}" data-track-index="{40 + i % 10}"'
    if kind == "hook":
        # one row per line; shrink long lines so they never wrap (Archivo Black caps ~0.74em per glyph)
        lines = "".join(f'<div class="hook-line hl{j}"><span style="font-size:{min(104, int(880 / (len(l) * 0.74)))}px">{esc(l)}</span></div>'
                        for j, l in enumerate(o["lines"]))
        kicker = f'<div class="hook-kicker">{esc(o.get("kicker", ""))}</div>' if o.get("kicker") else ""
        return f'<div {base}><div class="hook-inner">{kicker}{lines}</div></div>'
    if kind == "chips":
        title = f'<div class="chips-title">{esc(o["title"])}</div>' if o.get("title") else ""
        chips = "".join(f'<div class="chip c{j}"><b>{esc(c[0])}</b>{("<i>" + esc(c[1]) + "</i>") if len(c) > 1 and c[1] else ""}</div>'
                        for j, c in enumerate(o["items"]))
        return f'<div {base}><div class="chips-inner">{title}{chips}</div></div>'
    if kind == "stat":
        return (f'<div {base}><div class="stat-inner"><div class="stat-label">{esc(o.get("label", ""))}</div>'
                f'<div class="stat-num"><span class="stat-val" data-to="{o["to"]}">{o.get("from", 0)}</span>'
                f'<span class="stat-unit">{esc(o.get("unit", ""))}</span></div>'
                f'<div class="stat-sub">{esc(o.get("sub", ""))}</div></div></div>')
    if kind == "versus":
        L, R = o["left"], o["right"]
        def side(d, cls):
            return (f'<div class="vs-side {cls}"><div class="vs-where">{esc(d["where"])}</div>'
                    f'<div class="vs-price">{esc(d["price"])}</div><div class="vs-get">{esc(d["get"])}</div>'
                    f'<div class="vs-badge">{esc(d.get("badge", ""))}</div></div>')
        return (f'<div {base}><div class="vs-inner"><div class="vs-title">{esc(o.get("title", ""))}</div>'
                f'<div class="vs-row">{side(L, "vs-l")}<div class="vs-mid">VS</div>{side(R, "vs-r")}</div></div></div>')
    if kind == "label":
        return f'<div {base}><div class="label-inner"><span class="label-tag">{esc(o.get("tag", ""))}</span><span class="label-text">{esc(o["text"])}</span></div></div>'
    if kind == "stamp":
        return f'<div {base}><div class="stamp-inner">{esc(o["text"])}</div></div>'
    if kind == "steps":
        items = "".join(f'<div class="step s{j}"><span class="step-n">{j + 1}</span><span class="step-t">{esc(s)}</span></div>'
                        for j, s in enumerate(o["items"]))
        return f'<div {base}><div class="steps-inner"><div class="steps-title">{esc(o.get("title", ""))}</div>{items}</div></div>'
    if kind == "list":
        items = "".join(f'<div class="li l{j}"><span class="li-dot"></span><span class="li-t">{esc(s)}</span></div>'
                        for j, s in enumerate(o["items"]))
        return f'<div {base}><div class="list-inner"><div class="list-title">{esc(o.get("title", ""))}</div>{items}</div></div>'
    if kind == "cta":
        return (f'<div {base}><div class="cta-inner"><div class="cta-top">{esc(o.get("top", ""))}</div>'
                f'<div class="cta-main">{esc(o["text"])}</div></div></div>')
    raise ValueError(kind)


def overlay_motion(o, i, t0, dur, items_tl):
    """GSAP lines for one overlay. Times are absolute timeline seconds."""
    sel = f"#ov{i}"
    k = o["type"]
    end = t0 + dur
    js = []
    if k == "hook":
        js.append(f'tl.fromTo("{sel} .hook-kicker",{{y:-30,opacity:1}},{{y:0,opacity:1,duration:0.3,ease:"power3.out"}},{t0:.3f});')
        for j, _ in enumerate(o["lines"]):
            js.append(f'tl.fromTo("{sel} .hl{j}",{{scale:1.08,opacity:1,rotation:{-4 if j % 2 == 0 else 3}}},'
                      f'{{scale:1,opacity:1,rotation:{-2 if j % 2 == 0 else 1.5},duration:0.32,ease:"back.out(2.2)"}},{t0 + j * 0.12:.3f});')
        js.append(f'tl.to("{sel} .hook-inner",{{y:-14,duration:{max(0.3, dur - 1.0):.2f},ease:"sine.inOut"}},{t0 + 0.6:.3f});')
        js.append(f'tl.to("{sel} .hook-inner",{{scale:0.4,y:-260,opacity:0,duration:0.3,ease:"power2.in"}},{end - 0.3:.3f});')
    elif k == "chips":
        js.append(f'tl.fromTo("{sel} .chips-title",{{x:-60,opacity:0}},{{x:0,opacity:1,duration:0.3,ease:"power3.out"}},{t0:.3f});')
        for j, at in enumerate(items_tl):
            js.append(f'tl.fromTo("{sel} .c{j}",{{x:-80,scale:0.6,opacity:0}},{{x:0,scale:1,opacity:1,duration:0.28,ease:"back.out(2)"}},{at:.3f});')
        js.append(f'tl.to("{sel} .chips-inner",{{x:-120,opacity:0,duration:0.28,ease:"power2.in"}},{end - 0.28:.3f});')
    elif k == "stat":
        js.append(f'tl.fromTo("{sel} .stat-inner",{{scale:0.5,opacity:0,rotation:-4}},{{scale:1,opacity:1,rotation:-2,duration:0.35,ease:"back.out(2)"}},{t0:.3f});')
        js.append(f'(function(){{var el=document.querySelector("{sel} .stat-val");var o={{v:{o.get("from", 0)}}};'
                  f'tl.to(o,{{v:{o["to"]},duration:{o.get("count", 0.8)},ease:"power2.out",onUpdate:function(){{el.textContent=Math.round(o.v);}}}},{t0 + 0.25:.3f});}})();')
        js.append(f'tl.to("{sel} .stat-inner",{{scale:0.7,opacity:0,duration:0.25,ease:"power2.in"}},{end - 0.25:.3f});')
    elif k == "versus":
        js.append(f'tl.fromTo("{sel} .vs-title",{{y:-40,opacity:0}},{{y:0,opacity:1,duration:0.3,ease:"power3.out"}},{t0:.3f});')
        js.append(f'tl.fromTo("{sel} .vs-l",{{x:-200,opacity:0}},{{x:0,opacity:1,duration:0.35,ease:"power3.out"}},{items_tl[0]:.3f});')
        js.append(f'tl.fromTo("{sel} .vs-mid",{{scale:0,opacity:0}},{{scale:1,opacity:1,duration:0.3,ease:"back.out(3)"}},{items_tl[0] + 0.25:.3f});')
        js.append(f'tl.fromTo("{sel} .vs-r",{{x:200,opacity:0}},{{x:0,opacity:1,duration:0.35,ease:"power3.out"}},{items_tl[1]:.3f});')
        js.append(f'tl.fromTo("{sel} .vs-l .vs-badge",{{scale:2.2,opacity:0,rotation:-14}},{{scale:1,opacity:1,rotation:-8,duration:0.3,ease:"back.out(2)"}},{items_tl[2]:.3f});')
        js.append(f'tl.fromTo("{sel} .vs-r .vs-badge",{{scale:2.2,opacity:0,rotation:14}},{{scale:1,opacity:1,rotation:8,duration:0.3,ease:"back.out(2)"}},{items_tl[2] + 0.2:.3f});')
        js.append(f'tl.to("{sel} .vs-inner",{{y:-60,opacity:0,duration:0.3,ease:"power2.in"}},{end - 0.3:.3f});')
    elif k == "label":
        js.append(f'tl.fromTo("{sel} .label-inner",{{x:-420,opacity:0}},{{x:0,opacity:1,duration:0.35,ease:"power3.out"}},{t0:.3f});')
        js.append(f'tl.to("{sel} .label-inner",{{x:-420,opacity:0,duration:0.28,ease:"power2.in"}},{end - 0.28:.3f});')
    elif k == "stamp":
        js.append(f'tl.fromTo("{sel} .stamp-inner",{{scale:2.6,opacity:0,rotation:-18}},{{scale:1,opacity:1,rotation:-9,duration:0.25,ease:"power4.out"}},{t0:.3f});')
        if dur > 1.0:
            js.append(f'tl.to("{sel} .stamp-inner",{{scale:1.06,duration:0.12,yoyo:true,repeat:1,ease:"sine.inOut"}},{t0 + 0.28:.3f});')
        js.append(f'tl.to("{sel} .stamp-inner",{{opacity:0,scale:0.8,duration:0.2}},{max(end - 0.2, t0 + 0.53 if dur > 1.0 else t0 + 0.26):.3f});')
    elif k in ("steps", "list"):
        tcls = "steps-title" if k == "steps" else "list-title"
        icls = "s" if k == "steps" else "l"
        inner = "steps-inner" if k == "steps" else "list-inner"
        js.append(f'tl.fromTo("{sel} .{tcls}",{{y:-30,opacity:0}},{{y:0,opacity:1,duration:0.3,ease:"power3.out"}},{t0:.3f});')
        for j, at in enumerate(items_tl):
            js.append(f'tl.fromTo("{sel} .{icls}{j}",{{x:-60,opacity:0}},{{x:0,opacity:1,duration:0.28,ease:"power3.out"}},{at:.3f});')
        js.append(f'tl.to("{sel} .{inner}",{{opacity:0,x:-80,duration:0.28,ease:"power2.in"}},{end - 0.28:.3f});')
    elif k == "cta":
        js.append(f'tl.fromTo("{sel} .cta-inner",{{y:120,opacity:0}},{{y:0,opacity:1,duration:0.4,ease:"back.out(1.6)"}},{t0:.3f});')
        js.append(f'tl.to("{sel} .cta-main",{{scale:1.05,duration:0.4,yoyo:true,repeat:{max(1, int(dur / 0.8) - 1)},ease:"sine.inOut"}},{t0 + 0.45:.3f});')
    return js


def build(spec, raw, proj, skip_media=False):
    tm = TimeMap(spec["keeps"])
    keeps = [(a, b) for a, b, _ in tm.keeps]
    total = tm.duration + spec.get("tail", 0.0)
    coarse = coarse_ranges(keeps)
    assets = os.path.join(proj, "assets")
    os.makedirs(os.path.join(assets, "sfx"), exist_ok=True)
    if not skip_media:
        build_selects(raw, coarse, os.path.join(assets, "selects.mp4"))
    sel_index = json.load(open(os.path.join(assets, "selects.json")))
    for n in SFX_FILES:
        shutil.copyfile(os.path.join(SFX_DIR, n + ".mp3"), os.path.join(assets, "sfx", n + ".mp3"))
    for f in ("ArchivoBlack-Regular.ttf", "SpaceMono-Bold.ttf"):
        shutil.copyfile(os.path.join(os.path.dirname(__file__), "fonts", f), os.path.join(assets, f))
    shutil.copyfile(os.path.join(os.path.dirname(__file__), "gsap.min.js"), os.path.join(assets, "gsap.min.js"))

    words = spec.get("_words", [])
    body, js = [], []      # root: footage, zooms, sfx
    cbody, cjs = [], []    # captions sub-composition
    gbody, gjs = [], []    # graphics sub-composition

    # ---- video clips: one per kept range, punch-in alternates on each cut
    zooms = spec.get("zooms", {})
    for i, (a, b, t) in enumerate(tm.keeps):
        z = zooms.get(str(i), 1.0 if i % 2 == 0 else 1.12)
        ms = selects_offset(sel_index, a)
        body.append(
            f'<div id="vw{i}" class="vw"><video id="v{i}" class="clip src" src="assets/selects.mp4" '
            f'data-start="{t:.4f}" data-duration="{fdur(t, b - a)}" data-media-start="{ms:.4f}" data-track-index="0" '
            f'playsinline data-has-audio="true"></video></div>')
        js.append(f'tl.set("#vw{i}",{{scale:{z}}},0);')
    # punches: quick scale bumps on emphasis words (source time)
    for p in spec.get("punches", []):
        at = tm.to_tl(p["s"], k=p.get("k", 0))
        idx = max(j for j, (a, b, t) in enumerate(tm.keeps) if t <= at + 1e-6)
        base = zooms.get(str(idx), 1.0 if idx % 2 == 0 else 1.12)
        js.append(f'tl.to("#vw{idx}",{{scale:{base + p.get("amt", 0.12):.3f},duration:0.16,ease:"power3.out"}},{at:.3f});')
        js.append(f'tl.to("#vw{idx}",{{scale:{base},duration:{p.get("hold", 0.9):.2f},ease:"sine.inOut"}},{at + 0.16:.3f});')

    # ---- captions: collect groups first so each one can end where the next begins
    items = []   # (t0, t1, kind, payload)
    for ph in spec["captions"]:
        kk = ph.get("k", 0)
        T = lambda x, kk=kk: tm.to_tl(x, k=kk)
        if ph.get("who"):
            items.append((T(ph["s"]), T(ph["e"]) + 0.25, "guest", ph, None))
            continue
        timed = phrase_words(ph, words)
        for grp in chunk(timed, ph.get("mw", 3)):
            items.append((T(grp[0][1]), T(grp[-1][2]) + 0.12, "cap", ph, [(tok, T(ws)) for tok, ws, we in grp]))
    items.sort(key=lambda x: x[0])
    for n, (t0, t1, kind, ph, grp) in enumerate(items):
        nxt = next((x[0] for x in items[n + 1:]), None)   # one caption or chat bubble at a time
        if nxt is not None:
            t1 = min(t1, nxt)
        if kind == "cap" and nxt is not None and nxt - t1 < 0.25:
            t1 = nxt                                   # no flicker gap between groups
        dur = max(0.2, t1 - t0)
        if kind == "guest":
            who = ph["who"]
            cbody.append(
                f'<div id="g{n}" class="clip guest" data-start="{t0:.4f}" data-duration="{dur:.4f}" data-track-index="11">'
                f'<div class="guest-inner"><div class="guest-head"><span class="guest-av">{esc(who[0])}</span>'
                f'<span class="guest-name">{esc(who)}</span><span class="guest-live">LIVE</span></div>'
                f'<div class="guest-text">{esc(ph["t"])}</div></div></div>')
            cjs.append(f'tl.fromTo("#g{n} .guest-inner",{{y:40,scale:0.85,opacity:0}},{{y:0,scale:1,opacity:1,duration:0.25,ease:"back.out(2)"}},{t0:.3f});')
            continue
        hi = set(x.lower() for x in ph.get("hi", []))
        spans = []
        for j, (tok, ws) in enumerate(grp):
            cls = "w hot" if tok.lower().strip(".,?!") in hi else "w"
            spans.append(f'<span class="{cls}" id="c{n}w{j}">{esc(tok)}</span>')
            cjs.append(f'tl.set("#c{n}w{j}",{{className:"{cls} on"}},{max(t0, ws):.3f});')
        spk = f'<div class="spk"><span class="spk-dot"></span>{esc(ph["spk"])}</div>' if ph.get("spk") else ""
        gcls = " gcap" if ph.get("spk") else ""
        cbody.append(f'<div id="c{n}" class="clip cap{gcls}" data-start="{t0:.4f}" data-duration="{dur:.4f}" '
                     f'data-track-index="10">{spk}<div class="cap-inner">{" ".join(spans)}</div></div>')
        cjs.append(f'tl.fromTo("#c{n} .cap-inner",{{scale:0.82,y:18}},{{scale:1,y:0,duration:0.14,ease:"back.out(2.5)"}},{t0:.3f});')

    # ---- overlays
    for i, o in enumerate(spec.get("overlays", [])):
        kk = o.get("k", 0)
        t0 = tm.to_tl(o["s"], k=kk)
        t1 = tm.to_tl(o["e"], k=kk) if "e" in o else min(total, t0 + o.get("dur", 3))
        if o["type"] == "cta":
            t1 = total
        items_tl = [tm.to_tl(x, k=kk) for x in o.get("at", [])]
        gbody.append(overlay_html(o, i, t0, t1 - t0))
        gjs.extend(overlay_motion(o, i, t0, t1 - t0, items_tl))

    # ---- sfx
    for i, s in enumerate(spec.get("sfx", [])):
        at = max(0.0, tm.to_tl(s["s"], k=s.get("k", 0)) + s.get("off", 0.0))
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                    os.path.join(assets, "sfx", s["f"] + ".mp3")], capture_output=True, text=True).stdout)
        dur = min(dur, total - at)
        body.append(f'<audio id="sfx{i}" class="clip" src="assets/sfx/{s["f"]}.mp3" data-start="{at:.4f}" '
                    f'data-duration="{dur:.3f}" data-track-index="{100 + i}" data-volume="{s.get("vol", 0.5)}"></audio>')

    # ---- progress bar + series tag
    gjs.append(f'tl.fromTo("#prog",{{scaleX:0}},{{scaleX:1,duration:{total:.3f},ease:"none"}},0);')

    def fill(tpl, b, j):
        return tpl.replace("__TITLE__", esc(spec["title"])).replace("__DUR__", f"{total:.4f}") \
            .replace("__BODY__", "\n        ".join(b)).replace("__JS__", "\n        ".join(j)) \
            .replace("__TAG__", esc(spec.get("tag", "TASTY TUESDAY"))).replace("__EP__", esc(spec.get("ep", ""))) \
            .replace("__FONTS__", FONTS).replace("__TOKENS__", TOKENS)
    os.makedirs(os.path.join(proj, "compositions"), exist_ok=True)
    with open(os.path.join(proj, "index.html"), "w") as f:
        f.write(fill(TEMPLATE, body, js))
    with open(os.path.join(proj, "compositions", "captions.html"), "w") as f:
        f.write(fill(CAPTIONS_TPL, cbody, cjs))
    with open(os.path.join(proj, "compositions", "graphics.html"), "w") as f:
        f.write(fill(GRAPHICS_TPL, gbody, gjs))
    return total


TEMPLATE = r"""<!doctype html>
<html lang="ms">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>__TITLE__</title>
    <script src="assets/gsap.min.js"></script>
    <style>
__FONTS__
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: #2b130b; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; background: #2b130b; }
      .vw { position: absolute; inset: 0; transform-origin: 58% 34%; }
      .vw video { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; }
      #grade { position: absolute; inset: 0; pointer-events: none;
               background: radial-gradient(120% 80% at 50% 40%, rgba(0,0,0,0) 55%, rgba(43,19,11,0.45) 100%); }
      #topfade { position: absolute; left: 0; right: 0; top: 0; height: 360px;
                 background: linear-gradient(rgba(43,19,11,0.55), rgba(43,19,11,0)); }
      #graphics, #captions { position: absolute; inset: 0; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="__DUR__" data-width="1080" data-height="1920" data-fps="30">
        __BODY__
      <div id="grade"></div>
      <div id="topfade"></div>
      <div id="graphics" data-composition-id="graphics" data-composition-src="compositions/graphics.html"
           data-start="0" data-duration="__DUR__" data-track-index="2" data-width="1080" data-height="1920"></div>
      <div id="captions" data-track-kind="captions" data-composition-id="captions" data-composition-src="compositions/captions.html"
           data-start="0" data-duration="__DUR__" data-track-index="1" data-width="1080" data-height="1920"></div>
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
        __JS__
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""

FONTS = """      @font-face { font-family: "Archivo Black"; src: url("assets/ArchivoBlack-Regular.ttf"); font-weight: 400; }
      @font-face { font-family: "Space Mono"; src: url("assets/SpaceMono-Bold.ttf"); font-weight: 700; }"""

TOKENS = """      #root { --chili: #e2361b; --turmeric: #ffc93c; --cream: #fff3e0; --ink: #2b130b; --leaf: #2f6b3a;
              position: absolute; inset: 0; overflow: hidden; font-family: "Archivo Black", sans-serif; }"""

SUB_TPL = r"""<!doctype html>
<html lang="ms">
  <head><meta charset="UTF-8" /><title>__TITLE__ · __ID__</title></head>
  <body>
    <template>
      <style>
__FONTS__
__TOKENS__
__CSS__
      </style>
      <div id="root" data-composition-id="__ID__" data-start="0" data-duration="__DUR__" data-width="1080" data-height="1920">
        __BODY__
__EXTRA__
      </div>
      <script>
        const tl = gsap.timeline({ paused: true });
        __JS__
        window.__timelines["__ID__"] = tl;
      </script>
    </template>
  </body>
</html>
"""
CAPTIONS_TPL = SUB_TPL.replace("__ID__", "captions").replace("__EXTRA__", "").replace("__CSS__", r"""      /* captions */
      .cap { position: absolute; left: 70px; right: 70px; top: 1130px; height: 260px;
             display: flex; align-items: center; justify-content: center; }
      .cap-inner { text-align: center; font-size: 92px; line-height: 1.02; letter-spacing: -0.02em; text-transform: uppercase;
                   color: var(--cream); -webkit-text-stroke: 14px var(--ink); paint-order: stroke fill;
                   text-shadow: 0 10px 0 rgba(43,19,11,0.55); }
      .cap .w { display: inline-block; }
      .cap { flex-direction: column; gap: 14px; }
      .spk { display: flex; align-items: center; gap: 10px; font-family: "Space Mono", monospace; font-weight: 700; font-size: 28px;
             letter-spacing: 0.08em; color: var(--cream); background: var(--ink); padding: 6px 16px; border-radius: 8px; }
      .spk-dot { width: 14px; height: 14px; border-radius: 50%; background: var(--chili); }
      .gcap .w.on { color: #ffd9c9; }
      .cap .w.on { color: var(--turmeric); }
      .cap .w.hot.on { color: var(--chili); -webkit-text-stroke: 14px var(--cream); text-shadow: 0 10px 0 rgba(43,19,11,0.7); }
      /* guest chat bubble */
      .guest { position: absolute; left: 56px; top: 1110px; width: 760px; height: 330px; display: flex; align-items: flex-end; }
      .guest-inner { background: var(--cream); color: var(--ink); border-radius: 34px 34px 34px 8px; padding: 26px 34px 30px;
                     box-shadow: 0 16px 0 rgba(43,19,11,0.45); transform-origin: 0% 100%; max-width: 760px; }
      .guest-head { display: flex; align-items: center; gap: 14px; margin-bottom: 10px; }
      .guest-av { width: 54px; height: 54px; border-radius: 50%; background: var(--chili); color: var(--cream);
                  display: flex; align-items: center; justify-content: center; font-size: 30px; }
      .guest-name { font-family: "Space Mono", monospace; font-weight: 700; font-size: 30px; }
      .guest-live { font-family: "Space Mono", monospace; font-weight: 700; font-size: 20px; color: var(--cream);
                    background: var(--chili); padding: 2px 10px; border-radius: 6px; }
      .guest-text { font-size: 50px; line-height: 1.08; letter-spacing: -0.01em; }
""")
GRAPHICS_TPL = SUB_TPL.replace("__ID__", "graphics").replace("__EXTRA__", """        <div id="progwrap"><div id="prog"></div></div>
        <div id="tag"><span class="dot"></span><span>__TAG__</span><span class="ep">__EP__</span></div>""").replace("__CSS__", r"""      /* progress + tag */
      #progwrap { position: absolute; left: 0; right: 0; top: 0; height: 10px; background: rgba(255,243,224,0.18); }
      #prog { position: absolute; inset: 0; background: var(--turmeric); transform-origin: 0 50%; }
      #tag { position: absolute; left: 56px; top: 150px; display: flex; gap: 12px; align-items: center;
             background: rgba(43,19,11,0.82); padding: 8px 10px 8px 16px; border-radius: 10px;
             font-family: "Space Mono", monospace; font-weight: 700; font-size: 26px; letter-spacing: 0.08em; color: var(--cream); }
      #tag .dot { width: 18px; height: 18px; border-radius: 50%; background: var(--chili); box-shadow: 0 0 0 5px rgba(226,54,27,0.3); }
      #tag .ep { background: var(--cream); color: var(--ink); padding: 4px 12px; border-radius: 6px; }
      /* overlays */
      .ov { position: absolute; inset: 0; pointer-events: none; }
      .hook-inner { position: absolute; left: 60px; right: 60px; top: 300px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
      .hook-kicker { font-family: "Space Mono", monospace; font-weight: 700; font-size: 32px; letter-spacing: 0.1em;
                     color: var(--ink); background: var(--turmeric); padding: 6px 18px; border-radius: 8px; }
      .hook-line { display: block; }
      .hook-line span { display: inline-block; white-space: nowrap; font-size: 104px; line-height: 1; letter-spacing: -0.03em; text-transform: uppercase;
                        padding: 16px 28px 20px; background: var(--chili); color: var(--cream); border-radius: 14px;
                        box-shadow: 0 14px 0 var(--ink); }
      .hook-line.hl1 span { background: var(--cream); color: var(--ink); box-shadow: 0 14px 0 var(--chili); }
      .hook-line.hl2 span { background: var(--turmeric); color: var(--ink); }
      .chips-inner { position: absolute; left: 50px; top: 330px; width: 600px; display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
      .chips-title { font-family: "Space Mono", monospace; font-weight: 700; font-size: 30px; letter-spacing: 0.08em;
                     color: var(--ink); background: var(--turmeric); padding: 6px 16px; border-radius: 8px; }
      .chip { display: flex; align-items: baseline; gap: 14px; background: var(--cream); color: var(--ink);
              padding: 12px 24px 14px; border-radius: 999px; box-shadow: 0 8px 0 rgba(43,19,11,0.5); }
      .chip b { font-weight: 400; font-size: 46px; letter-spacing: -0.01em; }
      .chip i { font-style: normal; font-family: "Space Mono", monospace; font-weight: 700; font-size: 28px; color: var(--chili); }
      .stat-inner { position: absolute; left: 60px; top: 320px; width: 560px; padding: 26px 34px 30px; background: var(--chili);
                    border-radius: 26px; box-shadow: 0 16px 0 var(--ink); color: var(--cream); transform-origin: 0 0; }
      .stat-label { font-family: "Space Mono", monospace; font-weight: 700; font-size: 30px; letter-spacing: 0.08em; }
      .stat-num { display: flex; align-items: baseline; gap: 14px; }
      .stat-val { font-size: 190px; line-height: 0.95; letter-spacing: -0.04em; color: var(--turmeric); }
      .stat-unit { font-size: 70px; }
      .stat-sub { font-size: 44px; line-height: 1.05; }
      .vs-inner { position: absolute; left: 50px; right: 50px; top: 230px; display: flex; flex-direction: column; align-items: center; gap: 22px; }
      .vs-title { font-family: "Space Mono", monospace; font-weight: 700; font-size: 34px; letter-spacing: 0.08em; color: var(--ink);
                  background: var(--turmeric); padding: 6px 18px; border-radius: 8px; }
      .vs-row { display: flex; gap: 18px; align-items: center; }
      .vs-side { position: relative; width: 420px; height: 290px; border-radius: 28px; padding: 26px 30px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 14px 0 var(--ink); }
      .vs-l { background: var(--cream); color: var(--ink); }
      .vs-r { background: var(--ink); color: var(--cream); border: 6px solid var(--cream); }
      .vs-where { font-family: "Space Mono", monospace; font-weight: 700; font-size: 34px; letter-spacing: 0.04em; }
      .vs-price { font-size: 100px; line-height: 1; letter-spacing: -0.04em; color: var(--chili); }
      .vs-r .vs-price { color: var(--turmeric); }
      .vs-get { font-size: 40px; line-height: 1.05; }
      .vs-badge { position: absolute; right: -16px; bottom: -22px; font-size: 40px; padding: 8px 18px; border-radius: 12px; }
      .vs-l .vs-badge { background: var(--leaf); color: var(--cream); }
      .vs-r .vs-badge { background: var(--chili); color: var(--cream); }
      .vs-mid { font-size: 56px; color: var(--turmeric); -webkit-text-stroke: 10px var(--ink); paint-order: stroke fill; }
      .label-inner { position: absolute; left: 0; top: 360px; display: flex; flex-direction: column; align-items: flex-start; gap: 8px;
                     background: var(--cream); padding: 22px 40px 26px 56px; border-radius: 0 26px 26px 0; box-shadow: 0 12px 0 var(--chili); max-width: 860px; }
      .label-tag { font-family: "Space Mono", monospace; font-weight: 700; font-size: 28px; letter-spacing: 0.08em; color: var(--chili); }
      .label-text { font-size: 62px; line-height: 1.02; letter-spacing: -0.02em; color: var(--ink); }
      .stamp-inner { position: absolute; left: 90px; top: 420px; font-size: 96px; letter-spacing: -0.02em; text-transform: uppercase;
                     color: var(--chili); border: 10px solid var(--chili); border-radius: 18px; padding: 10px 30px 16px;
                     background: var(--cream); box-shadow: 0 12px 0 rgba(43,19,11,0.6); }
      .steps-inner, .list-inner { position: absolute; left: 50px; top: 320px; width: 760px; display: flex; flex-direction: column; gap: 14px; }
      .steps-title, .list-title { align-self: flex-start; font-family: "Space Mono", monospace; font-weight: 700; font-size: 30px; letter-spacing: 0.08em;
                                  color: var(--ink); background: var(--turmeric); padding: 6px 16px; border-radius: 8px; }
      .step, .li { display: flex; align-items: center; gap: 18px; background: var(--ink); color: var(--cream);
                   padding: 14px 26px 16px 16px; border-radius: 20px; align-self: flex-start; }
      .step-n { width: 64px; height: 64px; border-radius: 50%; background: var(--chili); display: flex; align-items: center; justify-content: center; font-size: 36px; }
      .step-t, .li-t { font-size: 46px; letter-spacing: -0.01em; }
      .li { padding: 10px 22px 12px 10px; border-radius: 16px; }
      .li-t { font-size: 40px; }
      .list-inner { gap: 10px; }
      .li-dot { width: 22px; height: 22px; border-radius: 50%; background: var(--turmeric); margin-left: 12px; }
      .cta-inner { position: absolute; left: 80px; right: 80px; top: 360px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
      .cta-top { font-family: "Space Mono", monospace; font-weight: 700; font-size: 30px; letter-spacing: 0.08em; color: var(--ink);
                 background: var(--turmeric); padding: 6px 18px; border-radius: 8px; }
      .cta-main { font-size: 78px; line-height: 1.02; text-align: center; letter-spacing: -0.02em; color: var(--cream);
                  background: var(--chili); padding: 18px 34px 22px; border-radius: 18px; box-shadow: 0 12px 0 var(--ink); }
""")


if __name__ == "__main__":
    spec_path, raw, proj = sys.argv[1:4]
    spec = json.load(open(spec_path))
    wpath = spec.get("words_file")
    if wpath:
        spec["_words"] = json.load(open(os.path.join(os.path.dirname(spec_path), wpath)))
    total = build(spec, raw, proj, skip_media="--skip-media" in sys.argv)
    print(f"{spec['id']}: {total:.2f}s")
