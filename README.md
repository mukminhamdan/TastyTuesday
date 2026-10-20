# TastyTuesday

Short-form edits cut from TikTok lives, built with [HyperFrames](https://hyperframes.heygen.com).

- `EDIT_PLAN.md` — the clip list, hooks, what was cut and why.
- `shorts/specs/*.json` — one spec per short (source ranges, hook, tips, stickers, SFX, caption fixes).
- `shorts/<id>/` — the generated HyperFrames project for each short.
- `tools/build_all.sh` — fetch the live, cut media, regenerate every composition.
- `transcript/` — full word-level transcript of the live.
