# Tasty Tuesday · Episod 3 · Better Together (Cooven × Thermomix)

Suntingan rakaman live (92 min, 640×1280) menjadi 7 video, dibina dengan [HyperFrames](https://hyperframes.heygen.com).

| Video | Format | Projek |
|---|---|---|
| YouTube — sesi penuh (disunting) | 1920×1080 | `videos/youtube-full/` |
| Reels rumusan (< 2 min) | 1080×1920 | `videos/reels/` |
| Menu 1 · Pes Sup (Kak Salma) | 1080×1920 | `videos/menu-1-pes-sup/` |
| Menu 2 · Red Velvet Cupcake | 1080×1920 | `videos/menu-2-red-velvet/` |
| Menu 3 · Ikan Siakap Stim (Ida) | 1080×1920 | `videos/menu-3-siakap-stim/` |
| Menu 4 · Ubi Lambung (Mukmin) | 1080×1920 | `videos/menu-4-ubi-lambung/` |
| Blooper | 1080×1920 | `videos/bloopers/` |

## Struktur

- `data/transcript.json` — transkrip Bahasa Melayu (Whisper large-v3-turbo, timestamp per perkataan)
- `data/transcript.txt` — transkrip boleh baca
- `data/corrections.json` — pembetulan ejaan (Kuven → Cooven, dll.) untuk caption
- `edits/*.json` — EDL setiap video: potongan sumber, tindanan (hook, tip, menu, lawak, CTA), SFX
- `tools/build.py` — jana projek HyperFrames daripada EDL (potong senyap automatik, caption karaoke, kad motion graphics, SFX, muzik latar)
- `tools/synth_audio.py` — sintesis SFX tambahan (ding, boing, ba-dum-tss) + muzik latar
- `videos/<id>/` — projek HyperFrames (index.html + compositions/), `CUTLIST.md`, dan sidecar `.srt`

## Cara guna

```bash
tools/fetch_source.sh                       # muat turun rakaman asal (1.6 GB) → /home/user/media/raw/source.mp4
python3 tools/build.py edits/*.json         # jana semua projek
cd videos/reels && npx hyperframes preview  # Studio preview
npx hyperframes render -o reels.mp4         # render akhir (selepas lulus preview)
```

Fail video sumber tidak disimpan dalam git; `videos/*/assets/source.mp4` ialah symlink ke `$TT_SOURCE`.
