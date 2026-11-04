"""Clip specs for the 48-min live: prepping ingredients for Tasty Tuesday (source times in seconds).

part types:
  talk  – speech-only: silences/pauses removed automatically, jump-cut punch-ins
  broll – visual segment, optional speed (timelapse), voice muted
  hold  – real-time segment, ambience kept
overlay/sfx cues are anchored to a part index (+dt seconds into that part).
"""

# ASR fixes (Whisper mishears these in this recording)
FIXES = {
    "sudden": "sardin", "sadin": "sardin", "sada": "sardin", "tidin": "sardin", "berpuny": "berpinat",
}
# (src_start, src_end, corrected text) – replaces the ASR words in that span
OVERRIDES = [
    (711.9, 715.95, "Oh, Sol nak buat ni, sardin roll."),
    (719.9, 722.0, "Kita orang punya tema petang ni, sardin."),
    (725.3, 726.45, "Sardin dan tuna."),
    (728.1, 731.5, "Jadi kita orang masak semua benda yang berkaitan sardin dengan tuna."),
    (742.9, 744.5, "Aku pun tengah masak nasi."),
    (766.0, 767.0, "sardin je banyak,"),
    (1103.7, 1105.4, "terutama bila dia ketawa."),
    (1107.1, 1110.7, "Macam siren tu. Macam raja duyung."),
]
# words rendered in the serif-italic accent style
EMPH = {"sardin", "tuna", "nasi", "roti", "live", "dugong", "siren", "duyung", "ikan"}

M92 = {"src": "music/groove_92.wav", "vol": 0.42, "duck": 0.065}
M104 = {"src": "music/groove_104.wav", "vol": 0.5, "duck": 0.065}

# CC0 beds for the 1-minute Reels/Story clips (scripts/prep_music.py, credits in public/music/CREDITS.md).
# No voice in these clips, so no ducking; beds are normalised to -14 LUFS.
def cc0(name, vol=0.9):
    return {"src": f"music/{name}.mp3", "vol": vol, "duck": vol}


HANDS = [0.5, 0.72]  # counter / hands area in output coords

CLIPS = [
    # ------------------------------------------------------------------ 1
    {
        "id": "01-sardin-roll-roti-biasa",
        "title": "Sardin roll guna roti biasa",
        "music": M104,
        "parts": [
            {"type": "talk", "src": [709.6, 716.2]},                                     # "Masak apa tu? / Oh, nak buat ni... sardin roll"
            {"type": "broll", "src": [392, 404], "speed": 4, "trans": "whip", "zoom": 1.25, "origin": HANDS},
            {"type": "broll", "src": [568, 580], "speed": 3, "trans": "zoomblur", "zoom": 1.55, "origin": [0.48, 0.72]},
            {"type": "broll", "src": [600, 650], "speed": 7, "trans": "whip", "zoom": 1.45, "origin": [0.48, 0.72]},
            {"type": "broll", "src": [1200, 1290], "speed": 30, "trans": "zoomblur", "zoom": 1.0},
            {"type": "broll", "src": [1832, 1844], "speed": 3, "trans": "whip", "zoom": 1.5, "origin": [0.42, 0.71]},
            {"type": "broll", "src": [2164, 2176], "speed": 3, "trans": "zoomblur", "zoom": 1.2},
            {"type": "broll", "src": [2644, 2668], "speed": 6, "trans": "whip", "zoom": 1.15},
            {"type": "hold", "src": [2668.3, 2670.8], "trans": "flash", "zoom": 1.6, "origin": [0.5, 0.8], "voice": False},
            {"type": "hold", "src": [1843, 1847.5], "trans": "zoomblur", "zoom": 1.5, "origin": [0.42, 0.71], "voice": False},
        ],
        "overlays": [
            {"part": 0, "dt": 0.0, "dur": 3.4, "kind": "hook", "h": 330, "props": {"kicker": "Prep untuk live", "line1": "Sardin roll", "line2": "guna roti biasa je.", "y": "auto"}},
            {"part": 1, "dt": 0.2, "dur": 2.8, "kind": "step", "props": {"n": "01", "label": "Ambil roti putih"}},
            {"part": 2, "dt": 0.2, "dur": 3.8, "kind": "step", "props": {"n": "02", "label": "Leperkan nipis-nipis"}},
            {"part": 3, "dt": 0.2, "dur": 3.4, "kind": "step", "props": {"n": "03", "label": "Letak inti sardin"}},
            {"part": 3, "dt": 3.7, "dur": 3.3, "kind": "step", "props": {"n": "04", "label": "Gulung ketat-ketat"}},
            {"part": 4, "dt": 0.2, "dur": 2.6, "kind": "word", "props": {"text": "Ulang", "sub": "sampai habis roti", "y": 330}},
            {"part": 5, "dt": 0.0, "dur": 4.0, "kind": "snap", "props": {"label": "SIAP DIGULUNG"}},
            {"part": 6, "dt": 0.2, "dur": 3.6, "kind": "step", "props": {"n": "05", "label": "Masuk Food Engine Cooven"}},
            {"part": 8, "dt": 0.1, "dur": 2.3, "kind": "word", "props": {"text": "garing.", "serif": True, "y": 360, "color": "#FFC94A", "size": 170}},
            {"part": 9, "dt": 0.2, "dur": 4.2, "kind": "end", "props": {"line1": "Save dulu,", "line2": "buat petang ni."}},
        ],
        "sfx": [{"part": 8, "dt": 0.0, "name": "sizzle", "vol": 0.4}],
    },
    # ------------------------------------------------------------------ 2
    {
        "id": "02-tema-live-sardin-tuna",
        "title": "Tema live petang ni: sardin & tuna",
        "music": M92,
        "parts": [
            {"type": "talk", "src": [727.9, 731.7]},           # cold open: "semua benda yang berkaitan sardin dengan tuna"
            {"type": "talk", "src": [709.6, 726.6], "trans": "whip"},
            {"type": "broll", "src": [600, 650], "speed": 8, "trans": "zoomblur", "zoom": 1.45, "origin": [0.48, 0.72]},
            {"type": "talk", "src": [742.6, 744.7], "trans": "whip"},
            {"type": "broll", "src": [2440, 2540], "speed": 25, "trans": "zoomblur", "zoom": 1.15},
            {"type": "talk", "src": [756.2, 769.3], "trans": "whip"},
            {"type": "broll", "src": [1832, 1844], "speed": 2.5, "trans": "zoomblur", "zoom": 1.5, "origin": [0.42, 0.71]},
        ],
        "overlays": [
            {"part": 0, "dt": 0.0, "dur": 3.6, "kind": "hook", "h": 330, "props": {"kicker": "Tema live petang ni", "line1": "Sardin & tuna", "line2": "semua menu.", "y": "auto"}},
            {"part": 2, "dt": 0.2, "dur": 3.4, "kind": "step", "props": {"n": "01", "label": "Sardin roll"}},
            {"part": 4, "dt": 0.2, "dur": 3.6, "kind": "step", "props": {"n": "02", "label": "Nasi, siap bekas"}},
            {"part": 6, "dt": 0.0, "dur": 4.8, "kind": "end", "props": {"line1": "Sardin & tuna.", "line2": "Komen & follow.", "cta": "KOMEN + FOLLOW"}},
        ],
    },
    # ------------------------------------------------------------------ 3
    {
        "id": "03-satu-periuk-nasi",
        "title": "Satu periuk nasi jadi berbekas-bekas",
        "music": M104,
        "parts": [
            {"type": "hold", "src": [2802, 2806], "zoom": 1.3, "origin": [0.5, 0.82], "voice": False},
            {"type": "broll", "src": [1950, 1995], "speed": 9, "trans": "whip", "zoom": 1.2},
            {"type": "broll", "src": [2205, 2560], "speed": 40, "trans": "zoomblur", "zoom": 1.15},
            {"type": "broll", "src": [2740, 2800], "speed": 12, "trans": "whip", "zoom": 1.2, "origin": [0.5, 0.82]},
            {"type": "hold", "src": [2836, 2841.5], "trans": "flash", "zoom": 1.35, "origin": [0.5, 0.82], "voice": False},
        ],
        "overlays": [
            {"part": 0, "dt": 0.0, "dur": 3.8, "kind": "hook", "h": 330, "props": {"kicker": "Prep bahan live", "line1": "1 periuk nasi", "line2": "jadi semua ni.", "y": "auto"}},
            {"part": 1, "dt": 0.2, "dur": 4.2, "kind": "step", "props": {"n": "01", "label": "Gaul nasi panas"}},
            {"part": 2, "dt": 0.3, "dur": 5.0, "kind": "step", "props": {"n": "02", "label": "Tekap guna mangkuk"}},
            {"part": 2, "dt": 5.6, "dur": 2.0, "kind": "word", "props": {"text": "Kemas.", "serif": True, "y": 360, "color": "#FFC94A", "size": 170}},
            {"part": 3, "dt": 0.2, "dur": 4.2, "kind": "step", "props": {"n": "03", "label": "Susun dalam bekas"}},
            {"part": 4, "dt": 0.0, "dur": 5.5, "kind": "end", "props": {"line1": "Prep siap awal,", "line2": "live jadi lancar."}},
        ],
    },
    # ------------------------------------------------------------------ 4
    {
        "id": "04-48-minit-dalam-30-saat",
        "title": "48 minit di dapur, dalam 30 saat",
        "music": M104,
        "parts": [
            {"type": "broll", "src": [2668.3, 2670.8], "speed": 1, "zoom": 1.6, "origin": [0.5, 0.8], "voice": False},
            {"type": "broll", "src": [392, 404], "speed": 6, "trans": "whip", "zoom": 1.2, "tag": False},
            {"type": "broll", "src": [566, 590], "speed": 8, "trans": "whip", "zoom": 1.5, "origin": [0.48, 0.72], "tag": False},
            {"type": "broll", "src": [600, 650], "speed": 14, "trans": "whip", "zoom": 1.4, "origin": [0.48, 0.72], "tag": False},
            {"type": "broll", "src": [700, 1800], "speed": 250, "trans": "zoomblur", "zoom": 1.0},
            {"type": "broll", "src": [1832, 1844], "speed": 5, "trans": "whip", "zoom": 1.5, "origin": [0.42, 0.71], "tag": False},
            {"type": "broll", "src": [1950, 1990], "speed": 15, "trans": "whip", "zoom": 1.2, "tag": False},
            {"type": "broll", "src": [2164, 2176], "speed": 5, "trans": "whip", "zoom": 1.2, "tag": False},
            {"type": "broll", "src": [2205, 2560], "speed": 150, "trans": "zoomblur", "zoom": 1.15},
            {"type": "broll", "src": [2644, 2668], "speed": 10, "trans": "whip", "zoom": 1.15, "tag": False},
            {"type": "hold", "src": [2802, 2806], "trans": "flash", "zoom": 1.3, "origin": [0.5, 0.82], "voice": False},
        ],
        "overlays": [
            {"part": 0, "dt": 0.0, "dur": 2.6, "kind": "hook", "h": 330, "props": {"kicker": "Prep sebelum live", "line1": "48 minit", "line2": "dalam 30 saat.", "y": "auto"}},
            {"part": 4, "dt": 0.1, "dur": 2.2, "kind": "word", "props": {"text": "×250", "y": 330}},
            {"part": 5, "dt": 0.0, "dur": 2.4, "kind": "snap", "props": {"label": "SARDIN ROLL"}},
            {"part": 10, "dt": 0.0, "dur": 4.0, "kind": "end", "props": {"line1": "Mana satu", "line2": "nak cuba dulu?"}},
        ],
    },
    # ------------------------------------------------------------------ 5
    {
        "id": "05-dugong-ketawa-atas-sampan",
        "title": "Dugong ketawa atas sampan?",
        "music": M92,
        "parts": [
            {"type": "talk", "src": [1094.1, 1102.3]},
            {"type": "talk", "src": [1103.6, 1110.8], "trans": "whip"},
            {"type": "broll", "src": [1110.8, 1116.0], "speed": 2, "trans": "zoomblur", "zoom": 1.45, "origin": [0.48, 0.72], "tag": False},
        ],
        "overlays": [
            {"part": 0, "dt": 0.0, "dur": 3.2, "kind": "hook", "h": 330, "props": {"kicker": "Sambil prep bahan", "line1": "Dugong ketawa", "line2": "ikan datang?", "y": "auto"}},
            {"part": 1, "dt": 3.6, "dur": 1.6, "kind": "word", "props": {"text": "Siren?!", "y": 330}},
            {"part": 2, "dt": 0.0, "dur": 2.6, "kind": "end", "props": {"line1": "Pernah dengar?", "line2": "Komen bawah."}},
        ],
    },
    # ------------------------------------------------------------------ 6
    # 60s cinematic montage for IG Stories / Reels: CC0 music bed only (no voice/SFX), quotes.
    {
        "id": "06-reels-story-1-minit",
        "title": "Sebelum live, ada dapur ni (1 minit)",
        "silent": True,
        "music": cc0("cc0_rhodes_jazz"),
        "progress": False,
        "topY": 280,  # IG Story header bar
        "parts": [
            {"type": "hold", "src": [2668.3, 2671.3], "zoom": 1.6, "origin": [0.5, 0.8], "voice": False},
            {"type": "broll", "src": [394, 404], "speed": 2, "trans": "fade", "zoom": 1.2, "origin": HANDS, "tag": False},
            {"type": "broll", "src": [568, 580], "speed": 2, "trans": "fade", "zoom": 1.5, "origin": [0.48, 0.72], "tag": False},
            {"type": "broll", "src": [600, 630], "speed": 3.5, "trans": "fade", "zoom": 1.4, "origin": [0.48, 0.72], "tag": False},
            {"type": "broll", "src": [1832, 1844], "speed": 2, "trans": "fade", "zoom": 1.5, "origin": [0.42, 0.71], "tag": False},
            {"type": "broll", "src": [1950, 1974], "speed": 3, "trans": "fade", "zoom": 1.2, "tag": False},
            {"type": "broll", "src": [2440, 2540], "speed": 15, "trans": "fade", "zoom": 1.15},
            {"type": "broll", "src": [2164, 2176], "speed": 2, "trans": "fade", "zoom": 1.2, "tag": False},
            {"type": "broll", "src": [2740, 2800], "speed": 10, "trans": "fade", "zoom": 1.2, "origin": [0.5, 0.82], "tag": False},
            {"type": "hold", "src": [2802, 2806.5], "trans": "fade", "zoom": 1.3, "origin": [0.5, 0.82], "voice": False},
        ],
        "overlays": [
            {"part": 0, "dt": 0.0, "dur": 3.0, "kind": "hook", "h": 330, "props": {"kicker": "Prep bahan pagi ni", "line1": "Sebelum live,", "line2": "ada dapur ni.", "y": "auto"}},
            {"part": 1, "dt": 0.5, "dur": 4.4, "kind": "quote", "h": 320, "props": {"n": "01", "text": "Tak ada yang instant. Semua bermula dengan prep.", "accent": "prep", "y": "auto"}},
            {"part": 3, "dt": 0.5, "dur": 7.6, "kind": "quote", "h": 320, "props": {"n": "02", "text": "Satu-satu. Leper, isi, gulung. Ulang.", "accent": "ulang", "y": "auto"}},
            {"part": 4, "dt": 0.4, "dur": 5.0, "kind": "snap", "props": {"label": "SARDIN ROLL"}},
            {"part": 5, "dt": 0.5, "dur": 7.0, "kind": "quote", "h": 320, "props": {"n": "03", "text": "Sabar itu bahan paling penting.", "accent": "sabar", "y": "auto"}},
            {"part": 7, "dt": 0.4, "dur": 5.2, "kind": "quote", "h": 320, "props": {"n": "04", "text": "Kerja kecil pagi ni, live lancar petang nanti.", "accent": "lancar", "y": "auto"}},
            {"part": 8, "dt": 0.4, "dur": 5.2, "kind": "quote", "h": 320, "props": {"n": "05", "text": "Rezeki datang pada yang bersedia.", "accent": "bersedia", "y": "auto"}},
            {"part": 9, "dt": 0.3, "dur": 4.2, "kind": "end", "props": {"line1": "Suka video ni?", "line2": "Komen & follow.", "cta": "KOMEN + FOLLOW", "y": 300}},
        ],
    },

]

# ---------------------------------------------------------------------------
# 60s quote montages (CC0 music, no voice/SFX) for IG Stories / Reels (07–10). Each uses different
# source moments so the series doesn't repeat shots.
# shot: (src_a, src_b, speed, zoom, origin | None=face)

def story(id, title, hook, shots, quotes, end, steps=(), top_y=280, music=None):
    parts = []
    for i, (a, b, sp, z, org) in enumerate(shots):
        part = {"type": "hold" if sp == 1 else "broll", "src": [a, b], "speed": sp, "zoom": z, "voice": False, "tag": False,
                "trans": "cut" if i == 0 else ("zoomblur" if i % 4 == 0 else "fade")}
        if org:
            part["origin"] = org
        parts.append(part)
    ov = [{"part": 0, "dt": 0.0, "dur": 3.2, "kind": "hook", "h": 330, "props": {"kicker": hook[0], "line1": hook[1], "line2": hook[2], "y": "auto"}}]
    for pi, text, accent, n in quotes:
        ov.append({"part": pi, "dt": 0.5, "dur": 5.0, "kind": "quote", "h": 320, "props": {"n": n, "text": text, "accent": accent, "y": "auto"}})
    for pi, n, label in steps:
        ov.append({"part": pi, "dt": 0.2, "dur": 5.4, "kind": "step", "props": {"n": n, "label": label, "y": 290}})
    ov.append({"part": len(shots) - 1, "dt": 0.6, "dur": 5.2, "kind": "end", "props": {"line1": end[0], "line2": end[1], "cta": "KOMEN + FOLLOW", "y": 300}})
    return {"id": id, "title": title, "silent": True, "music": music, "progress": False, "topY": top_y, "parts": parts, "overlays": ov}


CLIPS += [
    story("07-reels-gulung-sampai-habis", "Gulung sampai habis (1 minit)",
          ("Prep bahan", "Gulung", "sampai habis."),
          [(1830, 1836, 1, 1.5, [0.42, 0.71]), (765, 777, 2, 1.4, HANDS), (870, 888, 3, 1.35, HANDS), (960, 978, 3, 1.3, None),
           (1050, 1062, 2, 1.15, None), (1170, 1182, 2, 1.45, HANDS), (1425, 1443, 3, 1.4, HANDS), (1500, 1518, 3, 1.3, None),
           (1680, 1698, 3, 1.35, HANDS), (1838, 1847, 1.5, 1.5, [0.42, 0.71])],
          [(1, "Tangan yang sama, gulungan yang sama.", "sama", "01"),
           (3, "Bukan laju yang penting. Kemas.", "kemas", "02"),
           (5, "Sikit-sikit, lama-lama jadi sepinggan.", "sepinggan", "03"),
           (7, "Penat? Sikit. Puas? Banyak.", "puas", "04")],
          ("Siap digulung.", "Komen & follow."),
          music=cc0("cc0_lofi_80")),
    story("08-reels-senyum-di-dapur", "Senyum di dapur (1 minit)",
          ("Prep bahan", "Senyum dulu,", "baru masak."),
          [(1050, 1056, 1, 1.25, None), (945, 957, 2, 1.2, None), (1080, 1092, 2, 1.2, None), (1125, 1137, 2, 1.25, None),
           (1245, 1257, 2, 1.2, None), (1560, 1572, 2, 1.2, None), (1770, 1782, 2, 1.2, None), (2115, 2133, 3, 1.3, None),
           (2205, 2217, 2, 1.2, None), (2430, 2442, 2, 1.2, None)],
          [(1, "Kerja penat jadi ringan bila hati senang.", "senang", "01"),
           (3, "Masak dengan tenang, rasa pun jadi tenang.", "tenang", "02"),
           (5, "Yang buat sedap: seronok masa masak.", "seronok", "03"),
           (7, "Nikmati prosesnya.", "prosesnya", "04")],
          ("Senyum sikit.", "Komen & follow."),
          music=cc0("cc0_jazzhop_80")),
    story("09-reels-satu-periuk-nasi", "Satu periuk, satu-satu bekas (1 minit)",
          ("Prep bahan", "Satu periuk,", "satu-satu bekas."),
          [(2808, 2814, 1, 1.3, [0.5, 0.82]), (1950, 1968, 3, 1.2, None), (1968, 1992, 4, 1.25, None), (2235, 2253, 3, 1.2, None),
           (2253, 2295, 7, 1.3, [0.45, 0.75]), (2340, 2382, 7, 1.2, None), (2520, 2550, 5, 1.2, None), (2625, 2643, 3, 1.25, None),
           (2720, 2780, 10, 1.2, [0.5, 0.82]), (2850, 2862, 2, 1.3, [0.5, 0.8])],
          [(2, "Sukat sama rata. Adil untuk setiap bekas.", "adil", "01"),
           (4, "Kerja berulang, tapi tak pernah sama.", "berulang", "02"),
           (6, "Kemas itu tanda hormat pada yang makan.", "hormat", "03"),
           (8, "Siap satu, sambung lagi.", "sambung", "04")],
          ("Nasi siap.", "Komen & follow."),
          music=cc0("cc0_groove_160")),
    story("10-reels-5-bab-satu-dapur", "5 bab, satu dapur (1 minit)",
          ("Prep bahan", "5 bab,", "satu dapur."),
          [(375, 387, 2, 1.2, None), (555, 573, 3, 1.45, HANDS), (618, 630, 2, 1.45, HANDS), (1600, 1618, 3, 1.35, HANDS),
           (1836, 1845, 1.5, 1.5, [0.42, 0.71]), (2160, 2178, 3, 1.2, None), (2644, 2662, 3, 1.15, None), (2280, 2322, 7, 1.2, None),
           (2760, 2790, 5, 1.2, [0.5, 0.82]), (2826, 2834, 1.3333, 1.35, [0.5, 0.82])],
          [(1, "Mula dengan yang ringkas.", "ringkas", None),
           (2, "Isi dengan yang ikhlas.", "ikhlas", None),
           (3, "Gulung dengan sabar.", "sabar", None),
           (5, "Biar haba buat kerjanya.", "haba", None),
           (7, "Bahagi sama rata.", "rata", None)],
          ("Semua siap.", "Komen & follow."),
          steps=[(1, "01", "Roti"), (2, "02", "Inti sardin"), (3, "03", "Gulung"), (5, "04", "Food Engine Cooven"), (7, "05", "Nasi")],
          top_y=400, music=cc0("cc0_funk_trumpet")),
]
