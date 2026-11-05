"""Edit decision lists for the Tasty Tuesday (Tuna & Sardin edition) videos.

Every clip is (src_start, src_end, opts) in SOURCE seconds of the original
64-minute recording. The builder snaps to word boundaries, removes pauses
and maps everything onto the output timeline.

opts keys
  zoom      : base zoom (1.0 = full width)
  push      : slow push-in amount over the clip (e.g. 0.06)
  ov        : list of overlays anchored at a source time inside the clip
  tag       : section marker ("hook", "title", "body", "cta")
"""

CHEFS = {
    "roll": dict(chef="Mukmin", role="Chef #1", menu="Sardin Roll", mode="Deep Fry",
                 accent="#FF7A1A", music="m_192_05"),
    "wrap": dict(chef="Kak Hani", role="Chef #2", menu="Tortilla Spicy Tuna", mode="Grill",
                 accent="#E8462E", music="m_003_05"),
    "puff": dict(chef="Kak Salmah", role="Chef #3", menu="Sardin Puff", mode="Oven",
                 accent="#F2A93B", music="m_157_03"),
    "sambal": dict(chef="Mak Ida", role="Chef #4", menu="Sambal Sardin", mode="Cooker",
                   accent="#D7263D", music="m_036_11"),
    "pizza": dict(chef="Kak Piah", role="Chef #5", menu="Pizza Tuna", mode="Pizza",
                  accent="#FFB000", music="m_170_04"),
}

# B-roll of each finished dish. Pizza uses a close-up (time, zoom, centre-y) because the
# showcase shot has Kak Piah talking, which would not match the audio laid over it.
DISHES = dict(roll=3062.7, wrap=3107.6, puff=3196.3, sambal=3240.5,
              pizza=(2828.0, 1.1, 0.55))  # pizza: close-up, no talking face (lip-sync)
PIZZA_BROLL = [(2812.0, 1.1, 0.5), (2822.0, 1.1, 0.5), (2830.0, 1.15, 0.55)]


def cta(broll):
    """Host's follow/comment line, played over B-roll of that menu's finished dish."""
    return [(3347.4, 3352.7, dict(tag="cta", broll=broll, zoom=1.06, push=0.05, ov=[("cta", 3347.5, {})]))]


def hook(a, b, headline, sub=None, align=None, pos=None, **kw):
    props = dict(text=headline, sub=sub)
    if align:
        props["align"] = align
    if pos:  # "low": force the headline into the lower band (clean shorts)
        props["pos"] = pos
    return (a, b, dict(tag="hook", zoom=1.12, push=0.07, ov=[("hook", a + 0.05, props)], **kw))


def title(key, a, b, **kw):
    c = CHEFS[key]
    return (a, b, dict(tag="title", ov=[("title", a, dict(menu=c["menu"], chef=c["chef"],
                                                            role=c["role"], mode=c["mode"]))], **kw))


SHORTS = {}

# cap=True marks the few lines that get on-screen captions (hooks always do).
K = dict(cap=True)


def k(**kw):
    return dict(cap=True, **kw)


# ---------------------------------------------------------------- 1. SARDIN ROLL
SHORTS["roll"] = [
    hook(3075.3, 3079.9, "Goreng tanpa risau hangus", sub="Sardin Roll · Food Engine Cooven", align="right"),
    title("roll", 1094.6, 1110.0, ov2=[("chip", 1106.6, dict(text="Mode Deep Fry", icon="flame"))]),
    (1118.4, 1129.4, {}),
    (1133.4, 1135.5, {}),
    (1143.1, 1147.0, {}),
    (1156.2, 1159.0, {}),
    (1167.2, 1168.5, {}),
    (1192.5, 1202.4, k(ov=[("tip", 1196.0, dict(text="Suhu kekal stabil", sub="Tak naik, tak turun"))])),
    (1207.0, 1217.3, K),
    (1337.2, 1348.2, dict(ov=[("stat", 1340.6, dict(big="180°C", label="Hasil elok, tak hangit"))])),
    (3067.8, 3073.3, k(ov=[("stat", 3069.9, dict(big="< 20 min", label="Satu buku roti siap"))])),
] + cta(DISHES["roll"])

# ---------------------------------------------------------------- 2. TORTILLA
SHORTS["wrap"] = [
    hook(1955.7, 1957.5, "Wrap ala cafe dalam 4 minit", sub="Tortilla Spicy Tuna", pos="low"),
    (1974.6, 1977.6, k(zoom=1.08)),
    title("wrap", 1385.3, 1395.8, ov2=[("chip", 1393.2, dict(text="Mode Grill", icon="grill"))]),
    (1420.3, 1426.6, {}),
    (1443.3, 1452.4, dict(ov=[("stat", 1446.9, dict(big="8 min", label="Mode Grill · Medium"))])),
    (1456.2, 1459.6, {}),
    (1502.2, 1512.3, k(ov=[("tip", 1510.5, dict(text="Separuh masa: terbalikkan", sub="Mesin akan ingatkan"))])),
    (1958.8, 1967.8, K),
    (1969.6, 1970.3, K),
    (3103.3, 3115.2, dict(ov=[("reveal", 3104.6, dict(text="Spicy Tuna Wrap"))])),
    (3119.2, 3122.6, K),
] + cta(DISHES["wrap"])

# ---------------------------------------------------------------- 3. SARDIN PUFF
SHORTS["puff"] = [
    hook(3160.7, 3163.3, "Sardin puff siap 10 minit", sub="Food Engine Cooven"),
    title("puff", 1658.2, 1664.3),
    (1672.0, 1679.4, {}),
    (1686.5, 1697.0, {}),
    (1719.1, 1723.4, dict(ov=[("chip", 1721.3, dict(text="Mode Oven", icon="oven"))])),
    (1728.0, 1733.9, {}),
    (1765.1, 1769.9, k(ov=[("stat", 1766.9, dict(big="180°C", label="10 minit"))])),
    (2425.8, 2432.4, dict(ov=[("reveal", 2425.9, dict(text="Dah siap!"))])),
    (3200.6, 3207.5, {}),
    (3178.9, 3193.4, k(ov=[("tip", 3179.9, dict(text="Tip: half-cook 7 minit", sub="Simpan beku, bakar bila nak"))])),
] + cta(DISHES["puff"])

# ---------------------------------------------------------------- 4. SAMBAL SARDIN
SHORTS["sambal"] = [
    hook(3233.6, 3235.9, "Sambal tak merecik ke dinding", sub="Sambal Sardin · Mode Cooker"),
    (2329.0, 2333.0, k(zoom=1.06)),
    title("sambal", 2048.5, 2051.9),
    (2056.9, 2063.5, {}),
    (2100.5, 2109.3, {}),
    (2160.9, 2169.6, k(ov=[("tip", 2168.4, dict(text="Nak lagi laju?", sub="Tukar ke Mode Deep Fry"))])),
    (2270.9, 2275.0, {}),
    (2291.4, 2300.8, k(ov=[("stat", 2294.9, dict(big="8 Liter", label="Masak stok berbulan"))])),
    (2333.9, 2336.9, {}),
    (2341.2, 2345.1, K),
    (2357.1, 2365.0, {}),
    (2385.4, 2387.7, K),
    (3240.5, 3247.0, dict(ov=[("reveal", 3240.6, dict(text="Makan dengan nasi atau roti"))])),
] + cta(DISHES["sambal"])

# ---------------------------------------------------------------- 5. PIZZA TUNA
SHORTS["pizza"] = [
    hook(2742.4, 2753.0, "\u201cPizza ni beli eh?\u201d", sub="Pizza Tuna · 6 minit", brolls=PIZZA_BROLL),
    title("pizza", 2460.5, 2462.9),
    (2471.9, 2476.6, {}),
    (2482.3, 2488.4, {}),
    (2620.2, 2626.9, k(ov=[("stat", 2625.4, dict(big="15 min", label="Oven biasa", strike=True))])),
    (2631.9, 2637.7, dict(ov=[("chip", 2635.9, dict(text="Mode Pizza", icon="pizza"))])),
    (2641.5, 2644.7, k(ov=[("stat", 2643.7, dict(big="6 min", label="Mode Pizza · Food Engine Cooven"))])),
    (2898.0, 2900.8, {}),
    (2659.8, 2666.3, {}),
    (2834.2, 2839.9, K),
    (3274.2, 3275.7, dict(ov=[("reveal", 3274.3, dict(text="Lembut & fluffy"))])),
    (3283.4, 3289.0, K),
] + cta(DISHES["pizza"])

# ---------------------------------------------------------------- REEL: 5 MENU < 45 s
REEL = [
    (3333.0, 3340.0, dict(tag="hook", zoom=1.06, push=0.05,
                          brolls=[DISHES[x] for x in ("roll", "wrap", "puff", "sambal", "pizza")],
                          ov=[("hook", 3333.05, dict(text="1 bahan. 5 menu.", sub="Tuna & Sardin · Tasty Tuesday"))])),
    (3075.3, 3079.9, k(zoom=1.08, ov=[("menutag", 3075.35, dict(key="roll"))])),
    (1955.7, 1957.5, k(zoom=1.08, ov=[("menutag", 1955.75, dict(key="wrap"))])),
    (1974.6, 1977.6, k(zoom=1.04)),
    (3160.7, 3163.3, k(zoom=1.08, ov=[("menutag", 3160.75, dict(key="puff"))])),
    (3233.6, 3235.9, k(zoom=1.08, ov=[("menutag", 3233.65, dict(key="sambal"))])),
    (2341.2, 2345.1, k(broll=3241.5)),
    (2745.7, 2752.7, k(brolls=PIZZA_BROLL, ov=[("menutag", 2745.75, dict(key="pizza"))])),
    (3340.1, 3346.3, dict(tag="outro", zoom=1.06,
                          brolls=[(DISHES[x][0] + 1.5,) + DISHES[x][1:] if isinstance(DISHES[x], tuple) else DISHES[x] + 1.5 for x in ("roll", "puff", "wrap", "pizza", "sambal")],
                          ov=[("cta", 3340.15, {})])),
]

# ---------------------------------------------------------------- BLOOPERS < 45 s
BLOOPERS = [
    (1018.6, 1023.9, k(tag="blooper", ov=[("bloopertitle", 1018.65, {}), ("sticker", 1019.8, dict(text="Mic, mana mic?"))])),
    (1034.0, 1036.8, K),
    (1044.9, 1049.6, k(ov=[("sticker", 1047.3, dict(text="Apron belum gosok"))])),
    (1630.8, 1631.9, k(ov=[("sticker", 1630.85, dict(text="Kamera, oh kamera"))])),
    (1638.2, 1644.2, K),
    (2000.3, 2002.5, k(ov=[("sticker", 2000.35, dict(text="Tak dengar!"))])),
    (2029.8, 2031.1, K),
    (3021.5, 3027.5, k(ov=[("sticker", 3022.4, dict(text="Pizza tak sabar"))])),
    (3289.9, 3293.7, k(ov=[("sticker", 3292.0, dict(text="Habis dah?!"))])),
    (3575.7, 3583.4, k(ov=[("sticker", 3575.75, dict(text="Sesi screenshot"))])),
    (3768.8, 3774.7, k(ov=[("sticker", 3771.8, dict(text="Sibuk tunjuk makan"))])),
]

# ---------------------------------------------------------------- FULL YOUTUBE
FULL = [
    # cold open: best moments
    (2745.7, 2752.7, dict(tag="cold", zoom=1.1, push=0.05, brolls=PIZZA_BROLL, cap=True)),
    (3234.9, 3235.9, dict(tag="cold", zoom=1.12, cap=True)),
    (1955.7, 1957.5, dict(tag="cold", zoom=1.1, cap=True)),
    (3077.8, 3079.9, dict(tag="cold", zoom=1.1, cap=True)),
    (3333.0, 3340.0, dict(tag="cold", cap=True, ov=[("bigtitle", 3333.1, {})])),
    # intro
    (1058.9, 1066.8, dict(tag="intro", cap=True)),
    (1073.6, 1083.6, dict(ov=[("lineup", 1073.7, {})])),
]


def chapter(key, clips):
    c = CHEFS[key]
    clips = sorted(clips, key=lambda x: x[0])
    first = clips[0]
    ov = list(first[2].get("ov", []))
    ov.insert(0, ("chapter", first[0], dict(menu=c["menu"], chef=c["chef"], role=c["role"], mode=c["mode"], key=key)))
    o = dict(first[2]); o["ov"] = ov; o["chapter"] = key
    return [(first[0], first[1], o)] + clips[1:]


def strip(clips):
    """Short clips without hook/title/cta markers, for reuse inside the long video."""
    out = []
    for a, b, o in clips:
        if o.get("tag") in ("cta",):
            continue
        o = {k: v for k, v in o.items() if k not in ("tag", "zoom", "push")}
        o["ov"] = [x for x in o.get("ov", []) if x[0] not in ("hook", "title")] + o.pop("ov2", [])
        out.append((a, b, o))
    return out


FULL += chapter("roll", strip(SHORTS["roll"][1:]) + [
    (1352.8, 1358.7, {}),
    (3075.3, 3079.9, {}),
])
FULL += chapter("wrap", strip(SHORTS["wrap"][2:]) + [
    (1520.9, 1531.4, {}),
    (1406.1, 1413.4, {}),
    (1546.1, 1552.0, {}),
    (1952.4, 1957.5, {}),
])
FULL += chapter("puff", strip(SHORTS["puff"][1:]) + [
    (1877.1, 1893.8, {}),
    (1664.3, 1669.9, {}),
    (1867.1, 1870.6, {}),
])
FULL += chapter("sambal", strip(SHORTS["sambal"][2:]) + [
    (2329.0, 2333.0, {}),
    (3233.6, 3235.9, {}),
    (2211.4, 2216.4, {}),
    (2308.8, 2311.5, {}),
])
FULL += chapter("pizza", strip(SHORTS["pizza"][1:]) + [
    (2742.4, 2759.5, dict(brolls=PIZZA_BROLL + [DISHES["pizza"]], ov=[("quote", 2745.7, dict(text="“My mum buat.”"))])),
    (2807.2, 2815.9, {}),
    (2588.8, 2596.8, {}),
])
FULL += [
    (3313.4, 3346.3, dict(tag="outro", cap=True, ov=[("recap", 3340.1, {})])),
    (3347.4, 3356.7, {}),
    (3381.9, 3398.9, dict(ov=[("endcard", 3392.0, {})])),
]


# ---------------------------------------------------------------- TEASERS (Part 1, < 45 s each)
def thook(a, b, headline, sub, **kw):
    c = hook(a, b, headline, sub=sub, **kw)
    c[2]["ov"][0][2]["kicker"] = "Part 1"
    c[2]["cap"] = False
    return c


def part2(broll):
    return [(3347.4, 3352.7, dict(tag="cta", broll=broll, zoom=1.06, push=0.05, ov=[("cta", 3347.5, dict(part2=True))]))]


def joke(a, b, sticker=None, t=None, **kw):
    o = dict(cap=True, **kw)
    if sticker:
        o["ov"] = [("sticker", t if t is not None else a + 0.1, dict(text=sticker))]
    return (a, b, o)


TEASERS = {}
TEASERS["roll"] = [
    thook(3075.3, 3079.9, "Roti biasa jadi sardin roll?!", "Sardin Roll · Mukmin", align="right"),
    joke(3640.6, 3649.1, "Kena soal siasat", 3641.0),
    joke(3650.5, 3651.9),
    (1121.0, 1125.0, {}),
    joke(1207.0, 1217.3, "Goreng sambil rehat", 1214.9),
    joke(3580.7, 3583.4, "Host paling besar", 3580.8),
    (3067.8, 3073.3, k(ov=[("stat", 3069.9, dict(big="< 20 min", label="Satu buku roti siap"))])),
] + part2(DISHES["roll"])

TEASERS["wrap"] = [
    thook(1955.7, 1957.5, "Wrap cafe tanpa pergi cafe", "Tortilla Spicy Tuna · Kak Hani"),
    joke(3110.1, 3115.2, "Cafe Kak Hani dah buka", 3112.8),
    (1385.3, 1390.3, {}),
    joke(1502.2, 1512.3, "Mesin pun pandai suruh", 1510.6),
    (1958.8, 1967.8, k(ov=[("reveal", 1959.9, dict(text="Belang-belang!"))])),
    joke(3119.2, 3122.6),
] + part2(DISHES["wrap"])

TEASERS["puff"] = [
    thook(3160.7, 3163.3, "Puff segera, rasa kedai", "Sardin Puff · Kak Salmah"),
    joke(1630.8, 1631.9, "Kamera, oh kamera", 1630.85),
    joke(1638.2, 1644.2),
    joke(3507.5, 3510.7, "Petak-petak menyerang", 3508.8),
    (1686.5, 1693.0, {}),
    (1765.1, 1769.9, k(ov=[("stat", 1766.9, dict(big="180°C", label="10 minit"))])),
    joke(3186.3, 3193.4, "Stok untuk berdua", 3189.9),
] + part2(DISHES["puff"])

TEASERS["sambal"] = [
    thook(3233.6, 3235.9, "Sambal Mak, stok berbulan", "Sambal Sardin · Mak Ida"),
    joke(2000.3, 2002.5, "Tak dengar!", 2000.35),
    joke(2029.8, 2031.1, "Mic vs Mak: 0-1", 2029.85),
    (2291.4, 2300.8, k(ov=[("stat", 2294.9, dict(big="8 Liter", label="Masak stok berbulan"))])),
    joke(2341.2, 2345.1),
    joke(3247.5, 3252.3, "Rumah terbuka", 3248.0),
    joke(3257.0, 3257.9, "Tak sabar!", 3257.05),
] + part2(DISHES["sambal"])

TEASERS["pizza"] = [
    thook(2745.7, 2752.7, "“Pizza ni beli eh?”", "Pizza Tuna · Kak Piah", brolls=PIZZA_BROLL),
    joke(3021.5, 3027.5, "Pizza tak sabar", 3022.4),
    (2641.5, 2644.7, k(ov=[("stat", 2643.7, dict(big="6 min", label="Mode Pizza · Food Engine Cooven"))])),
    joke(3547.6, 3553.2, "Pizza besar sangat", 3551.5),
    joke(3283.4, 3294.0, "Habis dah?!", 3292.0),
] + part2(DISHES["pizza"])


# ================================================================ CLEAN SHORTS (v2 look, < 45 s)
# Tighter cut of each menu with a calmer graphic layer: hook / menu + mode title /
# numbered recipe steps (+ progress bar) / max two facts / comment & follow CTA.
# Overlays are (type, source_time, props); each time sits inside its own clip.


def st(t, n, text):
    return ("cstep", t, dict(n=n, text=text))


def nt(t, big, label):
    return ("cnote", t, dict(big=big, label=label))


def ttl(key, t):
    c = CHEFS[key]
    return ("title", t, dict(menu=c["menu"], mode=c["mode"]))


def cta45(key):
    """Silent close on the finished dish (music only): no host voice on the chef shorts."""
    spec = DISHES[key]
    t = spec[0] if isinstance(spec, tuple) else spec
    return (t, t + 3.4, dict(tag="cta", silent=True, broll=spec, zoom=1.0, push=0.04, ov=[("cta", t, {})]))


def hook45(a, b, headline, **kw):
    a_, b_, o = hook(a, b, headline, **kw)
    o.update(zoom=1.0, push=0.03)  # full width: keep the food and the Cooven in shot
    return (a_, b_, o)


CLEAN45 = {
    # only the steps done on the Food Engine Cooven (no ingredient prep)
    "roll": [
        hook45(3067.8, 3071.4, "Satu buku roti, bawah 20 minit", align="right"),
        (1106.5, 1110.1, dict(ov=[st(1106.6, 1, "Pilih Mode Deep Fry")])),
        (1338.4, 1345.4, dict(ov=[st(1338.5, 2, "Goreng pada 180°C")])),
        (1198.1, 1202.3, dict(ov=[st(1198.2, 3, "Biarkan, suhu kekal stabil")])),
        (1207.0, 1214.9, {}),
        (3075.3, 3079.6, dict(ov=[st(3075.4, 0, "Siap · tak hangus")])),
        cta45("roll"),
    ],
    "wrap": [
        hook45(3103.3, 3106.5, "Wrap ala cafe, Mode Grill"),
        (1385.3, 1388.0, dict(ov=[ttl("wrap", 1385.35)])),
        (1420.3, 1426.4, dict(ov=[st(1420.4, 1, "Mode Grill, guna grill pot")])),
        (1443.3, 1449.5, dict(ov=[st(1443.4, 2, "Set 8 minit · Medium")])),
        (1509.0, 1512.3, dict(ov=[st(1509.1, 3, "Terbalikkan bila mesin beri isyarat")])),
        (1958.8, 1960.7, {}),
        (1963.9, 1965.5, {}),
        (1974.6, 1977.6, dict(ov=[st(1974.7, 0, "Siap · garis grill cantik")])),
        (3119.2, 3122.6, {}),
        cta45("wrap"),
    ],
    "puff": [
        hook45(2425.8, 2427.6, "10 minit, terus kembang"),
        (1719.1, 1723.4, dict(ov=[ttl("puff", 1719.15), st(1720.9, 1, "Pilih function Oven")])),
        (1765.1, 1769.9, dict(ov=[st(1765.2, 2, "Bake 180°C · 10 minit")])),
        (3160.7, 3163.3, dict(ov=[st(3160.8, 0, "Siap dihidang")])),
        (3178.9, 3182.2, dict(ov=[nt(3179.9, "7 min", "Half-cook, simpan beku")])),
        (3186.3, 3187.6, {}),
        cta45("puff"),
    ],
    "sambal": [
        hook45(2341.2, 2345.1, "Merecik dalam periuk je"),
        (2048.5, 2051.9, dict(ov=[st(2048.6, 1, "Pilih function Cooker")])),
        (2058.0, 2063.2, dict(ov=[st(2058.1, 2, "Default 140°C · 15 minit")])),
        (2165.0, 2169.5, dict(ov=[st(2165.1, 3, "Nak tumis laju? Mode Deep Fry")])),
        (2270.9, 2275.0, dict(ov=[st(2271.0, 4, "Kembali ke 140°C")])),
        (2291.4, 2295.7, dict(ov=[nt(2294.9, "8 liter", "Masak stok berbulan")])),
        (2385.4, 2387.7, {}),
        (3233.6, 3235.9, dict(ov=[st(3233.7, 0, "Siap dihidang")])),
        cta45("sambal"),
    ],
    "pizza": [
        hook45(2641.5, 2644.7, "Pizza siap 6 minit", brolls=[(2834.5, 1.0, 0.5), (2825.0, 1.0, 0.5)]),
        (2460.5, 2462.9, dict(ov=[ttl("pizza", 2460.55)])),
        (2631.9, 2637.7, dict(ov=[st(2632.0, 1, "Pilih Mode Pizza")])),
        (2898.0, 2900.8, dict(ov=[st(2898.1, 2, "Suhu 220°C")])),
        (2482.3, 2485.5, dict(ov=[st(2482.4, 3, "Masuk pizza bila keluar \u2018Add Food\u2019")])),
        (2659.8, 2663.9, dict(ov=[st(2659.9, 4, "Minit ke-3: buka, masuk cheese")])),
        (2836.0, 2839.9, {}),
        (3274.2, 3275.7, dict(ov=[st(3274.3, 0, "Siap dihidang")])),
        (3283.4, 3289.0, {}),
        cta45("pizza"),
    ],
}
# fresh music beds for the v2 shorts (track, offset seconds)
CLEAN_MUSIC = dict(roll=("m_080_02", 20), wrap=("m_151_06", 120), puff=("m_192_05", 100),
                   sambal=("m_157_03", 0), pizza=("m_003_05", 0))


# clips that continue a recipe step started in the clip before (they keep its captions)
STEP_CONT = set()
# one short caption per cooking step (spread over the chef's own words)
CAPTXT = {
    ("roll", 1106.5): "Guna mode deep fry",
    ("roll", 1338.4): "Biar dalam suhu 180, hasil elok",
    ("roll", 1198.1): "Suhu takkan naik, dia maintain",
    ("wrap", 1420.3): "Grill mode guna grill pot",
    ("wrap", 1443.3): "Set 8 minit, medium mode",
    ("wrap", 1509.0): "Masa 4 minit, mesin suruh kita click",
    ("puff", 1719.1): "Guna function oven untuk bake",
    ("puff", 1765.1): "Bake 180 degree, 10 minit",
    ("sambal", 2048.5): "Guna function cooker",
    ("sambal", 2058.0): "Default 140 degree, 15 minit",
    ("sambal", 2165.0): "Nak laju, guna mode deep fry",
    ("sambal", 2270.9): "Guna balik suhu 140",
    ("pizza", 2631.9): "Cooven ada special mode pizza",
    ("pizza", 2898.0): "220 darjah, perfect untuk pizza",
    ("pizza", 2482.3): "Add food maksudnya dah ready",
    ("pizza", 2659.8): "Lepas 3 minit, buka dan masuk cheese",
}


def clean_short(key):
    out = []
    for a, b, o in CLEAN45[key]:
        for typ, t, _ in o.get("ov", []):
            assert a - 0.05 <= t < b, (key, typ, t, a, b)
        o = dict(o)
        # captions only while a cooking step is being explained
        o["cap"] = (key, a) in STEP_CONT or any(x[0] == "cstep" and x[2]["n"] for x in o.get("ov", []))
        if (key, a) in CAPTXT:
            o["captxt"] = CAPTXT[(key, a)]
        out.append((a, b, o))
    return out
