#!/usr/bin/env python3
"""Generate the "Premium Gold" 3D LUT (.cube, 33^3) for the gamelan reels.

Look (clean, rich, crisp; built for black-and-gold costumes on a beige stage):
  * cleaner whites: the warm tungsten cast is pulled back a little
  * filmic contrast: deep (not crushed) blacks, firm mids, soft highlight shoulder
  * gold / brass / yellow embroidery pushed richer and slightly brighter
  * skin tones protected; low-saturation beige backdrop calmed down
  * subtle split tone: near-neutral shadows, warm golden highlights

The .cube also works in Premiere / DaVinci / CapCut / VN / Lightroom.
"""
import sys
from pathlib import Path

import numpy as np

N = 33


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def hue_sat(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn
    sat = np.where(mx > 1e-6, d / np.maximum(mx, 1e-6), 0)
    dd = np.maximum(d, 1e-6)
    h = np.where(mx == r, ((g - b) / dd) % 6, np.where(mx == g, (b - r) / dd + 2, (r - g) / dd + 4)) * 60
    return np.where(d > 1e-6, h, 0), sat


def band(h, c, w):
    """Smooth hue window centred on c (degrees), half-width w."""
    d = np.abs((h - c + 180) % 360 - 180)
    return 1 - smoothstep(w * 0.5, w, d)


def grade(rgb):
    # 1) white balance: pull back some of the tungsten warmth
    rgb = rgb * np.array([0.975, 1.0, 1.035])
    rgb = np.clip(rgb, 0, 1)

    # 2) selective saturation
    luma = rgb @ np.array([0.2126, 0.7152, 0.0722])
    h, s = hue_sat(rgb)
    gold = band(h, 48, 26) * smoothstep(0.18, 0.45, s)          # brass, gold thread
    skin = band(h, 24, 14) * smoothstep(0.12, 0.3, s) * (1 - smoothstep(0.55, 0.8, s))
    beige = (1 - smoothstep(0.08, 0.28, s)) * smoothstep(0.35, 0.6, luma)  # backdrop / floor
    sat_gain = 1.05 + 0.18 * gold - 0.14 * skin - 0.18 * beige
    rgb = luma[..., None] + (rgb - luma[..., None]) * sat_gain[..., None]
    rgb = rgb * (1 + gold[..., None] * np.array([0.07, 0.03, -0.02]))  # gold: brighter, warmer (not lime)

    # 3) split tone
    luma = rgb @ np.array([0.2126, 0.7152, 0.0722])
    sh = (1 - smoothstep(0.0, 0.4, luma))[..., None]
    hi = smoothstep(0.55, 1.0, luma)[..., None]
    rgb = rgb + sh * np.array([-0.004, 0.000, 0.004]) + hi * np.array([0.018, 0.008, -0.016])

    # 4) filmic tone curve: firm S, deep blacks (0.012), soft shoulder (0.975)
    x = np.clip(rgb, 0, 1)
    k = 0.42
    s_curve = x * (1 - k) + (x * x * (3 - 2 * x)) * k
    rgb = 0.012 + s_curve * (0.975 - 0.012)
    return np.clip(rgb, 0, 1)


def main(out):
    lin = np.linspace(0, 1, N)
    b, g, r = np.meshgrid(lin, lin, lin, indexing="ij")  # .cube: R fastest
    rgb = np.stack([r, g, b], axis=-1).reshape(-1, 3)
    o = grade(rgb)
    with open(out, "w") as f:
        f.write('TITLE "Premium Gold"\n')
        f.write(f"LUT_3D_SIZE {N}\nDOMAIN_MIN 0.0 0.0 0.0\nDOMAIN_MAX 1.0 1.0 1.0\n")
        for row in o:
            f.write(f"{row[0]:.6f} {row[1]:.6f} {row[2]:.6f}\n")
    print("wrote", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).with_name("premium_gold.cube")))
