# Music credits / licence

The beds used by the 1-minute Reels/Story clips (06–10) come from the Hugging Face dataset
[`mrfakename/cc0-music-captioned`](https://huggingface.co/datasets/mrfakename/cc0-music-captioned).
It is a collection of human-made instrumentals released under **CC0 1.0 (public domain)**, gathered partly from FreePD.
CC0 means they are free for commercial use, with no attribution and no copyright claims.

Each track was checked with Whisper for hidden vocals. Two "instrumental" tracks that turned out to have rap vocals were dropped.

| file | clip | source (shard / row) | dataset caption | edit |
|---|---|---|---|---|
| `cc0_rhodes_jazz.mp3` | 06 | 480 / 8 | "A chill, upbeat jazz track featuring a rhodes keyboard." | 0–61s |
| `cc0_lofi_80.mp3` | 07 | 241 / 5 | "A nostalgic, lo-fi hip-hop track with a chill, upbeat vibe." | 80 bpm, drop on the first cut |
| `cc0_jazzhop_80.mp3` | 08 | 438 / 4 | "A chill, upbeat hip-hop track with a jazz-inspired piano sample and a smooth flow." | 80 bpm, drop on the first cut |
| `cc0_groove_160.mp3` | 09 | 348 / 4 | "A groovy, chill jazz-inspired beat perfect for a relaxed yet lively atmosphere." | 170 → 160 bpm |
| `cc0_funk_guitar_100.mp3` | 10 | 192 / 5 | "A funky, upbeat instrumental track featuring guitar, bass, drums, and keyboards." | 99 → 100 bpm |

The source parquet file is `data/train-<shard>-of-00591.parquet`, and the row is the index within it.
All beds are normalised to −14 LUFS with true peak ≤ −1.2 dBTP (`scripts/prep_music.py`).
For 07–10, a cut every 6 s lands on a beat, within one frame.

`groove_92.wav` / `groove_104.wav` (clips 01–05) are procedural, made by `scripts/sound_design.py`, so they have no third-party rights.
