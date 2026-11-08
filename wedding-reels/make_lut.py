#!/usr/bin/env python3
"""Generate the "Warm Romantic" 3D LUT (.cube, 33^3) used for all three reels.

Look:
  * soft filmic contrast with lifted blacks and rolled-off highlights
  * golden highlights, warm-brown shadows (no teal)
  * overall saturation slightly down; deep reds (the couple's outfits) tamed
    so they don't clip, skin tones kept natural

The .cube file also works in Premiere / DaVinci / CapCut / VN if the reels
are finished in an NLE instead of with render.py.
"""
import sys
from pathlib import Path

import numpy as np

N = 33


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def grade(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b

    # 1) Saturation: global -8%, extra -14% on saturated reds/oranges.
    mx = np.max(rgb, axis=-1)
    mn = np.min(rgb, axis=-1)
    sat = np.where(mx > 1e-6, (mx - mn) / np.maximum(mx, 1e-6), 0)
    redness = np.clip((r - np.maximum(g, b)) / np.maximum(mx, 1e-6), 0, 1)
    red_cut = 0.14 * smoothstep(0.35, 0.8, redness) * smoothstep(0.4, 0.9, sat)
    s = 0.92 - red_cut
    rgb = luma[..., None] + (rgb - luma[..., None]) * s[..., None]

    # 2) Split toning: warm-brown shadows, golden highlights.
    luma = 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]
    sh = (1 - smoothstep(0.0, 0.45, luma))[..., None]
    hi = smoothstep(0.45, 1.0, luma)[..., None]
    rgb = rgb + sh * np.array([0.018, 0.006, -0.012]) + hi * np.array([0.030, 0.012, -0.035])

    # 3) Filmic tone curve: lifted blacks (0.035), soft S, highlight roll-off (0.965).
    x = np.clip(rgb, 0, 1)
    k = 0.22  # blend towards smoothstep = gentle S-curve
    s_curve = x * (1 - k) + (x * x * (3 - 2 * x)) * k
    rgb = 0.035 + s_curve * (0.965 - 0.035)

    return np.clip(rgb, 0, 1)


def main(out):
    lin = np.linspace(0, 1, N)
    # .cube order: R changes fastest, then G, then B.
    b, g, r = np.meshgrid(lin, lin, lin, indexing="ij")
    rgb = np.stack([r, g, b], axis=-1).reshape(-1, 3)
    out_rgb = grade(rgb)
    with open(out, "w") as f:
        f.write('TITLE "Warm Romantic Wedding"\n')
        f.write(f"LUT_3D_SIZE {N}\n")
        f.write("DOMAIN_MIN 0.0 0.0 0.0\nDOMAIN_MAX 1.0 1.0 1.0\n")
        for row in out_rgb:
            f.write(f"{row[0]:.6f} {row[1]:.6f} {row[2]:.6f}\n")
    print("wrote", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).with_name("warm_romantic.cube")))
