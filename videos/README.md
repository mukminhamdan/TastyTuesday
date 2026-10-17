# Tasty Tuesday — video edits (HyperFrames)

Source: 26.5-minute vertical recording of the Tasty Tuesday live (720×1280, four Cooven cooks plus the host).
Two edits are built from it:

| Project | Length | What it is |
|---|---|---|
| `reel/` | ~86 s | Short-form cut: pizza hook, teaser, the four menus, outro. |
| `padat/` | ~12 min | Long cut that keeps every menu's steps, tips and tasting, with waiting, mute/unmute chatter, repeats and long promos taken out. Each menu's result is moved right after its cooking. |

## How an edit is built

1. `transcript/source_transcript.json` holds the speech segments (`transcript/transcript.md` is the readable version).
2. `plans/reel.json` and `plans/padat.src.json` list the kept source ranges in playback order, with framing, captions, graphics and SFX.
   `padat.src.json` is range-level; `tools/ranges_to_plan.py` expands it to `plans/padat.json`, splitting each range at pauses longer than 0.6 s.
3. `tools/build.py` compiles a plan into a HyperFrames project: `index.html` (cuts, camera moves, SFX), `compositions/graphics.html` (hook, menu cards, chips, flashes, outro) and `compositions/captions.html` (one caption track). It also writes `edl.json`.

Framing per clip:

- **tight** zooms into the clean area, left of the live app's guest thumbnails.
- **wide** keeps the full width and covers the guest strip with a blurred mirror of the picture next to it.
- **flip** mirrors the front-camera shots (Mukmin, and Chef Hani's tasting) so the "cooven" logo reads correctly.

```bash
# rebuild after editing a plan (needs numpy + soundfile, and a 16 kHz mono WAV of the source)
python3 tools/ranges_to_plan.py plans/padat.src.json transcript/source_transcript.json plans/padat.json
python3 tools/build.py plans/padat.json padat --audio audio16k.wav
cd padat && npx hyperframes check && npx hyperframes preview
```

The source footage (`assets/source.mp4`, `assets/source_audio.m4a`) is not in git. To restore it, put the original MP4 at `<project>/assets/source.mp4`, then run `ffmpeg -i assets/source.mp4 -vn -c:a copy assets/source_audio.m4a`.

SFX come from the HyperFrames media-use library (Pixabay Content License). GSAP is vendored in `assets/vendor/`.
