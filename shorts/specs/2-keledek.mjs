// Mukmin — roasted sweet potato, Oven mode (180°C 20 min, cold-water dip, 200°C 15 min).
// Host Kak Ida's voice carries the problem setup and the recap.
export default {
  id: "keledek",
  title: "Keledek Bakar Mode Oven",
  menu: "Keledek Bakar",
  proxy: [[1206, 1364], [3724, 3792], [3835, 3948]],
  transcript: "transcripts/keledek.json",
  fix: { ros: "roast", kopik: "kopek", "kopik-kopik": "kopek-kopek", "@1298.06": "suhu", "@1298.30": "", "180,": "180", eh: "", aa: "" },
  highlight: ["keledek", "rebus", "steam", "lama", "kering", "oven", "preheat", "180", "20", "minit", "air", "sejuk", "caramelize", "15", "200", "kulit", "sedapnya"],

  hook: { kicker: "TASTY TUESDAY", lines: ["Keledek lembut,", "kulit tanggal", "sendiri!"], accent: 2, dur: 3.0 },
  segments: [
    { in: 3878.0, out: 3882.6, fy: 0.62 }, // "Ya Allah sedap je. Wow. Wow." — plate of split keledek
    { in: 3745.5, out: 3752.75, fy: 0.5, cut: "whoosh" }, // "keledek tu dah masak ke belum, nak rebus ke steam ke, berapa lama"
    { in: 3757.4, out: 3760.55, fy: 0.5, zoom: 2.6 }, // "takut bila kita bakar tu dia terlebih kering"
    { in: 1225.96, out: 1227.41, fy: 0.42, cut: "whoosh" }, // "kita akan guna function oven"
    { in: 1275.36, out: 1277.55, fy: 0.45, zoom: 2.6 }, // "the best thing pasal Cooven ni dia ada preheat"
    { in: 1278.05, out: 1280.87, fy: 0.45 }, // "kita tak perlu nak agak-agak pasal preheat"
    { in: 1297.7, out: 1302.8, fy: 0.5 }, // "saya set suhu 180, 20 minit. masukkan potato"
    { in: 1316.94, out: 1323.55, fy: 0.45, zoom: 2.6 }, // "rendam dulu dalam air sejuk ... caramelize"
    { in: 1346.0, out: 1349.66, fy: 0.5 }, // "sambung semula roast menggunakan oven"
    { in: 1350.12, out: 1352.06, fy: 0.5, zoom: 2.6 }, // "untuk lagi 15 minit"
    { in: 1354.04, out: 1356.12, fy: 0.5 }, // "kita naikkan suhu 200"
    { in: 3898.19, out: 3905.6, fy: 0.58, cut: "whoosh" }, // "mudahnya nak kopek kulit... senang nak tanggal kulit dia"
    { in: 3910.0, out: 3914.0, fy: 0.55, zoom: 2.5 }, // "panas lagi ni sedapnya. sedapnya bau dia"
  ],
  cards: [
    { type: "chips", raw: 3749.0, dur: 3.7, y: 330, items: ["REBUS?", "STEAM?", "BERAPA LAMA?"], times: [3749.03, 3750.42, 3751.47] },
    { type: "chips", raw: 1226.4, dur: 1.0, items: ["MODE: OVEN"] },
    { type: "tip", raw: 1275.4, dur: 5.0, label: "BEST", text: "Preheat automatik. Tak perlu agak-agak oven dah panas ke belum" },
    { type: "chips", raw: 1299.0, dur: 3.7, items: ["180°C", "20 MIN"], times: [1299.04, 1299.52] },
    { type: "tip", raw: 1317.2, dur: 6.3, label: "RAHSIA", text: "Rendam air sejuk 30 saat, sambung bakar. Baru dapat caramelize!" },
    { type: "chips", raw: 1351.4, dur: 4.4, items: ["+15 MIN", "200°C"], times: [1351.38, 1355.25] },
    { type: "sticker", raw: 3904.4, dur: 1.6, text: "Senang kopek!", y: 330 },
  ],
  outro: { dur: 2.7, title: "Save resepi ni!", cta: "Follow untuk Tasty Tuesday setiap Selasa" },
};
