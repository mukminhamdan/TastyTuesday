# Tasty Tuesday shorts

Six sub-60s vertical shorts cut from the week-1 Tasty Tuesday live call (71 min),
one per chef/menu, built with [HyperFrames](https://hyperframes.heygen.com).

| Video | Chef | Cooven mode | Length |
|---|---|---|---|
| `videos/kentang` | Kak Ida | Air Crisp 205°C 30 min | 50.7 s |
| `videos/keledek` | Mukmin | Oven 180°C → 200°C | 52.3 s |
| `videos/ikan-bakar` | Kak Salma | Grill High 10 min + Broil 3 min | 53.1 s |
| `videos/puff-pastry` | Intan Safia | Oven 180°C 10 min | 55.7 s |
| `videos/corndog` | Zura | Deep Fry 1 min | 55.4 s |
| `videos/ikan-bilis` | Kak Hani | Air Crisp 200°C 5 min | 51.5 s |

## How it fits together

- `specs/*.mjs` — the edit decisions per video: raw-time cuts, hook text, tip cards,
  stat chips, stickers, outro, caption fixes. **Edit these, not the generated HTML.**
- `transcripts/*.json` — word-level Whisper (large-v3-turbo, Malay) transcripts of
  the source ranges, `[start, end, word]` in seconds of the raw recording.
- `build.mjs` — turns each spec into a standalone HyperFrames project in `videos/<id>/`.
- `cut-clips.mjs` — cuts each spec's footage proxy (`videos/<id>/assets/clip.mp4`,
  git-ignored) from the raw recording.
- `shared/` — styles, SFX (Pixabay licence, see `shared/assets/sfx/CREDITS.md`) and vendored GSAP.

```bash
node cut-clips.mjs /path/to/raw.mp4      # once, or after changing spec.proxy
node build.mjs                            # regenerate all six projects
cd videos/kentang
npx hyperframes@0.8.174 preview           # review in Studio
npx hyperframes@0.8.174 render --quality draft -o draft.mp4
```

Final renders: `npx hyperframes@0.8.174 render --quality delivery --fps 30`, then a two-pass
`loudnorm` to -14 LUFS (video stream copied). Output goes to `renders/` (git-ignored).
