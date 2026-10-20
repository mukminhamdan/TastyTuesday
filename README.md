# TastyTuesday

Short-form edits of the Tasty Tuesday live cook-along call, built with
[HyperFrames](https://hyperframes.heygen.com) (HTML → video).

## Layout

| Path | What |
| --- | --- |
| `edits/transcript.jsonl` | Full word-level transcript of the 93-min source (Whisper large-v3-turbo) |
| `edits/refined.jsonl` | Second-pass transcript (large-v3, beam 5) of the windows used in the shorts |
| `edits/shorts.json` | Edit decision lists — one entry per short, all times in **source seconds** |
| `EDIT_NOTES.md` | Human-readable plan: hook, tips, jokes, SFX per short |
| `shorts/<slug>/` | One HyperFrames project per short (`index.html` = the composition) |
| `shared/` | SFX library + vendored GSAP shared by every short |
| `tools/` | Transcription, project generator, preview renderer |

## Rebuild

```bash
# source recording (not in git): /home/user/src/video.mp4 or TT_SOURCE=/path/to/video.mp4
python3 tools/build_shorts.py            # all shorts (extracts footage proxies on first run)
python3 tools/build_shorts.py 03-rahsia-kuah-rojak
```

`build_shorts.py` reads each EDL, cuts silences longer than 0.65s inside every kept
segment (jump cuts with an alternating punch-in), maps source time → short time,
and writes the composition: footage clips, karaoke captions, hook title, tip cards,
stat pops, joke stickers with punch-in zooms, SFX and an end card.

## Preview / render

```bash
cd shorts/01-lempeng-garing
npx hyperframes preview                  # Studio: edit/trim visually
tools/render_previews.sh                 # low-res draft previews into previews/
npx hyperframes render -q delivery       # FINAL render (only after approval)
```
