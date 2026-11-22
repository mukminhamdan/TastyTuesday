# Pustaka muzik (CC0, instrumental)

Sumber: dataset Hugging Face `mrfakename/cc0-music-captioned` (CC0 1.0, tiada attribution diperlukan).

| Fail | Pilihan | Penerangan dataset | Mula disyorkan |
|---|---|---|---|
| `ukulele-ceria.mp3` | **A (lalai)** | "A positive instrumental tune featuring ukulele, guitar, and percussion." (~99 BPM) | 1s |
| `ukulele-iklan.mp3` | D | "Instrumental pop-folk track with a ukulele playing lead, suitable for advertising and summer themes." (~89 BPM) | 25s |
| `ukulele-riang.mp3` | 3 | "A lively instrumental piece featuring ukulele, guitar, and percussion." (167s) | 1s |
| `ukulele-folk.mp3` | 4 (W) | "A lively, instrumental folk piece featuring a ukulele and an acoustic guitar." (4 min; senyap 0-6s, 131-147s) | 8s, selamat hingga 130s |
| `ukulele-siul-tepuk.mp3` | 5 (X) | "A happy, uplifting instrumental track featuring ukulele, whistling, and claps." (53s) | 2s, **video ≤37s sahaja** |
| `ukulele-siulan.mp3` | 6 (Z) | "Positive instrumental tune featuring ukulele, whistling, and percussion" (2 min) | 15s, selamat hingga 118s |

Giliran antara video: **A → D → 3 → 4 → 5 → 6** (kemudian ulang). Lagu 5 hanya untuk video pendek (≤37s); kalau video lebih panjang, langkau ke 6. Lagu A ada break senyap 96–115s.

Untuk guna dalam Remotion, `scripts/get-music.py` muat turun versi WAV ke `public/music/`
(atau tukar terus: `ffmpeg -i assets/music-library/ukulele-ceria.mp3 public/music/ukulele-ceria.wav`).
