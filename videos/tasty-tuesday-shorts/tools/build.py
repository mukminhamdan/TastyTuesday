#!/usr/bin/env python3
"""Build one HyperFrames project per TikTok short from an edit list (edl/<id>.json).

Usage: python3 tools/build.py --source <raw.mp4> [--words <words.jsonl> ...] [ids...]

For each short it:
  1. cuts loudness-normalised footage excerpts out of the raw recording (projects/<id>/assets/footage),
  2. maps the hand-corrected caption text onto Whisper word timestamps,
  3. writes projects/<id>/index.html: hard cuts, punch-ins, karaoke captions,
     hook card, stickers/chips, end card, SFX track and a progress bar.
"""
import argparse, glob, html, json, os, re, shutil, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H, FPS = 1080, 1920, 30

# The call recording switches from Mukmin's full-screen camera to the call grid at ~27:40.
GRID_FROM = 1660.0
# Main tile of the call grid inside the 720x1280 recording.
TILE = dict(x=10, y=312, w=492, h=656)
TILE_TOP = 230
TS = W / TILE["w"]

SFX_LEN = {}


def run(cmd):
    subprocess.run(cmd, check=True)


def load_words(paths):
    """Word list [(start, end, word)]. Later files (medium re-transcription) override earlier ones in their range."""
    words = []
    for p in paths:
        segs = [json.loads(l) for l in open(p, encoding="utf-8")]
        if not segs:
            continue
        lo = min(s["start"] for s in segs) - 0.5
        hi = max(s["end"] for s in segs) + 0.5
        cover = []
        for s in segs:
            cover.append((s["start"] - 1, s["end"] + 1))
        words = [w for w in words if not any(a <= w[0] <= b for a, b in cover)]
        for s in segs:
            for w in s["words"]:
                words.append((w[0], w[1], w[2].strip()))
    return sorted(words)


def caption_timing(text, words, a, b):
    """Return [(word, start, end)] in source seconds for caption `text` spoken in [a, b]."""
    toks = text.split()
    inside = [w for w in words if w[0] >= a - 0.15 and w[1] <= b + 0.15 and w[2]]
    if len(inside) == len(toks):
        return [(t, max(a, w[0]), min(b, w[1])) for t, w in zip(toks, inside)]
    s = inside[0][0] if inside else a + 0.1
    e = inside[-1][1] if inside else b - 0.1
    s, e = max(a, s), min(b, e)
    weights = [len(re.sub(r"\W", "", t)) + 2 for t in toks]
    total, acc, out = sum(weights), 0, []
    for t, wgt in zip(toks, weights):
        ws = s + (e - s) * acc / total
        acc += wgt
        out.append((t, ws, s + (e - s) * acc / total))
    return out


def chunk_words(timed, max_words=3, max_chars=16):
    chunks, cur = [], []
    for w in timed:
        cur.append(w)
        n = sum(len(x[0]) for x in cur) + len(cur) - 1
        if len(cur) >= max_words or n >= max_chars or re.search(r"[.,!?…]$", w[0]):
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    return chunks


def excerpt_windows(segments):
    spans = sorted((s["in"], s["out"]) for s in segments)
    wins = []
    for a, b in spans:
        if wins and a - wins[-1][1] < 20:
            wins[-1][1] = max(wins[-1][1], b)
        else:
            wins.append([a, b])
    return [(max(0.0, a - 1.0), b + 1.0) for a, b in wins]


def cut_footage(source, proj, wins):
    out = {}
    fdir = os.path.join(proj, "assets", "footage")
    os.makedirs(fdir, exist_ok=True)
    for a, b in wins:
        name = f"w_{int(a*10):06d}_{int(b*10):06d}.mp4"
        path = os.path.join(fdir, name)
        if not os.path.exists(path):
            run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", source,
                 "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-g", "15", "-pix_fmt", "yuv420p",
                 "-af", "highpass=f=70,dynaudnorm=f=200:g=11:m=8,loudnorm=I=-14:TP=-1.5:LRA=9",
                 "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", path])
        out[(a, b)] = "assets/footage/" + name
    return out


def esc(s):
    return html.escape(s, quote=True)


def fit_size(line, maxw=940, cap=170, k=0.72):
    return int(min(cap, maxw / (k * max(1, len(line)))))


def build(edl, source, words):
    sid = edl["id"]
    proj = os.path.join(ROOT, "projects", sid)
    if not os.path.exists(os.path.join(proj, "hyperframes.json")):
        os.makedirs(os.path.dirname(proj), exist_ok=True)
        run(["npx", "-y", "hyperframes@0.8.168", "init", proj, "--non-interactive", "--example=blank",
             "--skill=general-video"])
        for f in ("CLAUDE.md", "AGENTS.md"):
            p = os.path.join(proj, f)
            if os.path.exists(p):
                os.remove(p)
    for sub in ("sfx", "vendor"):
        dst = os.path.join(proj, "assets", sub)
        shutil.rmtree(dst, ignore_errors=True)
        shutil.copytree(os.path.join(ROOT, "shared", sub), dst)

    segs = edl["segments"]
    wins = excerpt_windows(segs)
    files = cut_footage(source, proj, wins)

    def file_for(s):
        for (a, b), f in files.items():
            if a <= s["in"] and s["out"] <= b:
                return f, a
        raise ValueError(s)

    # ---- timeline layout
    t = 0.0
    clips, caps, sfx, tweens, gtw, ctw = [], [], [], [], [], []
    seg_start = []
    for i, s in enumerate(segs):
        rate = s.get("rate", 1)
        dur = round((s["out"] - s["in"]) / rate, 3)
        seg_start.append(t)
        f, wa = file_for(s)
        layout = s.get("layout") or ("tile" if s["in"] >= GRID_FROM else "full")
        clips.append(dict(i=i, start=t, dur=dur, src=f, mstart=round(s["in"] - wa, 3), rate=rate,
                          layout=layout, mute=s.get("mute", rate != 1), vol=s.get("vol", 1)))
        z = s.get("zoom")
        if z:
            origin = z.get("origin", "50% 50%")
            frm, to = z.get("from", 1.0), z.get("to", 1.15)
            if z.get("punch"):
                tweens.append(f'tl.fromTo("#vi{i}", {{scale:{frm}, transformOrigin:"{origin}"}}, '
                              f'{{scale:{to}, duration:0.22, ease:"power3.out", immediateRender:false}}, {t + z.get("at", 0):.3f});')
            else:
                tweens.append(f'tl.fromTo("#vi{i}", {{scale:{frm}, transformOrigin:"{origin}"}}, '
                              f'{{scale:{to}, duration:{dur:.3f}, ease:"none", immediateRender:false}}, {t:.3f});')
        if s.get("cap"):
            timed = caption_timing(s["cap"], words, s["in"], s["out"])
            timed = [(w, t + (ws - s["in"]) / rate, t + (we - s["in"]) / rate) for w, ws, we in timed]
            ch = chunk_words(timed)
            for k, c in enumerate(ch):
                cs = c[0][1] if k else t
                ce = ch[k + 1][0][1] if k + 1 < len(ch) else min(t + dur, c[-1][2] + 0.6)
                hold = edl.get("hook", {}).get("dur", 0) if edl.get("hook") else 0
                if ce <= hold:
                    continue
                cs = max(cs, hold)
                caps.append(dict(start=round(cs, 3), dur=round(max(0.2, ce - cs), 3), words=c,
                                 hot=set(s.get("hot", []))))
        for name, off, *vol in s.get("sfx", []):
            sfx.append((name, t + off, vol[0] if vol else 0.8))
        if i and not s.get("no_cut_sfx") and clips[i - 1]["layout"] != layout:
            sfx.append(("whoosh", t - 0.18, 0.45))
        t = round(t + dur, 3)
    total = round(t, 3)

    def at(ref):
        return seg_start[ref["seg"]] + ref.get("t", 0)

    # ---- overlays
    hook = edl.get("hook")
    end = edl.get("end")
    end_dur = end.get("dur", 2.6) if end else 0
    ov_html = []
    if hook:
        hd = hook.get("dur", 2.6)
        lines = "".join(
            f'<div class="hook-line{" hl" if j == hook.get("accent_line", 1) else ""}" '
            f'style="font-size:{fit_size(l)}px"><span>{esc(l)}</span></div>'
            for j, l in enumerate(hook["lines"]))
        ov_html.append(f'<section id="hook" class="clip ov" data-start="0" data-duration="{hd}" data-track-index="5">'
                       f'<div class="hook-dim" id="hook-dim"></div><div class="hook-card" id="hook-card">'
                       f'<div class="hook-kicker" id="hook-kicker">{esc(hook.get("kicker", "TASTY TUESDAY"))}</div>'
                       f'{lines}</div></section>')
        gtw.append('tl.fromTo("#hook-dim", {opacity:0}, {opacity:1, duration:0.25, ease:"power1.out"}, 0);')
        gtw.append('tl.fromTo("#hook-kicker", {y:-40, opacity:0}, {y:0, opacity:1, duration:0.35, ease:"power3.out"}, 0.05);')
        gtw.append('tl.fromTo("#hook-card .hook-line", {scale:1.9, opacity:0, rotation:-4}, '
                      '{scale:1, opacity:1, rotation:0, duration:0.38, ease:"back.out(2.2)", stagger:0.16}, 0.12);')
        gtw.append(f'tl.to("#hook-card", {{scale:0.92, opacity:0, duration:0.28, ease:"power2.in"}}, {hd - 0.3:.3f});')
        gtw.append(f'tl.to("#hook-dim", {{opacity:0, duration:0.3, ease:"power1.in"}}, {hd - 0.3:.3f});')
        sfx.append(("riser", 0.0, 0.25))
        for j in range(len(hook["lines"])):
            sfx.append(("boom" if j == hook.get("accent_line", 1) else "pop", 0.2 + 0.16 * j, 0.7))
        sfx.append(("whoosh", hd - 0.32, 0.5))

    if edl.get("headline"):
        hs = hook.get("dur", 2.6) if hook else 0
        ov_html.append(f'<section id="headline" class="clip ov" data-start="{hs}" data-duration="{total - hs - end_dur:.3f}" '
                       f'data-track-index="6"><div class="headline" id="headline-in">{esc(edl["headline"])}</div></section>')
        gtw.append(f'tl.fromTo("#headline-in", {{y:-30, opacity:0}}, {{y:0, opacity:1, duration:0.4, ease:"power3.out"}}, {hs + 0.1:.3f});')

    for n, ov in enumerate(edl.get("overlays", [])):
        os_, od = at(ov), ov.get("dur", 2.4)
        oid = f"ov{n}"
        if ov["type"] == "stamp":
            ov_html.append(f'<section id="{oid}" class="clip ov" data-start="{os_:.3f}" data-duration="{od}" data-track-index="7">'
                           f'<div class="stamp" id="{oid}-in" style="left:{ov.get("x", 640)}px;top:{ov.get("y", 380)}px">'
                           f'<div class="stamp-big">{esc(ov["text"])}</div><div class="stamp-small">{esc(ov.get("small", ""))}</div>'
                           f'</div></section>')
            gtw.append(f'tl.fromTo("#{oid}-in", {{scale:2.6, rotation:-28, opacity:0}}, '
                          f'{{scale:1, rotation:-9, opacity:1, duration:0.42, ease:"back.out(2)"}}, {os_:.3f});')
            gtw.append(f'tl.fromTo("#{oid}-in", {{scale:1}}, {{scale:1.06, duration:0.5, ease:"sine.inOut", yoyo:true, repeat:{max(0, int((od - 0.9) / 0.5) - 1)}, immediateRender:false}}, {os_ + 0.45:.3f});')
            gtw.append(f'tl.to("#{oid}-in", {{scale:0.6, opacity:0, duration:0.2, ease:"power2.in"}}, {os_ + od - 0.22:.3f});')
            sfx.append(("boom", os_, 0.55))
            sfx.append(("sparkle", os_ + 0.12, 0.6))
        elif ov["type"] == "chip":
            ov_html.append(f'<section id="{oid}" class="clip ov" data-start="{os_:.3f}" data-duration="{od}" data-track-index="7">'
                           f'<div class="chip" id="{oid}-in" style="top:{ov.get("y", 330)}px">'
                           f'<span class="chip-tag">{esc(ov.get("tag", "TIP"))}</span><span class="chip-text">{esc(ov["text"])}</span>'
                           f'</div></section>')
            gtw.append(f'tl.fromTo("#{oid}-in", {{x:-700, opacity:0}}, {{x:0, opacity:1, duration:0.42, ease:"power4.out"}}, {os_:.3f});')
            gtw.append(f'tl.to("#{oid}-in", {{x:700, opacity:0, duration:0.3, ease:"power3.in"}}, {os_ + od - 0.3:.3f});')
            sfx.append(("whoosh", os_ - 0.05, 0.4))
            sfx.append(("click", os_ + 0.3, 0.6))
        elif ov["type"] == "flash":
            ov_html.append(f'<section id="{oid}" class="clip ov" data-start="{os_:.3f}" data-duration="0.35" data-track-index="8">'
                           f'<div class="flash" id="{oid}-in"></div></section>')
            gtw.append(f'tl.fromTo("#{oid}-in", {{opacity:0.85}}, {{opacity:0, duration:0.33, ease:"power2.out", immediateRender:false}}, {os_:.3f});')
        elif ov["type"] == "shout":
            ov_html.append(f'<section id="{oid}" class="clip ov" data-start="{os_:.3f}" data-duration="{od}" data-track-index="7">'
                           f'<div class="shout" id="{oid}-in" style="top:{ov.get("y", 420)}px;font-size:{fit_size(ov["text"], 900, 150)}px">'
                           f'<span>{esc(ov["text"])}</span></div></section>')
            gtw.append(f'tl.fromTo("#{oid}-in", {{scale:0.2, rotation:8, opacity:0}}, '
                          f'{{scale:1, rotation:-3, opacity:1, duration:0.34, ease:"back.out(2.6)"}}, {os_:.3f});')
            gtw.append(f'tl.fromTo("#{oid}-in", {{x:0}}, {{x:10, duration:0.05, ease:"none", yoyo:true, repeat:5, immediateRender:false}}, {os_ + 0.34:.3f});')
            gtw.append(f'tl.to("#{oid}-in", {{scale:1.3, opacity:0, duration:0.22, ease:"power2.in"}}, {os_ + od - 0.24:.3f});')
            sfx.append((ov.get("sfx", "boom"), os_, 0.6))
        if ov.get("sfx_extra"):
            sfx.append((ov["sfx_extra"], os_, 0.6))

    if end:
        es = total - end_dur
        ov_html.append(f'<section id="endcard" class="clip ov" data-start="{es:.3f}" data-duration="{end_dur}" data-track-index="9">'
                       f'<div class="end-dim" id="end-dim"></div><div class="end-box" id="end-box">'
                       f'<div class="end-kicker">{esc(end.get("kicker", "TASTY TUESDAY"))}</div>'
                       f'<div class="end-title">{esc(end["title"])}</div>'
                       f'<div class="end-cta" id="end-cta">{esc(end.get("cta", "Follow untuk episod seterusnya"))}</div>'
                       f'</div></section>')
        gtw.append(f'tl.fromTo("#end-dim", {{opacity:0}}, {{opacity:1, duration:0.35, ease:"power1.out"}}, {es:.3f});')
        gtw.append(f'tl.fromTo("#end-box", {{y:80, opacity:0, scale:0.9}}, {{y:0, opacity:1, scale:1, duration:0.5, ease:"back.out(1.6)"}}, {es + 0.1:.3f});')
        gtw.append(f'tl.fromTo("#end-cta", {{scale:1}}, {{scale:1.07, duration:0.45, ease:"sine.inOut", yoyo:true, repeat:{max(0, int((end_dur - 0.8) / 0.45) - 1)}, immediateRender:false}}, {es + 0.6:.3f});')
        sfx.append(("sparkle", es + 0.1, 0.6))

    # ---- captions
    cap_html = []
    for k, c in enumerate(caps):
        spans = []
        for j, (w, ws, we) in enumerate(c["words"]):
            hot = re.sub(r"\W", "", w.lower()) in c["hot"]
            spans.append(f'<span class="w{" hot" if hot else ""}" id="c{k}w{j}">{esc(w)}</span>')
            ctw.append(f'tl.fromTo("#c{k}w{j}", {{color:"#FFFFFF", scale:1}}, {{color:"{"#FF5A4E" if hot else "#FFD23F"}", scale:1.12, duration:0.08, ease:"power2.out", immediateRender:false}}, {max(c["start"], ws):.3f});')
            ctw.append(f'tl.to("#c{k}w{j}", {{scale:1, duration:0.12, ease:"power2.out"}}, {max(c["start"], ws) + 0.09 if we < max(c["start"], ws) + 0.09 else we:.3f});')
        cap_html.append(f'<div id="cap{k}" class="clip cap" data-start="{c["start"]:.3f}" data-duration="{c["dur"]:.3f}" '
                        f'data-track-index="4"><div class="cap-in" id="cap{k}-in">{" ".join(spans)}</div></div>')
        ctw.append(f'tl.fromTo("#cap{k}-in", {{scale:0.7, y:20, opacity:0}}, {{scale:1, y:0, opacity:1, duration:0.16, ease:"back.out(2.4)"}}, {c["start"]:.3f});')

    # ---- footage
    v_html = []
    for c in clips:
        i = c["i"]
        audio = 'muted' if c["mute"] else 'data-has-audio="true" data-fade-in="0.03" data-fade-out="0.05"'
        rate = f' data-playback-rate="{c["rate"]}"' if c["rate"] != 1 else ""
        v_html.append(f'<div class="vwrap {c["layout"]}"><div class="vinner" id="vi{i}" data-layout-allow-overflow>'
                      f'<video id="v{i}" class="clip" src="{c["src"]}" playsinline {audio} data-volume="{c["vol"]}"{rate} '
                      f'data-start="{c["start"]:.3f}" data-duration="{c["dur"]:.3f}" data-media-start="{c["mstart"]:.3f}" '
                      f'data-track-index="{i % 2}"></video></div></div>')

    # ---- sfx track
    a_html, lanes = [], []
    for n, (name, st, vol) in enumerate(sorted(sfx, key=lambda x: x[1])):
        st = max(0.0, st)
        d = min(SFX_LEN[name], total - st)
        if d <= 0.02:
            continue
        lane = next((k for k, busy in enumerate(lanes) if busy <= st), None)
        if lane is None:
            lanes.append(0)
            lane = len(lanes) - 1
        lanes[lane] = st + d + 0.01
        a_html.append(f'<audio id="sfx{n}" src="assets/sfx/{name}.wav" data-start="{st:.3f}" data-duration="{d:.3f}" '
                      f'data-volume="{vol}" data-track-index="{10 + lane}"></audio>')

    gtw.append(f'tl.fromTo("#progress-fill", {{scaleX:0}}, {{scaleX:1, duration:{total:.3f}, ease:"none"}}, 0);')

    os.makedirs(os.path.join(proj, "compositions"), exist_ok=True)
    subs = {"captions": ("\n        ".join(cap_html), ctw, CAPTIONS_CSS),
            "graphics": ("\n        ".join(ov_html) + '\n        <div id="progress"><div id="progress-fill"></div></div>', gtw, GRAPHICS_CSS)}
    for cid, (markup, tw, css) in subs.items():
        with open(os.path.join(proj, "compositions", cid + ".html"), "w", encoding="utf-8") as f:
            f.write(SUB_TEMPLATE.replace("%%CID%%", cid).replace("%%DUR%%", f"{total:.3f}").replace("%%CSS%%", css)
                    .replace("%%MARKUP%%", markup).replace("%%TWEENS%%", "\n        ".join(tw)))
    doc = TEMPLATE.replace("%%TITLE%%", esc(edl.get("title", sid))) \
        .replace("%%ID%%", sid).replace("%%DUR%%", f"{total:.3f}") \
        .replace("%%VIDEOS%%", "\n      ".join(v_html)) \
        .replace("%%AUDIO%%", "\n      ".join(a_html)) \
        .replace("%%TWEENS%%", "\n      ".join(tweens)) \
        .replace("%%TILE_CSS%%", TILE_CSS) \
        .replace("%%ACC1%%", str(TILE_TOP - 12)).replace("%%ACC2%%", str(TILE_TOP + round(TILE["h"] * TS)))
    with open(os.path.join(proj, "index.html"), "w", encoding="utf-8") as f:
        f.write(doc)
    print(f"{sid}: {total:.1f}s, {len(clips)} cuts, {len(caps)} caption chunks, {len(a_html)} sfx")
    return total


TILE_CSS = (f".vwrap.tile{{left:0;top:{TILE_TOP}px;width:{W}px;height:{round(TILE['h'] * TS)}px;border-radius:0}}"
            f".vwrap.tile video{{width:{720 * TS:.1f}px;height:{1280 * TS:.1f}px;"
            f"left:{-TILE['x'] * TS:.1f}px;top:{-TILE['y'] * TS:.1f}px}}")

GRAPHICS_CSS = """
      #root { position: absolute; inset: 0; font-family: "Montserrat", sans-serif;
        --ink: #1E0F0A; --cream: #FFF4E2; --chili: #D7263D; --turmeric: #FFD23F; }
      .ov { position: absolute; inset: 0; }
      .hook-dim { position: absolute; inset: 0; background: rgba(30, 15, 10, 0.62); }
      .hook-card { position: absolute; left: 70px; right: 70px; top: 470px; display: flex; flex-direction: column;
        align-items: center; gap: 6px; }
      .hook-kicker { font-weight: 900; font-size: 34px; letter-spacing: 0.32em; color: var(--ink);
        background: var(--turmeric); padding: 10px 22px 8px 30px; border-radius: 6px; margin-bottom: 22px; }
      .hook-line { font-family: "Archivo Black", sans-serif; line-height: 1.02; color: #FFFFFF; text-align: center;
        text-transform: uppercase; display: block; }
      .hook-line span { display: inline-block; paint-order: stroke fill; -webkit-text-stroke: 14px #1E0F0A;
        text-shadow: 0 10px 0 #1E0F0A; }
      .hook-line.hl span { color: var(--turmeric); }
      .headline { position: absolute; left: 60px; right: 150px; top: 120px; font-family: "Archivo Black", sans-serif;
        font-size: 50px; line-height: 1.05; color: #FFFFFF; text-transform: uppercase; paint-order: stroke fill;
        -webkit-text-stroke: 9px #1E0F0A; }
      .stamp { position: absolute; width: 330px; height: 330px; border-radius: 50%; background: var(--chili);
        border: 10px dashed #FFF4E2; display: flex; flex-direction: column; align-items: center; justify-content: center;
        box-shadow: 0 18px 0 rgba(0, 0, 0, 0.35); }
      .stamp-big { font-family: "Archivo Black", sans-serif; font-size: 116px; line-height: 1; color: #FFFFFF; }
      .stamp-small { font-weight: 900; font-size: 38px; letter-spacing: 0.12em; color: var(--turmeric); }
      .chip { position: absolute; left: 60px; display: flex; align-items: stretch; border-radius: 14px; overflow: hidden;
        box-shadow: 0 12px 0 rgba(0, 0, 0, 0.35); max-width: 860px; }
      .chip-tag { background: var(--turmeric); color: var(--ink); font-weight: 900; font-size: 40px;
        padding: 18px 22px; letter-spacing: 0.06em; }
      .chip-text { background: #FFF4E2; color: var(--ink); font-weight: 900; font-size: 40px; padding: 18px 26px; }
      .shout { position: absolute; left: 60px; right: 150px; text-align: center; font-family: "Archivo Black", sans-serif;
        line-height: 1; text-transform: uppercase; }
      .shout span { display: inline-block; color: var(--turmeric); paint-order: stroke fill; -webkit-text-stroke: 14px #1E0F0A;
        text-shadow: 0 10px 0 #1E0F0A; }
      .flash { position: absolute; inset: 0; background: #FFF4E2; }
      .end-dim { position: absolute; inset: 0; background: rgba(30, 15, 10, 0.78); }
      .end-box { position: absolute; left: 80px; right: 80px; top: 620px; display: flex; flex-direction: column;
        align-items: center; gap: 26px; text-align: center; }
      .end-kicker { font-weight: 900; font-size: 34px; letter-spacing: 0.32em; color: var(--ink); background: var(--turmeric);
        padding: 10px 22px 8px 30px; border-radius: 6px; }
      .end-title { font-family: "Archivo Black", sans-serif; font-size: 96px; line-height: 1.02; color: #FFFFFF;
        text-transform: uppercase; }
      .end-cta { font-weight: 900; font-size: 44px; color: var(--ink); background: #FFF4E2; padding: 20px 34px;
        border-radius: 999px; }
      #progress { position: absolute; left: 0; top: 0; width: 1080px; height: 10px; background: rgba(255, 244, 226, 0.18); }
      #progress-fill { width: 1080px; height: 10px; background: var(--turmeric); transform-origin: 0 50%; }
"""

CAPTIONS_CSS = """
      #root { position: absolute; inset: 0; font-family: "Montserrat", sans-serif; }
          .cap { position: absolute; left: 60px; right: 150px; top: 1210px; height: 260px; display: flex;
        align-items: center; justify-content: center; }
      .cap-in { text-align: center; font-weight: 900; font-size: 74px; line-height: 1.1; text-transform: uppercase;
        will-change: transform; }
      .w { display: inline-block; margin: 0 0.14em; color: #FFFFFF; paint-order: stroke fill; -webkit-text-stroke: 12px #000000;
        text-shadow: 0 6px 0 rgba(0, 0, 0, 0.55); }
"""

SUB_TEMPLATE = """<!doctype html>
<html lang="ms">
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <template>
      <style>
%%CSS%%      </style>
      <div id="root" data-composition-id="%%CID%%" data-start="0" data-duration="%%DUR%%" data-width="1080" data-height="1920">
        %%MARKUP%%
      </div>
      <script>
        const tl = gsap.timeline({ paused: true });
        %%TWEENS%%
        window.__timelines["%%CID%%"] = tl;
      </script>
    </template>
  </body>
</html>
"""

TEMPLATE = """<!doctype html>
<html lang="ms">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>%%TITLE%%</title>
    <script src="assets/vendor/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1920px; overflow: hidden; background: #1E0F0A; }
      :root { --ink: #1E0F0A; --cream: #FFF4E2; --chili: #D7263D; --turmeric: #FFD23F; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden;
        background: radial-gradient(120% 60% at 50% 45%, #4A2116 0%, #1E0F0A 70%);
        font-family: "Montserrat", sans-serif; }
      .accent { position: absolute; left: 0; width: 1080px; height: 12px; background: var(--chili); }
      .vwrap { position: absolute; inset: 0; overflow: hidden; }
      .vinner { position: absolute; inset: 0; will-change: transform; }
      .vwrap.full video { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; object-fit: cover; }
      .vwrap.tile video { position: absolute; }
      %%TILE_CSS%%
      .brand { position: absolute; left: 60px; top: 1740px; font-weight: 900; font-size: 26px; letter-spacing: 0.3em;
        color: #1E0F0A; background: #FFD23F; padding: 8px 14px 6px 18px; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="%%ID%%" data-start="0" data-duration="%%DUR%%" data-width="1080" data-height="1920">
      <div class="accent" style="top:%%ACC1%%px"></div>
      <div class="accent" style="top:%%ACC2%%px"></div>
      %%VIDEOS%%
      <div class="brand">TASTY TUESDAY</div>
      <div id="captions" data-track-kind="captions" data-composition-id="captions" data-composition-src="compositions/captions.html"
        data-start="0" data-duration="%%DUR%%" data-track-index="4" data-width="1080" data-height="1920"></div>
      <div id="graphics" data-composition-id="graphics" data-composition-src="compositions/graphics.html"
        data-start="0" data-duration="%%DUR%%" data-track-index="5" data-width="1080" data-height="1920"></div>
      %%AUDIO%%
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      %%TWEENS%%
      window.__timelines["%%ID%%"] = tl;
    </script>
  </body>
</html>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True)
    ap.add_argument("--words", action="append", default=[])
    ap.add_argument("ids", nargs="*")
    a = ap.parse_args()
    for p in glob.glob(os.path.join(ROOT, "shared", "sfx", "*.wav")):
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p],
                             capture_output=True, text=True).stdout
        SFX_LEN[os.path.basename(p)[:-4]] = float(out)
    words = load_words(a.words)
    ids = a.ids or [os.path.basename(p)[:-5] for p in sorted(glob.glob(os.path.join(ROOT, "edl", "*.json")))]
    for sid in ids:
        build(json.load(open(os.path.join(ROOT, "edl", sid + ".json"), encoding="utf-8")), a.source, words)


if __name__ == "__main__":
    main()
