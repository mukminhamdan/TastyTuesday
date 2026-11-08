#!/usr/bin/env python3
"""Beat-synced cinematic wedding reels from reels.json.

Modes
  storyboard  graded still for every shot + timings, tiled per reel (no video render)
  preview     540x960 quick draft video, cheap slow-mo, click track if no music
  final       1080x1920, motion-interpolated slow-mo, grain, music + natural sound

Examples
  python3 render.py storyboard --src RAW_DIR --out OUT_DIR
  python3 render.py preview --src RAW_DIR --out OUT_DIR --reel reel1_hari_bahagia
  python3 render.py final --src RAW_DIR --out OUT_DIR --reel reel1_hari_bahagia \
      --music track.mp3 --music-offset 0.42 --bpm 72

--bpm overrides the reel's bpm (use the real tempo of the chosen track);
--music-offset is the time (s) of the first downbeat in the track, so that
every cut lands on a beat.
"""
import argparse
import copy
import hashlib
import json
import os
import math
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
FONT = HERE / "fonts" / "CormorantGaramond.ttf"
FONT_I = HERE / "fonts" / "CormorantGaramond-Italic.ttf"
LABEL_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
LUT = HERE / "warm_romantic.cube"
DISSOLVE = 16 / 30  # seconds (16 frames), centred on the beat
FADE_IN = 0.8
FADE_OUT = 0.7


def run(cmd):
    r = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if r.returncode != 0:
        sys.stderr.write(" ".join(map(str, cmd)) + "\n" + r.stderr[-3000:])
        raise SystemExit(f"ffmpeg failed ({r.returncode})")
    return r.stdout


def probe_duration(path):
    out = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)])
    return float(out.strip())


def fmt(t):
    m, s = divmod(t, 60)
    return f"{int(m)}:{s:04.1f}"


# ---------------------------------------------------------------- timeline
def beat_clock(bpm, beat_times=None):
    """Return T(k): time of beat k from the reel start. Uses the track's real
    (detected) beats when given, so cuts follow tempo drift; extrapolates past the end."""
    beat = 60.0 / bpm
    if not beat_times:
        return lambda k: k * beat

    def T(k):
        if k < len(beat_times):
            return beat_times[k]
        return beat_times[-1] + (k - len(beat_times) + 1) * beat
    return T


def track_beats(music, offset):
    """Detected beat times of `music`, re-based so the beat nearest `offset` is 0."""
    import librosa
    import numpy as np
    y, sr = librosa.load(str(music), sr=22050, mono=True)
    _, beats = librosa.beat.beat_track(y=y, sr=sr, hop_length=128, units="time")
    i0 = int(np.argmin(np.abs(beats - offset)))
    return [float(b - beats[i0]) for b in beats[i0:]], float(beats[i0])


def build_timeline(cfg, reel, bpm, src_dir, beat_times=None):
    T = beat_clock(bpm, beat_times)
    shots = reel["shots"]
    tl, t, k = [], 0.0, 0
    q = lambda x: round(x * 30) / 30  # snap cut points to the 30fps frame grid
    for i, s in enumerate(shots):
        t = q(T(k))
        dur = q(T(k + s["beats"])) - t
        k += s["beats"]
        nxt = shots[i + 1] if i + 1 < len(shots) else None
        head = DISSOLVE / 2 if s.get("t") == "dissolve" else 0.0
        tail = DISSOLVE / 2 if nxt and nxt.get("t") == "dissolve" else 0.0
        e = dict(s, idx=i + 1, start=t, dur=dur, head=head, tail=tail, speed=s.get("speed", 1.0))
        if s["src"] != "BLACK":
            src = cfg["sources"][s["src"]]
            e["file"] = src_dir / src["file"]
            e["srcinfo"] = src
            e["ss"] = s["in"] - head * e["speed"]
            e["src_len"] = (dur + head + tail) * e["speed"]
            if e["ss"] < 0:
                raise SystemExit(f"{reel['id']} shot {i+1}: in-point too early for dissolve handle")
            if not e["file"].exists():
                raise SystemExit(f"missing source {e['file']}")
            sd = probe_duration(e["file"]) - 0.05
            if e["ss"] + e["src_len"] > sd:
                # real beats ran a little long: slow the shot slightly so it still fits the source
                fit = (sd - s["in"]) / (dur + tail)
                if fit >= e["speed"] * 0.85:
                    print(f"  note: {reel['id']} shot {i+1} speed {e['speed']:.2f} -> {fit:.3f} to fit source", file=sys.stderr)
                    e["speed"] = fit
                    e["ss"] = s["in"] - head * fit
                    e["src_len"] = (dur + head + tail) * fit
            if e["ss"] + e["src_len"] > sd + 0.02:
                raise SystemExit(f"{reel['id']} shot {i+1}: needs {e['ss']+e['src_len']:.2f}s of {src['file']} ({sd:.2f}s)")
        tl.append(e)
    return tl, q(T(k))


# ---------------------------------------------------------------- filters
def text_filters(e, cfg, W, H, tmp, length, still=False):
    tx = e.get("text")
    if not tx:
        return []

    def sub(v):
        return v.replace("{date}", cfg["date"]).replace("{names}", cfg["names"])

    k = W / 1080.0
    style = tx["style"]
    font = FONT_I if style in ("title_italic", "lower") else FONT
    lines = []
    if style in ("title", "title_italic"):
        lines.append((sub(tx["main"]), font, 128, 0.30))
        if tx.get("sub"):
            lines.append((sub(tx["sub"]), FONT, 54, 0.30 + 0.07))
    elif style == "lower":
        lines.append((sub(tx["main"]), font, 76, 0.80))
    elif style == "end":
        lines.append((sub(tx["main"]), FONT_I, 84, 0.45))
        if tx.get("sub"):
            lines.append((sub(tx["sub"]), FONT, 50, 0.45 + 0.06))
    t0 = e["head"] + 0.25
    t1 = e["head"] + e["dur"] + (0.0 if style == "end" else -0.15)
    fi = min(0.7, (t1 - t0) / 4)
    fo = min(0.6, (t1 - t0) / 5)
    if still:
        alpha = "1"
    else:
        alpha = (f"if(lt(t,{t0}),0,if(lt(t,{t0+fi:.3f}),(t-{t0})/{fi:.3f},"
                 f"if(lt(t,{t1-fo:.3f}),1,if(lt(t,{t1:.3f}),({t1:.3f}-t)/{fo:.3f},0))))")
    out = []
    for n, (txt, f, size, y) in enumerate(lines):
        p = Path(tmp) / f"txt_{e['idx']}_{n}.txt"
        p.write_text(txt, encoding="utf-8")
        out.append(
            f"drawtext=fontfile='{f}':textfile='{p}':expansion=none:fontsize={int(size*k)}:fontcolor=0xFFF6E8:"
            f"x=(w-text_w)/2:y=h*{y}-text_h/2:shadowcolor=black@0.45:shadowx={max(1,int(2*k))}:"
            f"shadowy={max(1,int(2*k))}:alpha='{alpha}'"
        )
    return out


def grade_filters(mode):
    f = [f"lut3d=file='{LUT}':interp=tetrahedral",
         "split[g0][g1];[g1]gblur=sigma=14[g2];[g0][g2]blend=all_mode=screen:all_opacity=0.10",
         "vignette=angle=PI/5:mode=forward"]
    if mode == "final":
        f.append("noise=alls=4:allf=t")
    return f


def base_filters(e, W, H, mode, still=False):
    """Crop/scale/zoom/slow-mo for one shot. Returns a filtergraph string from [0:v] to [v]."""
    fps = 30
    info = e["srcinfo"]
    pre = []
    if info.get("hdr"):
        pre.append("zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,"
                   "zscale=t=bt709:m=bt709:r=tv,format=yuv420p")
    box = e.get("crop") or info.get("crop")
    if box:  # [x, y, w, h] as fractions of the frame (punch-in / remove distractions)
        x, y, w, h = box
        pre.append(f"crop=iw*{w}:ih*{h}:iw*{x}:ih*{y}")
    if info.get("crop_top"):
        c = info["crop_top"]
        pre.append(f"crop=iw*{1-c}:ih*{1-c}:(iw-ow)/2:ih*{c}")
    if e.get("mode") == "framed":
        # landscape shot floating on a blurred, darkened copy of itself
        g = (f"[0:v]{','.join(pre + ['setsar=1'])},split[a][b];"
             f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},gblur=sigma={int(30*W/1080)},"
             f"eq=brightness=-0.10:saturation=0.8[bg];"
             f"[b]scale={W-int(80*W/1080)}:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2")
    else:
        if info.get("landscape"):
            cx = e.get("crop_x", 0.5)
            pre.append(f"crop=ih*9/16:ih:max(0\\,min(iw-ow\\,{cx}*iw-ow/2)):0")
        pre += [f"scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos", f"crop={W}:{H}", "setsar=1"]
        g = f"[0:v]{','.join(pre)}"
    if still:
        return g + "[v]"
    sp = e["speed"]
    chain = []
    if sp < 0.999:
        chain.append(f"setpts=PTS/{sp}")
        if mode == "final":
            chain.append(f"minterpolate=fps={fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1")
        else:
            chain.append(f"framerate=fps={fps}")
    chain.append(f"fps={fps}")
    z = e.get("zoom")
    if z:
        n = max(1, int(round((e["dur"] + e["head"] + e["tail"]) * fps)))
        chain.append(f"scale={W*2}:{H*2}:flags=lanczos")
        chain.append(f"zoompan=z='1+{z-1}*on/{n}':d=1:x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':s={W}x{H}:fps={fps}")
    return g + "," + ",".join(chain) + "[v]"


def shot_graph(e, cfg, W, H, mode, tmp, still=False):
    length = e["dur"] + e["head"] + e["tail"]
    if e["src"] == "BLACK":
        g = "[0:v]null"
    else:
        g = base_filters(e, W, H, mode, still)[:-3]
        g = g + "," + ",".join(grade_filters(mode if not still else "preview"))
    tf = text_filters(e, cfg, W, H, tmp, length, still)
    if tf:
        g += "," + ",".join(tf)
    card = e.get("card")
    if card:
        # PNG title card (input 1) faded in with a small upward drift, faded out before the shot ends
        t0 = e["head"] + (card["in_frac"] * e["dur"] if "in_frac" in card else card.get("in", 0.3))
        t1 = e["head"] + e["dur"] - card.get("out", 0.0)
        cg = f"[1:v]scale={W}:{H},format=rgba"
        if not still:
            cg += f",fade=t=in:st={t0:.3f}:d=0.7:alpha=1"
            if card.get("out", 0.0) > 0:
                cg += f",fade=t=out:st={t1 - 0.5:.3f}:d=0.5:alpha=1"
        y = "0" if still else f"'{int(24 * H / 1920)}*max(0,1-(t-{t0:.3f})/1.4)'"
        g += f"[base];{cg}[card];[base][card]overlay=0:{y}:eof_action=pass"
    tail = [] if still else [f"trim=duration={length:.4f}", "setpts=PTS-STARTPTS", "format=yuv420p", "settb=AVTB"]
    if tail:
        g += "," + ",".join(tail)
    return g + "[v]"


def card_input(e, length, still=False):
    card = e.get("card")
    if not card:
        return []
    img = str(HERE / "titles" / card["img"])
    return ["-loop", "1", "-framerate", "30", "-t", f"{length + 0.1:.3f}", "-i", img]


# ---------------------------------------------------------------- storyboard
def storyboard(cfg, reel, bpm, src_dir, out_dir, tmp):
    tl, total = build_timeline(cfg, reel, bpm, src_dir)
    W, H = 540, 960
    frames = []
    for e in tl:
        png = Path(tmp) / f"{reel['id']}_{e['idx']:02d}.png"
        if e["src"] == "BLACK":
            inp = ["-f", "lavfi", "-i", f"color=black:s={W}x{H}:d=1"]
        else:
            mid = e["in"] + e["dur"] * e["speed"] / 2
            inp = ["-ss", f"{mid:.3f}", "-i", str(e["file"])]
        g = shot_graph(e, cfg, W, H, "preview", tmp, still=True)
        sp = "" if e["speed"] >= 0.999 else f"  SLOMO {int(round(e['speed']*100))}%"
        label = f"#{e['idx']} {fmt(e['start'])}-{fmt(e['start']+e['dur'])}  {e['beats']}b{sp}"
        label2 = (f"{e['src']} @{e['in']:.1f}s" if e["src"] != "BLACK" else "END CARD") + \
                 (f"  [{e['t']}]" if e.get("t") else "") + (f"  {e['act']}" if e.get("act") else "")
        lp = Path(tmp) / f"lbl_{reel['id']}_{e['idx']}.txt"
        lp.write_text(label + "\n" + label2)
        g = g[:-3] + (f",pad={W}:{H+70}:0:0:color=0x1a1410,drawtext=fontfile='{LABEL_FONT}':textfile='{lp}':expansion=none:"
                      f"fontsize=19:fontcolor=0xF2E6D0:x=10:y={H+8}:line_spacing=6[v]")
        run(["ffmpeg", "-v", "error", "-y", *inp, *card_input(e, 1, still=True), "-filter_complex", g, "-map", "[v]", "-frames:v", "1", str(png)])
        frames.append(png)
    cols = 5
    rows = math.ceil(len(frames) / cols)
    sheet = out_dir / f"storyboard_{reel['id']}.jpg"
    inputs = []
    for f in frames:
        inputs += ["-i", str(f)]
    pads = cols * rows - len(frames)
    for _ in range(pads):
        inputs += ["-f", "lavfi", "-i", f"color=0x1a1410:s={W}x{H+70}:d=1"]
    n = len(frames) + pads
    stack = "".join(f"[{i}:v]" for i in range(n))
    layout = "|".join(f"{(i % cols) * W}_{(i // cols) * (H + 70)}" for i in range(n))
    run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex",
         f"{stack}xstack=inputs={n}:layout={layout},scale=iw*0.6:-2[v]", "-map", "[v]",
         "-frames:v", "1", "-q:v", "3", str(sheet)])
    return sheet, tl, total


# ---------------------------------------------------------------- video
def film_variant(reel, first):
    """Copy of a part for the full film: no 'bersambung' cards, one intro card (no PART label) at the very start."""
    r = copy.deepcopy(reel)
    for s in r["shots"]:
        card = s.get("card")
        if not card:
            continue
        if card["img"].startswith("next_") or (card["img"].startswith("intro_part") and not first):
            s.pop("card")
        elif card["img"].startswith("intro_part"):
            card["img"] = "intro_full.png"
    return r


def render_video(cfg, reel, bpm, src_dir, out_dir, tmp, mode, music, music_offset, out_name=None):
    beat_times = None
    if music:
        beat_times, music_offset = track_beats(music, music_offset)
    tl, total = build_timeline(cfg, reel, bpm, src_dir, beat_times)
    W, H = (1080, 1920) if mode == "final" else (540, 960)
    crf = "16" if mode == "final" else "26"
    preset = "slow" if mode == "final" else "veryfast"
    parts = []
    for e in tl:
        length = e["dur"] + e["head"] + e["tail"]
        out = Path(tmp) / f"shot_{e['idx']:02d}.mp4"
        if e["src"] == "BLACK":
            inp = ["-f", "lavfi", "-i", f"color=black:s={W}x{H}:r=30:d={length:.4f}"]
        else:
            inp = ["-ss", f"{e['ss']:.3f}", "-t", f"{e['src_len'] + 0.2:.3f}", "-i", str(e["file"])]
        g = shot_graph(e, cfg, W, H, mode, tmp)
        cmd = [*inp, *card_input(e, length), "-filter_complex", g, "-map", "[v]", "-an",
               "-c:v", "libx264", "-preset", preset, "-crf", "12" if mode == "final" else "20"]
        # cache rendered shots: identical shots (e.g. part vs full-film version) are only rendered once
        stamp = [os.path.getmtime(x) for x in (e.get("file"), LUT) if x]
        key = hashlib.sha1(json.dumps([cmd, stamp], default=str).encode()).hexdigest()[:20]
        cache = out_dir / "cache" / f"{key}.mp4"
        cache.parent.mkdir(parents=True, exist_ok=True)
        if not cache.exists():
            run(["ffmpeg", "-v", "error", "-y", *cmd, str(cache) + ".tmp.mp4"])
            os.replace(str(cache) + ".tmp.mp4", cache)
        out = cache
        parts.append(out)
        print(f"  shot {e['idx']:2d} {fmt(e['start'])} {e['src']}", flush=True)

    # assemble: hard cuts = concat, dissolves = xfade centred on the beat
    inputs, fg = [], []
    for p in parts:
        inputs += ["-i", str(p)]
    for i in range(len(tl)):
        fg.append(f"[{i}:v]fps=30,format=yuv420p,setsar=1,settb=AVTB,setpts=PTS-STARTPTS[s{i}]")
    cur, L = "[s0]", tl[0]["dur"] + tl[0]["tail"]
    for i in range(1, len(tl)):
        e = tl[i]
        nxt = f"[x{i}]"
        if e.get("t") == "dissolve":
            fg.append(f"{cur}[s{i}]xfade=transition=fade:duration={DISSOLVE:.4f}:offset={L - DISSOLVE:.4f},settb=AVTB{nxt}")
        else:
            fg.append(f"{cur}[s{i}]concat=n=2:v=1:a=0,settb=AVTB{nxt}")
        cur = nxt
        L = e["start"] + e["dur"] + e["tail"]
    fg.append(f"{cur}fade=t=in:st=0:d={FADE_IN},fade=t=out:st={total - FADE_OUT:.3f}:d={FADE_OUT},"
              f"trim=duration={total:.4f}[vout]")

    # audio: music (or click track) + natural sound of real-speed shots
    n_in = len(parts)
    amix = []
    if music:
        inputs += ["-ss", f"{music_offset:.3f}", "-i", str(music)]
        fg.append(f"[{n_in}:a]atrim=duration={total:.3f},afade=t=in:d=0.3,"
                  f"afade=t=out:st={total-2.5:.3f}:d=2.5,volume=0.9[mus]")
    else:
        beat = 60.0 / bpm
        inputs += ["-f", "lavfi", "-i",
                   f"aevalsrc='0.35*sin(2*PI*(1500-700*lt(mod(t\\,{4*beat})\\,{beat}))*t)*lt(mod(t\\,{beat})\\,0.035)':s=48000:d={total:.3f}"]
        fg.append(f"[{n_in}:a]anull[mus]")
    amix.append("[mus]")
    k = n_in + 1
    for e in tl:
        if e.get("nat") and e["speed"] >= 0.999 and e["src"] != "BLACK":
            inputs += ["-ss", f"{e['in']:.3f}", "-t", f"{e['dur']:.3f}", "-i", str(e["file"])]
            d = int(e["start"] * 1000)
            fg.append(f"[{k}:a]aresample=48000,afade=t=in:d=0.12,afade=t=out:st={e['dur']-0.15:.3f}:d=0.15,"
                      f"volume={e['nat']},adelay={d}|{d}[n{k}]")
            amix.append(f"[n{k}]")
            k += 1
    fg.append(f"{''.join(amix)}amix=inputs={len(amix)}:normalize=0,atrim=duration={total:.3f},"
              f"loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[aout]")

    suffix = "" if music else "_CLICK"
    out = out_dir / f"{out_name or reel['id']}_{mode}{suffix}.mp4"
    run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fg),
         "-map", "[vout]", "-map", "[aout]", "-c:v", "libx264", "-preset", preset, "-crf", crf,
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)])

    if music and mode == "final":
        # same picture, natural sound only: for adding a song from Instagram's music library
        nat_in, nat_fg, labels = ["-i", str(out)], [], []
        j = 1
        for e in tl:
            if e.get("nat") and e["speed"] >= 0.999 and e["src"] != "BLACK":
                nat_in += ["-ss", f"{e['in']:.3f}", "-t", f"{e['dur']:.3f}", "-i", str(e["file"])]
                d = int(e["start"] * 1000)
                nat_fg.append(f"[{j}:a]aresample=48000,afade=t=in:d=0.12,afade=t=out:st={e['dur']-0.15:.3f}:d=0.15,"
                              f"volume={min(1.0, e['nat'] * 1.6):.2f},adelay={d}|{d}[n{j}]")
                labels.append(f"[n{j}]")
                j += 1
        nat_in += ["-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo:d={total:.3f}"]
        labels.append(f"[{j}:a]")
        nat_fg.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0,atrim=duration={total:.3f}[aout]")
        silent = out_dir / f"{out_name or reel['id']}_{mode}_TANPA-MUZIK.mp4"
        run(["ffmpeg", "-v", "error", "-y", *nat_in, "-filter_complex", ";".join(nat_fg),
             "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
             "-movflags", "+faststart", str(silent)])
        print(f"  + {silent.name}")
    return out, total


def build_full(cfg, a, tmp):
    """Render every part as a film segment and join them into one continuous film."""
    segdir = a.out / "film_segments"
    segdir.mkdir(parents=True, exist_ok=True)
    segs, total = [], 0.0
    for i, reel in enumerate(cfg["reels"]):
        r = film_variant(reel, first=(i == 0))
        music = HERE / r["music"]["file"]
        out, t = render_video(cfg, r, r["bpm"], a.src, segdir, tmp, a.mode, music, r["music"]["offset"],
                              out_name=f"seg{i + 1}_{r['id']}")
        segs.append(out)
        total += t
    crf = "16" if a.mode == "final" else "26"
    preset = "slow" if a.mode == "final" else "veryfast"
    variants = [("", segs)]
    if a.mode == "final":
        variants.append(("_TANPA-MUZIK", [p.with_name(p.stem + "_TANPA-MUZIK.mp4") for p in segs]))
    for suffix, files in variants:
        inputs = []
        for p in files:
            inputs += ["-i", str(p)]
        n = len(files)
        streams = "".join(f"[{i}:v][{i}:a]" for i in range(n))
        out = a.out / f"full_film_{a.mode}{suffix}.mp4"
        run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", f"{streams}concat=n={n}:v=1:a=1[v][a]",
             "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", preset, "-crf", crf, "-pix_fmt", "yuv420p",
             "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)])
        print(f"full film: {total:.1f}s -> {out}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["storyboard", "preview", "final"])
    ap.add_argument("--src", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--reel", help="reel id (default: all)")
    ap.add_argument("--bpm", type=float)
    ap.add_argument("--music", type=Path)
    ap.add_argument("--music-offset", type=float, default=0.0)
    ap.add_argument("--no-music", action="store_true", help="ignore the music set in reels.json (click track)")
    ap.add_argument("--config", type=Path, default=HERE / "reels.json")
    ap.add_argument("--full", action="store_true", help="also build the full film (all parts joined, one intro, no 'bersambung' cards)")
    ap.add_argument("--full-only", action="store_true", help="build only the full film")
    a = ap.parse_args()
    cfg = json.loads(a.config.read_text())
    if not LUT.exists():
        subprocess.run([sys.executable, str(HERE / "make_lut.py"), str(LUT)], check=True)
    a.out.mkdir(parents=True, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix="reels_")
    try:
        for reel in cfg["reels"]:
            if a.reel and reel["id"] != a.reel:
                continue
            bpm = a.bpm or reel["bpm"]
            music, offset = a.music, a.music_offset
            if music is None and reel.get("music") and not a.no_music:
                music = HERE / reel["music"]["file"]
                offset = reel["music"]["offset"]
            if a.mode == "storyboard":
                sheet, tl, total = storyboard(cfg, reel, bpm, a.src, a.out, tmp)
                print(f"{reel['id']}: {len(tl)} shots, {total:.1f}s @ {bpm} BPM -> {sheet}")
            elif not a.full_only:
                out, total = render_video(cfg, reel, bpm, a.src, a.out, tmp, a.mode, music, offset)
                print(f"{reel['id']}: {total:.1f}s -> {out}")
        if (a.full or a.full_only) and a.mode != "storyboard":
            build_full(cfg, a, tmp)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
