// Zura — cheesy corndog with bread dough, Deep Fry mode, plus her frozen-stock tip and
// why a steady 180°C beats a gas stove.
export default {
  id: "corndog",
  title: "Cheesy Corndog Deep Fry",
  menu: "Cheesy Corndog",
  proxy: [[1083, 1190], [2556, 2702], [2739, 2962], [3654, 3702]],
  transcript: "transcripts/corndog.json",
  fix: { gelet: "golek", creep: "crisp", sipan: "simpan", haa: "", eh: "", corn: "corn", "dog.": "dog." },
  highlight: ["kuali", "cheesy", "cheese", "proofing", "celup", "penuh", "satu", "minit", "cair", "terbalik", "sendiri", "air", "crisp", "lima", "170", "250", "berubah-ubah", "180", "consistent", "corndog"],

  hook: { kicker: "TASTY TUESDAY", lines: ["Cheesy corndog", "tanpa kuali!"], accent: 1, dur: 2.9 },
  segments: [
    { in: 3684.0, out: 3686.9, fy: 0.62, vol: 0 }, // tray of golden corndogs (host chatter here is off-topic, muted)
    { in: 2744.5, out: 2747.75, fy: 0.4 }, // "kita tak perlukan kuali dekat rumah kan. tak perlu."
    { in: 1091.44, out: 1094.63, fy: 0.42, cut: "whoosh" }, // "hari ni saya nak buat cheesy corn dog"
    { in: 1103.93, out: 1106.96, fy: 0.48, zoom: 2.5 }, // "atas cheese, bawah cheese"
    { in: 1162.1, out: 1166.15, fy: 0.45 }, // "guna adunan roti, kena proofing dulu"
    { in: 2579.03, out: 2583.25, fy: 0.45, cut: "whoosh" }, // "letak air dalam ni, lepas tu celup je"
    { in: 2595.96, out: 2598.55, fy: 0.5, zoom: 2.5 }, // "golek sampai penuh"
    { in: 2619.3, out: 2620.8, fy: 0.55, cut: "whoosh" }, // "dalam satu minit je"
    { in: 2621.78, out: 2627.1, fy: 0.55, zoom: 2.5 }, // "kalau biar lama, cheese cair dan keluar"
    { in: 2640.55, out: 2644.4, fy: 0.55 }, // "bila dah masak, dia terbalik sendiri"
    { in: 2676.21, out: 2681.2, fy: 0.55, zoom: 2.5 }, // "nak makan, air crisp 5 minit dah siap"
    { in: 2880.9, out: 2887.34, fy: 0.42, cut: "whoosh" }, // "dapur gas: 170 naik jadi 250, berubah-ubah"
    { in: 2851.62, out: 2856.7, fy: 0.42, zoom: 2.5 }, // "suhu dia maintain 180, consistent"
    { in: 3694.06, out: 3699.0, fy: 0.62, cut: "whoosh" }, // "Zura buat apa? Corndog."
  ],
  cards: [
    { type: "chips", raw: 1105.2, dur: 1.8, items: ["CHEESE", "SOSEJ", "CHEESE"], times: [1105.4, 1105.8, 1106.5] },
    { type: "tip", raw: 1162.2, dur: 3.9, label: "TIP", text: "Guna adunan roti, bukan bancuhan celup. Proofing dulu!" },
    { type: "chips", raw: 2581.0, dur: 2.2, items: ["1. CELUP AIR"] },
    { type: "chips", raw: 2596.0, dur: 2.5, items: ["2. GOLEK BREADCRUMBS"] },
    { type: "chips", raw: 2619.4, dur: 1.4, items: ["MODE: DEEP FRY", "1 MIN"], times: [2619.4, 2619.67] },
    { type: "tip", raw: 2621.9, dur: 4.2, label: "JANGAN", text: "Goreng lama-lama. Cheese akan cair dan keluar" },
    { type: "sticker", raw: 2642.3, dur: 1.9, text: "Terbalik sendiri!", y: 330 },
    { type: "tip", raw: 2676.3, dur: 4.9, label: "STOK FROZEN", text: "Sejukkan, simpan dalam plastik. Nak makan: Air Crisp 5 minit" },
    { type: "chips", raw: 2881.4, dur: 5.9, y: 330, items: ["DAPUR GAS", "170°C", "250°C"], times: [2881.0, 2881.44, 2882.98] },
    { type: "chips", raw: 2852.0, dur: 4.7, y: 330, items: ["COOVEN", "180°C STABIL"], times: [2852.0, 2852.99] },
  ],
  outro: { dur: 2.7, title: "Goreng tanpa kuali!", cta: "Follow untuk resepi Selasa depan" },
};
