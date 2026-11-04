"""Procedural white granite worktop backdrop (light theme)."""
import sys
import numpy as np
from PIL import Image, ImageFilter
W, H = 1920, 1080
rng = np.random.default_rng(7)


def noise(scale):
    small = rng.random((H // scale + 2, W // scale + 2)).astype(np.float32)
    img = Image.fromarray((small * 255).astype(np.uint8)).resize((W + 2 * scale, H + 2 * scale), Image.BICUBIC)
    return np.asarray(img, np.float32)[scale:scale + H, scale:scale + W] / 255


clouds = sum(noise(s) * w for s, w in [(300, 0.5), (110, 0.3), (40, 0.2)])
clouds = (clouds - clouds.min()) / (clouds.max() - clouds.min())
img = np.array([236, 233, 228], np.float32)[None, None, :] - (clouds[..., None] * np.array([16, 16, 15]))

# granite grains: irregular, clustered blobs at several sizes (not uniform dots)
cluster = noise(70)
quartz = np.clip((noise(10) - 0.62) * 4, 0, 1) * (0.5 + cluster)        # soft translucent grey patches
img -= quartz[..., None] * np.array([14, 14, 13])
grains = np.zeros((H, W), np.float32)
for sc, th, val in [(5, 0.88, 1.0), (3, 0.91, 0.9), (2, 0.95, 0.8)]:
    g = noise(sc)
    grains = np.maximum(grains, np.clip((g - (th - 0.12 * cluster)) * 12, 0, 1) * val)
grains = np.asarray(Image.fromarray((grains * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), np.float32) / 255
warm = noise(40)[..., None]
dark = np.array([46, 45, 44]) * (1 - warm * 0.5) + np.array([110, 88, 70]) * warm * 0.5
img = img * (1 - grains[..., None] * 0.62) + dark * grains[..., None] * 0.62

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
light = np.exp(-(((xx - W * 0.8) / (W * 0.6)) ** 2 + ((yy - H * 0.1) / (H * 0.8)) ** 2))
img += light[..., None] * np.array([10, 7, 3])
vig = 1 - 0.18 * (((xx - W / 2) / (W * 0.6)) ** 2 + ((yy - H / 2) / (H * 0.7)) ** 2)
img *= np.clip(vig, 0.75, 1)[..., None]
img += rng.normal(0, 1.5, (H, W, 1))
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(sys.argv[1], optimize=True)
print("ok")
