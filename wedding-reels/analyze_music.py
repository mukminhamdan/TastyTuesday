#!/usr/bin/env python3
"""Measure tempo, beat grid and the loudest (chorus-like) section of a track.

  python3 analyze_music.py song.mp3 [--window 40]

Prints BPM, first beat time and the start (snapped to a beat) of the most
energetic WINDOW-second section: a good --music-offset for render.py.
"""
import argparse

import librosa
import numpy as np


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("audio")
    ap.add_argument("--window", type=float, default=40.0)
    a = ap.parse_args()
    y, sr = librosa.load(a.audio, sr=22050, mono=True)
    dur = len(y) / sr
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr, units="time")
    # median beat interval is more precise than the coarse tempo estimate
    bpm = 60.0 / float(np.median(np.diff(beats))) if len(beats) > 2 else float(np.atleast_1d(tempo)[0])
    rms = librosa.feature.rms(y=y)[0]
    t = librosa.frames_to_time(np.arange(len(rms)), sr=sr)
    best, best_t = -1, 0.0
    for b in beats[::4]:  # bar starts (approx.)
        if b + a.window > dur:
            break
        e = rms[(t >= b) & (t < b + a.window)].mean()
        if e > best:
            best, best_t = e, b
    print(f"file      : {a.audio}")
    print(f"duration  : {dur:.1f}s")
    print(f"bpm       : {bpm:.1f}  (half-time {bpm/2:.1f})")
    print(f"first beat: {beats[0]:.3f}s")
    print(f"best {a.window:.0f}s section starts at {best_t:.3f}s  -> --music-offset {best_t:.3f}")


if __name__ == "__main__":
    main()
