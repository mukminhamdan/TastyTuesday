#!/usr/bin/env python3
"""Render the title cards (transparent 1080x1920 PNGs) for the 3-part series.

  intro_partN.png   PART N / 3 . big gold script names . date
  next_partN.png    "bersambung" + PART N / 3 >   (end of parts 1 and 2)
  intro_full.png    names . date, no PART label (start of the full film)
  end_card.png      Selamat Pengantin Baru . names . date   (end of part 3)

Names are drawn in Great Vibes with a champagne-to-gold gradient, a dark soft
shadow for legibility on footage and a faint warm outer glow.
"""
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

HERE = Path(__file__).resolve().parent
F = HERE / "fonts"
W, H = 1080, 1920
GOLD_LIGHT = (250, 236, 200)
GOLD_DEEP = (196, 152, 78)
CREAM = (255, 246, 232)


def font(name, size, var=None):
    f = ImageFont.truetype(str(F / name), size)
    if var:
        try:
            f.set_variation_by_name(var)
        except Exception:
            pass
    return f


def text_mask(txt, fnt, spacing=0):
    """Alpha mask of `txt` (with optional letter spacing), tightly cropped."""
    if spacing:
        widths = [fnt.getbbox(ch)[2] - fnt.getbbox(ch)[0] if ch != " " else fnt.size // 3 for ch in txt]
        total = sum(widths) + spacing * (len(txt) - 1)
    else:
        b = fnt.getbbox(txt)
        total = b[2] - b[0]
    pad = fnt.size
    m = Image.new("L", (total + 2 * pad, int(fnt.size * 1.9) + 2 * pad), 0)
    d = ImageDraw.Draw(m)
    if spacing:
        x = pad
        for ch, w in zip(txt, widths):
            d.text((x - fnt.getbbox(ch)[0] if ch != " " else x, pad), ch, font=fnt, fill=255)
            x += w + spacing
    else:
        d.text((pad - fnt.getbbox(txt)[0], pad), txt, font=fnt, fill=255)
    return m.crop(m.getbbox())


def gradient(size, top, bottom):
    w, h = size
    g = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        g.putpixel((0, y), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return g.resize((w, h))


def place(canvas, mask, cx, cy, fill, shadow=0.55, glow=None):
    """Composite a text mask centred at (cx, cy) with shadow/glow; fill = colour or (top, bottom) gradient."""
    w, h = mask.size
    x, y = int(cx - w / 2), int(cy - h / 2)
    if shadow:
        sh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        a = Image.new("L", canvas.size, 0)
        a.paste(mask, (x + 3, y + 5))
        a = a.filter(ImageFilter.GaussianBlur(9)).point(lambda v: int(v * shadow))
        sh.putalpha(a)
        canvas.alpha_composite(sh)
    if glow:
        gl = Image.new("RGBA", canvas.size, glow[:3] + (0,))
        a = Image.new("L", canvas.size, 0)
        a.paste(mask, (x, y))
        a = a.filter(ImageFilter.GaussianBlur(22)).point(lambda v: int(v * glow[3]))
        gl.putalpha(a)
        canvas.alpha_composite(gl)
    if isinstance(fill[0], tuple):
        layer = gradient((w, h), *fill).convert("RGBA")
    else:
        layer = Image.new("RGBA", (w, h), fill + (255,))
    layer.putalpha(mask)
    canvas.alpha_composite(layer, (x, y))
    return y, y + h


def ornament(canvas, cy, half=150, color=GOLD_DEEP):
    d = ImageDraw.Draw(canvas)
    cx = W // 2
    d.line([(cx - half, cy), (cx - 18, cy)], fill=color + (230,), width=2)
    d.line([(cx + 18, cy), (cx + half, cy)], fill=color + (230,), width=2)
    d.polygon([(cx, cy - 9), (cx + 9, cy), (cx, cy + 9), (cx - 9, cy)], fill=color + (255,))


def scrim(alpha=120, cy=0.5, rx=0.75, ry=0.32):
    """Soft dark elliptical backdrop so the card reads over busy footage."""
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    d.ellipse([W * (0.5 - rx / 2), H * (cy - ry / 2), W * (0.5 + rx / 2), H * (cy + ry / 2)], fill=alpha)
    m = m.filter(ImageFilter.GaussianBlur(140))
    img = Image.new("RGBA", (W, H), (12, 8, 4, 0))
    img.putalpha(m)
    return img


def names_block(canvas, names, cy, big=230):
    a, b = [s.strip() for s in names.split("&")]
    script = font("GreatVibes-Regular.ttf", big)
    amp = font("GreatVibes-Regular.ttf", int(big * 0.55))
    gold = (GOLD_LIGHT, GOLD_DEEP)
    glow = (255, 214, 140, 0.35)
    place(canvas, text_mask(a, script), W / 2 - 40, cy - big * 0.55, gold, glow=glow)
    place(canvas, text_mask("&", amp), W / 2, cy + big * 0.02, gold, glow=glow)
    place(canvas, text_mask(b, script), W / 2 + 50, cy + big * 0.62, gold, glow=glow)
    return cy - big * 1.05, cy + big * 1.1


def intro(names, date, part, chapter):
    c = scrim(135, 0.47, 0.95, 0.45)
    top, bot = names_block(c, names, H * 0.46)
    label = font("Cinzel.ttf", 38, "Regular")
    place(c, text_mask(f"PART {part} / 3", label, spacing=10), W / 2, top - 70, GOLD_LIGHT, shadow=0.6)
    ornament(c, int(top - 20))
    datef = font("Cinzel.ttf", 56, "SemiBold")
    place(c, text_mask(date, datef, spacing=12), W / 2, bot + 55, CREAM, shadow=0.6)
    return c


def intro_full(names, date):
    c = scrim(135, 0.47, 0.95, 0.45)
    top, bot = names_block(c, names, H * 0.46)
    ornament(c, int(top - 20), half=170)
    datef = font("Cinzel.ttf", 56, "SemiBold")
    place(c, text_mask(date, datef, spacing=12), W / 2, bot + 55, CREAM, shadow=0.6)
    return c


def next_card(nxt, chapter):
    c = scrim(120, 0.83, 0.9, 0.18)
    sc = font("GreatVibes-Regular.ttf", 110)
    place(c, text_mask("bersambung", sc), W / 2, H * 0.80, (GOLD_LIGHT, GOLD_DEEP), glow=(255, 214, 140, 0.3))
    lab = font("Cinzel.ttf", 36, "Regular")
    place(c, text_mask(f"PART {nxt} / 3  ·  {chapter.upper()}  ›", lab, spacing=6), W / 2, H * 0.80 + 95, CREAM, shadow=0.6)
    return c


def end_card(names, date):
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hd = font("Cinzel.ttf", 44, "Regular")
    top, bot = names_block(c, names, H * 0.47, big=210)
    place(c, text_mask("SELAMAT PENGANTIN BARU", hd, spacing=9), W / 2, top - 60, GOLD_LIGHT, shadow=0)
    ornament(c, int(top - 5), half=170)
    datef = font("Cinzel.ttf", 52, "SemiBold")
    place(c, text_mask(date, datef, spacing=12), W / 2, bot + 55, CREAM, shadow=0)
    return c


def main():
    cfg = json.loads((HERE / "reels.json").read_text())
    out = HERE / "titles"
    out.mkdir(exist_ok=True)
    names, date = cfg["names"], cfg["date"]
    parts = cfg["reels"]
    for i, r in enumerate(parts, 1):
        intro(names, date, i, r["title"]).save(out / f"intro_part{i}.png")
        if i < len(parts):
            next_card(i + 1, parts[i]["title"]).save(out / f"next_part{i + 1}.png")
    intro_full(names, date).save(out / "intro_full.png")
    end_card(names, date).save(out / "end_card.png")
    print("titles ->", sorted(p.name for p in out.glob("*.png")))


if __name__ == "__main__":
    main()
