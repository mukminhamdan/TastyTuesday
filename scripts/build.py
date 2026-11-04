"""Build the edit: cut proxies + clean voice track + timeline.json for Remotion.

Usage: python3 -I build.py <raw.mp4> <transcript.json> <repo_dir>
"""
import json, os, subprocess, sys

RAW, TRANSCRIPT, REPO = sys.argv[1], sys.argv[2], sys.argv[3]
FPS = 30
PUB = os.path.join(REPO, "public")
CLIPS = os.path.join(PUB, "clips")
MEDIA = os.path.join(PUB, "media")
TMP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "work", "build_tmp")
for d in (CLIPS, MEDIA, TMP):
    os.makedirs(d, exist_ok=True)

words_all = [w for s in json.load(open(TRANSCRIPT)) for w in s["words"]]

# ----------------------------------------------------------------------------
# EDIT DECISION LIST
# voice: (src_in, src_out, caption text) — caption text is hand-corrected
# shots: dict(src, dur | None (fills), speed, sync=True to lock to voice[i])
# ----------------------------------------------------------------------------
BEATS = [
    # Cooking-only cut (v2): no talking-head shots, voice only as VO over food.
    dict(id="hook", pre=0.9, lead=0.0, tail=0.45,
         voice=[(738.55, 739.98, "Tak payah|nak tukar bekas")],
         shots=[dict(src=1920.6, dur=1.6, speed=0.8, zoom=1.4, origin="85% 95%"),
                dict(src=1690.0, dur=None, speed=1.2)]),
    dict(id="s1", pre=4.0, lead=0.0, tail=0.0, voice=[],          # goreng ikan (Aircrisp)
         shots=[dict(src=1096.0, dur=1.3, speed=3.0, label="3x"),
                dict(src=1200.0, dur=1.2, speed=4.0, label="4x"),
                dict(src=1181.0, dur=None, speed=1.3)]),
    dict(id="s2", pre=2.0, lead=0.0, tail=0.0, voice=[],          # ketepikan ikan
         shots=[dict(src=1255.5, dur=None, speed=1.4)]),
    dict(id="s3", pre=1.8, lead=0.0, tail=0.0, voice=[],          # masukkan minyak
         shots=[dict(src=1270.9, dur=None, speed=1.0)]),
    dict(id="s4", pre=3.2, lead=0.0, tail=0.0, voice=[],          # ibu sambal
         shots=[dict(src=1325.0, dur=1.6, speed=1.6),
                dict(src=1341.0, dur=None, speed=3.0, label="3x")]),
    dict(id="s5", pre=0.0, lead=0.15, tail=0.35,                 # jintan putih
         voice=[(596.60, 598.00, "Yang beza ni,|jintan")],
         shots=[dict(src=1358.3, dur=None, speed=1.0)]),
    dict(id="s6", pre=0.0, lead=0.15, tail=0.3,                  # kicap sikit
         voice=[(598.20, 600.80, "Taruk kicap sikit,|nanti jadi sambal")],
         shots=[dict(src=1454.3, dur=1.7, speed=1.0),
                dict(src=1498.0, dur=None, speed=1.5)]),
    dict(id="s7", pre=2.6, lead=0.0, tail=0.4,                   # gaul dengan ikan
         voice=[(600.85, 602.35, "Sambal hitam")],
         shots=[dict(src=1484.0, dur=1.3, speed=1.5),
                dict(src=1512.0, dur=1.2, speed=2.0),
                dict(src=1560.0, dur=None, speed=2.0)]),
    dict(id="s8", pre=2.6, lead=0.0, tail=0.0, voice=[],          # tutup, biar meresap
         shots=[dict(src=1636.0, dur=1.1, speed=4.0, label="4x"),
                dict(src=1692.0, dur=None, speed=1.0)]),
    dict(id="end", pre=0.0, lead=0.1, tail=3.6,
         voice=[(1813.45, 1814.25, "Siap!")],
         shots=[dict(src=1812.8, voice=0, speed=1.0),
                dict(src=1920.4, dur=None, speed=0.75, zoom=1.4, origin="85% 95%")]),
]
GAP = 0.08  # breath between voice pieces inside a beat (dead air removed)

def f(sec):
    return int(round(sec * FPS))

def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

timeline = dict(fps=FPS, clips=[], voice=[], captions=[], beats=[])
t = 0.0
clip_n = 0
voice_parts = []

for beat in BEATS:
    b_start = t
    t += beat.get("pre", 0.0) + beat["lead"]
    vplaced = []
    for i, (a, b, text) in enumerate(beat["voice"]):
        vplaced.append((t, a, b, text))
        t += (b - a) + (GAP if i < len(beat["voice"]) - 1 else 0)
    t += beat["tail"]
    b_end = t
    timeline["beats"].append(dict(id=beat["id"], s=f(b_start), e=f(b_end),
                                  voice=[dict(s=f(o), e=f(o + (b - a))) for o, a, b, _ in vplaced]))

    # --- video shots: sync / voice-anchored shots get fixed windows; others fill
    windows = []
    for sh in beat["shots"]:
        if "sync" in sh:
            o, a, b, _ = vplaced[sh["sync"]]
            windows.append([o, o + (b - a), a, 1.0, sh])
        elif "voice" in sh:
            o, a, b, _ = vplaced[sh["voice"]]
            windows.append([o, o + (b - a), sh["src"], sh.get("speed", 1.0), sh])
        else:
            windows.append([None, sh.get("dur"), sh["src"], sh.get("speed", 1.0), sh])
    # lay out sequentially: anchored windows fix positions; free ones flow
    cur = b_start
    for wi, w in enumerate(windows):
        if w[0] is None:
            start = cur
            if w[1] is None:  # fill until next anchored window or beat end
                nxt = next((x[0] for x in windows[wi + 1:] if x[0] is not None), b_end)
                end = nxt
            else:
                end = start + w[1]
            w[0], w[1] = start, end
        else:
            # extend the first anchored window back to cover the lead, and
            # the last forward to cover the tail
            if wi == 0:
                w[2] -= (w[0] - b_start) * (w[3])
                w[0] = b_start
        cur = w[1]
    windows[-1][1] = b_end
    # close every gap: each shot runs until the next one starts (no black frames)
    for wi in range(len(windows) - 1):
        windows[wi][1] = windows[wi + 1][0]
    for w in windows:
        s, e, src, speed, sh = w
        dur_f = f(e) - f(s)
        if dur_f <= 0:
            continue
        clip_n += 1
        name = f"c{clip_n:02d}.mp4"
        src_len = (dur_f / FPS) * speed + 0.1
        vf = (f"setpts=PTS/{speed},fps={FPS},scale=1080:2160:flags=lanczos,crop=1080:1920:0:120,"
              "eq=saturation=1.12:contrast=1.04")
        run(["ffmpeg", "-y", "-ss", f"{src:.3f}", "-t", f"{src_len:.3f}", "-i", RAW, "-an",
             "-vf", vf, "-frames:v", str(dur_f), "-c:v", "libx264", "-preset", "veryfast",
             "-crf", "18", "-pix_fmt", "yuv420p", "-g", "15", os.path.join(CLIPS, name)])
        timeline["clips"].append(dict(file=f"clips/{name}", s=f(s), e=f(s) + dur_f,
                                      beat=beat["id"], sync="sync" in sh, label=sh.get("label"),
                                      zoom=sh.get("zoom"), origin=sh.get("origin")))

    # --- captions (hand-corrected text, timing from whisper / even spread)
    for o, a, b, text in vplaced:
        voice_parts.append((o, a, b))
        groups = [g.split() for g in text.split("|")]
        toks = [x for g in groups for x in g]
        ww = [w for w in words_all if w["s"] >= a - 0.05 and w["e"] <= b + 0.05]
        if len(ww) == len(toks):
            times = [(max(a, w["s"]), min(b, w["e"])) for w in ww]
        else:
            tot = sum(len(x) for x in toks)
            acc, times = a, []
            for x in toks:
                d = (b - a) * len(x) / tot
                times.append((acc, acc + d)); acc += d
        words = [dict(t=x, s=f(o + (ts - a)), e=f(o + (te - a))) for x, (ts, te) in zip(toks, times)]
        # chunk to single lines (<= 3 words / ~17 chars) so captions never climb onto the face
        if len(groups) > 1:
            k = 0
            for gi, g in enumerate(groups):
                cw = words[k:k + len(g)]; k += len(g)
                end = words[k]["s"] if k < len(words) else f(o + (b - a)) + 6
                timeline["captions"].append(dict(s=cw[0]["s"], e=end, words=cw))
            continue
        chunk = []
        for w in words:
            full = chunk and (len(chunk) >= 3 or sum(len(c["t"]) + 1 for c in chunk) + len(w["t"]) > 20)
            punct = chunk and chunk[-1]["t"][-1] in ",?!."
            if full or punct:
                timeline["captions"].append(dict(s=chunk[0]["s"], e=w["s"], words=chunk)); chunk = []
            chunk.append(w)
        if chunk:
            timeline["captions"].append(dict(s=chunk[0]["s"], e=f(o + (b - a)) + 6, words=chunk))

total_f = f(t)
timeline["durationInFrames"] = total_f
# fix caption overlaps
caps = timeline["captions"]
for i in range(len(caps) - 1):
    caps[i]["e"] = min(caps[i]["e"], caps[i + 1]["s"])

# ----------------------------------------------------------------------------
# VOICE: cut each piece from the original 44.1k audio, clean + level it, then
# place it on a silent bed at its output time -> one voice.wav
# ----------------------------------------------------------------------------
inputs, filters = [], []
for i, (o, a, b) in enumerate(voice_parts):
    inputs += ["-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", RAW]
    d = b - a
    filters.append(
        f"[{i}:a]aformat=sample_rates=48000:channel_layouts=mono,"
        f"afade=t=in:d=0.03,afade=t=out:st={max(0, d - 0.05):.3f}:d=0.05,"
        f"adelay={int(o * 1000)}:all=1[v{i}]")
mix = "".join(f"[v{i}]" for i in range(len(voice_parts)))
filters.append(
    f"{mix}amix=inputs={len(voice_parts)}:normalize=0:dropout_transition=0,"
    "highpass=f=85,lowpass=f=11000,afftdn=nf=-38:tn=1,"
    "equalizer=f=220:t=q:w=1.2:g=-2,equalizer=f=3200:t=q:w=1.0:g=3,"
    "acompressor=threshold=-24dB:ratio=3.5:attack=8:release=120:makeup=4,"
    f"loudnorm=I=-15:TP=-1.5:LRA=7,apad,atrim=0:{total_f / FPS:.3f}[out]")
run(["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(filters), "-map", "[out]",
     "-ar", "48000", "-ac", "1", os.path.join(MEDIA, "voice.wav")])

json.dump(timeline, open(os.path.join(REPO, "src", "data", "timeline.json"), "w"), indent=1, ensure_ascii=False)
print("duration", total_f / FPS, "s;", len(timeline["clips"]), "clips;", len(caps), "caption chunks")
for bt in timeline["beats"]:
    print(bt["id"], bt["s"] / FPS, "->", bt["e"] / FPS)
