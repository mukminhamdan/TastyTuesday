#!/usr/bin/env python3
"""Split a long EDL into render-friendly parts (same look; concatenate the renders afterwards).

    python3 tools/split_edl.py edits/youtube-full.json 1392.9 2721.1
    -> edits/parts/youtube-full-p1.json (segments before the first segment starting at 1392.9), -p2, -p3
"""
import json, os, sys

src = sys.argv[1]
cuts = [float(x) for x in sys.argv[2:]]
e = json.load(open(src))
segs = e["segments"]
idx = [next(i for i, s in enumerate(segs) if s.get("in") == c) for c in cuts]
bounds = [0] + idx + [len(segs)]


def now_runs(srcs, o):
    """A persistent "now" card belongs where its source run continues in order up to `until` (or to the
    part's end) - not in a cold-open hook that merely borrows a few seconds from that section."""
    for k, (a, b) in enumerate(srcs):
        if not a <= o["at"] <= b:
            continue
        j = k
        while srcs[j][1] < o["until"] - 0.5 and j + 1 < len(srcs) and srcs[j][1] - 0.5 <= srcs[j + 1][0] < o["until"]:
            j += 1
        if srcs[j][1] >= o["until"] - 0.5 or j == len(srcs) - 1 or 0 <= srcs[j + 1][0] - o["until"] < 30:
            return True
    return False


os.makedirs(os.path.join(os.path.dirname(src), "parts"), exist_ok=True)
for k in range(len(bounds) - 1):
    p = dict(e)
    p["id"] = f"{e['id']}-p{k + 1}"
    p["title"] = f"{e['title']} (part {k + 1})"
    p["segments"] = segs[bounds[k]:bounds[k + 1]]
    srcs = [(s["in"], s["out"]) for s in p["segments"] if "in" in s]
    p["overlays"] = [o for o in e["overlays"] if "at" in o and any(a <= o["at"] <= b for a, b in srcs)
                     and (o["type"] != "now" or "until" not in o or now_runs(srcs, o))]
    # persistent panel cards ("now" with an `until`) continue into later parts: restart them at the part's first segment
    if srcs:
        lo, hi = srcs[0][0], srcs[-1][1]
        for o in e["overlays"]:
            cont = {**o, "at": lo + 0.05}
            if o["type"] == "now" and "until" in o and o["at"] < lo < o["until"] and o not in p["overlays"] \
                    and now_runs(srcs, cont):
                p["overlays"].append(cont)
    if e.get("bgm"):
        rng = []
        if k == 0: rng.append(e["bgm"]["ranges"][0])
        if k == len(bounds) - 2: rng.append(e["bgm"]["ranges"][-1])
        p["bgm"] = {**e["bgm"], "ranges": rng} if rng else None
    out = os.path.join(os.path.dirname(src), "parts", f"{p['id']}.json")
    json.dump(p, open(out, "w"), indent=1, ensure_ascii=False)
    print(out, len(p["segments"]), "segments", len(p["overlays"]), "overlays")
