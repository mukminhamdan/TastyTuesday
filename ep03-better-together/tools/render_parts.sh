#!/usr/bin/env bash
# Resumable preview render of the YouTube cut in parts, then join.
# Usage: tools/render_parts.sh OUT_DIR P1.mp4 P2.mp4   (existing renders reused for parts 1-2)
set -u
OUT=$1; P1=$2; P2=$3
ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$OUT"
for k in 3 4 5 6 7; do
  f="$OUT/part-p$k.mp4"
  [ -s "$f" ] && continue
  ( cd "$ROOT/videos/youtube-full-p$k" && npx --prefix /home/user/tools hyperframes render -q draft -f 25 --video-bitrate 1200k -o "$f.tmp.mp4" > "$OUT/p$k.log" 2>&1 ) \
    && mv "$f.tmp.mp4" "$f" && echo "RENDERED p$k" >> "$OUT/progress.log" || { echo "FAILED p$k" >> "$OUT/progress.log"; exit 1; }
done
printf "file '%s'\n" "$P1" "$P2" "$OUT"/part-p3.mp4 "$OUT"/part-p4.mp4 "$OUT"/part-p5.mp4 "$OUT"/part-p6.mp4 "$OUT"/part-p7.mp4 > "$OUT/parts.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$OUT/parts.txt" -c copy -movflags +faststart "$OUT/PREVIEW-youtube-full.mp4" &&
ffmpeg -v error -y -i "$OUT/PREVIEW-youtube-full.mp4" -vf scale=1280:720 -c:v libx264 -preset veryfast -b:v 650k -maxrate 900k -bufsize 1800k \
  -c:a aac -b:a 96k -movflags +faststart "$OUT/PREVIEW-youtube-full-720p.mp4" && echo "JOINED ok" >> "$OUT/progress.log"
