"""Cut, beat-align and loudness-normalise the CC0 music beds for the 1-minute Reels/Story clips (06-10).

Source: Hugging Face dataset `mrfakename/cc0-music-captioned` (CC0 1.0, human-made instrumentals,
no attribution required). Tracks are named s<shard>_<row>.wav (shard file train-<shard>-of-00591.parquet, row <row>).

Usage: python3 scripts/prep_music.py <dir-with-source-wavs> public/music

Each bed: start = anchor - 6*speed, so the anchor beat (usually the drop) lands at 6.0s,
the first cut in clips 07-10. 07-10 cut every 6s = a whole number of beats (07-09: whole bars).
"""
import subprocess, sys, json, os

FPS_LEN = 61.0  # seconds of output (clips are 60s)
TARGET_LUFS, TP = -14.0, -1.5

BEDS = {
    # name: (source, anchor beat (orig seconds), speed, anchor lands at (clip s), note)
    "cc0_rhodes_jazz": ("s480_8.wav", 0.0, 1.0, 0.0, "chill upbeat jazz, rhodes - 170bpm"),
    "cc0_lofi_80": ("s241_5.wav", 12.037, 1.0, 6.0, "nostalgic lo-fi hip-hop - 80bpm, drop on first cut"),
    "cc0_jazzhop_80": ("s438_4.wav", 12.037, 1.0, 6.0, "chill jazz-piano hip-hop - 80bpm, drop on first cut"),
    "cc0_groove_160": ("s348_4.wav", 21.205, 160 / 169.99, 6.0, "groovy chill jazz - 170 -> 160bpm (6s = 4 bars)"),
    "cc0_funk_guitar_100": ("s192_5.wav", 0.035, 100 / 99.0, 0.0, "funky upbeat guitar/bass/keys - 99 -> 100bpm (6s = 10 beats)"),
}


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def main(src_dir, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    for name, (src, anchor, speed, at, note) in BEDS.items():
        start = max(0.0, anchor - at * speed)
        pre = (f"atrim=start={start:.3f}:duration={FPS_LEN * speed + 0.5:.3f},asetpts=PTS-STARTPTS,"
               f"atempo={speed:.5f},atrim=duration={FPS_LEN},afade=t=in:d=0.03")
        inp = os.path.join(src_dir, src)
        # two-pass loudnorm
        r = run(["ffmpeg", "-hide_banner", "-i", inp, "-af", pre + f",loudnorm=I={TARGET_LUFS}:TP={TP}:LRA=11:print_format=json", "-f", "null", "-"])
        m = json.loads(r.stderr[r.stderr.rindex("{"):])
        ln = (f"loudnorm=I={TARGET_LUFS}:TP={TP}:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
              f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
        out = os.path.join(out_dir, f"{name}.mp3")
        run(["ffmpeg", "-hide_banner", "-y", "-i", inp, "-af", pre + "," + ln + ",aresample=48000", "-ac", "2", "-c:a", "libmp3lame", "-b:a", "256k", out])
        print(f"{out}: {src} start={start:.3f}s speed={speed:.4f} ({note})")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
