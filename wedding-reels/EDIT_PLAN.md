# Pelan Edit: 3 Cinematic Wedding Reels

Majlis: 11 Oktober 2026 · Format: 1080×1920 (9:16), 30fps · Setiap reel bawah 45 saat
Status: **muzik dipilih, timeline disync ikut beat, preview 540p siap. Render final menunggu kelulusan.**

---

## 1. Penilaian footage

| Kod | Fail | Isi | Kualiti / Catatan |
|---|---|---|---|
| HALL | VID_20261107_232731_694 | Dewan luas, chandelier, rombongan masuk | 720p, guna sebagai establishing shot |
| GUEST | VID_20261107_232724_650 | Tetamu bertepuk, suasana meriah | 720p, teks "CONCORDE HOTEL SHAH ALAM" dibuang dengan crop |
| PENGAPIT | VID_20261011_123040 | Pengapit berkebaya turun tangga, karpet merah | 4K, sangat cantik untuk slow-mo |
| PENGIRING | VID_20261011_123104 | Pengiring baju magenta, flower girl, keluarga | 4K |
| ARRIVE | VID_20261011_123126 | Pengantin muncul di atas tangga | 4K, jurugambar masuk frame selepas 3.5s (tak diguna) |
| **HERO** | VID_20261011_123138 | **Pengantin berjalan ke kamera sambil senyum** | 4K, **shot terbaik**, jadi kemuncak setiap reel |
| KOMPANG | VID_20261011_123202 | Pasukan kompang/rebana, pesilat | 4K, bunyi asal dicampur bawah muzik |
| SCREEN | VID_20261011_123344 | Pengantin di skrin LED | 4K, crop buang papan "KELUAR" |
| SILAT | VID_20261011_123809 | Silat (landscape) + **bersanding** di skrin LED | Landscape, crop 9:16 / dibingkai atas latar blur |
| DANCE | Document from Mukmin Hamdan (.mov) | Tarian tradisional kuning-oren | 4K HDR iPhone, warna sangat cantik, tone-map ke SDR |
| — | HnVideoEditor_2026_10_11_… | Sama dengan PENGAPIT (versi export) | Tak diguna (duplikat) |

**Had footage yang perlu anda tahu:**
- **Tiada shot bersalaman.** Kalau ada klip bersalaman atau merenjis, hantar dan saya masukkan pada babak kemuncak.
- **Bersanding hanya ada dari skrin LED** (dirakam dari skrin, bukan terus dari pelamin). Saya letak dalam bingkai elegan atas latar blur supaya nampak disengajakan. Kalau ada klip pelamin yang dirakam terus, shot penutup akan jauh lebih kuat.
- Semua footage 30fps. Slow-mo guna *motion interpolation* (minterpolate) supaya licin, bukan tersekat-sekat.

---

## 2. Gaya keseluruhan

- **Colour grade "Warm Romantic"** (`warm_romantic.cube`, LUT 33³ yang boleh juga dipakai dalam CapCut/Premiere/DaVinci):
  shadow coklat hangat, highlight keemasan, black diangkat sedikit (rupa filem), saturasi turun 8%, dan merah pakaian pengantin dikawal supaya tak "pecah". Ditambah soft glow 10%, vignette lembut, film grain halus.
- **Transition:** kebanyakannya hard cut tepat pada beat. Cross-dissolve 0.5s (berpusat pada beat) **hanya** pada pertukaran babak. Fade dari hitam pada pembuka, fade ke hitam pada penutup. Tiada transition gimik.
- **Pergerakan:** slow push-in (zoom 4–8%) pada shot penting untuk rasa "gimbal".
- **Tipografi:** Cormorant Garamond (serif elegan, lesen OFL), warna krim `#FFF6E8`, fade masuk dan keluar.
- **Audio:** muzik instrumental + bunyi asal kompang/tepukan (25–60%) pada shot kelajuan normal.

---

## 3. Siri 3 Part: "Marsya & Finn"

Tiga reel yang bersambung, untuk dimuat naik berturut-turut (atau sebagai carousel/series):

| Part | Tajuk | Cerita | Sambungan |
|---|---|---|---|
| 1/3 | **Ketibaan** | Dewan, kompang, perarakan pengapit & pengiring, debaran tetamu | Berakhir dengan pengantin muncul di tangga + kad *"bersambung · Part 2"* |
| 2/3 | **Raja Sehari** | Pengantin turun tangga, berjalan, masuk dewan, sambutan tetamu, bersanding | Dibuka dengan shot tangga yang **sama** (sambungan terus dari Part 1); berakhir dengan bersanding + *"bersambung · Part 3"* |
| 3/3 | **Raikan Cinta** | Persembahan silat & tarian untuk pengantin, kemeriahan tetamu | Silat dipersembahkan di hadapan pelamin (pengantin kelihatan di belakang); ditutup dengan pengantin + end card *Selamat Pengantin Baru* |

**Intro setiap part:** kad tajuk emas: *PART n / 3* · nama **Marsya & Finn** dalam skrip Great Vibes (gradient emas + glow) · **11 . 10 . 2026** dalam Cinzel · nama bab. Fail: `titles/*.png` (dijana oleh `make_titles.py`).
Setiap shot hanya digunakan dalam satu part, kecuali shot pengantin di hujung Part 3 yang sengaja diulang sebagai penutup.

### Part 1/3: "Ketibaan" (33.0s · 97.1 BPM)
*Part 1/3: suasana dewan, kompang, perarakan pengapit & pengiring, debaran tetamu. Berakhir dengan pengantin muncul di tangga (cliffhanger).*

Muzik: **Instrumental Melayu #7 (@DHMUSICART20)**, mula pada saat 165.91. Cut disesuaikan dengan beat sebenar lagu.

| # | Masa | Beat | Laju | Shot | Transition | Babak |
|---|---|---|---|---|---|---|
| 1 | 0:00.0–0:04.9 | 8 | 60% | HALL @0.0s · kad `intro_part1.png` | fadein | PEMBUKA |
| 2 | 0:04.9–0:07.4 | 4 | 100% | KOMPANG @6.0s | cut |  |
| 3 | 0:07.4–0:09.9 | 4 | 100% | KOMPANG @1.5s | cut |  |
| 4 | 0:09.9–0:13.6 | 6 | 70% | PENGAPIT @0.5s | dissolve | PERARAKAN |
| 5 | 0:13.6–0:16.1 | 4 | 60% | PENGAPIT @4.5s | cut |  |
| 6 | 0:16.1–0:18.7 | 4 | 75% | PENGIRING @1.0s | cut |  |
| 7 | 0:18.7–0:21.1 | 4 | 70% | PENGIRING @4.5s | cut |  |
| 8 | 0:21.1–0:23.6 | 4 | 70% | PENGIRING @11.5s | cut |  |
| 9 | 0:23.6–0:25.5 | 3 | 60% | PENGAPIT @10.4s | cut |  |
| 10 | 0:25.5–0:28.0 | 4 | 100% | GUEST @0.5s | cut | DEBARAN |
| 11 | 0:28.0–0:33.0 | 8 | 45% | ARRIVE @0.2s · kad `next_part2.png` | dissolve | CLIFFHANGER |

### Part 2/3: "Raja Sehari" (31.0s · 120.1 BPM)
*Part 2/3: bersambung dari tangga, pengantin berjalan, masuk dewan, sambutan tetamu, bersanding. Berakhir dengan bersanding.*

Muzik: **Instrumental Melayu #2 (@DHMUSICART20)**, mula pada saat 99.74. Cut disesuaikan dengan beat sebenar lagu.

| # | Masa | Beat | Laju | Shot | Transition | Babak |
|---|---|---|---|---|---|---|
| 1 | 0:00.0–0:04.0 | 8 | 30% | HERO @3.7s · kad `intro_part2.png` | fadein | PEMBUKA |
| 2 | 0:04.0–0:07.0 | 6 | 45% | ARRIVE @2.0s | dissolve | SAMBUNGAN (dari Part 1) |
| 3 | 0:07.0–0:15.0 | 16 | 45% | HERO @0.2s | cut | KEMUNCAK |
| 4 | 0:15.0–0:17.0 | 4 | 70% | HERO @5.0s | cut |  |
| 5 | 0:17.0–0:19.0 | 4 | 100% | HALL @3.5s | cut | MASUK DEWAN |
| 6 | 0:19.0–0:21.0 | 4 | 80% | GUEST @11.0s | cut |  |
| 7 | 0:21.0–0:23.0 | 4 | 100% | GUEST @6.0s | cut |  |
| 8 | 0:23.0–0:26.0 | 6 | 70% | SCREEN @4.0s | dissolve |  |
| 9 | 0:26.0–0:31.0 | 10 | 50% | SILAT @23.6s (dibingkai) · kad `next_part3.png` | dissolve | BERSANDING |

### Part 3/3: "Raikan Cinta" (37.0s · 120.0 BPM)
*Part 3/3: persembahan untuk pengantin (silat, tarian), kemeriahan tetamu, ditutup dengan pengantin dan end card.*

Muzik: **Instrumental Melayu #8 (@DHMUSICART20)**, mula pada saat 1.63. Cut disesuaikan dengan beat sebenar lagu.

| # | Masa | Beat | Laju | Shot | Transition | Babak |
|---|---|---|---|---|---|---|
| 1 | 0:00.0–0:04.0 | 8 | 50% | DANCE @10.0s · kad `intro_part3.png` | fadein | PEMBUKA |
| 2 | 0:04.0–0:06.0 | 4 | 100% | KOMPANG @9.2s | cut |  |
| 3 | 0:06.0–0:09.0 | 6 | 60% | SILAT @4.0s | cut | ADAT |
| 4 | 0:09.0–0:11.0 | 4 | 100% | SILAT @7.0s | cut |  |
| 5 | 0:11.0–0:13.0 | 4 | 100% | HALL @10.0s | cut |  |
| 6 | 0:13.0–0:15.0 | 4 | 100% | DANCE @1.0s | cut | TARIAN |
| 7 | 0:15.0–0:18.0 | 6 | 50% | DANCE @17.8s | cut |  |
| 8 | 0:18.0–0:20.0 | 4 | 60% | DANCE @29.5s | cut |  |
| 9 | 0:20.0–0:22.0 | 4 | 100% | DANCE @49.5s | cut |  |
| 10 | 0:22.0–0:24.0 | 4 | 100% | DANCE @55.5s | cut |  |
| 11 | 0:24.0–0:26.0 | 4 | 100% | GUEST @0.0s | cut |  |
| 12 | 0:26.0–0:29.0 | 6 | 60% | DANCE @41.6s | cut |  |
| 13 | 0:29.0–0:33.0 | 8 | 50% | HERO @0.5s | dissolve | PENUTUP |
| 14 | 0:33.0–0:37.0 | 8 | — | Hitam · kad `end_card.png` | dissolve |  |

### Muzik: instrumental lagu Melayu (dibekalkan oleh pengguna)
Sumber: fail "Easy Listening !!! Kumpulan Musik Instrumen Melayu @DHMUSICART20.mp3" (kompilasi 13 lagu, 64.6 minit) dalam folder Drive.
- Part 1: lagu #7 (97 BPM) · Part 2: lagu #2 (120 BPM, cut setiap 2 beat) · Part 3: lagu #8 (120 BPM)
- Lagu #5 dan #10 tidak digunakan kerana ada bahagian rosak (kosong) dalam fail.
- Fail audio disimpan dalam `music_local/` dan **tidak di-commit** ke repo, kerana muzik ini berhak cipta.
- Kekuatan bunyi dinormalkan ke -14 LUFS (standard Instagram/TikTok).
- Hak cipta: untuk Instagram, guna versi `_TANPA-MUZIK` dan tambah lagu dari library Instagram, atau terima risiko di-mute.
- Muzik CC0 sebelum ini (Wedding / Lullabies #5 / Street Lights) masih ada dalam `music/` sebagai sandaran.

## 6. Status & langkah seterusnya

1. Nama pengantin: **Marsya & Finn** ✓
2. Muzik instrumental Melayu disync ✓ (lagu #7 / #2 / #8 dari kompilasi @DHMUSICART20)
3. Disusun semula sebagai siri 3 part bersambung + kad intro emas ✓
4. Preview 540p siap ✓ (`out/*_preview.mp4`, tidak di-commit kerana fail video)
5. **Menunggu:** kelulusan preview, atau senarai perubahan. Selepas itu baru render final 1080×1920.
6. (Pilihan) Klip tambahan: bersalaman, merenjis, pelamin yang dirakam terus.

## 7. Cara render (selepas lulus)

```bash
python3 make_lut.py                                      # jana LUT (sekali)
python3 make_titles.py                                   # jana kad tajuk (intro / bersambung / end card)
python3 render.py storyboard --src RAW --out storyboard  # still yang dah di-grade untuk setiap shot
python3 render.py preview --src RAW --out out --reel part1_ketibaan   # draf 540p dengan muzik
python3 render.py final   --src RAW --out out --reel part1_ketibaan    # 1080x1920 final (muzik dari reels.json)
```
Muzik, tempo dan titik mula setiap reel disimpan dalam `reels.json`. Skrip mengesan beat sebenar lagu dan meletakkan setiap cut tepat pada beat (ketepatan bawah 1 frame). Untuk tukar lagu: `--music fail.mp3 --music-offset SAAT --bpm BPM`.
