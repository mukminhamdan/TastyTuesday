"""Per-second loudness (dB RMS) of a video/audio file, to spot dips or loud spikes.
Usage: python3 -I scripts/audio-profile.py <file> [...]
Healthy preview after loudnorm: mostly -14..-20 dB with no long run below -22.
"""
import subprocess, sys
import numpy as np
for f in sys.argv[1:]:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    prof = [20 * np.log10(np.sqrt(np.mean(x[i:i + 8000] ** 2)) + 1e-9) for i in range(0, len(x) - 8000, 8000)]
    print(f"{f} ({len(x)/8000:.1f}s):", " ".join(f"{v:.0f}" for v in prof))
