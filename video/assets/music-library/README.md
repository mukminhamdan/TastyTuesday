# Pustaka muzik (CC0, instrumental)

Sumber: dataset Hugging Face `mrfakename/cc0-music-captioned` (CC0 1.0, tiada attribution diperlukan).

| Fail | Pilihan | Penerangan dataset | Mula disyorkan |
|---|---|---|---|
| `ukulele-ceria.mp3` | **A (lalai)** | "A positive instrumental tune featuring ukulele, guitar, and percussion." (~99 BPM) | 1s |
| `ukulele-iklan.mp3` | D | "Instrumental pop-folk track with a ukulele playing lead, suitable for advertising and summer themes." (~89 BPM) | 25s |
| `ukulele-riang.mp3` | 3 | "A lively instrumental piece featuring ukulele, guitar, and percussion." (167s) | 1s |
| `ukulele-loceng.mp3` | 4 | "A joyful and uplifting instrumental piece featuring ukulele, guitar, and glockenspiel." (~89 BPM, 130s) | 1s |

Giliran antara video: **A → D → 3 → 4** (kemudian ulang). Lagu A ada break senyap 96–115s.

Untuk guna dalam Remotion, `scripts/get-music.py` muat turun versi WAV ke `public/music/`
(atau tukar terus: `ffmpeg -i assets/music-library/ukulele-ceria.mp3 public/music/ukulele-ceria.wav`).
