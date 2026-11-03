"""Builds Remotion timeline JSON (+ music beds) from the edit spec.

Usage: python3 scripts/build.py <work_dir>
  work_dir must contain: full.json (whisper words), rms10ms.npy, faces.json
"""
import json, os, re, subprocess, sys
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import edit_spec as SPEC  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = sys.argv[1]
OUT = os.path.join(ROOT, "src", "data")
PUB = os.path.join(ROOT, "public")
MUSIC_SRC = os.environ.get("MUSIC_SRC", os.path.join(WORK, "..", "music_dl"))
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(PUB, "music"), exist_ok=True)

FPS = 30
T0 = 1040.0  # proxy/voice start in source seconds
SFX = json.load(open(os.path.join(ROOT, "sfx_meta.json")))

# ------------------------------------------------------------------ inputs
segs = json.load(open(os.path.join(WORK, "full.json")))
WORDS = [dict(w=w["w"].strip(), s=float(w["s"]), e=float(w["e"])) for s in segs for w in s["words"] if w["w"].strip()]
RMS = np.load(os.path.join(WORK, "rms10ms.npy"))  # 10 ms frames, t=0 at T0
RMS_S = np.convolve(RMS, np.ones(5) / 5, mode="same")
try:
    FACES = json.load(open(os.path.join(WORK, "faces.json")))
except FileNotFoundError:
    FACES = []
FACE_T = np.array([f["t"] for f in FACES]) if FACES else np.array([])

SIL_DB = -37.0
MIN_PAUSE = 0.30
KEEP_PAD = 0.07


def rms_at(t):
    i = int((t - T0) * 100)
    return RMS_S[max(0, min(i, len(RMS_S) - 1))]


def clip_threshold(a, b):
    """Adaptive pause threshold: noise floor + 30% of the way to speech level."""
    i0, i1 = int((a - 15 - T0) * 100), int((b + 15 - T0) * 100)
    x = RMS_S[max(0, i0):max(i0 + 10, i1)]
    floor, speech = np.percentile(x, 5), np.percentile(x, 80)
    return float(np.clip(floor + 0.3 * (speech - floor), -40, -22))


def silent_runs(a, b, thr):
    i0, i1 = int((a - T0) * 100), int((b - T0) * 100)
    x = RMS_S[i0:i1] < thr
    runs, st = [], None
    for k, v in enumerate(x):
        if v and st is None:
            st = k
        if (not v or k == len(x) - 1) and st is not None:
            en = k if not v else k + 1
            if (en - st) / 100 >= MIN_PAUSE:
                runs.append((a + st / 100, a + en / 100))
            st = None
    return runs


# ------------------------------------------------------------------ text fixes
TOKEN_FIX = {
    "sadin": "sardin", "sadid": "sardin", "saling": "sardin", "sadib": "sardin", "sardine": "sardin",
    "sanding": "sardin", "sadeh": "sardin", "tunah": "tuna", "kuven": "Cooven", "cuven": "Cooven",
    "kuwen": "Cooven", "cuvan": "Cooven", "kuven.": "Cooven.", "kuwen.": "Cooven.", "tuhu": "suhu",
    "suruh": "suhu", "hangis": "hangit", "menggorek": "menggoreng", "mengorek": "menggoreng",
    "dipkan": "celupkan", "pav": "puff", "kefe": "cafe", "lembur": "lembut", "front": "prompt",
    "jaring": "garing", "caramalize": "caramelize", "menyambar": "menyambal", "visa": "pizza",
    "sepas": "lepas", "testitusi": "Tasty Tuesday", "glisskan": "sapukan", "green": "grill",
    "green,": "grill,", "gerai": "grill", "gerai,": "grill,", "grip": "grill", "pak": "Mak",
    "awak": "Mak", "derol": "roll", "fri": "fryer", "fried": "fryer", "menit": "minit",
    "daslah": "rasa", "daram": "garam", "fabric": "", "feel": "rasa", "paste": "sapu",
    "pandang": "panggang", "efek": "effect", "kadiri": "", "lah": "lah",
}
PHRASE_FIX = [
    (["gunakan", "lembut", "refry", "ni"], "guna mode deep fry ni"),
    (["food", "and", "improvement"], "Food Engine"),
    (["mod", "tukar"], "mode cooker"),
    (["8", "sejuk"], "peti sejuk"),
    (["kuai", "jean", "-kuai"], "Cooven"),
    (["pak", "haji"], ""),
    (["air", "fryer", "paper"], "air fryer paper"),
    (["sawar", "dough"], "sourdough"),
    (["hon,"], ""),
    (["bukan", "-kana"], "bukan"),
    (["boleh", "nak", "tahu", "in", "case", "kalau", "macam"], ""),
]
KEEP_CAPS = {"Cooven", "Mak", "Kak", "Mukmin", "I", "Food", "Engine", "Tasty", "Tuesday", "Hani", "Salma", "Pia", "Ida"}
FILLER = {"eh", "eh,", "haa", "haa,", "ha", "aa", "apa", "ni,"}
HL_WORDS = re.compile(
    r"^(\d+|\d+°c|180|140|220|minit|minit\.|sardin|tuna|hangit|hangus|garing|lembut|crunchy|fluffy|pizza|"
    r"cafe|deep|fry|grill|oven|cooker|cooven|sedap|sedapnya|mudah|senang|cepat|6|4|8|10|15|liter|"
    r"berbulan-bulan|beli|tipu|serius|mum|stabil|frozenkan|special)[.,?!]*$", re.I)


def fix_tokens(ws):
    toks = [dict(x) for x in ws]
    # phrase fixes
    i = 0
    out = []
    while i < len(toks):
        hit = None
        for pat, rep in PHRASE_FIX:
            n = len(pat)
            seg = [t["w"].lower().strip(",.?!") for t in toks[i:i + n]]
            if seg == [p.strip(",.?!") for p in pat]:
                hit = (n, rep)
                break
        if hit:
            n, rep = hit
            span = toks[i:i + n]
            parts = rep.split()
            if parts:
                dur = (span[-1]["e"] - span[0]["s"]) / len(parts)
                for k, p in enumerate(parts):
                    out.append(dict(w=p, s=span[0]["s"] + k * dur, e=span[0]["s"] + (k + 1) * dur))
            i += n
            continue
        t = toks[i]
        key = t["w"].lower()
        bare = key.strip(",.?!")
        punct = key[len(bare):] if key.startswith(bare) else ""
        if key in TOKEN_FIX:
            t["w"] = TOKEN_FIX[key]
        elif bare in TOKEN_FIX:
            t["w"] = TOKEN_FIX[bare] + punct if TOKEN_FIX[bare] else ""
        if t["w"]:
            out.append(t)
        i += 1
    # merge "-xxx" reduplication into previous token
    merged = []
    for t in out:
        if t["w"].startswith("-") and merged:
            merged[-1]["w"] += t["w"]
            merged[-1]["e"] = t["e"]
        else:
            merged.append(t)
    return merged


# ------------------------------------------------------------------ faces
def face_for(a, b):
    if not len(FACE_T):
        return None
    idx = np.where((FACE_T >= a - 0.25) & (FACE_T <= b + 0.25))[0]
    pts = []
    for k in idx:
        fs = [f for f in FACES[k]["faces"] if f[4] >= 0.7 and f[2] > 0.08]
        if fs:
            f = max(fs, key=lambda f: f[2] * f[3])
            pts.append((f[0] + f[2] / 2, f[1] + f[3] / 2, f[2], f[3]))
    if len(pts) < max(1, len(idx) * 0.4):
        return None
    p = np.median(np.array(pts), axis=0)
    return dict(x=round(float(p[0]), 3), y=round(float(p[1]), 3), w=round(float(p[2]), 3), h=round(float(p[3]), 3))


# ------------------------------------------------------------------ core
OV_DUR = dict(hook=2.6, title=2.6, chip=2.2, step=2.4, tip=2.8, stat=2.3, reveal=2.4, cta=None,
              chapter=3.0, bigtitle=3.4, lineup=6.5, recap=6.0, endcard=None, quote=2.6)


def build(vid, clips, layout, music_plan):
    pieces = []  # output pieces
    captions, overlays, sfx, speech = [], [], [], []
    cur = 0  # frames
    zflip = 0
    prev_src_end = None
    for ci, (a, b, o) in enumerate(clips):
        ws = [w for w in WORDS if w["s"] >= a - 0.05 and w["s"] < b]
        if not ws:
            print("WARN no words", vid, a, b)
            continue
        st = max(ws[0]["s"] - 0.10, a - 0.15)
        en = min(ws[-1]["e"] + 0.14, b + 0.5)
        # trim leading / trailing low energy
        thr = clip_threshold(a, b)
        while st < en - 0.3 and rms_at(st + 0.03) < thr:
            st += 0.02
        while en > st + 0.3 and rms_at(en - 0.03) < thr:
            en -= 0.02
        st = max(st - 0.05, a - 0.2)
        en = en + 0.08
        cuts = silent_runs(st, en, thr)
        parts, p0 = [], st
        for s0, s1 in cuts:
            if s0 + KEEP_PAD > p0:
                parts.append((p0, s0 + KEEP_PAD))
            p0 = s1 - KEEP_PAD
        parts.append((p0, en))
        parts = [(x, y) for x, y in parts if y - x >= 0.22]
        base_zoom = o.get("zoom", 1.0)
        clip_pieces = []
        for k, (x, y) in enumerate(parts):
            f0 = cur
            nf = max(1, int(round((y - x) * FPS)))
            jump = k > 0 or (prev_src_end is not None and abs(x - prev_src_end) < 3)
            if jump:
                zflip ^= 1
            z = base_zoom * (1.0 + 0.09 * zflip) if o.get("tag") not in ("hook", "cold") else base_zoom
            push = o.get("push", 0.0)
            pc = dict(src=round(x - T0, 3), dur=nf, frm=f0, zoom=round(z, 3), push=push,
                      face=face_for(x, y), clip=ci, tag=o.get("tag", "body"))
            pieces.append(pc)
            clip_pieces.append((x, y, pc))
            cur += nf
        prev_src_end = parts[-1][1] if parts else prev_src_end

        def map_t(t, snap=True):
            for x, y, pc in clip_pieces:
                if x <= t <= y:
                    return pc["frm"] + (t - x) * FPS
            if snap:
                for x, y, pc in clip_pieces:
                    if t < x:
                        return pc["frm"]
                x, y, pc = clip_pieces[-1]
                return pc["frm"] + pc["dur"] - 1
            return None

        # captions
        toks = fix_tokens(ws)
        out_words = []
        def nearest(t, tol=0.9):
            """Map a source time onto the output, snapping to the closest kept piece
            (whisper word times drift by a few hundred ms)."""
            best = None
            for x, y, pc in clip_pieces:
                if x <= t <= y:
                    return pc["frm"] + (t - x) * FPS
                d = x - t if t < x else t - y
                if d <= tol and (best is None or d < best[0]):
                    best = (d, pc["frm"] if t < x else pc["frm"] + pc["dur"] - 2)
            return best[1] if best else None

        last_f = -1
        for t in toks:
            mid = (t["s"] + min(t["e"], t["s"] + 0.6)) / 2
            m = nearest(mid)
            if m is None:
                continue
            fs = max(nearest(t["s"]) or m - 3, last_f + 1)
            fe = nearest(min(t["e"], t["s"] + 0.9)) or m + 3
            out_words.append(dict(t=t["w"], f0=int(fs), f1=int(max(fe, fs + 3))))
            last_f = int(fs)
        chunk = []

        def flush():
            if chunk:
                captions.append(dict(frm=chunk[0]["f0"], end=chunk[-1]["f1"],
                                     words=[dict(t=c["t"], f=c["f0"] - chunk[0]["f0"],
                                                 hl=bool(HL_WORDS.match(c["t"]))) for c in chunk]))
                chunk.clear()

        for w in out_words:
            if w["t"].lower() in FILLER and not chunk:
                continue
            if chunk and w["t"][:1].isupper() and w["t"] not in KEEP_CAPS:
                flush()
            txt = " ".join(c["t"] for c in chunk + [w])
            if chunk and (len(chunk) >= 3 or len(txt) > 17 or w["f0"] - chunk[-1]["f1"] > 8):
                flush()
            chunk.append(w)
            if re.search(r"[.?!,]$", w["t"]):
                flush()
        flush()
        for w in out_words:
            speech.append([w["f0"], w["f1"]])

        # overlays
        clip_end = clip_pieces[-1][2]["frm"] + clip_pieces[-1][2]["dur"] if clip_pieces else cur
        for typ, t, props in list(o.get("ov", [])) + list(o.get("ov2", [])):
            f = int(map_t(t))
            d = OV_DUR.get(typ)
            if typ in ("hook",):
                d = max(2.6, (clip_end - f) / FPS)
            dur = int(d * FPS) if d else None
            overlays.append(dict(type=typ, frm=f, dur=dur, props=props, clip=ci))
    total = cur

    # fill open-ended overlays (cta / endcard) to end
    for ov in overlays:
        if ov["dur"] is None:
            ov["dur"] = total - ov["frm"]
    # close captions so they don't overlap
    captions.sort(key=lambda c: c["frm"])
    for i in range(len(captions) - 1):
        nxt = captions[i + 1]["frm"]
        captions[i]["end"] = min(max(captions[i]["end"] + 4, captions[i]["frm"] + 8), nxt) if nxt - captions[i]["end"] < 10 else captions[i]["end"] + 4
        captions[i]["end"] = min(captions[i]["end"], nxt)
    if captions:
        captions[-1]["end"] = min(captions[-1]["end"] + 6, total)

    # speech intervals merged
    speech.sort()
    merged = []
    for s, e in speech:
        if merged and s - merged[-1][1] <= 9:
            merged[-1][1] = max(merged[-1][1], e)
        else:
            merged.append([s, e])

    # ------------------------------------------------ SFX design
    def add(name, frame, vol, align="sync"):
        m = SFX[name]
        off = m["sync"] if align == "sync" else (m["dur"] if align == "end" else 0)
        f = int(round(frame - off * FPS))
        if f < 0:
            f = 0
        sfx.append(dict(name=name, frm=f, vol=vol))

    for ov in overlays:
        f, t = ov["frm"], ov["type"]
        if t == "hook":
            add("boom-hit-medium", f + 1, 0.55)
            add("whoosh-fast-hard", f + 2, 0.35)
        elif t == "title":
            add("reverse-whoosh-short-soft", f, 0.35, align="end")
            add("whoosh-medium-medium", f + 2, 0.5)
            add("pop-medium-in", f + 10, 0.4)
        elif t == "chapter":
            add("reverse-whoosh-medium-strong", f, 0.35, align="end")
            add("boom-hit-medium", f + 1, 0.45)
            add("whoosh-medium-hard", f + 3, 0.35)
        elif t == "chip":
            add("click-toggle-on-soft", f + 3, 0.6)
        elif t == "step":
            add("pop-small-in", f + 2, 0.5)
        elif t == "tip":
            add("zip-in-soft", f + 2, 0.45)
            add("tone-ding-mid", f + 9, 0.25)
        elif t == "stat":
            add("whoosh-fast-soft", f + 2, 0.4)
            add("impact-light-soft", f + 6, 0.45)
            if ov["props"].get("strike"):
                add("swish-medium", f + 26, 0.4)
        elif t == "reveal":
            add("riser-1s-soft", f, 0.35, align="end")
            add("shimmer-short-sparkle", f + 2, 0.5)
        elif t == "quote":
            add("mechanical-shutter-light", f + 2, 0.4)
        elif t == "cta":
            add("whoosh-medium-medium", f + 2, 0.4)
            add("notification-success-sparkle", f + 12, 0.4)
        elif t == "bigtitle":
            add("riser-2s-soft", f, 0.4, align="end")
            add("cinematic-slam-big", f + 1, 0.5)
            add("shimmer-medium-bright", f + 8, 0.4)
        elif t == "lineup":
            for k in range(5):
                add("pop-small-in", f + 12 + k * 9, 0.4)
        elif t == "recap":
            for k in range(5):
                add("pop-small-in", f + 6 + k * 8, 0.4)
        elif t == "endcard":
            add("sting-warm-short", f + 2, 0.45)
    # subtle whoosh on hard source jumps between sections (not jump cuts)
    for i in range(1, len(pieces)):
        p, q = pieces[i - 1], pieces[i]
        if p["clip"] != q["clip"] and abs((q["src"]) - (p["src"] + p["dur"] / FPS)) > 30:
            near = any(abs(s["frm"] - q["frm"]) < 20 for s in sfx)
            if not near:
                add("whoosh-fast-soft", q["frm"], 0.22)

    # ------------------------------------------------ music bed
    music_file = f"music/{vid}.wav"
    make_music(os.path.join(PUB, music_file), music_plan(pieces, overlays, total), total / FPS)

    data = dict(id=vid, fps=FPS, layout=layout, total=total, pieces=pieces, captions=captions,
                overlays=overlays, sfx=sfx, speech=merged, music=music_file,
                chapters=[dict(key=ov["props"]["key"], frm=ov["frm"], menu=ov["props"]["menu"])
                          for ov in overlays if ov["type"] == "chapter"])
    json.dump(data, open(os.path.join(OUT, f"{vid}.json"), "w"))
    print(f"{vid}: {total / FPS:6.1f}s  pieces={len(pieces)} captions={len(captions)} overlays={len(overlays)} sfx={len(sfx)}")
    return data


NORM_CACHE = {}


def norm_track(name):
    if name in NORM_CACHE:
        return NORM_CACHE[name]
    dst = os.path.join(WORK, f"norm_{name}.wav")
    if not os.path.exists(dst):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", os.path.join(MUSIC_SRC, name + ".wav"),
                        "-af", "loudnorm=I=-18:LRA=9:TP=-2", "-ar", "48000", "-ac", "2", dst], check=True)
    NORM_CACHE[name] = dst
    return dst


def make_music(dst, sections, total_s):
    """sections: list of (start_s, end_s, track, offset_s)."""
    inputs, filters = [], []
    for k, (s, e, track, off) in enumerate(sections):
        dur = e - s + 1.2
        inputs += ["-stream_loop", "-1", "-ss", str(off), "-i", norm_track(track)]
        filters.append(f"[{k}:a]atrim=0:{dur:.3f},asetpts=PTS-STARTPTS,afade=t=in:d={0.6 if k else 0.05},"
                       f"afade=t=out:st={max(0, dur - 1.4):.3f}:d=1.4,adelay={int(s * 1000)}|{int(s * 1000)}[m{k}]")
    mix = "".join(f"[m{k}]" for k in range(len(sections)))
    filters.append(f"{mix}amix=inputs={len(sections)}:normalize=0,atrim=0:{total_s + 0.5:.3f}[out]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(filters),
                    "-map", "[out]", "-ar", "48000", "-ac", "2", dst], check=True)


def short_plan(key):
    def plan(pieces, overlays, total):
        return [(0, total / FPS, SPEC.CHEFS[key]["music"], 0)]
    return plan


def full_plan(pieces, overlays, total):
    marks = [(0, "m_151_06", 0)]
    for ov in overlays:
        if ov["type"] == "chapter":
            marks.append((ov["frm"] / FPS, SPEC.CHEFS[ov["props"]["key"]]["music"], 0))
        if ov["type"] == "recap":
            marks.append((ov["frm"] / FPS - 4, "m_151_06", 95))
    secs = []
    for i, (s, tr, off) in enumerate(marks):
        e = marks[i + 1][0] if i + 1 < len(marks) else total / FPS
        secs.append((s, e, tr, off))
    return secs


if __name__ == "__main__":
    only = sys.argv[2:] or list(SPEC.SHORTS) + ["full"]
    for key in only:
        if key == "full":
            build("full", SPEC.FULL, "wide", full_plan)
        else:
            build(key, SPEC.SHORTS[key], "short", short_plan(key))
