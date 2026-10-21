"""Synthesise the extra SFX + a light music bed (no external downloads needed).

Writes into shared/sfx/: ding.wav, boing.wav, badumtss.wav, bgm-kitchen.wav
"""
import os, sys, wave
import numpy as np

SR = 44100
OUT = sys.argv[1] if len(sys.argv) > 1 else "shared/sfx"
rng = np.random.default_rng(7)


def write(name, x, gain=0.9):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    x = x / (np.max(np.abs(x)) + 1e-9) * gain
    with wave.open(os.path.join(OUT, name), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def t(d):
    return np.arange(int(SR * d)) / SR


def env(n, a=0.005, d=0.3):
    tt = np.arange(n) / SR
    return np.minimum(tt / a, 1) * np.exp(-tt / d)


# ding: bell partials (kitchen timer)
tt = t(2.2)
ding = sum(amp * np.sin(2 * np.pi * 1318.5 * r * tt) * np.exp(-tt / dec)
           for r, amp, dec in [(1, 1, .9), (2.0, .5, .5), (2.76, .35, .35), (5.4, .2, .2)])
ding *= np.minimum(tt / .002, 1)
write("ding.wav", ding, .8)

# boing: sine with wobbling pitch
tt = t(0.9)
f = 180 + 260 * np.exp(-tt * 3) * (1 + .35 * np.sin(2 * np.pi * 14 * tt))
boing = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3.2) * np.minimum(tt / .004, 1)
write("boing.wav", boing, .8)


# ba-dum-tss
def tom(freq, d=.35):
    tt = t(d)
    f = freq * (1 + .6 * np.exp(-tt * 30))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9) + .3 * rng.normal(0, 1, len(tt)) * np.exp(-tt * 60)


def snare(d=.3):
    tt = t(d)
    return .55 * np.sin(2 * np.pi * 190 * tt) * np.exp(-tt * 25) + rng.normal(0, 1, len(tt)) * np.exp(-tt * 14) * .7


def cymbal(d=1.6):
    tt = t(d)
    n = rng.normal(0, 1, len(tt))
    n = np.diff(np.concatenate([[0], n]))  # crude high-pass
    return n * np.exp(-tt * 2.6) * .8


bd = np.zeros(int(SR * 2.4))
for start, s in [(0, tom(160)), (.18, tom(110)), (.5, snare()), (.5, cymbal())]:
    i = int(start * SR); bd[i:i + len(s)] += s
write("badumtss.wav", bd, .85)


# light kitchen bed: plucked (Karplus-Strong) chords + soft shaker/kick, 96 BPM, 4 bars looped x8
def pluck(freq, d=1.2):
    n = int(SR * d); p = int(SR / freq)
    buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = .996 * .5 * (buf[i % p] + buf[(i + 1) % p])
    return out * env(n, .002, .8)


bpm = 96; beat = 60 / bpm; bar = 4 * beat
prog = [[261.6, 329.6, 392.0, 493.9], [220.0, 261.6, 329.6, 392.0], [174.6, 220.0, 261.6, 329.6], [196.0, 246.9, 293.7, 349.2]]  # Cmaj7 Am7 Fmaj7 G7
bass = [65.4, 55.0, 43.65, 49.0]
loop = np.zeros(int(SR * bar * 4) + SR * 2)
cache = {}
for b, chord in enumerate(prog):
    for k, step in enumerate([0, 1.5, 2, 3, 3.5]):
        for j, fr in enumerate(chord):
            key = (fr,)
            if key not in cache: cache[key] = pluck(fr)
            s = cache[key] * (.5 if k else .7)
            i = int((b * bar + step * beat + j * .012) * SR); loop[i:i + len(s)] += s
    tt = t(bar); bs = np.sin(2 * np.pi * bass[b] * tt) * env(len(tt), .01, 1.2) * .8
    i = int(b * bar * SR); loop[i:i + len(bs)] += bs
    for q in range(8):  # shaker on 8ths
        tt = t(.08); sh = rng.normal(0, 1, len(tt)) * np.exp(-tt * 70) * (.12 if q % 2 else .07)
        i = int((b * bar + q * beat / 2) * SR); loop[i:i + len(sh)] += sh
    for q in (0, 2):  # soft kick
        tt = t(.3); kk = np.sin(2 * np.pi * np.cumsum(55 * (1 + 2 * np.exp(-tt * 40))) / SR) * np.exp(-tt * 12) * .6
        i = int((b * bar + q * beat) * SR); loop[i:i + len(kk)] += kk
L = int(SR * bar * 4)
tail = loop[L:]; loop = loop[:L].copy(); loop[:len(tail)] += tail
full = np.tile(loop, 8)
fade = int(SR * 2); full[-fade:] *= np.linspace(1, 0, fade)
# gentle stereo width
st = np.stack([full, np.roll(full, int(SR * .011))], 1)
write("bgm-kitchen.wav", st, .7)
print("ok", len(full) / SR, "s bgm")
