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
            {"part": 0, "dt": 0.0, "dur": 3.4, "kind": "hook", "h": 330, "props": {"kicker": "Prep untuk Tasty Tuesday", "line1": "Sardin roll", "line2": "guna roti biasa je.", "y": "auto"}},
            {"part": 1, "dt": 0.2, "dur": 2.8, "kind": "step", "props": {"n": "01", "label": "Ambil roti putih"}},
            {"part": 2, "dt": 0.2, "dur": 3.8, "kind": "step", "props": {"n": "02", "label": "Leperkan nipis-nipis"}},
            {"part": 3, "dt": 0.2, "dur": 3.4, "kind": "step", "props": {"n": "03", "label": "Letak inti sardin"}},
            {"part": 3, "dt": 3.7, "dur": 3.3, "kind": "step", "props": {"n": "04", "label": "Gulung ketat-ketat"}},
            {"part": 4, "dt": 0.2, "dur": 2.6, "kind": "word", "props": {"text": "Ulang", "sub": "sampai habis roti", "y": 330}},
            {"part": 5, "dt": 0.0, "dur": 4.0, "kind": "snap", "props": {"label": "SIAP DIGULUNG"}},
            {"part": 6, "dt": 0.2, "dur": 3.6, "kind": "step", "props": {"n": "05", "label": "Masuk air fryer"}},
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
            {"part": 0, "dt": 0.0, "dur": 3.6, "kind": "hook", "h": 330, "props": {"kicker": "Tema Tasty Tuesday petang ni", "line1": "Sardin & tuna", "line2": "semua menu.", "y": "auto"}},
            {"part": 2, "dt": 0.2, "dur": 3.4, "kind": "step", "props": {"n": "01", "label": "Sardin roll"}},
            {"part": 4, "dt": 0.2, "dur": 3.6, "kind": "step", "props": {"n": "02", "label": "Nasi, siap bekas"}},
            {"part": 6, "dt": 0.0, "dur": 4.8, "kind": "end", "props": {"line1": "Jumpa dalam", "line2": "live petang ni."}},
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
            {"part": 0, "dt": 0.0, "dur": 3.8, "kind": "hook", "h": 330, "props": {"kicker": "Prep bahan Tasty Tuesday", "line1": "1 periuk nasi", "line2": "jadi semua ni.", "y": "auto"}},
            {"part": 1, "dt": 0.2, "dur": 4.2, "kind": "step", "props": {"n": "01", "label": "Gaul nasi panas"}},
            {"part": 2, "dt": 0.3, "dur": 5.0, "kind": "step", "props": {"n": "02", "label": "Tekap guna mangkuk"}},
            {"part": 2, "dt": 5.6, "dur": 2.0, "kind": "word", "props": {"text": "Kemas.", "serif": True, "y": 360, "color": "#FFC94A", "size": 170}},
            {"part": 3, "dt": 0.2, "dur": 4.2, "kind": "step", "props": {"n": "03", "label": "Susun dalam bekas"}},
            {"part": 4, "dt": 0.0, "dur": 5.5, "kind": "end", "props": {"line1": "Prep sekali,", "line2": "senang seminggu."}},
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
            {"part": 0, "dt": 0.0, "dur": 2.6, "kind": "hook", "h": 330, "props": {"kicker": "Prep sebelum Tasty Tuesday", "line1": "48 minit", "line2": "dalam 30 saat.", "y": "auto"}},
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
]
