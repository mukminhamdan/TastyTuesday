#!/usr/bin/env python3
"""Check that no footage repeats: overlaps (within each video and across the 3 parts) and
'near-repeats' (two shots of the same clip less than GAP seconds apart in the same video)."""
import json
import sys
from pathlib import Path

sys.argv = sys.argv[:1] + sys.argv[1:]
import render

GAP = 1.5
src = Path(sys.argv[1]) if len(sys.argv) > 1 else None
c = json.loads((render.HERE / "reels.json").read_text())
videos = c["reels"] + ([c["full"]] if c.get("full") else [])
segs, problems = [], 0
for r in videos:
    bt, _ = render.track_beats(render.HERE / r["music"]["file"], r["music"]["offset"])
    tl, total = render.build_timeline(c, r, r["bpm"], src, bt)
    mine = [(e["src"], e["ss"], e["ss"] + e["src_len"], e["idx"]) for e in tl if e["src"] != "BLACK"]
    print(f"{r['id']}: {total:.1f}s, {len(mine)} shots")
    for i, a in enumerate(mine):
        for b in mine[i + 1:]:
            if a[0] == b[0]:
                gap = max(a[1], b[1]) - min(a[2], b[2])
                if gap < GAP:
                    problems += 1
                    print(f"   {'OVERLAP' if gap < 0 else 'near-repeat'} {a[0]} #{a[3]} {a[1]:.2f}-{a[2]:.2f} vs #{b[3]} {b[1]:.2f}-{b[2]:.2f} (gap {gap:.2f}s)")
    if r is not c.get("full"):
        segs += [(s, x, y, r["id"], i) for s, x, y, i in mine]
for i, a in enumerate(segs):
    for b in segs[i + 1:]:
        if a[0] == b[0] and a[3] != b[3] and min(a[2], b[2]) - max(a[1], b[1]) > 0.0:
            problems += 1
            print(f"   ACROSS PARTS {a[0]}: {a[3]}#{a[4]} {a[1]:.2f}-{a[2]:.2f} vs {b[3]}#{b[4]} {b[1]:.2f}-{b[2]:.2f}")
print("problems:", problems)
