---
name: video-masakan
description: Edit raw cooking footage (usually from the user's Google Drive folder) into TikTok / IG Reels videos with the Remotion project in video/, in the established "Mukmin Masak" style - hook first, numbered steps with zooms, recipe cards, safe zones, CC0 music + SFX, -14 LUFS, preview before final, then thumbnails and IG/TikTok/Threads captions. Use whenever the user asks (often in Malay) to edit/buat video, reels, siri/part, resipi, thumbnail or caption for a cooking video ("edit video masak", "buat reels", "video resipi", "part by part", "render final").
---

# Video masakan (Remotion, gaya Mukmin Masak)

Projek: `video/` (Remotion 4). Baca `video/CLAUDE.md` dulu: ia ada ketetapan pengguna (jenama, lagu, bunyi,
istilah) dan nota resipi/setting yang dah disahkan. Komunikasi dengan pengguna dalam Bahasa Melayu.

## Prinsip (dari maklum balas pengguna)

- **Jangan teka** bahan, sukatan, suhu, masa atau apa yang disapu/dimasukkan. Guna label umum dan **tanya**;
  tanda label yang belum pasti dalam ringkasan. Jangan tambah "tip" yang pengguna tak sebut.
- **Peralatan**: sebut "Food Engine Cooven" (bukan air fryer). Penimbang pun jenama Cooven.
- **Jenama** badge = `BRAND` ("MUKMIN MASAK"), hashtag `#mukminmasak`. Video lama jangan diubah.
- **Siri** ("part by part") = chip `epLabel` + kad "Bersambung" + CTA. **Video tunggal / resipi** = tiada EP,
  tutup dengan kad recap. Video resipi diasingkan bila pengguna minta; part lain jangan ada resipi.
- **CTA** ikut permintaan pengguna (contoh siri roti: `Nak resipi?\nFollow & komen "RESIPI"`).
- **Muka**: jangan tutup dengan grafik. Shot lebar yang ada muka: `faceLeft: true` + tajuk `pos: 'bottom'`;
  close-up: zoom ke meja supaya muka keluar frame.
- **Audio**: bunyi asal klip rendah (`clipGain: 0.3`, `asmrDuck: 0.85`), lagu di depan, akhir -14 LUFS.
- **Lagu**: bergilir `MUSIC` A `ukuleleCeria` -> D `ukuleleIklan` -> 3 `ukuleleRiang` -> 4 `ukuleleFolk` ->
  5 `ukuleleSiulTepuk` (video <=37s sahaja) -> 6 `ukuleleSiulan`. Guna `start` lagu itu dan pastikan
  `musicStart + durasi <= safeUntil` (lagu A ada break senyap 96-115s). Sampel lain boleh dicari dari dataset CC0 (`scripts/get-music.py`).
- **Visual**: `look: 'warm'` untuk makanan; final dengan `SHARPEN=1`.
- **Durasi**: part ±30-50s; video resipi **bawah 1 minit** (resipi + langkah + hasil bakar).
- **Satu rakaman panjang (contoh live)**: setiap video **bawah 1 minit** dan keluarkan **seberapa banyak video**
  yang boleh: cara penuh, before->after, dan video **suara** bila tukang masak menerangkan/menjawab soalan
  (`subs` + `vo`, contoh `ayam-percik.ts`). Video suara: `clipGain: 1`, `musicBed: 0.35`, `asmrDuck: 0.22`.
  Tetingkap peserta lain (picture-in-picture) mesti dikeluarkan dengan zoom.
- **Preview dulu** (540x960), tunggu kelulusan, baru final. Hantar setiap fail dengan SendUserFile sebaik siap.

## Aliran kerja

### 1. Ambil footage
- Senarai folder Drive dengan `mcp__Google_Drive__search_files` (`parentId = '<folder>'`). **Semak
  `nextPageToken`** dan ambil semua halaman (pernah terlepas 2 fail).
- Folder biasanya kongsi awam: `curl -L -o raw/X.mp4 "https://drive.usercontent.google.com/download?id=<id>&export=download&confirm=t"`
  (selari dengan `&` ... `wait`). Letak dalam folder media sendiri, contoh `~/media/raw_<projek>/`.
- `df -h /home` dulu. Bundle Remotion menyalin `public/`; buang `video/out/bundle*` lama bila ruang sempit.

### 2. Proxy, transkrip, contact sheet
```bash
cd video
./scripts/make-proxy.sh ~/media/proxy ~/media/raw_x/*.mp4          # latar belakang; 14 min klip ~ 5 min
for f in ~/media/raw_x/*.mp4; do ffmpeg -nostdin -v error -y -i $f -vn -ac 1 -ar 16000 ~/media/audio/$(basename $f .mp4).wav; done
python3 -I scripts/transcribe.py ~/media/transcripts ~/media/audio/*.wav   # pip install faster-whisper
./scripts/contact-sheet.sh ~/media/raw_x/A.mp4 /tmp/A.jpg 8 14x6           # kemudian Read imej
./scripts/contact-sheet.sh ~/media/raw_x/A.mp4 /tmp/A2.jpg 2 15x4 300 120 "crop=iw*0.7:ih*0.42:iw*0.15:ih*0.24,"
```
- Setakat ini footage **tiada suara**; transkrip VAD kosong = tiada ucapan (Whisper tanpa VAD halusinasi
  "Terima kasih kerana menonton!"). Kalau ada suara, guna timestamp perkataan untuk potong jeda/ulangan.
- Buat **log visual** (klip -> julat saat -> aksi) dengan sheet kasar dulu, kemudian sheet halus/crop pada
  momen penting. Cari: hook terkuat (hasil akhir: carik roti, tarikan keju, kembang), langkah, momen berulang
  (padatkan jadi montaj), shot muka, kamera bergoyang (elak).

### 3. Rancang & tulis episod
- Satu fail `video/src/episodes/<nama>.ts`, satu objek `Shot` setiap potongan. Daftar dalam `src/Root.tsx`
  (`EPISODES`). Contoh lengkap: `roti-manis.ts` (siri 3 part + bonus + resipi), `resepi-doh-pizza.ts`
  (video resipi tunggal), `pizza-ep1.ts` (`faceLeft`, montaj).
- Struktur: **hook** (payoff dulu, `enter: 'cut'`, tajuk + sparkles + `sting`/`impact`) -> `enter: 'glitch'`
  -> langkah `step` bernombor (2.8-4.5s setiap satu, `speed` badge jujur) -> kad `recipe` (BAHAN / PROOF / TIP,
  `note` dengan `\n`, `cta`) -> **payoff** -> kad akhir (`endNext` untuk siri, `recipe` recap untuk tunggal).
- Durasi shot = `(to - from) / rate`. Step yang bersambung merentas potongan: ulang step dengan `at: -2`.
- Episod baru: `series: BRAND`, `music`/`musicStart` ikut giliran lagu, `musicBed: 0.5`, `clipGain: 0.3`,
  `asmrDuck: 0.85`, `look: 'warm'`.
- **Zoom**: `transform-origin` = fokus. Titik sumber `p` jatuh di skrin `fx + (p - fx) * s`. Untuk letak objek
  di skrin, selesaikan `fx`; fokus 0..1 (guna 0 atau 1 di tepi untuk elak jalur hitam). Zoom > 2x jadi lembut.

### 4. Semak still (wajib sebelum render)
```bash
./scripts/make-public.sh public-x ~/media/proxy/<klip-projek>*.mp4   # public ramping (hard link)
OUT=out/bundle PUBLIC_DIR=public-x node scripts/bundle.mjs
export CHROME_PATH=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell BUNDLE=$PWD/out/bundle
node scripts/stills.mjs <CompId> $(seq -f "%04g" 45 90 2000 | paste -sd,) safe   # ralat "highest frame" = abaikan
```
Tile dengan ffmpeg dan Read. Semak: teks dalam kotak hijau `SAFE`, objek utama tak terpotong, muka tak
ditutup, label tak terkeluar kanan (lajur butang), kad recipe muat (pendekkan teks kalau tidak).

### 5. Preview
```bash
node scripts/render-preview.mjs <CompId> [...]     # ~4-6 min setiap video, -14 LUFS automatik
python3 -I scripts/audio-profile.py out/preview/<CompId>-PREVIEW.mp4
```
- Lubang senyap dalam profil biasanya bahagian lagu yang senyap: tukar `musicStart`.
- Jangan bundle semula ke folder yang sedang dirender (guna `OUT=out/bundle-xyz`). Satu render pada satu masa.
- Hantar preview dengan SendUserFile, senaraikan label yang perlu disahkan.

### 6. Final (selepas pengguna setuju)
```bash
SHARPEN=1 node scripts/render-final.mjs <CompId> [...]   # ~12 min setiap video, out/final/
```
Sahkan dengan `ffmpeg -i f.mp4 -af ebur128=peak=true -f null -` (I ~ -14 LUFS) dan hantar.

### 7. Thumbnail & kapsyen
- Thumbnail = `<Still>` dengan komponen `Thumbnail` (`src/Thumbnail.tsx`): ekstrak frame terbaik dari raw ke
  `public/thumbs/`, daftar dalam `Root.tsx` (contoh `ROTI_THUMBS`), render dengan bundle kecil
  (`make-public.sh public-thumbs` tanpa footage) + `node scripts/render-thumbs.mjs <ids>`.
  Teks utama mesti dalam jalur tengah (y 440-1500) supaya selamat dalam potongan grid 3:4 dan 1:1.
- Kapsyen dalam `video/CAPTIONS.md`: versi penuh (bahan, proof, suhu) + versi ringkas **IG / TikTok / Threads**
  (TikTok 3-5 hashtag + `#fyp`; Threads tanpa hashtag, ayat santai) + komen pin.

### 8. Simpan
Commit + push ke branch kerja selepas setiap perubahan bermakna. Media (footage, lagu, SFX) tak dicommit;
`scripts/fetch-assets.sh` boleh bina semula. Kemas kini `video/CLAUDE.md` bila pengguna beri ketetapan baru.
