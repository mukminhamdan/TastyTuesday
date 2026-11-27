# Ketetapan projek video (Remotion)

Aliran kerja penuh: skill **`video-masakan`** (`.claude/skills/video-masakan/SKILL.md` di akar repo).

- **Jenama**: semua video baru guna badge `BRAND` (`src/lib/theme.ts`) = **"MUKMIN MASAK"** dan hashtag `#mukminmasak`.
  Video lama (Mee, Telur, siri pizza) kekal seperti yang sudah di-post; jangan ubah kecuali diminta.
- **Muzik**: guna pustaka `MUSIC` dalam `src/lib/theme.ts`: **A `ukuleleCeria`**, **D `ukuleleIklan`** (mula dari 25s),
  **3 `ukuleleRiang`**, **4 `ukuleleFolk`**, **5 `ukuleleSiulTepuk`** (video ≤37s sahaja), **6 `ukuleleSiulan`**.
  **Bergilir A → D → 3 → 4 → 5 → 6** antara video (part 1 = A, part 2 = D, ...); patuhi `safeUntil` setiap lagu; bila lagu sama diguna semula dalam
  siri yang sama, mula dari bahagian lain (`musicStart`) supaya tak bunyi berulang. Lagu A ada *break* senyap pada
  96–115s: pastikan `musicStart + durasi video` tak terkena bahagian tu. Salinan MP3 disimpan dalam `assets/music-library/` (CC0); `scripts/fetch-assets.sh` menyediakan WAV-nya.
- **Grade warna**: `look: 'cinematic'` (kontras, bayang teal, sedikit neutral/sejuk supaya tak terlalu oren, vignette) bila pengguna
  mahu rupa lebih menarik/cinematic; `look: 'warm'` untuk grade ringan.
- **Peralatan**: sebut **"Food Engine Cooven"**, bukan "air fryer".
- **Siri vs video berasingan**: hanya letak "EP" dan kad "Bersambung" bila pengguna minta siri. Video jawapan
  komen / video tunggal berakhir dengan kad recap (contoh `resepi-doh-pizza.ts`).
- **Gaya**: hook paling kuat dulu → langkah bernombor (`step`) dengan zoom → payoff dengan sparkle → kad akhir.
  Teks/grafik mesti dalam `SAFE` (TikTok + IG). Jangan tutup muka (`faceLeft`, atau zoom ke meja).
- **Audio**: tiada suara dalam footage setakat ini; muzik CC0 + SFX CC0, akhir -14 LUFS. Pengguna mahu **bunyi asal
  klip rendah** supaya tak ganggu lagu: guna `clipGain: 0.3` dan `asmrDuck: 0.85` pada episod baru (lihat `roti-manis.ts`).
- **Aliran kerja**: transkrip dulu (Whisper), buat contact sheet, render **preview 540x960** dan tunggu kelulusan
  sebelum `render-final.mjs`. Jangan teka bahan/sukatan; tanya pengguna dan tanda label yang belum pasti.
- **Footage**: muat turun dari folder Drive pengguna, semak semua halaman hasil carian (`nextPageToken`).

## Nota untuk video akan datang

- **Video resipi roti manis**: dah dibuat (`RotiManis-Resipi`). Bahan: 400g tepung roti, 100g tepung gandum, 300g air,
  60g gula kastor, 60g mentega masin (kiub 2 cm), 10g yis kering, 1 s/k garam. Juga:
  Food Engine Cooven mode oven **150°C, 15–20 min**; oven biasa **170°C, 15–20 min**; proof 1 = 15 min / naik double,
  proof 2 = 30–45 min sampai naik double; sapu **butter** lepas bakar.
- **Ayam percik** (dari live, kata-kata pengguna sendiri): 1 ayam belah tengah + kuah percik blend (cili kering, halia,
  lengkuas, serai, buah keras, santan, gula melaka, garam, minyak) + daun kunyit & asam keping; Smart Cook 30 min
  (25 braise + 5 broil), siram kuah, tudung air fryer, broil 10 min. Perap: tak perlu, boleh kalau nak. Sukatan belum diberi.
  **Jangan tunjuk masa memasak** dan **jangan tunjuk muka** (fokus cara masak sahaja: zoom ke periuk/tangan) dalam video ayam percik; **tiada kotak blur**: zoom supaya tetingkap peserta live (x > 0.785) di luar frame; mesej: Smart Cook = braise + broil, 2 fungsi dalam 1,
  tak perlu alat memasak lain. **Muzik sahaja** (`clipGain: 0`, tiada bunyi live); payoff = satu pergerakan kamera licin (`zoom.path`) ke setiap bahagian ayam + kuah menggelegak.
- **Ikan bawal stim tofu** (`ikan-bawal.ts`, 3 video): sos = kicap cair, sos tiram, sos ikan, minyak bijan; halia hiris;
  tofu disusun keliling ikan; Food Engine Cooven **mode steam** (preheat dulu); tabur **bawang putih goreng**.
  Tiada sukatan/masa diberi. Pengguna: **jangan letak langkah "cek isi dengan garfu"**; label "siap stim!" ok.
  Gambar hasil (img*.jpg) dipusing 90° dan dijadikan pembuka. `look: 'premium'` + `light` setiap shot untuk betulkan cahaya.
- **Pes gulai kawah** (`pes-gulai.ts`, 1 video memasak + 2 quote): kisar bawang merah, bawang putih, halia, lengkuas;
  tumis **rempah 4 sekawan**; masuk **rempah gulai kawah**; masuk **cili boh**, **air asam**; tutup, masak sampai pecah minyak;
  masuk **gula nisan, garam, perasa** (dalam rakaman: selepas tudung dibuka). Render panjang meninggalkan /tmp/remotion-v4*-assets* yang besar: buang selepas render.
  **Jangan sebut mode atau masa** Cooven. Tiada sukatan diberi. Format pilihan pengguna terkini: **1 video memasak + 1 video quote**; video quote **tanpa kad resipi**.
