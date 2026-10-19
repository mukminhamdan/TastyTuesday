// Kak Hani — ikan bilis + kacang for nasi lemak, Air Crisp 200°C 5 min, both together,
// rack on top, a light oil spray only.
export default {
  id: "ikan-bilis",
  title: "Ikan Bilis Kacang Air Crisp",
  menu: "Ikan Bilis & Kacang",
  proxy: [[2420, 2540], [3026, 3068]],
  transcript: "transcripts/ikanbilis.json",
  fix: { kuadi: "kuali", creeps: "crisp", "creeps,": "crisp", kubun: "Cooven", full: "Food", berterberangan: "berterbangan", terih: "", ha: "", haa: "" },
  highlight: ["crunchy", "hangit", "kuali", "kacau-kacau", "air", "crisp", "lima", "minit", "200", "serentak", "tutup", "rak", "spray", "minyak", "banyak-banyak", "nasi", "lemak", "senang", "dua", "kali"],

  hook: { kicker: "TASTY TUESDAY", lines: ["Ikan bilis + kacang", "5 minit, tak hangit!"], accent: 1, dur: 2.8 },
  segments: [
    { in: 3047.2, out: 3050.25, fy: 0.62 }, // plate — "ni untuk nasi lemak ni. Marvellous."
    { in: 3028.7, out: 3031.1, fx: 0.6, fy: 0.28, zoom: 2.5 }, // "dia sebenarnya very-very crunchy"
    { in: 3036.55, out: 3037.5, fx: 0.6, fy: 0.28 }, // "dan dia tak hangit"
    { in: 2427.05, out: 2433.26, fx: 0.6, fy: 0.28, cut: "whoosh" }, // "atas kuali kena kacau-kacau, nak tunggu, hangit"
    { in: 2435.3, out: 2444.1, fx: 0.6, fy: 0.28, zoom: 2.5 }, // "fungsi air crisp, lima minit, suhu 200"
    { in: 2451.6, out: 2455.4, fy: 0.55, cut: "whoosh" }, // host: "masukkan dua-dua serentak ke?"
    { in: 2457.0, out: 2462.4, fy: 0.6, zoom: 2.5 }, // "air crisp ikan bilis dan kacang serentak"
    { in: 2473.3, out: 2476.15, fy: 0.55 }, // "tutup ni supaya dia tidak berterbangan"
    { in: 2478.98, out: 2479.8, fy: 0.55, zoom: 2.5 }, // "kita guna rak"
    { in: 2516.82, out: 2519.7, fx: 0.6, fy: 0.28, cut: "whoosh" }, // "kita dah spray dengan minyak, gaul-gaulkan"
    { in: 2530.6, out: 2535.98, fx: 0.6, fy: 0.28, zoom: 2.5 }, // "tidak payah menggunakan minyak banyak-banyak"
    { in: 3057.2, out: 3060.15, fx: 0.6, fy: 0.28, cut: "whoosh" }, // "lima minit sahaja ikan bilis dengan kacang"
    { in: 3060.24, out: 3063.24, fx: 0.6, fy: 0.28, zoom: 2.5 }, // "nak masak nasi lemak sangat senang"
    { in: 3063.34, out: 3066.3, fx: 0.6, fy: 0.28 }, // "tak payah masak goreng dua kali"
  ],
  cards: [
    { type: "sticker", raw: 3036.6, dur: 1.8, text: "Tak hangit!", y: 330 },
    { type: "chips", raw: 2438.6, dur: 5.4, y: 330, items: ["MODE: AIR CRISP", "5 MIN", "200°C"], times: [2438.64, 2440.65, 2443.19] },
    { type: "tip", raw: 2457.1, dur: 5.2, label: "JIMAT MASA", text: "Masukkan ikan bilis dan kacang serentak" },
    { type: "tip", raw: 2473.4, dur: 3.6, label: "TIP", text: "Letak rak di atas supaya ikan bilis tak berterbangan" },
    { type: "tip", raw: 2516.9, dur: 8.2, y: 900, label: "RAHSIA", text: "Spray minyak sikit, gaul rata. Tak perlu minyak banyak" },
  ],
  outro: { dur: 2.7, title: "Sambal nasi lemak, siap!", cta: "Komen NASI LEMAK kalau nak cuba" },
};
