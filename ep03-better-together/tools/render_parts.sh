#!/usr/bin/env bash
# Resumable render of the YouTube cut in parts (edits/parts -> videos/youtube-full-pN), then join.
# Usage: tools/render_parts.sh OUT_DIR [draft|standard|high] [bitrate]
# A part already rendered as OUT_DIR/part-pN.mp4 is skipped, so a restarted run picks up where it stopped.
set -u
OUT=$1; Q=${2:-draft}; BR=${3:-1200k}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$OUT"
N=$(ls -d "$ROOT"/videos/youtube-full-p* | wc -l)
for k in $(seq 1 "$N"); do
  f="$OUT/part-p$k.mp4"
  [ -s "$f" ] && continue
  ( cd "$ROOT/videos/youtube-full-p$k" && npx --prefix /home/user/tools hyperframes render -q "$Q" -f 25 $( [ "${BR#crf:}" != "$BR" ] && echo --crf "${BR#crf:}" || echo --video-bitrate "$BR") -o "$f.tmp.mp4" > "$OUT/p$k.log" 2>&1 ) \
    && mv "$f.tmp.mp4" "$f" && echo "RENDERED p$k" >> "$OUT/progress.log" || { echo "FAILED p$k" >> "$OUT/progress.log"; exit 1; }
done
for k in $(seq 1 "$N"); do echo "file '$OUT/part-p$k.mp4'"; done > "$OUT/parts.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$OUT/parts.txt" -c copy -movflags +faststart "$OUT/youtube-full.mp4" &&
ffmpeg -v error -y -i "$OUT/youtube-full.mp4" -vf scale=1280:720 -c:v libx264 -preset veryfast -b:v 650k -maxrate 900k -bufsize 1800k \
  -c:a aac -b:a 96k -movflags +faststart "$OUT/youtube-full-720p.mp4" && echo "JOINED ok" >> "$OUT/progress.log"
