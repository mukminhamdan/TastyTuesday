#!/usr/bin/env python3
"""Ten sharp candid stills from the gamelan footage.

For every pick, all frames within +-WINDOW seconds of the chosen moment are decoded
straight from the video (no intermediate JPEG) and scored by the sharpness of the
player's face region (variance of the Laplacian); the sharpest frame wins. The crop
is kept wide enough that the upscale stays small, then: gentle non-local-means
denoise, lanczos resize, adaptive + fine + clarity sharpening, Premium Gold LUT.

  python3 stills.py --src DIR --out DIR
"""
import argparse
import json
import subprocess
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
WINDOW = 2.0
SW, SH = 1920, 1080

# name, source, moment (s), crop box [x0,y0,x1,y1] (4:5 or full frame), face box
PICKS = [
    ("01_saron",    "video_20261128_115835.mp4", 1275, [880, 230, 1560, 1080], [1100, 380, 1300, 620]),
    ("02_gendang",  "video_20261128_115835.mp4", 795,  [0, 230, 680, 1080],   [230, 450, 380, 620]),
    ("03_kenong",   "video_20261128_115835.mp4", 1203, [600, 230, 1280, 1080],  [840, 380, 960, 520]),
    ("04_gambang",  "video_20261128_115835.mp4", 1083, [1160, 230, 1840, 1080], [1410, 400, 1560, 580]),
    ("05_ensemble", "video_20261128_115835.mp4", 1500, [0, 0, 1920, 1080],     [1100, 380, 1300, 620]),
    ("06_saron",    "video_20261128_130000.mp4", 1169, [760, 230, 1440, 1080], [980, 420, 1140, 600]),
    ("07_gendang",  "video_20261128_130000.mp4", 881,  [0, 230, 680, 1080],    [120, 450, 280, 620]),
    ("08_kenong_gong", "video_20261128_130000.mp4", 1337, [560, 330, 1040, 930], [760, 370, 860, 480]),
    ("09_gambang",  "video_20261128_130000.mp4", 1739, [1060, 230, 1740, 1080], [1290, 380, 1440, 560]),
    ("10_ensemble", "video_20261128_130000.mp4", 900,  [0, 0, 1920, 1080],     [960, 420, 1140, 600]),
]


def lap_var(g):
    g = g.astype(np.float32)
    lap = 4 * g[1:-1, 1:-1] - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:]
    return float(lap.var())


def sharpest(src, t, face):
    """Decode every frame in [t-WINDOW, t+WINDOW]; return (time, rgb frame) of the sharpest face."""
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{max(0, t - WINDOW):.3f}", "-t", f"{2 * WINDOW:.3f}", "-i", str(src),
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    n, best, best_s, best_i = SW * SH * 3, None, -1, 0
    x0, y0, x1, y1 = face
    i = 0
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n:
            break
        f = np.frombuffer(buf, np.uint8).reshape(SH, SW, 3)
        s = lap_var(f[y0:y1, x0:x1].mean(axis=2))
        if s > best_s:
            best, best_s, best_i = f.copy(), s, i
        i += 1
    p.wait()
    return max(0, t - WINDOW) + best_i / 26.0, best, best_s, i


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", nargs="*")
    a = ap.parse_args()
    lut = (HERE / json.loads((HERE / "edit.json").read_text())["lut"]).resolve()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    for name, srcname, t, box, face in PICKS:
        if a.only and name not in a.only:
            continue
        tt, frame, score, nfr = sharpest(Path(a.src) / srcname, t, face)
        x0, y0, x1, y1 = box
        crop = np.ascontiguousarray(frame[y0:y1, x0:x1])
        w, h = x1 - x0, y1 - y0
        ow, oh = (1920, 1080) if w == SW else (1080, 1350)
        up = ow / w
        # gentler denoise when barely upscaled; sharpening tuned to the upscale factor
        dn = "nlmeans=s=1.2:p=3:r=9" if up < 1.2 else "nlmeans=s=1.8:p=5:r=11"
        fine = f"unsharp=lx=5:ly=5:la={0.55 if up < 1.2 else 0.8}:cx=5:cy=5:ca=0"
        vf = (f"{dn},scale={ow}:{oh}:flags=lanczos,cas=0.7,{fine},"
              f"unsharp=lx=13:ly=13:la=0.25:cx=5:cy=5:ca=0,"
              f"lut3d=file='{lut}':interp=tetrahedral,vignette=angle=PI/8:mode=forward")
        dst = out / f"gamelan_{name}.jpg"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}",
                        "-i", "-", "-vf", vf, "-q:v", "1", "-pix_fmt", "yuvj444p", str(dst)],
                       input=crop.tobytes(), check=True)
        print(f"{dst.name}: t={tt:.2f}s (of {nfr} frames)  sharpness={score:.0f}  upscale x{up:.2f}")


if __name__ == "__main__":
    main()
