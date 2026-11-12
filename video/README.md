# Siri Pizza Frozen + Masak Malas — projek Remotion

Video TikTok / IG Reels (1080×1920, 30fps) daripada 7 klip mentah dalam folder Google Drive
`1hQPTwdVUCl9tLqPQ3KIKwpKQRrYt8DxT`.

| Komposisi | Isi | Durasi |
|---|---|---|
| `Pizza-EP1-PrepBase` | **Siri Pizza Frozen EP1/2**: buat base, bakar sekejap, susun untuk freezer | ~35s |
| `Pizza-EP2-ToppingBakar` | **Siri Pizza Frozen EP2/2**: base dari freezer → sos, topping, keju → Food Engine Cooven → tarikan keju | ~50s |
| `MeeGoreng` | Video berasingan: mee goreng satu periuk | ~41s |
| `TelurDadar` | Video berasingan: telur dadar Food Engine Cooven, tak payah terbalik + recap 3 menu | ~43s |
| `Siri-Pizza-Penuh` / `Semua-Video` | Disambung untuk semakan sahaja | |

## Transkripsi

Semua klip ditranskrip dengan Whisper `large-v3-turbo` (bahasa Melayu, dengan dan tanpa VAD).
**Tiada ucapan dikesan dalam mana-mana klip**: VAD tidak jumpa suara, dan output tanpa VAD cuma
halusinasi biasa Whisper atas bunyi bising ("Terima kasih kerana menonton!"). Audio sebenar ialah
bunyi kipas Food Engine Cooven / periuk, desis minyak, pisau.

Jadi cerita disampaikan dengan teks di skrin + bunyi ASMR masakan, dan potongan dibuat berdasarkan
log visual di bawah (bukan transkrip ucapan).

### Log visual (masa sumber, saat)

| Klip | Isi | Momen penting |
|---|---|---|
| `v132807` (22 min) | Shot lebar dapur, **muka nampak di kiri atas**, separuh bawah frame sofa | Kitaran berulang: bentuk doh dengan tangan (281–307), tekan dalam loyang (166–214), keluarkan dari Food Engine Cooven & susun (1070–1083); **1300–1311 timbunan base dibawa ke kamera** |
| `v195221` (7 min) | Topping | 0–5 base dari freezer, 8–44 sapu sos, 82–222 Food Engine Cooven (buang), 229–257 susun topping, 259–283 keju, 289–302 masuk Food Engine Cooven, 306–430 bakar |
| `v195943` (36s) | Pizza dalam Food Engine Cooven | 0–14 lampu padam, 15–30 lampu menyala, keju menggelegak |
| `v200030` (82s) | Papan potong | 0–8 papan kosong (buang), 8–58 potong, 61–66 tangan tutup pizza (buang), **74–79 tarikan keju** |
| `v202235` (512s) | Mee dalam periuk elektrik | 0–39 minyak panas (buang), 40–44 perencah, 74–80 masuk air (desis), 82–100 masuk mee, 128–162 bertutup, 164–250 leraikan, 308–312 kicap, 320–350 gaul (putih → perang), 486–490 angkat mee |
| `v203156` (52s) | Hidang mee | 15–19 pinggan penuh, 35–37 close-up |
| `v203532` (435s) | Telur dadar Food Engine Cooven | 0–140 panaskan (diulang, buang hampir semua), 148–152 pukul telur, 211–216 masuk loyang, 218–222 tuang telur, 226–335 masak (intai pada 294 & 329, buang), **345 keluar kembang**, 387–420 pindah ke pinggan |

Bahagian yang berulang atau statik (panaskan Food Engine Cooven 2+ minit, minyak panas, penutup periuk, tangan
menutup frame) dibuang atau dipercepatkan (badge `▶▶ 6x/8x/16x` jujur tunjuk kelajuan).

## Struktur setiap video

1. **Hook (0–5s)**: momen paling sedap ditunjuk dulu (timbunan base / tarikan keju / mee berkilat /
   telur kembang) + tajuk kinetik.
2. **Rewind glitch** → langkah bernombor (`01`, `02`…) dengan zoom ke bahagian penting. Kitaran prep
   base yang berulang dipadatkan jadi montaj ("Ulang sampai habis doh").
3. **Payoff** semula dengan sparkle + SFX.
4. **Kad penutup**: Pizza EP1 → "Bersambung… EP2" (peek tarikan keju); Pizza EP2 → Mee → Telur
   ("Video seterusnya…"); Telur tutup dengan kolaj 3 menu + CTA komen.

## Safe zone TikTok + IG

Semua teks/grafik berada dalam kotak `x 80–920, y 250–1480` (`src/lib/theme.ts → SAFE`): elak bar
atas, lajur butang kanan, dan kapsyen/nama pengguna bawah.

**Muka**: hanya `v132807` tunjuk muka (kiri atas). Shot lebar ditanda `faceLeft: true`, jadi badge siri
pindah ke kanan dan progress bar disembunyikan, manakala tajuk diletak di bawah (atas sofa). Shot
close-up di-zoom ke meja, jadi muka berada di luar frame dan tiada grafik di atasnya.
Tukar `showSafeZone: true` dalam props untuk lihat panduan.

## Audio

- **Muzik**: CC0 (dataset `mrfakename/cc0-music-captioned`): `pizza.wav` (funky), `mee.wav` (groovy
  hip-hop vintage), `telur.wav` (ukulele + siulan). Alternatif: `alt-funk.wav`, `alt-lofi.wav`.
- **Ducking**: muzik turun ke ~32% semasa momen ASMR (desis air, pisau, tuang telur, angkat mee) dan ke
  70% bila audio klip dihidupkan; perubahan dilicinkan (`musicCurve` dalam `src/lib/timeline.ts`).
  Kalau nanti tambah voice-over, tandakan shot itu `asmr: true` dan suara takkan tenggelam.
- **Audio klip**: high-pass + denoise (buang dengung kipas) + normalise.
- **SFX**: CC0 `wyzowl/sfx-kit` (whoosh, pop, sparkle, riser, sting, clock, inflate…), peak -3 dBFS.
- **Loudness akhir**: 2-pass EBU R128 ke **-14 LUFS / -1.5 dBTP** (standard TikTok/Reels).

## Arahan

```bash
cd video
npm install
./scripts/fetch-assets.sh            # footage proxy, SFX, muzik (tak dicommit sebab besar)
export CHROME_PATH=/path/to/chrome-headless-shell   # pilihan
npm run studio                       # Remotion Studio
node scripts/render-preview.mjs      # PREVIEW 540x960 -> out/preview/
node scripts/render-final.mjs        # FINAL 1080x1920 -> out/final/  (lepas preview diluluskan)
```

Semua suntingan (potongan, kelajuan, zoom, teks, SFX) ada dalam `src/episodes/*.ts`, satu objek
per shot, jadi senang diubah.
