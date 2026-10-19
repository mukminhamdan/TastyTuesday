#!/usr/bin/env python3
"""Print word-level timings for a source range: words.py START END (seconds or mm:ss)."""
import json, os, sys

def t(x):
    if ":" in x:
        m, s = x.split(":")
        return int(m) * 60 + float(s)
    return float(x)

a, b = t(sys.argv[1]), t(sys.argv[2])
segs = json.load(open(os.path.join(os.path.dirname(__file__), "..", "transcript", "transcript.json")))
line, last = [], None
for seg in segs:
    for w in seg["words"]:
        if w["s"] < a or w["s"] > b:
            continue
        if last is not None and w["s"] - last > 0.6:
            print(" ".join(line)); line = []
            print(f"   ---- gap {w['s'] - last:.1f}s")
        if not line:
            line.append(f"[{w['s']:.2f}]")
        line.append(w["w"].strip())
        last = w["e"]
        if len(line) > 14:
            print(" ".join(line) + f" ({last:.2f})"); line = []
print(" ".join(line), f"({last:.2f})" if last else "")
