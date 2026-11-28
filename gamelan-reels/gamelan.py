#!/usr/bin/env python3
"""Gamelan performance reels: one vertical (1080x1920) cinematic edit per source file.

The source is a single static wide camera, so every "live" shot is a virtual camera
(a 9:16 crop on one player) taken at the SAME moment as the audio under it: the edit
behaves like a synced multi-cam and every mallet hit stays in sync. "Snap" shots are
candid freeze-frames of each player (from any moment of the performance) shown as a
photo print with a shutter flash; the music keeps running underneath.

The soundtrack is the ensemble's own playing: one continuous window that ends on the
piece's final gong. Cuts land on detected beats; the last shot starts on the gong.

  python3 gamelan.py candids  --src DIR --frames DIR --out DIR   # JPG stills of every player
  python3 gamelan.py sheet    --src DIR --frames DIR --out DIR   # crop check sheet
  python3 gamelan.py render   --src DIR --frames DIR --out DIR [--only gamelan_1]
"""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

HERE = Path(__file__).resolve().parent
W, H = 1080, 1920


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(f"FAILED: {' '.join(map(str, cmd))}\n{r.stderr[-3000:]}")
    return r


def load():
    cfg = json.loads((HERE / "edit.json").read_text())
    cfg["lut_path"] = str((HERE / cfg["lut"]).resolve())
    return cfg


# ------------------------------------------------------------------ beats / timeline
def beats_in(src, a, b):
    import librosa
    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / "a.wav"
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", str(src),
             "-vn", "-ac", "1", "-ar", "22050", str(wav)])
        y, sr = librosa.load(str(wav), sr=22050)
    o = librosa.onset.onset_strength(y=y, sr=sr, hop_length=256)
    _, fr = librosa.beat.beat_track(onset_envelope=o, sr=sr, hop_length=256)
    return librosa.frames_to_time(fr, sr=sr, hop_length=256) + a


def timeline(v, src, fps):
    """Shots with absolute source in/out times, cut on beats, frame-quantised."""
    final = v["final_hit"]
    bt = beats_in(src, v["start"] - 2, final + 1)
    k = int(np.argmin(abs(bt - v["start"])))
    start = float(bt[k])
    end = final + v["tail"]
    q = lambda t: start + round((t - start) * fps) / fps  # noqa: E731
    shots, i = [], k
    for s in v["shots"]:
        if s.get("final"):
            t0 = q(final)
            shots.append(dict(s, t0=t0, t1=q(end)))
            break
        t0 = q(bt[i])
        if s.get("fill"):
            t1 = q(final)
            shots.append(dict(s, t0=t0, t1=t1, nb=round((t1 - t0) / np.median(np.diff(bt)), 1)))
            continue
        i += s["beats"]
        shots.append(dict(s, t0=t0, t1=q(bt[i])))
    for a, b in zip(shots, shots[1:]):
        b["t0"] = a["t1"] = b["t0"]  # contiguous
    return start, end, shots


# ------------------------------------------------------------------ stills
def frame_path(cfg, v, frames_dir, n):
    return Path(frames_dir) / v["frames"] / f"{n:04d}.jpg"


def frame_time(v, n):
    return v["frame_start"] + n * v["frame_step"]


def grab(src, t, out):
    run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", str(src), "-frames:v", "1", str(out)])
    return Image.open(out).convert("RGB")


def candid_image(img, box):
    """4:5 crop: non-local-means denoise, lanczos upscale to 1080 wide, sharpen (no grade yet)."""
    c = img.crop(box)
    with tempfile.TemporaryDirectory() as td:
        a, b = Path(td) / "a.png", Path(td) / "b.png"
        c.save(a)
        run(["ffmpeg", "-v", "error", "-y", "-i", str(a), "-vf",
             f"nlmeans=s=2.2:p=5:r=11,scale=1080:-2:flags=lanczos,{','.join(SHARP)}", str(b)])
        return Image.open(b).convert("RGB")


def snap_card(img, box, tilt):
    """1080x1920: blurred, darkened backdrop + the candid as a bordered photo print."""
    x0, y0, x1, y1 = box
    cx = (x0 + x1) / 2
    bw = img.height * 9 / 16
    bx = max(0, min(img.width - bw, cx - bw / 2))
    bg = img.crop((int(bx), 0, int(bx + bw), img.height)).resize((W, H), Image.LANCZOS)
    bg = ImageEnhance.Brightness(bg.filter(ImageFilter.GaussianBlur(38))).enhance(0.55)
    photo = candid_image(img, box).resize((860, int(860 * (y1 - y0) / (x1 - x0))), Image.LANCZOS)
    b = 18
    framed = Image.new("RGB", (photo.width + 2 * b, photo.height + 2 * b), (247, 243, 236))
    framed.paste(photo, (b, b))
    framed = framed.convert("RGBA").rotate(tilt, resample=Image.BICUBIC, expand=True)
    canvas = bg.convert("RGBA")
    sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    a = Image.new("L", canvas.size, 0)
    px, py = (W - framed.width) // 2, (H - framed.height) // 2 - 20
    a.paste(framed.split()[3].point(lambda p: 170 if p else 0), (px + 10, py + 22))
    sh.putalpha(a.filter(ImageFilter.GaussianBlur(24)))
    canvas.alpha_composite(sh)
    canvas.alpha_composite(framed, (px, py))
    return canvas.convert("RGB")


# ------------------------------------------------------------------ filters
SHARP = ["cas=0.75", "unsharp=lx=13:ly=13:la=0.32:cx=5:cy=5:ca=0"]  # detail + clarity
DENOISE = "hqdn3d=1.5:1.5:3:3"


def grade(cfg, noise=False):
    """Premium Gold LUT + soft vignette. No glow or grain: keeps the image crisp."""
    return [f"lut3d=file='{cfg['lut_path']}':interp=tetrahedral", "vignette=angle=PI/7:mode=forward"]


def push(z, n, fps):
    return [f"scale={W*2}:{H*2}:flags=lanczos",
            f"zoompan=z='1+{z-1}*on/{n}':d=1:x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':s={W}x{H}:fps={fps}"]


def live_graph(cfg, crop, n, zoom, fade_in, fade_out, dur):
    fps = cfg["fps"]
    if crop.get("framed"):
        g = (f"[0:v]fps={fps},{DENOISE},setsar=1,split[a][b];"
             f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},gblur=sigma=30,"
             f"eq=brightness=-0.10:saturation=0.8[bg];[b]scale={W-80}:-2:flags=lanczos[fg];"
             f"[bg][fg]overlay=(W-w)/2:(H-h)/2")
    else:
        h = crop["h"]
        w = round(h * 9 / 16 / 2) * 2
        x = int(max(0, min(1920 - w, crop["cx"] - w / 2)))
        g = f"[0:v]fps={fps},crop={w}:{h}:{x}:{crop['y']},{DENOISE},setsar=1"
        if not zoom:
            g += f",scale={W}:{H}:flags=lanczos"
    if zoom:
        g += "," + ",".join(push(zoom, n, fps))
    g += "," + ",".join(SHARP + grade(cfg))
    if fade_in:
        g += f",fade=t=in:st=0:d={fade_in}"
    if fade_out:
        g += f",fade=t=out:st={dur - fade_out:.3f}:d={fade_out}"
    return g + f",trim=end_frame={n},setpts=PTS-STARTPTS,format=yuv420p[v]"


def snap_graph(cfg, n):
    fps = cfg["fps"]
    g = f"[0:v]fps={fps},setsar=1," + ",".join(push(1.035, n, fps))
    g += ",cas=0.4," + ",".join(grade(cfg))
    g += ",fade=t=in:st=0:d=0.22:color=white"
    return g + f",trim=end_frame={n},setpts=PTS-STARTPTS,format=yuv420p[v]"


ENC = ["-c:v", "libx264", "-preset", "slow", "-crf", "19", "-maxrate", "16M", "-bufsize", "32M", "-pix_fmt", "yuv420p"]


# ------------------------------------------------------------------ commands
def cmd_candids(cfg, a):
    out = Path(a.out) / "candid"
    out.mkdir(parents=True, exist_ok=True)
    for name, v in cfg["videos"].items():
        for sname, s in v["snaps"].items():
            img = Image.open(frame_path(cfg, v, a.frames, s["frame"])).convert("RGB")
            tmp = out / "_tmp.png"
            candid_image(img, s["box"]).save(tmp)
            dst = out / f"{name}_{sname}.jpg"
            run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp), "-vf", ",".join(grade(cfg, noise=False)),
                 "-q:v", "2", str(dst)])
            print("  ", dst.name)
        (out / "_tmp.png").unlink(missing_ok=True)


def cmd_sheet(cfg, a):
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    for name, v in cfg["videos"].items():
        src = Path(a.src) / v["src"]
        with tempfile.TemporaryDirectory() as td:
            img = grab(src, v["start"] + 5, Path(td) / "f.png")
        tiles = []
        for cname, c in v["crops"].items():
            if c.get("framed"):
                t = Image.new("RGB", (W, H), (20, 20, 20))
                t.paste(img.resize((W, int(W * 9 / 16))), (0, (H - int(W * 9 / 16)) // 2))
            else:
                w = round(c["h"] * 9 / 16)
                x = int(max(0, min(1920 - w, c["cx"] - w / 2)))
                t = img.crop((x, c["y"], x + w, c["y"] + c["h"])).resize((W, H))
            t = t.resize((270, 480))
            ImageDraw.Draw(t).text((6, 6), cname, fill=(255, 255, 0))
            tiles.append(t)
        for sname, s in v["snaps"].items():
            t = snap_card(Image.open(frame_path(cfg, v, a.frames, s["frame"])).convert("RGB"), s["box"], 0)
            t = t.resize((270, 480))
            ImageDraw.Draw(t).text((6, 6), sname, fill=(255, 255, 0))
            tiles.append(t)
        cols = 8
        sheet = Image.new("RGB", (270 * cols, 480 * ((len(tiles) + cols - 1) // cols)))
        for i, t in enumerate(tiles):
            sheet.paste(t, ((i % cols) * 270, (i // cols) * 480))
        sheet.save(out / f"sheet_{name}.jpg", quality=85)
        print("sheet ->", out / f"sheet_{name}.jpg")


def cmd_render(cfg, a):
    fps = cfg["fps"]
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    for name, v in cfg["videos"].items():
        if a.only and name not in a.only:
            continue
        src = Path(a.src) / v["src"]
        start, end, shots = timeline(v, src, fps)
        print(f"== {name}: {start:.2f} -> {end:.2f}  ({end - start:.1f}s, {len(shots)} shots)")
        work = out / f"_work_{name}"
        work.mkdir(exist_ok=True)
        segs, tilt = [], -2.2
        for i, s in enumerate(shots):
            f0 = round((s["t0"] - start) * fps)
            f1 = round((s["t1"] - start) * fps)
            n = f1 - f0
            dur = n / fps
            seg = work / f"s{i:02d}.mp4"
            label = s.get("live") or s.get("snap")
            print(f"  {i:2d} {label:10s} {s['t0'] - start:6.2f}s  {dur:5.2f}s" + (f"  (fill {s['nb']} beats)" if s.get("fill") else ""))
            if "snap" in s:
                sn = v["snaps"][s["snap"]]
                png = work / f"snap_{s['snap']}.png"
                snap_card(Image.open(frame_path(cfg, v, a.frames, sn["frame"])).convert("RGB"), sn["box"], tilt).save(png)
                tilt = -tilt
                cmd = ["ffmpeg", "-v", "error", "-y", "-loop", "1", "-framerate", str(fps), "-t", f"{dur + 0.5:.3f}",
                       "-i", str(png), "-filter_complex", snap_graph(cfg, n), "-map", "[v]"]
            else:
                g = live_graph(cfg, v["crops"][s["live"]], n, s.get("zoom"), s.get("fade_in"), s.get("fade_out"), dur)
                cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{start + f0 / fps:.4f}", "-t", f"{dur + 0.5:.3f}",
                       "-i", str(src), "-filter_complex", g, "-map", "[v]"]
            run(cmd + ENC + ["-r", str(fps), "-an", str(seg)])
            segs.append(seg)
        lst = work / "list.txt"
        lst.write_text("".join(f"file '{p.resolve()}'\n" for p in segs))
        vid = work / "video.mp4"
        run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(vid)])
        total = sum(round((s["t1"] - start) * fps) - round((s["t0"] - start) * fps) for s in shots) / fps
        # soundtrack: the performance itself, same window, two-pass loudnorm to -14 LUFS
        af = f"afade=t=in:d=0.5,afade=t=out:st={total - 2.2:.3f}:d=2.2"
        r = run(["ffmpeg", "-v", "info", "-y", "-ss", f"{start:.4f}", "-t", f"{total:.4f}", "-i", str(src), "-vn",
                 "-af", af + ",loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"])
        st = r.stderr
        m = json.loads(st[st.rindex("{"):st.rindex("}") + 1])
        ln = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
              f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
        final = out / f"{name}.mp4"
        run(["ffmpeg", "-v", "error", "-y", "-i", str(vid), "-ss", f"{start:.4f}", "-t", f"{total:.4f}", "-i", str(src),
             "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", af + "," + ln + ",aresample=48000",
             "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-movflags", "+faststart", "-shortest", str(final)])
        print(f"  -> {final}  ({total:.2f}s)")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("cmd", choices=["candids", "sheet", "render"])
    p.add_argument("--src", required=True)
    p.add_argument("--frames", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--only", nargs="*")
    a = p.parse_args()
    cfg = load()
    {"candids": cmd_candids, "sheet": cmd_sheet, "render": cmd_render}[a.cmd](cfg, a)


if __name__ == "__main__":
    main()
