# Pelan Edit: 3 Cinematic Wedding Reels

Majlis: 11 Oktober 2026 · Format: 1080×1920 (9:16), 30fps · 3 part + 1 filem penuh (bawah 1:30)
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

## 3. Siri "Marsya & Finn": 4 video

| Video | Tajuk | Durasi | Isi |
|---|---|---|---|
| Part 1/3 | **Berarak Masuk** | 47s | Ikut susunan perarakan: penari perempuan, penari lelaki, pengantin, keluarga pengantin, kompang, pesilat, kemudian kad *"bersambung · Part 2"* |
| Part 2/3 | **Raja Sehari** | 37s | Pengantin di skrin dewan, bersanding, persembahan silat, kemudian *"bersambung · Part 3"* (diluluskan, tidak diubah) |
| Part 3/3 | **Tarian & Joget** | 43s | Persembahan tarian (momen yang jelas berbeza), joget lambak bersama tetamu, kemudian end card |
| **Filem penuh** | **Marsya & Finn** | 71s | Edit highlight tersendiri (bawah 1:30), bukan cantuman 3 part: perarakan, pengantin, keluarga, kompang & pesilat, skrin & bersanding, silat, tarian, joget lambak, end card. Satu lagu sepanjang filem. |

- **Tiada shot ulangan:** setiap video disemak dengan `qa_repeats.py`: tiada footage bertindih dalam video atau antara part, dan tiada dua shot dari klip yang sama yang terlalu rapat (< 1.5s) sehingga nampak berulang.
- **Intro:** kad emas *PART n / 3* · **Marsya & Finn** (Great Vibes) · **11 . 10 . 2026** (Cinzel). Filem penuh guna `intro_full.png` (tanpa label PART). Tiada caption di bawah tarikh.

### Part 1/3: "Berarak Masuk" (46.9s · 97.1 BPM)
*Part 1/3: perarakan masuk mengikut susunan: penari perempuan, penari lelaki, pengantin, keluarga pengantin, kompang, pesilat.*

Muzik: **Instrumental Melayu #7 (@DHMUSICART20)**, mula pada saat 57.27. Cut disesuaikan dengan beat sebenar lagu.

| # | Masa | Beat | Laju | Shot | Transition | Babak |
|---|---|---|---|---|---|---|
| 1 | 0:00.0–0:05.1 | 8 | 50% | PENGAPIT @0.0s · kad `intro_part1.png` | fadein | PENARI PEREMPUAN |
| 2 | 0:05.1–0:09.4 | 8 | 60% | PENGAPIT @4.5s | cut |  |
| 3 | 0:09.4–0:14.4 | 8 | 60% | PENGIRING @1.0s | dissolve | PENARI LELAKI |
| 4 | 0:14.4–0:18.1 | 6 | 70% | PENGIRING @6.5s | cut |  |
| 5 | 0:18.1–0:22.0 | 6 | 50% | ARRIVE @0.2s | dissolve | PENGANTIN |
| 6 | 0:22.0–0:32.0 | 16 | 40% | HERO @0.2s | cut |  |
| 7 | 0:32.0–0:34.5 | 4 | 70% | HERO @5.7s | cut | KELUARGA PENGANTIN |
| 8 | 0:34.5–0:39.5 | 8 | 70% | PENGIRING @11.5s | cut |  |
| 9 | 0:39.5–0:42.0 | 4 | 100% | KOMPANG @1.3s | dissolve | KOMPANG |
| 10 | 0:42.0–0:44.4 | 4 | 100% | KOMPANG @6.0s | cut |  |
| 11 | 0:44.4–0:46.9 | 4 | 39% | KOMPANG @11.3s · kad `next_part2.png` | cut | PESILAT |

### Part 2/3: "Raja Sehari" (36.8s · 121.7 BPM)
*Part 2/3: pengantin di skrin dewan, bersanding, kemudian persembahan silat untuk pengantin.*

Muzik: **Instrumental Melayu #9 (@DHMUSICART20)**, mula pada saat 152.27. Cut disesuaikan dengan beat sebenar lagu.

| # | Masa | Beat | Laju | Shot | Transition | Babak |
|---|---|---|---|---|---|---|
| 1 | 0:00.0–0:04.0 | 8 | 60% | SCREEN @1.0s · kad `intro_part2.png` | fadein | PEMBUKA |
| 2 | 0:04.0–0:08.9 | 10 | 70% | SCREEN @4.4s | cut | PENGANTIN DI SKRIN |
| 3 | 0:08.9–0:13.9 | 10 | 50% | SILAT @23.5s (dibingkai) | dissolve | BERSANDING |
| 4 | 0:13.9–0:15.8 | 4 | 100% | KOMPANG @9.2s | dissolve | SILAT |
| 5 | 0:15.8–0:19.8 | 8 | 60% | SILAT @0.0s | cut |  |
| 6 | 0:19.8–0:23.7 | 8 | 50% | SILAT @4.0s | cut |  |
| 7 | 0:23.7–0:25.7 | 4 | 100% | SILAT @7.0s | cut |  |
| 8 | 0:25.7–0:28.9 | 6 | 100% | SILAT @10.0s | cut |  |
| 9 | 0:28.9–0:31.8 | 6 | 100% | SILAT @14.0s | cut |  |
| 10 | 0:31.8–0:33.8 | 4 | 100% | SILAT @18.0s | cut |  |
| 11 | 0:33.8–0:36.8 | 6 | 70% | SILAT @21.0s · kad `next_part3.png` | cut |  |

### Part 3/3: "Tarian & Joget" (43.0s · 120.0 BPM)
*Part 3/3: persembahan tarian, kemudian joget lambak bersama tetamu. Ditutup dengan end card Selamat Pengantin Baru.*

Muzik: **Instrumental Melayu #8 (@DHMUSICART20)**, mula pada saat 1.63. Cut disesuaikan dengan beat sebenar lagu.

| # | Masa | Beat | Laju | Shot | Transition | Babak |
|---|---|---|---|---|---|---|
| 1 | 0:00.0–0:04.0 | 8 | 50% | DANCE @10.0s · kad `intro_part3.png` | fadein | PEMBUKA |
| 2 | 0:04.0–0:08.0 | 8 | 100% | DANCE @1.0s | cut | TARIAN |
| 3 | 0:08.0–0:11.0 | 6 | 50% | DANCE @17.8s | cut |  |
| 4 | 0:11.0–0:13.0 | 4 | 100% | DANCE @22.0s | cut |  |
| 5 | 0:13.0–0:16.0 | 6 | 60% | DANCE @29.5s | cut |  |
| 6 | 0:16.0–0:19.0 | 6 | 50% | DANCE @34.0s | cut |  |
| 7 | 0:19.0–0:22.0 | 6 | 60% | DANCE @41.6s | cut |  |
| 8 | 0:22.0–0:24.0 | 4 | 100% | DANCE @49.5s | cut |  |
| 9 | 0:24.0–0:26.0 | 4 | 100% | DANCE @55.5s | cut |  |
| 10 | 0:26.0–0:30.0 | 8 | 100% | HALL @0.3s | dissolve | JOGET LAMBAK |
| 11 | 0:30.0–0:33.0 | 6 | 100% | GUEST @0.0s | cut |  |
| 12 | 0:33.0–0:36.0 | 6 | 100% | HALL @10.0s | cut |  |
| 13 | 0:36.0–0:39.0 | 6 | 100% | GUEST @7.0s | cut |  |
| 14 | 0:39.0–0:43.0 | 8 | — | Hitam · kad `end_card.png` | dissolve |  |

### Filem penuh: "Marsya & Finn" (70.6s · 97.1 BPM)
*Filem penuh (bawah 1:30): highlight seluruh majlis mengikut susunan: perarakan, pengantin, kompang & pesilat, skrin & bersanding, silat, tarian, joget lambak, end card.*

Muzik: **Instrumental Melayu #7 (@DHMUSICART20)**, mula pada saat 4.78. Cut disesuaikan dengan beat sebenar lagu.

| # | Masa | Beat | Laju | Shot | Transition | Babak |
|---|---|---|---|---|---|---|
| 1 | 0:00.0–0:05.3 | 8 | 50% | PENGAPIT @0.0s · kad `intro_full.png` | fadein | PERARAKAN |
| 2 | 0:05.3–0:09.2 | 6 | 60% | PENGIRING @1.0s | cut |  |
| 3 | 0:09.2–0:11.7 | 4 | 60% | ARRIVE @0.2s | dissolve | PENGANTIN |
| 4 | 0:11.7–0:20.6 | 14 | 40% | HERO @0.2s | cut |  |
| 5 | 0:20.6–0:24.4 | 6 | 70% | PENGIRING @11.5s | cut | KELUARGA |
| 6 | 0:24.4–0:26.9 | 4 | 100% | KOMPANG @5.0s | cut | KOMPANG |
| 7 | 0:26.9–0:29.4 | 4 | 100% | KOMPANG @9.2s | cut | PESILAT |
| 8 | 0:29.4–0:33.1 | 6 | 70% | SCREEN @4.4s | dissolve | SKRIN |
| 9 | 0:33.1–0:38.2 | 8 | 50% | SILAT @23.5s (dibingkai) | cut | BERSANDING |
| 10 | 0:38.2–0:41.3 | 6 | 50% | SILAT @4.0s | dissolve | SILAT |
| 11 | 0:41.3–0:43.7 | 4 | 100% | SILAT @10.0s | cut |  |
| 12 | 0:43.7–0:46.2 | 4 | 70% | SILAT @19.8s | cut |  |
| 13 | 0:46.2–0:50.0 | 6 | 50% | DANCE @10.0s | dissolve | TARIAN |
| 14 | 0:50.0–0:53.7 | 6 | 50% | DANCE @17.8s | cut |  |
| 15 | 0:53.7–0:56.3 | 4 | 60% | DANCE @41.6s | cut |  |
| 16 | 0:56.3–0:58.6 | 4 | 100% | DANCE @49.5s | cut |  |
| 17 | 0:58.6–1:01.9 | 6 | 100% | HALL @0.3s | cut | JOGET LAMBAK |
| 18 | 1:01.9–1:05.7 | 6 | 100% | GUEST @7.0s | cut |  |
| 19 | 1:05.7–1:10.6 | 8 | — | Hitam · kad `end_card.png` | dissolve |  |

### Muzik: instrumental lagu Melayu (dibekalkan oleh pengguna)
Sumber: fail "Easy Listening !!! Kumpulan Musik Instrumen Melayu @DHMUSICART20.mp3" (kompilasi 13 lagu, 64.6 minit) dalam folder Drive.
- Part 1: lagu #7 (97 BPM) · Part 2: lagu #9 (122 BPM, mula lembut dan naik untuk silat) · Part 3: lagu #8 (120 BPM) · Filem penuh: lagu #7
- Lagu #5 dan #10 tidak digunakan kerana ada bahagian rosak (kosong) dalam fail.
- Fail audio disimpan dalam `music_local/` dan **tidak di-commit** ke repo, kerana muzik ini berhak cipta.
- Kekuatan bunyi dinormalkan ke -14 LUFS (standard Instagram/TikTok).
- Hak cipta: untuk Instagram, guna versi `_TANPA-MUZIK` dan tambah lagu dari library Instagram, atau terima risiko di-mute.
- Muzik CC0 sebelum ini (Wedding / Lullabies #5 / Street Lights) masih ada dalam `music/` sebagai sandaran.

## 6. Status & langkah seterusnya

1. Nama pengantin: **Marsya & Finn** ✓
2. Muzik instrumental Melayu disync ✓ (lagu #7 / #2 / #8 dari kompilasi @DHMUSICART20)
3. Siri 3 part bersambung + filem penuh (4 video), tiada shot ulangan, tiada had masa ✓
4. Preview 540p siap ✓ (`out/*_preview.mp4`, tidak di-commit kerana fail video)
5. **Menunggu:** kelulusan preview, atau senarai perubahan. Selepas itu baru render final 1080×1920.
6. (Pilihan) Klip tambahan: bersalaman, merenjis, pelamin yang dirakam terus.

## 7. Cara render (selepas lulus)

```bash
python3 make_lut.py                                      # jana LUT (sekali)
python3 make_titles.py                                   # jana kad tajuk (intro / bersambung / end card)
python3 render.py storyboard --src RAW --out storyboard  # still yang dah di-grade untuk setiap shot
python3 render.py preview --src RAW --out out --reel part1_berarak_masuk   # draf 540p dengan muzik
python3 render.py final   --src RAW --out out --full    # 1080x1920: 3 part + filem penuh (+ versi TANPA-MUZIK)
```
Muzik, tempo dan titik mula setiap reel disimpan dalam `reels.json`. Skrip mengesan beat sebenar lagu dan meletakkan setiap cut tepat pada beat (ketepatan bawah 1 frame). Untuk tukar lagu: `--music fail.mp3 --music-offset SAAT --bpm BPM`.
