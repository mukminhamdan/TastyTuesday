"""Synthesise the SFX pack and background music used by the edit.

Everything is generated from scratch (no third-party samples), so there are no
licensing issues when posting to TikTok / Instagram.

Usage: python3 -I scripts/gen_audio.py <out_dir>
"""
import sys
import os
import numpy as np
import soundfile as sf

SR = 48000
rng = np.random.default_rng(7)
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/sfx"
os.makedirs(OUT, exist_ok=True)


# ---------------------------------------------------------------- helpers
def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def env_adsr(n, a, d, s, r, sustain_level=0.7):
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    s_n = max(n - a - d - r, 0)
    e = np.concatenate([
        np.linspace(0, 1, a, endpoint=False) ** 1.5,
        np.linspace(1, sustain_level, d, endpoint=False),
        np.full(s_n, sustain_level),
        np.linspace(sustain_level, 0, r) ** 2,
    ])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def exp_env(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def svf_bandpass(x, fc, q=2.0):
    """State-variable band-pass with per-sample cutoff (fc may be an array)."""
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape)
    low = band = 0.0
    y = np.empty_like(x)
    damp = 1.0 / q
    for i in range(len(x)):
        f = 2 * np.sin(np.pi * min(fc[i], SR / 6) / SR)
        low += f * band
        high = x[i] - low - damp * band
        band += f * high
        y[i] = band
    return y


def svf_lowpass(x, fc, q=0.8):
    fc = np.broadcast_to(np.asarray(fc, dtype=float), x.shape)
    low = band = 0.0
    y = np.empty_like(x)
    damp = 1.0 / q
    for i in range(len(x)):
        f = 2 * np.sin(np.pi * min(fc[i], SR / 6) / SR)
        low += f * band
        high = x[i] - low - damp * band
        band += f * high
        y[i] = low
    return y


def reverb_ir(dur=1.6, decay=0.45, bright=6000):
    n = int(dur * SR)
    ir = np.zeros((n, 2))
    for ch in range(2):
        noise = rng.standard_normal(n)
        noise = onepole_lp(noise, bright)
        ir[:, ch] = noise * np.exp(-np.arange(n) / (decay * SR))
    ir[:int(0.012 * SR)] = 0  # pre-delay
    return ir / np.sqrt((ir ** 2).sum(axis=0))


IR_SMALL = reverb_ir(0.9, 0.18, 7000)
IR_HALL = reverb_ir(2.4, 0.6, 5000)


def conv_stereo(x, ir):
    from scipy.signal import fftconvolve
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    out = np.stack([fftconvolve(x[:, c], ir[:, c]) for c in range(2)], axis=1)
    return out


def add_reverb(x, ir, wet=0.25):
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    w = conv_stereo(x, ir)
    dry = np.pad(x, ((0, len(w) - len(x)), (0, 0)))
    return dry * (1 - wet) + w * wet


def pan(x, p):
    """p: -1..1, scalar or array. Equal-power."""
    p = np.broadcast_to(np.asarray(p, dtype=float), x.shape)
    ang = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(ang), x * np.sin(ang)], axis=1)


def soft_clip(x, drive=1.0):
    return np.tanh(x * drive) / np.tanh(drive)


def finish(x, peak_db=-1.0, fade_out=0.02):
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    # trim trailing silence
    mag = np.abs(x).max(axis=1)
    idx = np.where(mag > 1e-4)[0]
    if len(idx):
        x = x[: idx[-1] + 1]
    fo = int(fade_out * SR)
    if fo and len(x) > fo:
        x[-fo:] *= np.linspace(1, 0, fo)[:, None]
    x = x - x.mean(axis=0)
    x = x / (np.abs(x).max() + 1e-9) * 10 ** (peak_db / 20)
    return x.astype(np.float32)


def save(name, x, peak_db=-1.0):
    sf.write(os.path.join(OUT, name + ".wav"), finish(x, peak_db), SR, subtype="PCM_24")
    print("wrote", name)


# ---------------------------------------------------------------- SFX
def whoosh(dur=0.7, f0=300, f1=4500, peak=0.45, name="whoosh"):
    t = t_axis(dur)
    n = len(t)
    noise = rng.standard_normal(n)
    # bell-shaped intensity peaking at `peak` of the duration
    shape = np.exp(-((t / dur - peak) ** 2) / 0.035)
    fc = f0 * (f1 / f0) ** np.clip(shape * 1.0, 0, 1)
    body = svf_bandpass(noise, fc, q=1.4) * shape
    air = svf_bandpass(rng.standard_normal(n), fc * 2.2, q=3.0) * shape ** 2 * 0.35
    sig = body + air
    st = pan(sig, np.linspace(-0.7, 0.7, n))
    save(name, add_reverb(st, IR_SMALL, 0.22))


def pop(name="pop", f_start=1200, f_end=260, dur=0.12):
    t = t_axis(dur)
    f = f_end + (f_start - f_end) * np.exp(-t / 0.012)
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = np.sin(ph) * exp_env(len(t), 0.03)
    click = rng.standard_normal(len(t)) * exp_env(len(t), 0.0015) * 0.6
    sig = soft_clip(tone + svf_lowpass(click, 6000), 1.6)
    save(name, add_reverb(sig, IR_SMALL, 0.12))


def bubbles(dur=2.6, count=26, name="bubbles"):
    n = int(dur * SR)
    out = np.zeros((n, 2))
    for _ in range(count):
        start = rng.uniform(0, dur - 0.15)
        f0 = rng.uniform(380, 1300)
        bd = rng.uniform(0.03, 0.09)
        t = t_axis(bd)
        # bubbles chirp upward as they resonate (Minnaert)
        f = f0 * (1 + 2.4 * t / bd)
        ph = 2 * np.pi * np.cumsum(f) / SR
        b = np.sin(ph) * np.exp(-t / (bd * 0.35)) * rng.uniform(0.3, 1.0)
        s = int(start * SR)
        out[s:s + len(b)] += pan(b, rng.uniform(-0.8, 0.8))
    simmer = svf_lowpass(rng.standard_normal(n), 900) * 0.05
    out += pan(simmer, 0)
    fade = np.minimum(1, np.minimum(np.arange(n) / (0.25 * SR), (n - np.arange(n)) / (0.5 * SR)))
    save(name, add_reverb(out * fade[:, None], IR_SMALL, 0.2), peak_db=-3)


def sparkle(name="sparkle", dur=1.3):
    """Honey shimmer: glassy FM bells cascading upward."""
    n = int(dur * SR)
    out = np.zeros((n, 2))
    notes = [1318.5, 1760.0, 2093.0, 2637.0, 3136.0, 3520.0]
    for i, f in enumerate(notes):
        s = int(i * 0.055 * SR)
        t = t_axis(dur - i * 0.055)
        mod = np.sin(2 * np.pi * f * 3.5 * t) * 1.2 * np.exp(-t / 0.15)
        b = np.sin(2 * np.pi * f * t + mod) * np.exp(-t / 0.35) * (0.9 - i * 0.08)
        out[s:s + len(b)] += pan(b, -0.6 + i * 0.24)
    glitter = svf_bandpass(rng.standard_normal(n), 9000, 4) * exp_env(n, 0.4) * 0.25
    out += pan(glitter, 0)
    save(name, add_reverb(out, IR_HALL, 0.35), peak_db=-2)


def ding(name="ding", f=1567.98, dur=1.8):
    t = t_axis(dur)
    partials = [(1, 1.0, 0.9), (2.0, 0.45, 0.5), (2.76, 0.3, 0.35), (5.4, 0.15, 0.2), (8.93, 0.08, 0.1)]
    sig = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / tau) for m, a, tau in partials)
    sig *= np.minimum(1, t / 0.002)
    save(name, add_reverb(sig, IR_HALL, 0.3))


def impact(name="impact", dur=1.8):
    t = t_axis(dur)
    n = len(t)
    f = 38 + 90 * np.exp(-t / 0.05)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.45)
    crack = svf_lowpass(rng.standard_normal(n), 3500 * np.exp(-t / 0.08) + 200) * np.exp(-t / 0.07)
    sig = soft_clip(sub * 1.2 + crack * 0.8, 2.2)
    save(name, add_reverb(sig, IR_HALL, 0.3))


def riser(name="riser", dur=1.6):
    t = t_axis(dur)
    n = len(t)
    prog = t / dur
    noise = svf_bandpass(rng.standard_normal(n), 400 + 7000 * prog ** 2, q=2.5)
    f = 220 * 2 ** (prog * 2)
    tone = sum(np.sin(2 * np.pi * np.cumsum(f * d) / SR) for d in (1.0, 1.005, 0.995)) / 3
    sig = (noise * 0.8 + tone * 0.35) * prog ** 2.2
    sig[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    st = pan(sig, np.sin(prog * 12) * 0.4)
    save(name, add_reverb(st, IR_HALL, 0.25))


def tick(name="tick"):
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    sig = np.sin(2 * np.pi * 2800 * t) * exp_env(n, 0.006) + svf_bandpass(rng.standard_normal(n), 5000, 3) * exp_env(n, 0.003)
    save(name, sig, peak_db=-4)


def drip(name="drip"):
    """Honey drip / bloop: resonant upward chirp."""
    dur = 0.25
    t = t_axis(dur)
    f = 350 + 1100 * (1 - np.exp(-t / 0.03))
    sig = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05)
    save(name, add_reverb(sig, IR_SMALL, 0.25))


def success(name="success"):
    """Two-note chime for the CTA / end card."""
    out = np.zeros((int(1.6 * SR), 2))
    for i, f in enumerate([1046.5, 1568.0, 2093.0]):
        s = int(i * 0.09 * SR)
        t = t_axis(1.6 - i * 0.09)
        b = (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2 * t)) * np.exp(-t / 0.5)
        out[s:s + len(b)] += pan(b, -0.4 + 0.4 * i)
    save(name, add_reverb(out, IR_HALL, 0.3))


def swipe(name="swipe"):
    whoosh(0.32, 900, 7000, 0.6, name)


def record_scratch_stop(name="tape-stop", dur=0.6):
    t = t_axis(dur)
    f = 440 * (1 - t / dur) ** 1.8 + 20
    sig = sum(np.sin(2 * np.pi * np.cumsum(f * h) / SR) / h for h in (1, 2, 3))
    sig *= np.exp(-t / 0.4)
    save(name, svf_lowpass(sig, 2500))


# ---------------------------------------------------------------- music
def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


def epiano(f, dur, vel=0.6):
    """FM Rhodes-ish tone."""
    t = t_axis(dur)
    modi = 1.8 * np.exp(-t / 0.25) * vel
    mod = np.sin(2 * np.pi * f * t) * modi
    car = np.sin(2 * np.pi * f * t + mod)
    tine = np.sin(2 * np.pi * f * 14 * t) * np.exp(-t / 0.02) * 0.06
    trem = 1 + 0.08 * np.sin(2 * np.pi * 4.5 * t)
    return (car + tine) * env_adsr(len(t), 0.004, 0.6, dur, 0.4, 0.35) * vel * trem


def make_music(bars=32, bpm=88, name="bgm"):
    beat = 60 / bpm
    bar = beat * 4
    total = bars * bar + 2
    n = int(total * SR)
    mix = np.zeros((n, 2))
    # F maj7 | E m7 | D m9 | C add9 - warm, positive kitchen vibe
    prog = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60, 64], [48, 52, 55, 62]]
    bass = [41, 40, 38, 36]
    melody_pool = [72, 74, 76, 77, 79, 81]

    def place(sig, at, p=0.0, gain=1.0):
        s = int(at * SR)
        if s >= n:
            return
        if sig.ndim == 1:
            sig = pan(sig, p)
        e = min(n, s + len(sig))
        mix[s:e] += sig[: e - s] * gain

    for b in range(bars):
        chord = prog[b % 4]
        t0 = b * bar
        intro = b < 2
        # chords: swung stabs on 1 and the "and" of 2
        for hit, v in ((0, 0.55), (1.5, 0.35), (2.5, 0.3)):
            for k, note in enumerate(chord):
                place(epiano(midi(note), beat * 1.6, v), t0 + hit * beat + k * 0.008, p=-0.3 + 0.15 * k, gain=0.22)
        if not intro:
            # bass
            for hit, dur in ((0, 1.4), (1.75, 0.5), (2.5, 1.2)):
                tb = t_axis(beat * dur)
                f = midi(bass[b % 4] + (12 if hit == 1.75 else 0) - 12)
                bs = np.sin(2 * np.pi * f * tb) + 0.25 * np.sin(4 * np.pi * f * tb)
                bs *= env_adsr(len(tb), 0.005, 0.2, 1, 0.08, 0.8)
                place(soft_clip(bs, 1.5), t0 + hit * beat, 0, 0.32)
            # drums (lazy swing)
            for k in range(4):
                tb = t_axis(0.35)
                if k in (0, 2):
                    f = 45 + 110 * np.exp(-tb / 0.03)
                    kick = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tb / 0.18)
                    place(soft_clip(kick, 2), t0 + k * beat, 0, 0.5)
                if k in (1, 3):
                    sn = svf_bandpass(rng.standard_normal(len(tb)), 1800, 0.9) * np.exp(-tb / 0.07)
                    sn += np.sin(2 * np.pi * 190 * tb) * np.exp(-tb / 0.05) * 0.4
                    place(sn, t0 + k * beat + 0.012, 0.05, 0.22)
                for sub in (0, 0.58):  # swung 8ths
                    th = t_axis(0.06)
                    hh = svf_bandpass(rng.standard_normal(len(th)), 9000, 2) * np.exp(-th / 0.015)
                    place(hh, t0 + (k + sub) * beat, 0.35, 0.10 if sub else 0.14)
        # sparse melody on even bars after bar 4
        if b >= 4 and b % 2 == 0:
            for k in range(3):
                note = melody_pool[rng.integers(len(melody_pool))]
                tt = t0 + (k * 1.25 + 0.5) * beat
                place(epiano(midi(note), beat * 1.2, 0.35), tt, 0.4, 0.16)

    # vinyl crackle + warm tape noise
    crackle = np.zeros(n)
    idx = rng.integers(0, n, size=int(total * 9))
    crackle[idx] = rng.standard_normal(len(idx)) * 0.5
    crackle = svf_bandpass(crackle, 3000, 1.2)
    hiss = svf_lowpass(rng.standard_normal(n), 5000) * 0.006
    mix += pan(crackle * 0.05 + hiss, 0)
    # glue: gentle lowpass + saturation + room
    for c in range(2):
        mix[:, c] = svf_lowpass(mix[:, c], 9000, 0.7)
    mix = add_reverb(mix, IR_HALL, 0.18)
    mix = soft_clip(mix * 1.3, 1.2)
    # fade in/out
    m = len(mix)
    fi, fo = int(1.0 * SR), int(2.5 * SR)
    mix[:fi] *= np.linspace(0, 1, fi)[:, None]
    mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
    sf.write(os.path.join(OUT, "..", "music", name + ".wav"), finish(mix, -3.0, 0.05), SR, subtype="PCM_16")
    print("wrote music", name, round(m / SR, 1), "s")


if __name__ == "__main__":
    os.makedirs(os.path.join(OUT, "..", "music"), exist_ok=True)
    whoosh()
    whoosh(0.5, 500, 6000, 0.4, "whoosh-fast")
    swipe()
    pop()
    pop("pop-high", 2000, 600, 0.09)
    bubbles()
    sparkle()
    ding()
    impact()
    riser()
    tick()
    drip()
    success()
    record_scratch_stop()
    make_music()
