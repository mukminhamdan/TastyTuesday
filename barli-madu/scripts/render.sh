#!/usr/bin/env bash
# Usage: scripts/render.sh preview|final
# preview: 720x1280 from proxies. final: 1080x1920 from the raw clips.
set -euo pipefail
cd "$(dirname "$0")/.."
mode=${1:-preview}
python3 -I scripts/build_edit.py .
if [ "$mode" = final ]; then
  npx remotion render BarliMadu out/final_raw.mp4 --props='{"proxy":false}' --crf=16 --concurrency=4
  in=out/final_raw.mp4; out=out/final.mp4
else
  npx remotion render BarliMadu out/preview_raw.mp4 --props='{"proxy":true}' --scale=0.6667 --crf=23 --concurrency=4
  in=out/preview_raw.mp4; out=out/preview.mp4
fi
# Two-pass loudness normalisation to -14 LUFS (TikTok / Reels level).
m=$(ffmpeg -hide_banner -i "$in" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p' |
  python3 -c "import json,sys;d=json.load(sys.stdin);print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
ffmpeg -y -v error -i "$in" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11:$m:linear=true" -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$out"
echo "wrote $out"
