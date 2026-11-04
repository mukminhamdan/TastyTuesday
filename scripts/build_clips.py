"""Edit planner: turns clip specs (source time ranges + overlay cues) into Remotion clip JSON.

- talk parts: keeps only speech islands (from word timestamps) -> removes dead air & awkward pauses,
  drops stutter repeats, alternates punch-in zoom on every jump cut.
- broll parts: timelapse/speed-ramped visual segments (voice muted, music up).
- face track is used to anchor zooms on the face and keep graphics off it.

usage: python3 scripts/build_clips.py <transcript.json> <faces.json>
"""
import json, re, sys, os, math, statistics
sys.path.insert(0, os.path.dirname(__file__))
from clip_specs import CLIPS, FIXES, EMPH, OVERRIDES

FPS = 30
W, H, PLATE_H = 1080, 1920, 2160
HALLU = re.compile(r"terima kasih|selamat menikmati|menonton|subscribe", re.I)

tr = json.load(open(sys.argv[1]))
faces = json.load(open(sys.argv[2]))
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "clips")

# ---------- words ----------
WORDS = []
for s in tr:
    if HALLU.search(s["text"]):
        continue
    for w in s["words"]:
        txt = w["w"].strip()
        if not txt:
            continue
        WORDS.append({"s": w["s"], "e": w["e"], "w": txt})


# manual transcript corrections: retime corrected tokens across the original span
for a, b, text in OVERRIDES:
    span = [w for w in WORDS if w["s"] >= a - 0.05 and w["e"] <= b + 0.05]
    if not span:
        continue
    t0, t1 = span[0]["s"], span[-1]["e"]
    toks = text.split()
    tot = sum(len(t) + 1 for t in toks)
    acc = 0
    new = []
    for t in toks:
        s0 = t0 + (t1 - t0) * acc / tot
        acc += len(t) + 1
        new.append({"s": s0, "e": t0 + (t1 - t0) * (acc - 1) / tot, "w": t, "fixed": True})
    WORDS[:] = sorted([w for w in WORDS if w not in span] + new, key=lambda w: w["s"])


def fix_word(txt):
    k = re.sub(r"[^\w-]", "", txt).lower()
    if k in FIXES:
        rep = FIXES[k]
        if txt[:1].isupper():
            rep = rep[:1].upper() + rep[1:]
        return rep + re.sub(r"^[\w-]+", "", txt)
    return txt


def words_in(a, b):
    return [dict(w, w=w["w"] if w.get("fixed") else fix_word(w["w"])) for w in WORDS if w["s"] >= a - 0.05 and w["e"] <= b + 0.05]


# ---------- face ----------
def face_at(t):
    i = int(round(t * 2))
    for d in range(0, 6):
        for j in (i - d, i + d):
            if 0 <= j < len(faces) and faces[j][1] is not None:
                return faces[j]
    return None


def face_stats(a, b):
    pts = [face_at(a + (b - a) * k / 6) for k in range(7)]
    pts = [p for p in pts if p]
    if not pts:
        return None
    return [statistics.median(p[i] for p in pts) for i in (1, 2, 3, 4)]


def to_out(fx, fy, crop):
    return fx, (fy * PLATE_H - crop) / H


# ---------- build ----------
def build(spec):
    segs, words, overlays, sfx = [], [], [], []
    frame = 0
    part_start = []
    zflip = False
    for pi, part in enumerate(spec["parts"]):
        part_start.append(frame)
        kind = part["type"]
        a, b = part["src"]
        trans = part.get("trans", "cut")
        zoom = part.get("zoom", 1.0)
        if kind == "talk":
            ws = [w for w in words_in(a, b) if not any(x in w["w"].lower() for x in part.get("drop", []))]
            # drop immediate repeats ("sardin sardin roll")
            ws = [w for i, w in enumerate(ws) if not (i + 1 < len(ws) and re.sub(r"\W", "", w["w"].lower()) == re.sub(r"\W", "", ws[i + 1]["w"].lower()))]
            # merge into islands: cut gaps longer than MAXGAP
            maxgap = part.get("maxgap", 0.32)
            islands = []
            for w in ws:
                if islands and w["s"] - islands[-1][-1]["e"] <= maxgap:
                    islands[-1].append(w)
                else:
                    islands.append([w])
            pre, post = 0.10, 0.16
            for k, isl in enumerate(islands):
                s0 = max(a, isl[0]["s"] - pre)
                s1 = min(b, isl[-1]["e"] + post)
                dur = max(6, round((s1 - s0) * FPS))
                fs = face_stats(s0, s1)
                crop = 120
                if fs and fs[1] * PLATE_H < 420:
                    crop = max(0, int(fs[1] * PLATE_H - 300))
                origin = list(to_out(fs[0], fs[1], crop)) if fs else [0.6, 0.35]
                z = zoom * (part.get("punch", 1.14) if zflip else 1.0)
                zflip = not zflip
                segs.append(dict(from_=frame, dur=dur, srcStart=round(s0, 3), speed=1, zoom=round(z, 3), origin=[round(origin[0], 3), round(min(max(origin[1], 0.12), 0.7), 3)], cropY=crop, voice=True,
                                 trans=trans if k == 0 else "punch"))
                for w in isl:
                    t = (frame + (w["s"] - s0) * FPS) / FPS
                    e = (frame + (min(w["e"], s1) - s0) * FPS) / FPS
                    key = re.sub(r"[^\w]", "", w["w"].lower())
                    words.append({"t": round(t, 3), "e": round(e, 3), "w": w["w"], **({"emph": True} if key in EMPH else {})})
                frame += dur
        else:  # broll / hold
            speed = part.get("speed", 1)
            dur = round((b - a) / speed * FPS)
            fs = face_stats(a, b)
            crop = part.get("crop", 120)
            origin = part.get("origin") or (list(to_out(fs[0], fs[1], crop)) if fs else [0.5, 0.55])
            segs.append(dict(from_=frame, dur=dur, srcStart=a, speed=speed, zoom=zoom, origin=[round(origin[0], 3), round(min(max(origin[1], 0.1), 0.8), 3)], cropY=crop,
                             voice=part.get("voice", speed == 1), trans=trans))
            if speed >= 2 and part.get("tag", True):
                overlays.append({"kind": "speed", "from": frame + 4, "dur": max(20, dur - 8), "props": {"speed": speed}})
            frame += dur
        if spec.get("silent"):
            pass
        elif trans in ("whip",):
            sfx.append({"name": "whoosh", "from": part_start[-1] - 6, "vol": 0.45})
        if trans == "zoomblur" and not spec.get("silent"):
            sfx.append({"name": "whoosh_long", "from": part_start[-1] - 12, "vol": 0.4})
        if trans == "flash":
            overlays.append({"kind": "flash", "from": part_start[-1], "dur": 8})
            if not spec.get("silent"):
                sfx.append({"name": "impact", "from": part_start[-1], "vol": 0.35})
    total = frame
    part_start.append(total)

    # face-aware placement helpers (output coords)
    def face_out(fr):
        for s in segs:
            if s["from_"] <= fr < s["from_"] + s["dur"]:
                src_t = s["srcStart"] + (fr - s["from_"]) / FPS * s["speed"]
                f = face_at(src_t)
                if not f:
                    return None
                # scale around origin
                ox, oy = s["origin"][0] * W, s["origin"][1] * H
                cx, cy = f[1] * W, (f[2] * PLATE_H - s["cropY"])
                fh = f[4] * PLATE_H * s["zoom"]
                cx = ox + (cx - ox) * s["zoom"]
                cy = oy + (cy - oy) * s["zoom"]
                return cx, cy, fh
        return None

    def top_free_y(fr0, fr1, block_h):
        """y for a top-band graphic of height block_h that doesn't hit the face."""
        Y0 = spec.get("topY", 240)
        worst = None
        for fr in range(fr0, fr1, 6):
            f = face_out(fr)
            if f:
                top = f[1] - f[2] * 0.75
                bot = f[1] + f[2] * 0.75
                worst = (min(worst[0], top), max(worst[1], bot)) if worst else (top, bot)
        if not worst or worst[0] > Y0 + block_h + 20:
            return Y0
        return int(min(max(worst[1] + 30, Y0), 1500 - block_h - 260))

    def place_top(fr0, fr1, block_h):
        """keep top-band graphics in the top band but beside the face (never on it)."""
        boxes = []
        for fr in range(fr0, fr1, 5):
            f = face_out(fr)
            if f:
                hw = f[2] * 0.55  # face half-width ~ 0.55 * height (+ hair margin)
                boxes.append((f[0] - hw, f[0] + hw, f[1] - f[2] * 0.8, f[1] + f[2] * 0.7))
        y = spec.get("topY", 240)
        if not boxes:
            return {"y": y}
        l = min(b[0] for b in boxes); r = max(b[1] for b in boxes); t = min(b[2] for b in boxes)
        if t > y + block_h + 20:
            return {"y": y}
        if l - 70 >= 420:  # room on the left
            return {"y": y, "maxW": int(l - 70 - 30), "align": "left"}
        if 1010 - r >= 420:
            return {"y": y, "maxW": int(1010 - r - 30), "align": "right"}
        return {"y": top_free_y(fr0, fr1, block_h)}

    def side_x(fr):
        f = face_out(fr)
        if f and f[0] < W * 0.5:
            return "right"
        return "left"

    for o in spec.get("overlays", []):
        p = o["part"] if o["part"] >= 0 else len(spec["parts"]) + o["part"]
        fr = part_start[p] + round(o.get("dt", 0) * FPS)
        if o.get("fromEnd"):
            fr = total - round(o["fromEnd"] * FPS)
        dur = round(o.get("dur", 2) * FPS)
        props = dict(o.get("props", {}))
        k = o["kind"]
        if props.get("y") == "auto":
            props.update(place_top(fr, fr + dur, o.get("h", 330)))
        if k == "word" and "x" not in props:
            if side_x(fr) == "right":
                props["x"] = 560
            else:
                props["x"] = 80
        overlays.append({"kind": k, "from": fr, "dur": dur, "props": props})
        auto = {"hook": [("impact", 0, 0.42), ("whoosh", -2, 0.35)], "step": [("pop", 0, 0.5)], "word": [("impact", 0, 0.38), ("bass_drop", 0, 0.25)],
                "counter": [("typing", 2, 0.35), ("ding", 26, 0.35)], "arrow": [("swipe", 0, 0.4)], "snap": [("shutter", 0, 0.6)], "end": [("sparkle", 4, 0.4)],
                "speed": []}
        for name, off, vol in ([] if spec.get("silent") else auto.get(k, [])):
            sfx.append({"name": name, "from": fr + off, "vol": vol})
    for s in spec.get("sfx", []):
        p = s["part"] if s["part"] >= 0 else len(spec["parts"]) + s["part"]
        sfx.append({"name": s["name"], "from": part_start[p] + round(s.get("dt", 0) * FPS), "vol": s.get("vol", 0.4)})
    if spec.get("riser_into_hook", True):
        pass

    face_track = []
    for sec in range(0, math.ceil(total / FPS)):
        f = face_out(sec * FPS)
        face_track.append([round(f[0] / W, 3), round(f[1] / H, 3), round(f[2] / H, 3)] if f else None)

    for s in segs:
        s["from"] = s.pop("from_")
    data = {
        "id": spec["id"],
        "title": spec["title"],
        "durationInFrames": total,
        "segments": segs,
        "words": words,
        "overlays": overlays,
        "sfx": sorted(sfx, key=lambda x: x["from"]),
        "music": None if spec.get("silent") else spec.get("music", {"src": "music/groove_92.wav", "vol": 0.22, "duck": 0.06}),
        "progress": spec.get("progress", True),
        "face": face_track,
        "captionY": spec.get("captionY", 1140),
    }
    return data


os.makedirs(OUT, exist_ok=True)
ids = []
for spec in CLIPS:
    d = build(spec)
    json.dump(d, open(os.path.join(OUT, f"{spec['id']}.json"), "w"), ensure_ascii=False, indent=1)
    ids.append(spec["id"])
    print(f"{spec['id']:28s} {d['durationInFrames']/FPS:6.1f}s  segs={len(d['segments'])} words={len(d['words'])} overlays={len(d['overlays'])} sfx={len(d['sfx'])}")

with open(os.path.join(OUT, "index.ts"), "w") as f:
    f.write("// generated by scripts/build_clips.py\nimport type {ClipData} from '../lib/types';\n")
    for i, cid in enumerate(ids):
        f.write(f"import c{i} from './{cid}.json';\n")
    f.write("export const CLIPS = [" + ", ".join(f"c{i}" for i in range(len(ids))) + "] as unknown as ClipData[];\n")
