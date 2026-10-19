// Kak Ida (host) — baby potato, Air Crisp mode. Raw times are seconds into the
// 71-min call recording. Hook = the finished basket, then the how-to, then CTA.
export default {
  id: "kentang",
  title: "Kentang Rangup Air Crisp",
  menu: "Kentang Rangup",
  proxy: [[1364, 1592], [3408, 3510]],
  transcript: "transcripts/kentang.json",
  fix: { eclipse: "air crisp", ranguk: "rangup", "k.a": "", clips: "", haa: "", eh: "", "@3493.65": "" },
  highlight: ["rangup", "garing", "air", "crisp", "205", "30", "minit", "preheat", "add", "1", "kilo", "atas", "bawah", "minyak", "senang", "sesangat"],

  hook: { kicker: "TASTY TUESDAY", lines: ["Kentang rangup", "tanpa goreng?!"], accent: 1, dur: 2.8 },
  segments: [
    { in: 3453.2, out: 3456.0, fy: 0.58, vol: 0 }, // basket of finished potatoes at camera (her line here is off-topic, muted)
    { in: 3501.55, out: 3503.56, fy: 0.5, zoom: 2.5 }, // "dia dah siap. sangat rangup, sangat garing"
    { in: 1378.25, out: 1380.12, fy: 0.58, cut: "whoosh" }, // "ini baby potato ni"
    { in: 1380.4, out: 1383.72, fy: 0.45, zoom: 2.6 }, // "tapi menggunakan function air crisp"
    { in: 1407.78, out: 1412.35, fy: 0.45 }, // "cuma bezanya air fryer panas dari atas sahaja"
    { in: 1414.92, out: 1418.4, fy: 0.42, zoom: 2.6 }, // "tetapi Cooven food engine..."
    { in: 1432.58, out: 1437.45, fy: 0.48 }, // "bawah, kiri, kanan, depan, belakang dan atas"
    { in: 1467.3, out: 1470.06, fy: 0.45, zoom: 2.6, cut: "whoosh" }, // "suhu yang kita gunakan 205"
    { in: 1471.78, out: 1473.62, fy: 0.45 }, // "darjah celsius. masa 30 minit"
    { in: 1521.05, out: 1524.58, fy: 0.5 }, // "nak masak guna air crisp, kita preheat dulu"
    { in: 1531.38, out: 1534.55, fy: 0.5, zoom: 2.6 }, // "automatik dia suruh add food"
    { in: 1536.55, out: 1539.28, fy: 0.5 }, // "tak perlu agak-agak dah panas ke belum"
    { in: 1547.08, out: 1549.08, fy: 0.62, zoom: 2.5 }, // "boleh buat sampai 1 kilo"
    { in: 3491.02, out: 3494.7, fy: 0.5, cut: "whoosh" }, // "kita tak gunakan minyak goreng"
    { in: 3495.32, out: 3497.4, fy: 0.5, zoom: 2.6 }, // "cuma gaulkan dengan minyak"
    { in: 3498.36, out: 3499.12, fy: 0.5, zoom: 2.6 }, // "garam dan"
    { in: 3500.45, out: 3501.45, fy: 0.5 }, // "black pepper"
    { in: 1569.82, out: 1574.05, fy: 0.42, zoom: 2.5 }, // "senang ke senang sesangat? kita jawab"
  ],
  cards: [
    { type: "sticker", raw: 3502.05, dur: 1.5, text: "Rangup!", y: 330 },
    { type: "chips", raw: 1382.3, dur: 2.2, items: ["MODE: AIR CRISP"] },
    { type: "tip", raw: 1407.85, dur: 4.4, label: "BEZANYA", text: "Air fryer biasa: panas dari atas sahaja" },
    { type: "chips", raw: 1433.5, dur: 4.6, y: 330, items: ["BAWAH", "KIRI", "KANAN", "DEPAN", "BELAKANG", "ATAS"], times: [1434.08, 1434.98, 1435.34, 1435.76, 1436.15, 1436.84] },
    { type: "chips", raw: 1468.7, dur: 4.4, items: ["205°C", "30 MIN"], times: [1468.82, 1472.55] },
    { type: "tip", raw: 1522.0, dur: 6.0, label: "TIP", text: "Preheat dulu. Bila skrin tulis ADD FOOD, baru masukkan" },
    { type: "chips", raw: 1547.9, dur: 1.9, items: ["MUAT SAMPAI 1 KG"] },
    { type: "tip", raw: 3491.6, dur: 6.4, label: "RAHSIA", text: "Tak perlu goreng! Gaul minyak sikit, garam & black pepper" },
  ],
  outro: { dur: 2.7, title: "Senang sangat!", cta: "Komen SENANG kalau nak cuba" },
};
