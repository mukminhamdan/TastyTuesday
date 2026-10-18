---
workflow: general-video
flow: automation
storyboard: no
message: "Setahun Tak Tahu Dapur Gas Boleh Guna"
destination: tiktok
aspect: 1080x1920
language: ms
length: under-2min
---

## Intent

One of 6 TikTok shorts cut from the Tasty Tuesday live (pes asam pedas session, 74 min).
User brief (verbatim): "Edit video ni menggunakan Hyperframes. Transcribe dulu so kau tahu mana nak letak
animation, motion graphics, sound fx dekat mana yang patut. Buang yg repeatable, awkward pauses, cari hook
yang kuat dan moment yang boleh menarik audience. Buat lebih kurang 5-6 video yang sesuai untuk di post di
tiktok kurang 2 minit. Jangan render dulu final file. Preview dulu."

Hook (cold open): "Anak aku tengok," with title card "Setahun pindah / tak tahu dapur gas / boleh guna".

## Assets

- assets/selects.mp4: loudness-normalised (-14 LUFS) selects pulled from the raw live recording (not in git; rebuild with tools/build_short.py)
- assets/sfx/: bundled HyperFrames media-use SFX library

## Customizations

- Word-level jump cuts: repeats, false starts and pauses removed; alternating punch-in zoom on every cut
- Kinetic captions (active word highlight), live-guest chat bubbles and "TETAMU LIVE" speaker pill
- Motion graphics: hook slam title, labels, stat count-ups, stamps, lists/steps, end CTA, progress bar
- SFX on hook, pops, impacts, risers and chimes

## Notes

- Generated from ../specs/02-dapur-gas.json by ../tools/build_short.py; edit the spec and rebuild rather than hand-editing HTML.
- No background music: the HeyGen BGM catalog needs a sign-in; ask before adding one.
