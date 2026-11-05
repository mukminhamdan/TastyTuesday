"""Turn a hand-written cut list (edit/cuts.json) + clip analysis into the
Remotion timeline (src/timeline.json).

- tightens awkward pauses inside kept ranges (gap > max_gap is removed)
- alternates jump-cut zoom so cuts feel intentional
- remaps word timestamps onto the timeline -> karaoke caption pages
- picks caption + overlay positions that avoid the detected face
- adds the matching sound effect for every motion graphic
- exports speech intervals for music ducking

Usage: python3 -I scripts/build_edit.py <project_dir>
"""
import json
import os
import re
import sys

PROJ = sys.argv[1]
ANA = os.path.join(PROJ, "analysis")
cuts = json.load(open(os.path.join(PROJ, "edit", "cuts.json")))
ana = {}


def A(clip):
    if clip not in ana:
        ana[clip] = json.load(open(os.path.join(ANA, clip + ".json")))
    return ana[clip]


MAX_GAP = cuts.get("max_gap", 0.45)
PAD_IN, PAD_OUT = 0.06, 0.12

# ------------------------------------------------------------------ clips
timeline_clips = []
t = 0.0
zoom_toggle = False
for c in cuts["clips"]:
    pieces = [(c["from"], c["to"])]
    if c.get("tighten", True) and not c.get("broll"):
        words = [w for w in A(c["clip"])["words"] if w["end"] > c["from"] and w["start"] < c["to"]]
        if words:
            pieces = []
            s = max(c["from"], words[0]["start"] - PAD_IN)
            for a, b in zip(words, words[1:]):
                if b["start"] - a["end"] > MAX_GAP:
                    pieces.append((s, a["end"] + PAD_OUT))
                    s = b["start"] - PAD_IN
            pieces.append((s, min(c["to"], words[-1]["end"] + PAD_OUT)))
    for i, (a, b) in enumerate(pieces):
        if b - a < 0.2:
            continue
        speed = c.get("speed", 1)
        base = c.get("zoom", 1.0)
        if not c.get("broll") and (i > 0 or c.get("jump", True)):
            zoom_toggle = not zoom_toggle
            base = base * (1.12 if zoom_toggle else 1.0)
        focus = c.get("focus")
        if not focus:
            focus = face_focus = None
            fc = [f for f in A(c["clip"])["faces"] if a - 1 <= f["t"] <= b + 1 and f["boxes"]]
            if fc:
                bx = max(fc[len(fc) // 2]["boxes"], key=lambda q: q[2] * q[3])
                focus = [round(bx[0] + bx[2] / 2, 3), round(bx[1] + bx[3] / 2, 3)]
            else:
                focus = [0.5, 0.45]
        timeline_clips.append({
            "clip": c["clip"], "from": round(a, 3), "to": round(b, 3), "at": round(t, 3),
            "zoom": round(base, 3), "punch": bool(c.get("punch", i > 0)), "focus": focus,
            "speed": speed, "muted": bool(c.get("muted", False)), "volume": c.get("volume", 1.0), "_broll": bool(c.get("broll")),
            "_id": c.get("id"),
        })
        t += (b - a) / speed
duration = round(t, 3)


CLIP_START = {}
for tc in timeline_clips:
    if tc.get("_id") and tc["_id"] not in CLIP_START:
        CLIP_START[tc["_id"]] = tc["at"]


def anchor(o):
    """Resolve an item's timeline time from at / src / on+off."""
    if "on" in o:
        return CLIP_START[o["on"]] + o.get("off", 0)
    if "src" in o:
        return src_to_tl(o["src"][0], o["src"][1])
    at = o.get("at")
    if at is not None and at < 0:
        at = duration + at
    return at


def src_to_tl(clip, sec):
    """Map a source time to the timeline (first clip that contains it)."""
    for tc in timeline_clips:
        if tc["clip"] == clip and tc["from"] - 0.05 <= sec <= tc["to"] + 0.05:
            return tc["at"] + (min(max(sec, tc["from"]), tc["to"]) - tc["from"]) / tc["speed"]
    return None


IGNORE_FACES = cuts.get("ignore_faces", False)


def faces_at(tl):
    if IGNORE_FACES:
        return []
    for tc in timeline_clips:
        dur = (tc["to"] - tc["from"]) / tc["speed"]
        if tc["at"] <= tl < tc["at"] + dur:
            src = tc["from"] + (tl - tc["at"]) * tc["speed"]
            fc = A(tc["clip"])["faces"]
            near = [f for f in fc if abs(f["t"] - src) <= 1.0]
            boxes = [b for f in near for b in f["boxes"]]
            # apply zoom around focus
            z = tc["zoom"]
            fx, fy = tc["focus"]
            out = []
            for x, y, w, h in boxes:
                out.append([fx + (x - fx) * z, fy + (y - fy) * z, w * z, h * z])
            return out
    return []


def overlaps(r, boxes, margin=0.03):
    x0, y0, x1, y1 = r
    for x, y, w, h in boxes:
        if x - margin < x1 and x + w + margin > x0 and y - margin < y1 and y + h + margin > y0:
            return True
    return False


SLOTS = {
    "top": (0.06, 0.115, 0.83, 0.36),
    "topLeft": (0.06, 0.115, 0.50, 0.45),
    "topRight": (0.58, 0.115, 0.83, 0.25),
    "midLeft": (0.06, 0.40, 0.50, 0.62),
    "midRight": (0.58, 0.40, 0.83, 0.52),
    "center": (0.06, 0.40, 0.83, 0.58),
    "bottom": (0.06, 0.59, 0.83, 0.75),
}
PREF = {
    "hook": ["top", "bottom", "center"],
    "step": ["topLeft", "midLeft", "bottom"],
    "ingredients": ["topLeft", "midLeft", "topRight"],
    "timer": ["topRight", "midRight", "topLeft"],
    "tip": ["top", "bottom", "center"],
    "label": ["top", "bottom", "center"],
    "benefits": ["top", "bottom", "center"],
    "cta": ["top", "bottom", "center"],
}


PLACED = []  # (rect, start, end) of overlays already placed


def busy(at, end):
    return [(r[0], r[1], r[2] - r[0], r[3] - r[1]) for r, s, e in PLACED if s < end and e > at]


def pick_slot(kind, at, dur, want=None):
    boxes = []
    k = at
    while k < at + dur:
        boxes += faces_at(k)
        k += 0.5
    others = busy(at, at + dur)
    order = ([want] if want and want != "auto" else []) + PREF.get(kind, ["top"])
    order += [s for s in SLOTS if s not in order]
    for s in order:
        if s in SLOTS and not overlaps(SLOTS[s], boxes) and not overlaps(SLOTS[s], others, 0.0):
            break
    else:
        s = next((s for s in order if s in SLOTS and not overlaps(SLOTS[s], others, 0.0)), order[0])
    PLACED.append((SLOTS[s], at, at + dur))
    return s


# ------------------------------------------------------------------ captions
EMPH = set(w.upper() for w in cuts.get("emphasis", []))
FIX = cuts.get("word_fixes", {})
words_tl = []
for tc in timeline_clips:
    if tc["_broll"]:
        continue
    for w in A(tc["clip"])["words"]:
        mid = (w["start"] + w["end"]) / 2
        if tc["from"] <= mid <= tc["to"]:
            s = tc["at"] + (max(w["start"], tc["from"]) - tc["from"]) / tc["speed"]
            e = tc["at"] + (min(w["end"], tc["to"]) - tc["from"]) / tc["speed"]
            txt = FIX.get(w["word"].lower().strip(".,!?"), w["word"])
            words_tl.append({"w": txt, "s": round(s, 3), "e": round(e, 3)})
NARR = []
for gi, n in enumerate(cuts.get("narration", [])):
    at = anchor(n)
    toks = n["text"].split()
    step = n.get("pace", 0.26)
    for i, tok in enumerate(toks):
        NARR.append({"w": tok, "s": round(at + i * step, 3), "e": round(at + (i + 1) * step - 0.02, 3), "_hold": n.get("hold", 0.9), "g": gi})
    if NARR:
        NARR[-1]["w"] = NARR[-1]["w"] if re.search(r"[.!?]$", NARR[-1]["w"]) else NARR[-1]["w"] + "."
        NARR[-1]["e"] = round(NARR[-1]["e"] + n.get("hold", 0.9), 3)
VOICE = [dict(w) for w in words_tl]
words_tl += [{k: v for k, v in w.items() if not k.startswith("_")} for w in NARR]
words_tl.sort(key=lambda x: x["s"])

pages, cur = [], []
for w in words_tl:
    clean = re.sub(r"[.,!?]+$", "", w["w"]).strip()
    if not clean:
        continue
    item = {"w": clean, "s": w["s"], "e": w["e"]}
    grp = w.get("g")
    if re.sub(r"[^A-Z0-9]", "", clean.upper()) in EMPH:
        item["hi"] = True
    same_phrase = grp is not None and cur and cur[-1].get("_g") == grp
    if cur and not same_phrase and (w["s"] - cur[-1]["e"] > 0.35 or len(cur) >= 4 or sum(len(x["w"]) + 1 for x in cur) + len(clean) > 22):
        pages.append(cur)
        cur = []
    if grp is not None:
        item["_g"] = grp
    cur.append(item)
    if re.search(r"[.!?]$", w["w"]) and not (grp is not None and re.search(r"\.\.\.$", w["w"])):
        pages.append(cur)
        cur = []
if cur:
    pages.append(cur)

caption_pages = []
for i, p in enumerate(pages):
    start = p[0]["s"]
    end = p[-1]["e"] + 0.25
    if i + 1 < len(pages):
        end = min(end, pages[i + 1][0]["s"])
    p = [{k: v for k, v in x.items() if k != "_g"} for x in p]
    caption_pages.append({"start": round(start, 3), "end": round(end, 3), "words": p, "pos": "low"})

# ------------------------------------------------------------------ overlays & sfx
AUTO_SFX = {  # simple style: one soft accent per graphic, nothing on decoration
    "hook": [("impact", 0.0, 0.28)],
    "step": [("swipe", 0.0, 0.22)],
    "ingredients": [],
    "timer": [],
    "tip": [],
    "label": [],
    "benefits": [],
    "sticker": [],
    "cta": [("success", 0.0, 0.25)],
    "flash": [],
}

overlays, sfx = [], []
for o in cuts.get("overlays", []):
    at = anchor(o)
    if at is None:
        print("WARN overlay time not in edit:", o)
        continue
    dur = min(o.get("dur", 2.5), duration - at)
    out = {"type": o["type"], "at": round(at, 3), "dur": round(dur, 3), "props": o.get("props", {})}
    if o["type"] in PREF:
        out["slot"] = pick_slot(o["type"], at, dur, o.get("slot"))
    elif o.get("slot"):
        out["slot"] = o["slot"]
    overlays.append(out)
    if o.get("sfx", True):
        for name, off, vol in AUTO_SFX.get(o["type"], []):
            sfx.append({"name": name, "at": round(max(0, at + off), 3), "vol": vol})

for s in cuts.get("sfx", []):
    at = anchor(s)
    if at is None:
        continue
    sfx.append({"name": s["name"], "at": round(at, 3), "vol": s.get("vol", 0.4)})

# optional whoosh on section changes (off in the simple style)
if cuts.get("cut_whoosh", False):
    for i, tc in enumerate(timeline_clips[1:], 1):
        prev = timeline_clips[i - 1]
        if tc["_broll"] != prev["_broll"] or tc["clip"] != prev["clip"]:
            sfx.append({"name": "whoosh-fast", "at": round(max(0, tc["at"] - 0.12), 3), "vol": 0.22})

# caption bands: low (default) / high / mid -- avoid face and active graphics
CAP_BANDS = {"low": (0.06, 0.62, 0.83, 0.75), "high": (0.06, 0.125, 0.83, 0.245), "mid": (0.06, 0.43, 0.83, 0.55)}
for cp in caption_pages:
    fb = [b for k in (cp["start"], (cp["start"] + cp["end"]) / 2, cp["end"]) for b in faces_at(k)]
    ob = busy(cp["start"], cp["end"])
    for band in ("low", "high", "mid"):
        if not overlaps(CAP_BANDS[band], fb, 0.0) and not overlaps(CAP_BANDS[band], ob, 0.0):
            cp["pos"] = band
            break
    else:
        cp["pos"] = next((b for b in ("low", "high", "mid") if not overlaps(CAP_BANDS[b], fb, 0.0)), "low")

# ------------------------------------------------------------------ speech (ducking)
speech = []
for w in VOICE:
    if speech and w["s"] - speech[-1][1] < 0.5:
        speech[-1][1] = w["e"]
    else:
        speech.append([w["s"], w["e"]])

if cuts.get("mute_voice"):
    speech = []  # no voice in the mix -> no ducking

timeline = {
    "duration": duration,
    "clips": [{k: v for k, v in c.items() if not k.startswith("_")} for c in timeline_clips],
    "captions": caption_pages,
    "overlays": overlays,
    "sfx": sorted(sfx, key=lambda s: s["at"]),
    "speech": [[round(a, 3), round(b, 3)] for a, b in speech],
    "music": cuts.get("music", {"src": "music/bgm.wav", "vol": 0.16, "duck": 0.05}),
}
json.dump(timeline, open(os.path.join(PROJ, "src", "timeline.json"), "w"), ensure_ascii=False, indent=1)
print(f"timeline {duration:.1f}s, {len(timeline_clips)} clips, {len(caption_pages)} caption pages, {len(overlays)} overlays, {len(sfx)} sfx")
