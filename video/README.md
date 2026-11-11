# Siri "Masak Malas" — projek Remotion

3 episod bersambung (TikTok / IG Reels, 1080×1920, 30fps) daripada 5 klip mentah dalam folder Google Drive
`1hQPTwdVUCl9tLqPQ3KIKwpKQRrYt8DxT`.

| Komposisi | Isi | Durasi |
|---|---|---|
| `Ep1-Pizza` | Pizza frozen dalam air fryer → potong → tarikan keju | ~30s |
| `Ep2-MeeGoreng` | Mee goreng satu periuk | ~41s |
| `Ep3-TelurDadar` | Telur dadar air fryer, tak payah terbalik + penutup siri | ~43s |
| `Siri-Penuh` | Ketiga-tiga episod disambung (untuk semakan sahaja) | ~1m54s |

## Transkripsi

Semua klip ditranskrip dengan Whisper `large-v3-turbo` (bahasa Melayu, dengan dan tanpa VAD).
**Tiada ucapan dikesan dalam mana-mana klip**: VAD tidak jumpa suara, dan output tanpa VAD cuma
halusinasi biasa Whisper atas bunyi bising ("Terima kasih kerana menonton!"). Audio sebenar ialah
bunyi kipas air fryer / periuk, desis minyak, pisau.

Jadi cerita disampaikan dengan teks di skrin + bunyi ASMR masakan, dan potongan dibuat berdasarkan
log visual di bawah (bukan transkrip ucapan).

### Log visual (masa sumber, saat)

| Klip | Isi | Momen penting |
|---|---|---|
| `v195943` (36s) | Pizza dalam air fryer | 0–14 lampu padam, 15–30 lampu menyala, keju menggelegak |
| `v200030` (82s) | Papan potong | 0–8 papan kosong (buang), 8–58 potong, 61–66 tangan tutup pizza (buang), **74–79 tarikan keju** |
| `v202235` (512s) | Mee dalam periuk elektrik | 0–39 minyak panas (buang), 40–44 perencah, 74–80 masuk air (desis), 82–100 masuk mee, 128–162 bertutup, 164–250 leraikan, 308–312 kicap, 320–350 gaul (putih → perang), 486–490 angkat mee |
| `v203156` (52s) | Hidang mee | 15–19 pinggan penuh, 35–37 close-up |
| `v203532` (435s) | Telur dadar air fryer | 0–140 panaskan (diulang, buang hampir semua), 148–152 pukul telur, 211–216 masuk loyang, 218–222 tuang telur, 226–335 masak (intai pada 294 & 329, buang), **345 keluar kembang**, 387–420 pindah ke pinggan |

Bahagian yang berulang atau statik (panaskan air fryer 2+ minit, minyak panas, penutup periuk, tangan
menutup frame) dibuang atau dipercepatkan (badge `▶▶ 6x/8x/16x` jujur tunjuk kelajuan).

## Struktur setiap episod

1. **Hook (0–5s)**: momen paling sedap ditunjuk dulu (tarikan keju / mee berkilat / telur kembang) +
   tajuk kinetik.
2. **Rewind glitch** → langkah bernombor (`01`, `02`…) dengan zoom ke bahagian penting.
3. **Payoff** semula dengan sparkle + SFX.
4. **Kad "Bersambung…"** dengan peek video episod seterusnya (EP3 tutup dengan kolaj 3 menu + CTA
   komen).

## Safe zone TikTok + IG

Semua teks/grafik berada dalam kotak `x 80–920, y 250–1480` (`src/lib/theme.ts → SAFE`): elak bar
atas, lajur butang kanan, dan kapsyen/nama pengguna bawah. Tiada muka dalam footage (tangan sahaja);
grafik diletak di atas/bawah supaya tak tutup makanan semasa momen penting.
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
