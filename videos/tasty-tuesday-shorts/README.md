# Shorts TikTok dari live masak (HyperFrames)

Empat video pendek (< 1 minit setiap satu, 1080x1920) yang dipotong daripada rakaman live TikTok
masak bersama keluarga (`VID_20261012_214059_551.mp4`, 87 minit). Caption untuk post: `captions-tiktok.md`.

| Short | Tempoh | Hook | Isi |
| --- | --- | --- | --- |
| `short-1-terung-seringgit` | 51.5s | "Terung hijau seringgit seikat?!" | Ikan bakar + terung bakar Mukmin, harga RM1, reveal pinggan |
| `short-2-diserang-kelkatu` | 30.9s | "Tiba-tiba diserang kelkatu!" | Momen lucu kelkatu masa live masak |
| `short-3-ikan-talang-garing` | 50.7s | "Ikan goreng garing tak hancur" | Tips Mak: deep fry minyak sikit, sambal asing, kulit crispy |
| `short-4-sambal-kurang-gula` | 41.0s | "Sambal sedap? Kurangkan gula!" | Tips sambal Mak: bawang 140°C, ibu sambal, gula kurang separuh |

## Struktur

- `edl/<short>.json` — senarai potongan (masa sumber dalam saat), caption yang dibetulkan, sticker/chip, hook dan end card.
- `tools/build.py` — jana projek HyperFrames untuk setiap short: potong & normalkan audio footage (-14 LUFS),
  padankan caption dengan timestamp perkataan Whisper, tulis `index.html` + `compositions/captions.html` + `compositions/graphics.html`.
- `shared/sfx` — SFX yang dijana dengan ffmpeg (whoosh, pop, ding, boom, riser, click, sparkle). `shared/vendor` — GSAP.
- `transcript/` — transkrip penuh (Whisper small) dan transkrip tepat bahagian terpilih (Whisper medium).
- `projects/<short>/` — projek HyperFrames yang siap untuk preview/render.

## Jana semula

Footage tidak disimpan dalam git. Muat turun video asal dari Drive, kemudian:

```bash
python3 tools/build.py --source /path/to/VID_20261012_214059_551.mp4 \
  --words transcript/words-small.jsonl --words transcript/words-medium-selected.jsonl
cd projects/short-1-terung-seringgit
npx hyperframes@0.8.168 check
npx hyperframes@0.8.168 preview                 # Studio
npx hyperframes@0.8.168 render --quality draft  # preview cepat
npx hyperframes@0.8.168 render --quality delivery  # fail final (selepas lulus)
```

Untuk ubah potongan atau caption, edit `edl/<short>.json` dan jalankan `tools/build.py` semula.
