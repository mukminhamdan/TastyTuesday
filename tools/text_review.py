#!/usr/bin/env python3
"""Dump every on-screen text of each short (hook, title, cards, stickers, CTA, captions) as JSON."""
import glob, json, os, re, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = []
for spec_path in sorted(glob.glob(os.path.join(REPO, "shorts", "specs", "*.json"))):
    spec = json.load(open(spec_path))
    cid = spec["id"]
    page = open(os.path.join(REPO, "shorts", cid, "index.html")).read()
    D = json.loads(re.search(r"const D = (\{.*?\});\n", page).group(1))
    items = []

    def add(kind, at, text, key):
        items.append({"id": f"{cid}:{key}", "kind": kind, "at": round(at, 2), "text": text})

    for i, line in enumerate(spec["hook"]):
        add("hook", 0, line, f"hook:{i}")
    add("title", D["hookHold"], spec["title"], "title")
    for i, (ev, ed) in enumerate(zip(spec.get("events", []), D["events"])):
        t = ev["type"]
        if t == "tip":
            add("tip", ed["at"], ev.get("label", "TIP"), f"ev:{i}:label")
            add("tip", ed["at"], ev["text"], f"ev:{i}:text")
        elif t in ("lol", "sticker"):
            add(t, ed["at"], ev.get("text", ""), f"ev:{i}:text")
        elif t == "list":
            add("list", ed["at"], ev.get("label", "RESEPI"), f"ev:{i}:label")
            for k, ((_, txt), at) in enumerate(zip(ev["items"], ed["itemsAt"])):
                add("list", at, txt, f"ev:{i}:item:{k}")
    add("cta", D["duration"] - 2.6, spec.get("cta", ""), "cta")
    for gi, g in enumerate(D["captions"]):
        add("caption", g["start"], " ".join(w["t"] for w in g["words"]), f"cap:{gi}")
    out.append({"id": cid, "title": spec["title"], "duration": D["duration"], "items": items})
json.dump(out, sys.stdout, ensure_ascii=False)
