// Intan Safia — puff pastry bites from store-bought sheets, Oven mode 180°C 10 min,
// served with a chocolate dip.
export default {
  id: "puff-pastry",
  title: "Puff Pastry Bite Mode Oven",
  menu: "Puff Pastry Bite",
  proxy: [[1906, 1932], [2030, 2372], [3186, 3332]],
  transcript: "transcripts/puff.json",
  fix: { profesif: "puff pastry", pinak: "peanut", aa: "", haa: "", "180": "180°C", "@2179.14": "puff pastry" },
  highlight: ["crunchy", "crispy", "puff", "pastry", "bite", "beli", "siap", "mulut", "kembang", "rapat-rapat", "180°c", "10", "minit", "100%", "buka", "teruskan", "sejuk", "sedapnya"],

  hook: { kicker: "TASTY TUESDAY", lines: ["Snek rangup", "10 minit je!"], accent: 1, dur: 2.8 },
  segments: [
    { in: 3304.9, out: 3308.75, fy: 0.6 }, // "Wow, crunchy. Crispy. Kan." — plate + chocolate dip
    { in: 1911.45, out: 1914.05, fy: 0.42, cut: "whoosh" }, // "hari ini kita nak buat puff pastry bite"
    { in: 1925.84, out: 1931.07, fy: 0.5, zoom: 2.5 }, // "tak payah susah-susah buat sendiri, beli je yang dah siap"
    { in: 2124.58, out: 2131.2, fy: 0.5, cut: "whoosh" }, // "puff pastry bite... sekali masuk mulut habis"
    { in: 2177.92, out: 2180.44, fy: 0.5, zoom: 2.5 }, // "nanti dia kembang, boleh je rapat-rapat"
    { in: 2044.68, out: 2049.4, fy: 0.45, cut: "whoosh" }, // "set suhu kepada 180"
    { in: 2059.93, out: 2063.94, fy: 0.45, zoom: 2.5 }, // "kita nak buat 10 minit je"
    { in: 2277.1, out: 2280.7, fy: 0.45 }, // "25%, 50%, 75%" — preheat bars
    { in: 2282.6, out: 2284.42, fy: 0.45, zoom: 2.5 }, // "dah dekat nak 100% ready"
    { in: 2344.54, out: 2348.7, fy: 0.55 }, // "kalau oven, kena buka. kalau tak buka dia tak akan teruskan"
    { in: 3214.71, out: 3218.82, fy: 0.5, cut: "whoosh" }, // "puff pastry tadi dah masak, kita angkat"
    { in: 3254.35, out: 3261.94, fy: 0.6, zoom: 2.5 }, // "nak piping coklat / peanut butter, tunggu sejuk dulu"
    { in: 3315.76, out: 3320.6, fy: 0.6 }, // "sedapnya buat minum petang"
  ],
  cards: [
    { type: "sticker", raw: 3316.0, dur: 1.6, text: "Crunchy!", y: 330 },
    { type: "chips", raw: 1929.0, dur: 2.0, items: ["GUNA PUFF PASTRY SEJUK BEKU"] },
    { type: "tip", raw: 2178.0, dur: 2.4, label: "TIP", text: "Susun rapat pun boleh. Senang dipisahkan lepas bakar" },
    { type: "chips", raw: 2045.0, dur: 8.2, y: 330, items: ["MODE: OVEN", "180°C", "10 MIN"], times: [2045.0, 2048.03, 2061.78] },
    { type: "chips", raw: 2277.1, dur: 5.3, items: ["25%", "50%", "75%", "100%"], times: [2277.18, 2278.76, 2279.71, 2283.18] },
    { type: "tip", raw: 2344.6, dur: 4.1, label: "PENTING", text: "Mode oven: bila keluar ADD FOOD, buka penutup. Kalau tak, dia tak mula masak!" },
    { type: "tip", raw: 3255.0, dur: 6.9, label: "TIP", text: "Nak piping coklat atau peanut butter? Tunggu sejuk dulu" },
  ],
  outro: { dur: 2.7, title: "Snek minum petang!", cta: "Save & cuba hujung minggu ni" },
};
