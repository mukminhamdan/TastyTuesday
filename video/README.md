# Tasty Tuesday — Edisi Tuna & Sardin (Remotion)

6 videos edited from the 64-minute live cooking session:

| Composition | Format | Content |
| --- | --- | --- |
| `Full-YouTube` | 1920×1080 | Full episode, 5 chapters |
| `Short-1-SardinRoll` | 1080×1920 | Mukmin · Mode Deep Fry |
| `Short-2-TortillaTuna` | 1080×1920 | Kak Hani · Mode Grill |
| `Short-3-SardinPuff` | 1080×1920 | Kak Salma · Mode Oven |
| `Short-4-SambalSardin` | 1080×1920 | Mak Ida · Mode Cooker |
| `Short-5-PizzaTuna` | 1080×1920 | Kak Pia · Mode Pizza |

## Pipeline

1. Whisper (large-v3-turbo, Malay) word-level transcript of the source.
2. `scripts/edit_spec.py` — hand-picked edit decision list (hooks, beats, overlays) in source seconds.
3. `scripts/build.py` — removes pauses (adaptive audio threshold), snaps captions to words, fixes
   Malay transcription errors, auto-reframes on faces (YuNet), places SFX, builds ducked music beds.
   Writes `src/data/*.json` and `public/music/*.wav`.
4. Remotion renders. Captions and graphics stay inside the TikTok/Reels safe area
   (x 70–940, y 230–1490) and move away from detected faces.

`public/media/proxy.mp4` (cropped, sharpened 1080×2808 proxy of source 1040s–3420s) and
`public/media/voice.wav` (cleaned voice: HPF, denoise, compression, −16 LUFS) are generated
locally and not committed.

## Assets & licences
- SFX: wyzowl/sfx-kit (CC0) — `public/sfx`
- Music: CC0 instrumental tracks (mrfakename/cc0-music-captioned, FreePD et al.)
- Fonts (OFL, Google Fonts): Unbounded, Instrument Serif, Bricolage Grotesque, Archivo

## Render
```
npx remotion render Short-1-SardinRoll out/short1.mp4 --props='{"preview":false}'
```
Preview renders use `--scale=0.5` with the PREVIEW bug on.
