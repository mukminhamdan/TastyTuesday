# Layering: video (background, softly calmed) -> "[ROTI GULA]" text -> person cutout on top.
import sys, subprocess, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont

SRC, ALPHA, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
PREVIEW = sys.argv[4:]  # optional frame numbers -> write PNGs only
W, H, FPS = 720, 1280, 30
A0 = 107                       # first frame of the stored matte (shot start)
TEXT = "[ROTI GULA]"
FONT = "/usr/share/fonts/opentype/inter/InterDisplay-Black.otf"

# Timing (seconds), from word timestamps + audio energy: "roti" ~5.56s, "gula." ends ~6.52s, cut at 6.967s.
T_IN = 5.50        # first letter starts
STAGGER = 0.035    # delay between letters
LETTER_DUR = 0.32  # per-letter in-animation
T_OUT = 6.52       # sentence ends -> start fade-out
OUT_DUR = 0.36     # fully gone by 6.88, before the cut
RISE = 26          # px the letters rise into place
BLUR0 = 9.0        # starting blur sigma per letter
BG_IN, BG_OUT = (5.30, 5.62), (6.52, 6.90)   # background calm-down ramps

def ease_out(t): t = np.clip(t, 0, 1); return 1 - (1 - t) ** 3
def ease_io(t): t = np.clip(t, 0, 1); return t * t * (3 - 2 * t)

# --- pre-render each glyph as an RGBA tile at its final position ---
font_size = 106
font = ImageFont.truetype(FONT, font_size)
tracking = -2
widths = [font.getlength(c) + (22 if c == " " else 0) for c in TEXT]
total = sum(widths) + tracking * (len(TEXT) - 1)
x0 = (W - total) / 2
print("text width", total)
BASE_Y = 572  # baseline: glyph bottoms tuck slightly behind the top of the head
asc = font.getmetrics()[0]
glyphs = []
x = x0
for c, w in zip(TEXT, widths):
    if c != " ":
        pad = 40
        tile = Image.new("L", (int(w) + 2 * pad, font_size + 2 * pad), 0)
        ImageDraw.Draw(tile).text((pad, pad), c, font=font, fill=255)
        glyphs.append((np.asarray(tile, np.float32) / 255, int(round(x)) - pad, BASE_Y - asc - pad))
    else:
        glyphs.append(None)
    x += w + tracking

def text_layer(t):
    """Returns coverage (H,W) float for the text at time t (already includes fade/blur)."""
    cov = np.zeros((H, W), np.float32)
    out_k = ease_io((t - T_OUT) / OUT_DUR)
    for i, g in enumerate(glyphs):
        if g is None: continue
        k = ease_out((t - T_IN - i * STAGGER) / LETTER_DUR)
        op = k * (1 - out_k)
        if op <= 0.002: continue
        tile, gx, gy = g
        sig = BLUR0 * (1 - k) + 4.0 * out_k
        if sig > 0.3: tile = cv2.GaussianBlur(tile, (0, 0), sig)
        gy += int(round(RISE * (1 - k) - 10 * out_k))
        y1, x1 = max(gy, 0), max(gx, 0)
        y2, x2 = min(gy + tile.shape[0], H), min(gx + tile.shape[1], W)
        sub = tile[y1 - gy:y2 - gy, x1 - gx:x2 - gx] * op
        cov[y1:y2, x1:x2] = np.maximum(cov[y1:y2, x1:x2], sub)
    return cov

# --- matte cleanup ---
alphas = np.load(ALPHA)
yy, xx = np.mgrid[0:H, 0:W]
ghost = (xx < 163) & (yy > 560)               # blurred side panel the model half-detects
def clean_alpha(a):
    a = a.astype(np.float32) / 255
    a[ghost] = 0
    # keep only the main subject
    n, lab, stats, _ = cv2.connectedComponentsWithStats((a > 0.5).astype(np.uint8))
    if n > 1:
        keep = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        gate = cv2.dilate((lab == keep).astype(np.uint8), np.ones((15, 15), np.uint8)).astype(np.float32)
        a *= cv2.GaussianBlur(gate, (0, 0), 4)
    # tighten edge 1px and soften so no hard line or halo shows
    a = cv2.erode(a, np.ones((3, 3), np.uint8))
    a = ease_io((a - 0.30) / 0.55)          # firm up RVM's wide soft transition
    a = cv2.GaussianBlur(a, (0, 0), 1.0)     # ~2px feather: no hard cut line
    return a

# vertical gate: calm only the upper area around the text; leave captions / lower frame untouched
vgate = np.clip((820 - yy) / 110.0, 0, 1).astype(np.float32)
vgate = vgate * vgate * (3 - 2 * vgate)

def process(frame, fi):
    t = fi / FPS
    if not (T_IN - 0.3 <= t <= T_OUT + OUT_DUR + 0.05) or fi - A0 >= len(alphas):
        return frame
    a = clean_alpha(alphas[fi - A0])[..., None]
    f = frame.astype(np.float32)
    # 1) background: gentle dim + blur + desaturate to reduce distraction
    bgk = ease_io((t - BG_IN[0]) / (BG_IN[1] - BG_IN[0])) * (1 - ease_io((t - BG_OUT[0]) / (BG_OUT[1] - BG_OUT[0])))
    bg = f
    if bgk > 0:
        calm = cv2.GaussianBlur(f, (0, 0), 3.0)
        g = calm.mean(axis=2, keepdims=True)
        calm = (calm * 0.6 + g * 0.4) * 0.56
        m = (bgk * vgate)[..., None]
        bg = f * (1 - m) + calm * m
    # 2) text: soft shadow then white fill
    cov = text_layer(t)[..., None]
    if cov.max() > 0:
        sh = cv2.GaussianBlur(cov[..., 0], (0, 0), 10)[..., None] * 0.65
        sh = np.roll(sh, 6, axis=0)
        bg = bg * (1 - sh)
        fill = np.array([255, 250, 240], np.float32)  # warm white
        bg = bg * (1 - cov) + fill * cov
    # 3) person on top; edge pixels still carry the bright cabinet colour, so pull their
    #    colour from the solid interior to avoid a light fringe against the darker layers
    inner = (a[..., 0] > 0.92).astype(np.float32)
    den = cv2.GaussianBlur(inner, (0, 0), 5)[..., None] + 1e-4
    fg_est = cv2.GaussianBlur(f * inner[..., None], (0, 0), 5) / den
    solid = ease_io((a - 0.80) / 0.18)
    fg = f * solid + fg_est * (1 - solid)
    out = fg * a + bg * (1 - a)
    return np.clip(out + 0.5, 0, 255).astype(np.uint8)

if PREVIEW:
    for s in PREVIEW:
        fi = int(s)
        r = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{fi/FPS:.4f}", "-i", SRC, "-frames:v", "1",
                            "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        fr = np.frombuffer(r, np.uint8).reshape(H, W, 3)
        cv2.imwrite(f"{OUT}_{fi}.png", cv2.cvtColor(process(fr, fi), cv2.COLOR_RGB2BGR))
    sys.exit()

dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", SRC, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
                        "-i", "-", "-i", SRC, "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "slow", "-crf", "17",
                        "-pix_fmt", "yuv420p", "-c:a", "copy", "-movflags", "+faststart", OUT], stdin=subprocess.PIPE)
fi = 0
while True:
    buf = dec.stdout.read(W * H * 3)
    if len(buf) < W * H * 3: break
    enc.stdin.write(process(np.frombuffer(buf, np.uint8).reshape(H, W, 3), fi).tobytes())
    fi += 1
enc.stdin.close(); enc.wait()
print("frames", fi)
