# TastyTuesday — Dapur Acik Sal

Short-form edits of Makcik's TikTok Live cooking session (*Ikan Parang Masak Lemak Cili Padi + Jantung Pisang*,
source `VID_20261021_234942_070.mp4`, 51 min), built with [HyperFrames](https://hyperframes.heygen.com).

| Project | What it is |
| --- | --- |
| `edits/01-ikan-parang-masak-lemak` | Full recipe in under 90 s: 5 steps, 2 tips, tasting |
| `edits/02-cuci-ikan-guna-oka` | Tip: cleaning fish with the *oka* food detoxifier (the slime reveal) |
| `edits/03-hack-jus-limau` | Hack: blend limes instead of squeezing ("dua minit... eh, dua saat!") |
| `edits/04-bloopers-dapur-makcik` | Bloopers: banjir, garam x2, rebung, nasi lupa masak, "Mumin, are you there?" |
| `edits/05-terung-hijau-bakar` | First-time grilled green brinjal from Kuala Perlis |
| `edits/06-rahsia-masak-lemak` | Santan kayu api + why asam limau can split the gravy |

`edits/transcript.{txt,json}` is the full word-level transcript (Whisper large-v3-turbo, Malay);
`edits/vad.json` holds the speech spans used to cut pauses.

## Rebuild a project

```bash
# needs the source video, ffmpeg and the hyperframes CLI
python3 tools/build_project.py edits/01-ikan-parang-masak-lemak --src /path/to/VID_20261021_234942_070.mp4
tools/grade.sh edits/01-ikan-parang-masak-lemak      # colour grade (re-run after every rebuild)
cd edits/01-ikan-parang-masak-lemak && npx hyperframes preview   # Studio preview
```

Each project's `edl.json` is the edit: source ranges with corrected captions, overlay cards, joke punches,
shakes and sound effects. `build_project.py` turns it into `index.html` + `compositions/` and cuts
`assets/selects.mp4` (upscaled, voice cleaned, loudness-normalised). Pauses longer than 0.5 s inside a
range are removed automatically. The live was recorded mirrored, so the cut flips it back (`hflip`). Music beds in `assets/bgm/` were generated locally with MusicGen.
