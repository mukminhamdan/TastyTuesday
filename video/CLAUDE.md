# Ketetapan projek video (Remotion)

- **Jenama**: semua video baru guna badge `BRAND` (`src/lib/theme.ts`) = **"MUKMIN MASAK"** dan hashtag `#mukminmasak`.
  Video lama (Mee, Telur, siri pizza) kekal seperti yang sudah di-post; jangan ubah kecuali diminta.
- **Muzik**: guna pustaka `MUSIC` dalam `src/lib/theme.ts`. Lalai = **A `ukuleleCeria`**; alternatif = **D `ukuleleIklan`**
  (mula dari 25s). Salinan MP3 disimpan dalam `assets/music-library/` (CC0); `scripts/fetch-assets.sh` menyediakan WAV-nya.
- **Peralatan**: sebut **"Food Engine Cooven"**, bukan "air fryer".
- **Siri vs video berasingan**: hanya letak "EP" dan kad "Bersambung" bila pengguna minta siri. Video jawapan
  komen / video tunggal berakhir dengan kad recap (contoh `resepi-doh-pizza.ts`).
- **Gaya**: hook paling kuat dulu → langkah bernombor (`step`) dengan zoom → payoff dengan sparkle → kad akhir.
  Teks/grafik mesti dalam `SAFE` (TikTok + IG). Jangan tutup muka (`faceLeft`, atau zoom ke meja).
- **Audio**: tiada suara dalam footage setakat ini; muzik CC0 + SFX CC0, ducking bawah bunyi asli, akhir -14 LUFS.
- **Aliran kerja**: transkrip dulu (Whisper), buat contact sheet, render **preview 540x960** dan tunggu kelulusan
  sebelum `render-final.mjs`. Jangan teka bahan/sukatan; tanya pengguna dan tanda label yang belum pasti.
- **Footage**: muat turun dari folder Drive pengguna, semak semua halaman hasil carian (`nextPageToken`).

## Nota untuk video akan datang

- **Video resipi roti manis** (belum dibuat): pengguna akan beri bahan & sukatan. Masukkan juga:
  Food Engine Cooven mode oven **150°C, 15–20 min**; oven biasa **170°C, 15–20 min**; proof 1 = 15 min / naik double,
  proof 2 = 30–45 min sampai naik double; sapu **butter** lepas bakar.
