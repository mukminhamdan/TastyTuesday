// Kak Salma — ikan bakar ala Kuala Perlis, Grill mode (High, 10 min) on banana leaf,
// finished with 3 min Broil (top heat only) for the charcoal look.
export default {
  id: "ikan-bakar",
  title: "Ikan Bakar Mode Grill",
  menu: "Ikan Bakar",
  proxy: [[1600, 1892], [3076, 3168], [3338, 3408]],
  transcript: "transcripts/ikan.json",
  fix: { kajuan: "kayu", mood: "mode", boil: "broil", cola: "Kuala", pelik: "Perlis", ngangus: "hangus", "harang-harang": "arang-arang", ah: "", haa: "", eh: "", "@1781.28": "" },
  highlight: ["hangus", "arang-arang", "grill", "high", "10", "minit", "daun-daun", "pisang", "paper", "kunyit", "aluminium", "foil", "sekata", "broil", "atas", "overcook", "tiga", "kering", "kedai"],

  hook: { kicker: "TASTY TUESDAY", lines: ["Ikan bakar", "tanpa arang", "& asap!"], accent: 1, dur: 3.0 },
  segments: [
    { in: 3373.95, out: 3380.05, fy: 0.55 }, // "ada macam hangus arang-arang sikit tu... itu yang kita nak"
    { in: 3346.8, out: 3348.9, fy: 0.55, zoom: 2.5 }, // "ikan bakar, Kuala Perlis"
    { in: 1608.66, out: 1610.56, fy: 0.45, cut: "whoosh" }, // "saya nak gunakan function grill"
    { in: 1621.72, out: 1625.0, fy: 0.5, zoom: 2.5 }, // "temperature dia high, 10 minit"
    { in: 1741.91, out: 1745.9, fy: 0.55 }, // "ikan ni I nak bakar dengan daun-daun pisang"
    { in: 1765.82, out: 1772.05, fy: 0.55, zoom: 2.5 }, // "selain daun pisang boleh guna paper alas air fryer"
    { in: 1773.5, out: 1775.2, fy: 0.55 }, // "ataupun daun kunyit"
    { in: 1779.12, out: 1781.45, fy: 0.55, zoom: 2.5 }, // "ataupun aluminium foil"
    { in: 1823.44, out: 1825.1, fy: 0.5, cut: "whoosh" }, // "lepas tu kita tutup sahaja"
    { in: 1828.4, out: 1831.6, fy: 0.5, zoom: 2.5 }, // "dia akan masak sekata, atas dan bawah"
    { in: 3093.37, out: 3095.05, fy: 0.5, cut: "whoosh" }, // "I sambungkan broil pula"
    { in: 3097.3, out: 3103.8, fy: 0.5, zoom: 2.5 }, // "function atas, efek bakar atas kayu api"
    { in: 3131.74, out: 3135.64, fy: 0.5 }, // "mode broil tak akan overcook ikan"
    { in: 3154.95, out: 3156.4, fy: 0.5, zoom: 2.5 }, // "I buat dalam tiga minit sahaja"
    { in: 3390.08, out: 3393.12, fy: 0.55, cut: "whoosh" }, // "tengok dia tak kering, minyak-minyak dia"
    { in: 3399.65, out: 3403.7, fy: 0.55, zoom: 2.5 }, // "dah tak payah pergi makan dekat kedai"
  ],
  cards: [
    { type: "chips", raw: 3347.0, dur: 1.8, items: ["ALA KUALA PERLIS"] },
    { type: "chips", raw: 1609.5, dur: 1.0, items: ["MODE: GRILL"] },
    { type: "chips", raw: 1622.8, dur: 2.2, items: ["SUHU HIGH", "10 MIN"], times: [1623.09, 1623.48] },
    { type: "tip", raw: 1765.9, dur: 3.2, label: "TIP ALAS", text: "Tiada daun pisang? Boleh guna yang ni:" },
    { type: "chips", raw: 1768.4, dur: 6.4, y: 680, items: ["KERTAS AIR FRYER", "DAUN KUNYIT", "ALUMINIUM FOIL"], times: [1768.44, 1774.34, 1779.83] },
    { type: "tip", raw: 3093.4, dur: 8.0, label: "RAHSIA", text: "Habis grill, sambung BROIL. Panas dari atas je, dapat rupa ikan bakar kayu api" },
    { type: "chips", raw: 3155.0, dur: 1.4, items: ["BROIL", "3 MIN"], times: [3155.02, 3155.68] },
    { type: "sticker", raw: 3390.6, dur: 1.8, text: "Juicy!", y: 330 },
  ],
  outro: { dur: 2.7, title: "Tak payah ke kedai!", cta: "Tag kawan yang suka ikan bakar" },
};
