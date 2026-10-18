# Tasty Tuesday: TikTok shorts from the pes asam pedas live

Six vertical (1080x1920, 30fps) shorts cut from the 74-minute live recording, built with
[HyperFrames](https://hyperframes.heygen.com). Status: **preview, waiting for approval**. No final render yet.

| # | Project | Hook (cold open) | Length | What happens |
|---|---|---|---|---|
| 1 | `01-pes-asam-pedas` | "Dua kilo, sepuluh kali makan." | 47.5s | Recipe: ingredients blended, what to tumis, cook until pecah minyak, 10 bekas, freezer tip |
| 2 | `02-dapur-gas` | "Anak aku tengok, eh boleh guna ke dapur kita ni?" | 50.7s | Live guest's story: a year after moving, didn't know the gas stove under the induction cooker still worked |
| 3 | `03-bunga-kantan` | "Tiga ringgit, dapat dua kuntum je bunga kantan." | 38.9s | NSK (one big bunch) vs Lotus's (RM3 = 2 stalks), buy in bulk, blend and freeze |
| 4 | `04-kaya-hutang` | "Haa, orang kaya lah hutang." | 30.1s | "Why don't you sell the paste?" "Dah kaya." Then: "Ya Allah, I owe you money." |
| 5 | `05-ikan-bakar` | "Dua orang makan, terkejut I boleh habis semua." | 35.2s | Ikan bakar Kuala Perlis order list; "wajib nasi baru puas" |
| 6 | `06-tips-thermomix` | "Kalau tumis lebih 120, boleh ke?" | 41.8s | Thermomix 120°C vs Varoma; slow cooker 150°C for 30 min, no kerak |

## Suggested TikTok captions

1. Pes asam pedas sekali buat, 10 kali makan 🌶️ Komen "NAK" untuk resepi penuh #asampedas #resepimudah #masakanmelayu #mealprep
2. Setahun pindah rumah… baru tahu dapur gas boleh guna 😭 #ceritalive #dapur #lawak #ibuibu
3. RM3 dapat 2 kuntum je bunga kantan?! Beli kat mana lagi murah? #bungakantan #jimatbelanja #tipsdapur
4. Orang kaya lah hutang 😂 #lawakmelayu #live #asampedas
5. Ikan bakar Kuala Perlis, 2 orang, licin 🐟 #ikanbakar #kualaperlis #makanmakan
6. Tumis lebih 120°C dalam Thermomix boleh ke? #thermomix #tipsmasak #slowcooker

## How it is built

- `transcript/`: full transcript of the live (Whisper large-v3-turbo, word timestamps)
- `specs/NN-*.json`: one edit spec per short: source ranges to keep (word-level, repeats and pauses cut),
  corrected Malay captions, overlays, zoom punches and SFX cues, all in **source** seconds.
  `specs/words.json` is the large-v3 re-transcription of the chosen ranges, used for caption timing.
- `tools/build_short.py`: turns a spec into a HyperFrames project:
  - `assets/selects.mp4`: just the needed source ranges, loudness-normalised to -14 LUFS (not in git)
  - `index.html`: the cut. Each kept range is its own `<video>` clip (`data-media-start` + `data-duration`),
    snapped to the 30fps grid, with an alternating punch-in on every jump cut, plus the SFX tracks
  - `compositions/captions.html`: kinetic captions, live-guest chat bubbles, speaker pill
  - `compositions/graphics.html`: hook title, labels, stats, stamps, lists, CTA, progress bar, series tag

Rebuild one short (needs the raw recording from Google Drive):

```bash
python3 tools/build_short.py specs/02-dapur-gas.json /path/to/raw.mp4 02-dapur-gas
cd 02-dapur-gas && npx hyperframes check
```

Change only captions or graphics without re-cutting media: add `--skip-media`.

Preview in Studio: `cd 02-dapur-gas && npx hyperframes preview`.
Final render (after approval): `npx hyperframes render -q high -o renders/02-dapur-gas.mp4`.

## Look

Chili red `#E2361B`, turmeric `#FFC93C`, cream `#FFF3E0`, deep-brown ink `#2B130B`.
Archivo Black (captions, titles) + Space Mono (labels, tags, numbers), both OFL and embedded locally.
SFX are from the HyperFrames media-use bundled library. There is no background music yet.

## Open points

- Captions are hand-corrected from ASR. Names and slang (e.g. "Cik Pia", "port") are worth a quick read.
- The NSK price for bunga kantan is not clear in the audio, so the card says "1 ikat, dapat selambak" with no number.
- Who is speaking is inferred from context (no diarisation). Lines marked "Tetamu live" are off-camera live guests.
