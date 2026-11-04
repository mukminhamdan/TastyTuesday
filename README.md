# Prep Tasty Tuesday — short-form edits (Remotion)

Ten vertical videos (1080x1920, 30fps) cut from a 48-minute live of prepping ingredients for Tasty Tuesday.
The live was mostly quiet cooking with a little talking in between.

| id | idea | length |
|---|---|---|
| `01-sardin-roll-roti-biasa` | step-by-step sardine roll (hook: "Masak apa tu?") | ~41s |
| `02-tema-live-sardin-tuna` | talking clip: this evening's theme is sardines & tuna | ~40s |
| `03-satu-periuk-nasi` | portioning rice, timelapse, ends on the containers lined up | ~28s |
| `04-48-minit-dalam-30-saat` | the whole session, speed-ramped | ~32s |
| `05-dugong-ketawa-atas-sampan` | funny story about the "laughing dugong" | ~18s |
| `06-reels-story-1-minit` | 60s cinematic montage with quotes for IG Stories/Reels, CC0 jazz bed, fade transitions | ~60s |
| `07-reels-gulung-sampai-habis` | 60s quote montage: rolling sessions from across the live | 60s |
| `08-reels-senyum-di-dapur` | 60s quote montage: candid smiles and looks at the camera | 60s |
| `09-reels-satu-periuk-nasi` | 60s quote montage: rice, from the pot to the containers | 60s |
| `10-reels-5-bab-satu-dapur` | 60s, five chapters (Roti → Inti → Gulung → Food Engine Cooven → Nasi) with quotes | 60s |

## Pipeline

1. **Transcribe**: Whisper large-v3-turbo on a boosted and denoised mono mix gives word timestamps (`data/transcript.json`).
   ASR mistakes are fixed in `scripts/clip_specs.py` (`FIXES`, `OVERRIDES`).
2. **Face track**: OpenCV at 2fps (`scripts/face_track.py` → `data/faces.json`). Zooms are anchored on the face, and the hook and kinetic text are placed beside the face, never on it.
3. **Edit plan**: `python3 scripts/build_clips.py data/transcript.json data/faces.json` → `src/clips/*.json`
   - talk parts: dead air and awkward pauses are cut using word timestamps, immediate repeats are dropped, and every jump cut gets a punch-in
   - b-roll parts: timelapse/speed ramps with whip and zoom-blur transitions
4. **Remotion** (`src/`): grade + grain + vignette, word-by-word captions, motion graphics (hook, step chips, timelapse tag, kinetic words, photo snap, end card),
   music ducked under the voice (fast attack / slow release), SFX tied to every graphic and transition.

Type: **Archivo** (variable, expanded width) + **Instrument Serif Italic** accents + **JetBrains Mono** labels.
Safe zone (TikTok + IG): top 230px, bottom 420px, right 150px are kept clear (`SAFE` in `src/lib/theme.ts`).

## Setup

```bash
npm i
pip install faster-whisper scipy opencv-python-headless==4.10.0.84
python3 scripts/sound_design.py public            # SFX + music beds
# put the source video at public/source.mp4, then make the cleaned voice track:
ffmpeg -i public/source.mp4 -vn -af "highpass=f=80,afftdn=nf=-32:nr=10,equalizer=f=250:t=q:w=1:g=-2,equalizer=f=3500:t=q:w=1.2:g=3,dynaudnorm=f=300:g=21:p=0.85:m=25,acompressor=threshold=-18dB:ratio=3:attack=6:release=120:makeup=2,alimiter=limit=0.92" -ac 1 -ar 48000 public/voice_clean.wav
```

- Studio: `npm run studio`
- Preview renders (540x960): `npm run preview` (or `node scripts/render-previews.mjs 01`)
- Final: `npx remotion render src/index.ts <id> out/final/<id>.mp4 --crf=16`

## Sound

**Clips 06–10:** CC0 (public-domain) instrumentals from Hugging Face `mrfakename/cc0-music-captioned`. They are cut, beat-aligned and normalised by
`scripts/prep_music.py`, and the result is committed as `public/music/cc0_*.mp3`. Sources and licence are in `public/music/CREDITS.md`.
In 07–10 every 6-second cut lands on a beat.

**Clips 01–05:** the build machine can't reach the stock SFX/music libraries, so the SFX and the two talking-clip music beds in `public/` were made procedurally
(`scripts/sound_design.py`). To use library sounds (Artlist, Epidemic, etc.), drop files with the **same names** into `public/sfx/` and `public/music/`.
