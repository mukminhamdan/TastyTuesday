#!/usr/bin/env python3
"""Export / import every on-screen text as one plain, editable sheet.

    python3 tools/text_sheet.py export            # -> TEKS-SKRIN.txt
    python3 tools/text_sheet.py apply             # TEKS-SKRIN.txt -> edits/*.json (then rebuild)

Each block is keyed by [video.oNN] (overlay) or [video.gNN] (full-screen card); only the
`field = value` lines are read back, so times and headings are just guidance.
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import build  # noqa: E402

SHEET = os.path.join(ROOT, "TEKS-SKRIN.txt")
ORDER = ["reels", "menu-1-pes-sup", "menu-2-red-velvet", "menu-3-siakap-stim", "menu-4-ubi-lambung", "bloopers", "youtube-full"]
FIELDS = {
    "hook": ["kicker", "text", "highlight"], "tip": ["title", "text"], "label": ["title", "text"],
    "fact": ["title", "text"], "menu": ["num", "text", "apps"], "joke": ["text"], "lower": ["name", "role"],
    "ingredients": ["title", "items"], "chapter": ["kicker", "text"], "reveal": ["text", "sub"],
    "cta": ["text", "button", "sub"], "now": ["kicker", "text", "apps"],
}
GFX_FIELDS = ["l1", "l2", "l3"]
LABEL = {"hook": "HOOK", "tip": "TIP", "label": "LABEL", "fact": "FAKTA", "menu": "KAD MENU", "joke": "LAWAK",
         "lower": "NAMA", "ingredients": "BAHAN", "chapter": "BAB", "reveal": "HASIL", "cta": "CTA",
         "now": "PANEL 'SEDANG DIMASAK'"}

HEADER = """TEKS SKRIN — Tasty Tuesday EP3 · Better Together
==================================================
Cara edit:
  • Tukar hanya teks selepas tanda "=". Jangan ubah baris [kod] di atasnya.
  • [perkataan] dalam teks tip = perkataan itu diwarnakan merah.
  • highlight = perkataan dalam hook yang diwarnakan kuning (mesti ada dalam teks).
  • apps / items = senarai, dipisah dengan " | ".
  • Masa (m:ss) ialah kedudukan dalam video siap — sebagai panduan sahaja.
  • Simpan fail ini dan hantar semula; saya akan masukkan ke video.
"""


def fmt_t(t):
    return f"{int(t // 60)}:{t % 60:04.1f}"


def val(v):
    return " | ".join(v) if isinstance(v, list) else str(v)


def export():
    words, _ = build.load_words()
    out = [HEADER]
    for vid in ORDER:
        e = json.load(open(os.path.join(ROOT, "edits", f"{vid}.json")))
        clips, beats, total = build.build_clips(e, words)
        rows = []
        for i, o in enumerate(e["overlays"]):
            if o["type"] not in FIELDS:
                continue
            st = o["out_at"] if "out_at" in o else build.src_to_out(clips, o["at"])
            if st is None:
                continue
            st = st if st >= 0 else total + st
            rows.append((st, f"[{vid}.o{i:02d}]", LABEL[o["type"]], [(f, o[f]) for f in FIELDS[o["type"]] if f in o]))
        gi = 0
        for k, s in enumerate(e["segments"]):
            if "gfx" in s:
                rows.append((beats[gi]["start"], f"[{vid}.g{k:02d}]", "KAD " + s["gfx"].upper(),
                             [(f, s[f]) for f in GFX_FIELDS if f in s]))
                gi += 1
        rows.sort(key=lambda r: r[0])
        out.append(f"\n\n### {e.get('title', vid)}  ·  {fmt_t(total)}\n")
        for st, key, lab, fields in rows:
            out.append(f"\n{key} {fmt_t(st)} {lab}")
            for f, v in fields:
                out.append(f"  {f} = {val(v)}")
    open(SHEET, "w").write("\n".join(out) + "\n")
    print("wrote", SHEET)


def apply():
    edits, cur = {}, None
    for line in open(SHEET):
        m = re.match(r"\[([\w-]+)\.([og])(\d+)\]", line.strip())
        if m:
            cur = (m.group(1), m.group(2), int(m.group(3)))
            edits.setdefault(cur, {})
            continue
        m = re.match(r"\s+(\w+) = (.*)$", line.rstrip("\n"))
        if m and cur:
            edits[cur][m.group(1)] = m.group(2).strip()
    changed = 0
    for vid in ORDER:
        p = os.path.join(ROOT, "edits", f"{vid}.json")
        e = json.load(open(p))
        for (v, kind, n), fields in edits.items():
            if v != vid:
                continue
            item = e["overlays"][n] if kind == "o" else e["segments"][n]
            for f, new in fields.items():
                new_v = [x.strip() for x in new.split("|")] if isinstance(item.get(f), list) else new
                if item.get(f) != new_v:
                    item[f] = new_v
                    changed += 1
        json.dump(e, open(p, "w"), indent=1, ensure_ascii=False)
    print("fields changed:", changed)


if __name__ == "__main__":
    {"export": export, "apply": apply}[sys.argv[1]]()
