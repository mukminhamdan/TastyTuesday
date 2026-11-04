# TastyTuesday

Short-form (TikTok / IG Reels) edits built with [Remotion](https://remotion.dev).

## Episode: Ikan talang sambal hitam — 1 periuk (Cooven Food Engine)

~30s cooking-only vertical cut (1080x1920, 30fps) from a 32-minute live recording: 7 step cards (Aircrisp fish → ketepikan → minyak → ibu sambal → jintan putih → kicap → gaul), VO only over food.

### Pipeline

1. **Transcribe** – `scripts/transcribe.py` (faster-whisper `large-v3-turbo`, Malay, word timestamps) → `src/data/transcript.json`
2. **Cut** – `scripts/build.py` holds the edit decision list (hook, recipe, montage, features, payoff, CTA). It:
   - cuts 1080x1920 proxies for every shot into `public/clips/` (speed ramps baked in)
   - removes dead air / repeats, cleans + levels the voice (HPF, denoise, EQ, compression, loudnorm −15 LUFS) → `public/media/voice.wav`
   - writes `src/data/timeline.json` (shots, voice windows, hand-corrected word-timed captions)
3. **Creative layer** – `src/data/edit.ts`: motion graphics + sound design, anchored to beats / spoken words.
4. **Render** – Remotion composition `TastyTuesday` (`TastyTuesdaySafeZone` shows the TikTok + IG safe-zone guide).

```bash
npm install
python3 scripts/build.py <raw.mp4> src/data/transcript.json .   # regenerates public/clips + voice.wav
npm run studio                                                    # live preview
npx remotion render TastyTuesday out/final.mp4                    # final render
```

In sandboxes without Remotion's Chrome download host, set `REMOTION_BROWSER` to a local `chrome-headless-shell`.

### Rules followed

- **Safe zone** (TikTok ∩ IG Reels): content kept inside x 60–930, y 250–1440 (`src/theme.ts`).
- **Face**: graphics live in the wall band above the face or the left column on talking shots; captions are single-line under the chin; talking-shot zooms anchor on the face.
- **Music ducking**: bed sits ~18–20 dB under the voice while talking, lifts during montages.

### Audio credits (all CC0 / public domain)

- Music: HoliznaCC0 – *Sunny Afternoon* (CC0, via Free Music Archive / SoundSafari CC0-1.0-Music)
- SFX: SFXMint CC0 Sound Effects (`flreey/sfxmint-cc0-sound-effects`)
