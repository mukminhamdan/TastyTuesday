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
    "puff": dict(chef="Kak Salma", role="Chef #3", menu="Sardin Puff", mode="Oven",
                 accent="#F2A93B", music="m_157_03"),
    "sambal": dict(chef="Mak Ida", role="Chef #4", menu="Sambal Sardin", mode="Cooker",
                   accent="#D7263D", music="m_036_11"),
    "pizza": dict(chef="Kak Pia", role="Chef #5", menu="Pizza Tuna", mode="Pizza",
                  accent="#FFB000", music="m_170_04"),
}

def cta(broll):
    """Host's follow/comment line, played over B-roll of that menu's finished dish."""
    return [(3347.4, 3352.7, dict(tag="cta", broll=broll, zoom=1.06, push=0.05, ov=[("cta", 3347.5, {})]))]


def hook(a, b, headline, sub=None, align=None, **kw):
    props = dict(text=headline, sub=sub)
    if align:
        props["align"] = align
    return (a, b, dict(tag="hook", zoom=1.12, push=0.07, ov=[("hook", a + 0.05, props)], **kw))


def title(key, a, b, **kw):
    c = CHEFS[key]
    return (a, b, dict(tag="title", ov=[("title", a, dict(menu=c["menu"], chef=c["chef"],
                                                            role=c["role"], mode=c["mode"]))], **kw))


SHORTS = {}

# ---------------------------------------------------------------- 1. SARDIN ROLL
SHORTS["roll"] = [
    hook(3075.3, 3079.9, "Goreng tanpa risau hangus", sub="Sardin Roll · Cooven", align="right"),
    title("roll", 1094.6, 1110.0, ov2=[("chip", 1106.6, dict(text="Mode Deep Fry", icon="flame"))]),
    (1118.4, 1129.4, dict(ov=[("step", 1118.5, dict(n=1, text="Letak sardin & gulung"))])),
    (1133.4, 1135.5, dict(ov=[("step", 1133.5, dict(n=2, text="Sapu telur untuk lekat"))])),
    (1143.1, 1147.0, {}),
    (1156.2, 1159.0, dict(ov=[("step", 1156.3, dict(n=3, text="Celup telur & goreng"))])),
    (1167.2, 1168.5, {}),
    (1192.5, 1202.4, dict(ov=[("tip", 1196.0, dict(text="Suhu kekal stabil", sub="Tak naik, tak turun"))])),
    (1207.0, 1217.3, {}),
    (1337.2, 1348.2, dict(ov=[("stat", 1340.6, dict(big="180°C", label="Hasil elok, tak hangit"))])),
    (3067.8, 3073.3, dict(ov=[("stat", 3069.9, dict(big="< 20 min", label="Satu buku roti siap"))])),
] + cta(3062.7)

# ---------------------------------------------------------------- 2. TORTILLA
SHORTS["wrap"] = [
    hook(1955.7, 1957.5, "Wrap ala cafe dalam 4 minit", sub="Tortilla Spicy Tuna"),
    (1974.6, 1977.6, dict(zoom=1.08)),
    title("wrap", 1385.3, 1395.8, ov2=[("chip", 1393.2, dict(text="Mode Grill", icon="grill"))]),
    (1420.3, 1426.6, dict(ov=[("tip", 1425.9, dict(text="Guna Grill Pot", sub="Tahan suhu tinggi"))])),
    (1443.3, 1452.4, dict(ov=[("stat", 1446.9, dict(big="8 min", label="Medium · auto flip"))])),
    (1456.2, 1459.6, dict(ov=[("step", 1456.3, dict(n=1, text="Sapu minyak & susun"))])),
    (1502.2, 1512.3, dict(ov=[("tip", 1510.5, dict(text="Separuh masa: terbalikkan", sub="Mesin akan ingatkan"))])),
 (1958.8, 1967.8, dict(ov=[("stat", 1959.9, dict(big="Garing", label="Luar garing · dalam lembut"))])),
    (1969.6, 1970.3, {}),
    (3103.3, 3115.2, dict(ov=[("reveal", 3104.6, dict(text="Spicy Tuna Wrap"))])),
    (3119.2, 3122.6, {}),
] + cta(3107.6)

# ---------------------------------------------------------------- 3. SARDIN PUFF
SHORTS["puff"] = [
    hook(3160.7, 3163.3, "Sardin puff siap 10 minit", sub="Mode Oven · Cooven"),
    title("puff", 1658.2, 1664.3),
    (1672.0, 1679.4, dict(ov=[("step", 1672.1, dict(n=1, text="Puff pastry + inti sardin"))])),
    (1686.5, 1697.0, dict(ov=[("step", 1689.5, dict(n=2, text="Bentuk ikut suka"))])),
    (1719.1, 1723.4, dict(ov=[("chip", 1721.3, dict(text="Mode Oven", icon="oven"))])),
    (1728.0, 1733.9, dict(ov=[("step", 1729.6, dict(n=3, text="Sapu kuning telur"))])),
    (1765.1, 1769.9, dict(ov=[("stat", 1766.9, dict(big="180°C", label="10 minit"))])),
    (2425.8, 2432.4, dict(ov=[("reveal", 2425.9, dict(text="Dah siap!"))])),
    (3200.6, 3207.5, {}),
    (3178.9, 3193.4, dict(ov=[("tip", 3179.9, dict(text="Tip: half-cook 7 minit", sub="Simpan beku, bakar bila nak"))])),
] + cta(3196.3)

# ---------------------------------------------------------------- 4. SAMBAL SARDIN
SHORTS["sambal"] = [
    hook(3233.6, 3235.9, "Sambal tak mercik ke dinding", sub="Sambal Sardin · Mode Cooker"),
    (2329.0, 2333.0, dict(zoom=1.06)),
    title("sambal", 2048.5, 2051.9),
    (2056.9, 2063.5, dict(ov=[("stat", 2060.3, dict(big="140°C", label="Default · 15 minit"))])),
    (2100.5, 2109.3, dict(ov=[("step", 2100.6, dict(n=1, text="Tumis bawang"))])),
    (2160.9, 2169.6, dict(ov=[("tip", 2168.4, dict(text="Nak lagi laju?", sub="Tukar ke Mode Deep Fry"))])),
    (2270.9, 2275.0, dict(ov=[("step", 2271.0, dict(n=2, text="Masuk ibu sambal · 140°C"))])),
    (2291.4, 2300.8, dict(ov=[("stat", 2294.9, dict(big="8 Liter", label="Masak stok berbulan"))])),
    (2333.9, 2336.9, {}),
    (2341.2, 2345.1, {}),
    (2357.1, 2365.0, dict(ov=[("step", 2363.0, dict(n=3, text="Air & sardin"))])),
    (2385.4, 2387.7, {}),
    (3240.5, 3247.0, dict(ov=[("reveal", 3240.6, dict(text="Makan dengan nasi atau roti"))])),
] + cta(3240.5)

# ---------------------------------------------------------------- 5. PIZZA TUNA
SHORTS["pizza"] = [
    hook(2742.4, 2753.0, "“Pizza ni beli eh?”", sub="Pizza Tuna · 6 minit", broll=3270.4),
    title("pizza", 2460.5, 2462.9),
    (2471.9, 2476.6, {}),
    (2482.3, 2488.4, dict(ov=[("tip", 2483.4, dict(text="Tunggu 'Add Food'", sub="Dah cukup panas"))])),
    (2620.2, 2626.9, dict(ov=[("stat", 2625.4, dict(big="15 min", label="Oven biasa", strike=True))])),
    (2631.9, 2637.7, dict(ov=[("chip", 2635.9, dict(text="Mode Pizza", icon="pizza"))])),
    (2641.5, 2644.7, dict(ov=[("stat", 2643.7, dict(big="6 min", label="Mode Pizza Cooven"))])),
    (2898.0, 2900.8, dict(ov=[("tip", 2899.9, dict(text="220°C", sub="Suhu perfect untuk pizza"))])),
    (2659.8, 2666.3, dict(ov=[("step", 2659.9, dict(n=1, text="Minit ke-3: tabur cheese"))])),
    (2834.2, 2839.9, {}),
    (3274.2, 3275.7, dict(ov=[("reveal", 3274.3, dict(text="Lembut & fluffy"))])),
    (3283.4, 3289.0, {}),
] + cta(3283.4)

# ---------------------------------------------------------------- FULL YOUTUBE
FULL = [
    # cold open: best moments
    (2745.7, 2752.7, dict(tag="cold", zoom=1.1, push=0.05, broll=3270.4)),
    (3234.9, 3235.9, dict(tag="cold", zoom=1.12)),
    (1955.7, 1957.5, dict(tag="cold", zoom=1.1)),
    (3077.8, 3079.9, dict(tag="cold", zoom=1.1)),
    (3333.0, 3340.0, dict(tag="cold", ov=[("bigtitle", 3333.1, {})])),
    # intro
    (1058.9, 1066.8, dict(tag="intro")),
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
    (1315.1, 1328.7, dict(ov=[("tip", 1325.5, dict(text="Promo: Utensil Set 7 pcs", sub="Untuk pembelian sekarang"))])),
    (1352.8, 1358.7, {}),
    (3075.3, 3079.9, {}),
])
FULL += chapter("wrap", strip(SHORTS["wrap"][2:]) + [
    (1520.9, 1531.4, dict(ov=[("tip", 1525.2, dict(text="Dapat 2 pot", sub="Grill Pot + Flat Pot"))])),
    (1406.1, 1413.4, {}),
    (1546.1, 1552.0, {}),
    (1952.4, 1957.5, {}),
])
FULL += chapter("puff", strip(SHORTS["puff"][1:]) + [
    (1877.1, 1893.8, dict(ov=[("tip", 1880.9, dict(text="Rack multi-purpose", sub="Medium atau low rack"))])),
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
    (2742.4, 2759.5, dict(broll=3268.2, ov=[("quote", 2745.7, dict(text="“My mum buat.”"))])),
    (2807.2, 2815.9, {}),
    (2588.8, 2596.8, dict(ov=[("tip", 2588.9, dict(text="Lapik air fryer paper", sub="Tak perlu pizza pan"))])),
])
FULL += [
    (3313.4, 3346.3, dict(tag="outro", ov=[("recap", 3340.1, {})])),
    (3347.4, 3356.7, {}),
    (3381.9, 3398.9, dict(ov=[("endcard", 3392.0, {})])),
]
