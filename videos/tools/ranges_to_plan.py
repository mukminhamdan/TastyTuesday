#!/usr/bin/env python3
"""Expand a range-level edit (videos/plans/<name>.src.json) into a clip-level plan.

Each range keeps the speech inside it and drops pauses: ASR segments within the
range are merged while the gap between them is under --gap seconds, and every
merged run becomes one clip. Caption text comes from the ASR, cleaned with the
spelling fixes below, unless the range gives its own "text".

Usage: python3 ranges_to_plan.py plans/padat.src.json transcript/source_transcript.json plans/padat.json
"""
import argparse, json, re

FIXES = [
    (r"\b(kubur|kuburn|kugun|kuban|kubuan|kuven|kuvert|kuhun|kufvn|kufan|kuvoi|kuvo|kubut|kubutnya|kuvertnya|proven|fecover|f-e cover|cover|coover|kuhoorn|kuven punya)\b", "Cooven"),
    (r"\b(mumin|mami|bomin|mokmin|memimpunya|mukmin)\b", "Mukmin"),
    (r"\b(salmah|samas|kasalemah|kaisalembah|kat salmah)\b", "Salma"),
    (r"\b(kak anif|kak anir|kat anipun|syaf hani|chef honey)\b", "Kak Hani"),
    (r"\bair (cribs|crips|crepes|krebs|clips|kreps)\b", "air crisp"),
    (r"\bechips\b", "air crisp"),
    (r"\b(perihid|pre-hit|free hit|free-kan|perihik|perihitkan|free-hit|pre-heat)\b", "preheat"),
    (r"\b(cukur duduk|cukur duk|cengkut|cikodong|cikodok|skuruh pisang)\b", "cekodok"),
    (r"\b(abu-abu|abut-abut|abuk-abuk|abok-abok|kebab-babuk|babut|kui abo abo|keribu-keribu)\b", "abok-abok"),
    (r"\b(kui|kuih-kuih)\b", "kuih"),
    (r"\b(syaf|syah|syabir)\b", "chef"),
    (r"\b(di fry|di-fry|defry|di frai)\b", "deep fry"),
    (r"\b(mukviza|mod visa|tiza gun|mod tiza|wizzak)\b", "pizza"),
    (r"\b(krup krap krup krap|kerap kerap kerap|krup krup krup|crop crop crop)\b", "krup krup krup"),
    (r"\b(tesi tuesday|tesir tuesday|tesir)\b", "Tasty Tuesday"),
    (r"\b(rag|rek)\b", "rack"),
    (r"\b(ride|right) ni\b", "rack ni"),
    (r"\bkelonsong\b", "kelongsong"),
    (r"\bciz\b", "cheese"),
    (r"\bsoup, beans\b", "sous vide"),
    (r"\s+", " "),
]


def clean(text):
    for pat, rep in FIXES:
        text = re.sub(pat, rep, text, flags=re.I)
    return text.strip()


def split_text(text, durs):
    """Split one caption across pieces, breaking at punctuation nearest each piece's share of the time."""
    words = text.split()
    cuts, total, acc = [], sum(durs), 0.0
    for d in durs[:-1]:
        acc += d
        target = acc / total * len(words)
        cands = [i + 1 for i, w in enumerate(words[:-1]) if re.search(r"[.,?!]$", w)] or list(range(1, len(words)))
        cuts.append(min((c for c in cands if not cuts or c > cuts[-1]), key=lambda c: abs(c - target), default=len(words) - 1))
    bounds = [0] + cuts + [len(words)]
    return [" ".join(words[bounds[i]:bounds[i + 1]]) for i in range(len(durs))]


def expand(src, segs, gap):
    clips = []
    for r in src["ranges"]:
        a, b = r["in"], r["out"]
        inside = [s for s in segs if s["end"] > a + 0.05 and s["start"] < b - 0.05]
        runs = []
        for s in inside:
            s0, s1 = max(a, s["start"]), min(b, s["end"])
            if runs and s0 - runs[-1]["out"] < gap:
                runs[-1]["out"] = s1
                runs[-1]["asr"].append(s["text"])
            else:
                runs.append({"in": s0, "out": s1, "asr": [s["text"]]})
        texts = r.get("texts")
        if not texts and "text" in r and len(runs) > 1:
            texts = split_text(r["text"], [x["out"] - x["in"] for x in runs])
        for j, run in enumerate(runs):
            clip = {k: v for k, v in r.items() if k not in ("in", "out", "id", "text", "texts", "graphics")}
            clip.update({"id": r["id"] if len(runs) == 1 else f'{r["id"]}.{j}', "in": round(run["in"], 2), "out": round(run["out"], 2)})
            if texts:
                clip["text"] = texts[j]
            elif "text" in r and len(runs) == 1:
                clip["text"] = r["text"]
            else:
                clip["text"] = clean(" ".join(run["asr"]))
            clips.append(clip)
    return clips


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("transcript")
    ap.add_argument("out")
    ap.add_argument("--gap", type=float, default=0.6)
    a = ap.parse_args()
    src = json.load(open(a.src))
    segs = json.load(open(a.transcript))["segments"]
    plan = {k: v for k, v in src.items() if k != "ranges"}
    plan["clips"] = expand(src, segs, a.gap)
    json.dump(plan, open(a.out, "w"), indent=1, ensure_ascii=False)
    total = sum(c["out"] - c["in"] for c in plan["clips"])
    print(f"{len(plan['clips'])} clips, ~{total:.0f}s")
