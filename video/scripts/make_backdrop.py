"""Procedural cooking-show backdrop: dark slate worktop, warm practical light, soft bokeh."""
import numpy as np
from PIL import Image, ImageFilter
W, H = 1920, 1080
rng = np.random.default_rng(42)


def noise(scale):
    small = rng.random((H // scale + 2, W // scale + 2)).astype(np.float32)
    img = Image.fromarray((small * 255).astype(np.uint8)).resize((W + 2 * scale, H + 2 * scale), Image.BICUBIC)
    return np.asarray(img, np.float32)[scale:scale + H, scale:scale + W] / 255


# fractal stone texture
stone = sum(noise(s) * w for s, w in [(240, 0.45), (90, 0.25), (30, 0.15), (8, 0.1), (2, 0.05)])
stone = (stone - stone.min()) / (stone.max() - stone.min())
# faint mineral veins
veins = np.abs(np.sin((noise(160) * 9 + np.linspace(0, 6, W)[None, :] * 0.6) * np.pi))
veins = np.clip(1 - veins * 18, 0, 1) * 0.35
base = np.array([20, 17, 15], np.float32)
img = base[None, None, :] + (stone[..., None] - 0.5) * np.array([26, 23, 20]) + veins[..., None] * np.array([18, 15, 12])

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
# warm practical light (top right) + cool fill (bottom left)
warm = np.exp(-(((xx - W * 0.82) / (W * 0.45)) ** 2 + ((yy - H * 0.05) / (H * 0.65)) ** 2))
cool = np.exp(-(((xx - W * 0.05) / (W * 0.5)) ** 2 + ((yy - H * 1.0) / (H * 0.6)) ** 2))
img += warm[..., None] * np.array([46, 26, 10]) + cool[..., None] * np.array([2, 8, 12])

# bokeh: out-of-focus kitchen lights
bok = Image.new("RGB", (W, H), (0, 0, 0))
from PIL import ImageDraw
d = ImageDraw.Draw(bok)
for _ in range(16):
    x = rng.uniform(W * 0.62, W * 1.05); y = rng.uniform(-60, H * 0.22)
    r = rng.uniform(18, 70); a = rng.uniform(20, 55)
    c = (int(255 * a / 100), int(170 * a / 100), int(90 * a / 100))
    d.ellipse([x - r, y - r, x + r, y + r], fill=c)
bok = np.asarray(bok.filter(ImageFilter.GaussianBlur(16)), np.float32) * 0.32
img += bok

# vignette + grain
vig = 1 - 0.55 * (((xx - W / 2) / (W * 0.62)) ** 2 + ((yy - H / 2) / (H * 0.7)) ** 2)
img *= np.clip(vig, 0.35, 1)[..., None]
img += rng.normal(0, 2.2, (H, W, 1))
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(__import__("sys").argv[1], optimize=True)
print("ok")
