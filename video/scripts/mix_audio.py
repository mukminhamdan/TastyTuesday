"""Offline audio mix of a timeline (same rules as the Remotion composition):
voice pieces + ducked music bed + SFX. Used to pair with chunked/muted video renders.

Usage: python3 scripts/mix_audio.py full out/chunks/full_audio_mix.wav [under] [open] [sfx_gain]
"""
import json, sys, wave
import numpy as np

vid, out = sys.argv[1], sys.argv[2]
UNDER = float(sys.argv[3]) if len(sys.argv) > 3 else 0.14
OPEN = float(sys.argv[4]) if len(sys.argv) > 4 else 0.40
SFX_GAIN = float(sys.argv[5]) if len(sys.argv) > 5 else 0.9
SR, FPS = 48000, 30
d = json.load(open(f"src/data/{vid}.json"))
total = d["total"]
N = int(total / FPS * SR) + SR


def load(path):
    w = wave.open(path)
    assert w.getframerate() == SR, path
    ch, sw = w.getnchannels(), w.getsampwidth()
    raw = w.readframes(w.getnframes())
    if sw == 2:
        a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    elif sw == 3:
        b = np.frombuffer(raw, np.uint8).reshape(-1, 3)
        a = (b[:, 0].astype(np.int32) | (b[:, 1].astype(np.int32) << 8) | (b[:, 2].astype(np.int32) << 16))
        a = np.where(a >= 1 << 23, a - (1 << 24), a).astype(np.float32) / (1 << 23)
    else:
        raise ValueError(sw)
    a = a.reshape(-1, ch)
    return np.repeat(a, 2, axis=1) if ch == 1 else a


mix = np.zeros((N, 2), np.float32)
voice = load("public/media/voice.wav")
ramp = int(SR / FPS)
for p in d["pieces"]:
    s0 = int(round(p["src"] * FPS)) * SR // FPS
    n = p["dur"] * SR // FPS
    o = p["frm"] * SR // FPS
    seg = voice[s0:s0 + n].copy()
    k = min(ramp, len(seg) // 2)
    seg[:k] *= np.linspace(0.55, 1, k)[:, None]
    seg[-k:] *= np.linspace(1, 0.55, k)[:, None]
    mix[o:o + len(seg)] += seg

# ducking envelope (per frame) — identical to useDuck()
target = np.full(total, OPEN, np.float32)
for s, e in d["speech"]:
    target[max(0, s - 4):min(total, e + 6)] = UNDER
env = np.zeros(total, np.float32)
v = target[0]
for f in range(total):
    t = target[f]
    v += (t - v) * (1 / 6 if t < v else 1 / 18)
    env[f] = v
env[:15] *= np.arange(min(15, total)) / 15
env[-45:] *= np.maximum(0, (total - np.arange(total - 45, total)) / 45)
music = load("public/" + d["music"])[:N]
fe = np.interp(np.arange(len(music)) / SR * FPS, np.arange(total), env).astype(np.float32)
mix[:len(music)] += music * fe[:, None]

for s in d["sfx"]:
    a = load(f"public/sfx/{s['name']}.wav")
    o = s["frm"] * SR // FPS
    a = a[: max(0, N - o)]
    mix[o:o + len(a)] += a * s["vol"] * SFX_GAIN

mix = mix[: int(total / FPS * SR)]
peak = np.abs(mix).max()
if peak > 0.98:
    mix *= 0.98 / peak
w = wave.open(out, "wb")
w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((mix * 32767).astype(np.int16).tobytes())
w.close()
print("ok", out, round(total / FPS, 1), "s peak", round(float(peak), 3))
