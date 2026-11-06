#!/usr/bin/env bash
# 4K (2160x3840) finals for the v2 shorts: muted picture in chunks at --scale=2, then the
# already-final audio from out/final_v3 is muxed back on. Usage: render_4k.sh <id> [...]
cd "$(dirname "$0")/.." || exit 1
OUT=out/final_4k; mkdir -p "$OUT/chunks"; LOG="$OUT/final.log"
STEP=450
for id in "$@"; do
  n=$(npx remotion compositions --log=error 2>/dev/null | awk -v id="$id" '$1==id{print $4}')
  rm -rf /tmp/remotion-webpack-bundle-* /tmp/remotion-v4*-assets*
  : > "$OUT/chunks/$id.txt"
  for ((a=0; a<n; a+=STEP)); do
    b=$((a+STEP-1)); ((b>=n)) && b=$((n-1))
    c="$OUT/chunks/${id}_$(printf %05d $a).mp4"; s=$(date +%s)
    if [ ! -s "$c" ]; then
      npx remotion render "$id" "$c" --frames=$a-$b --muted --scale=2 --jpeg-quality=95 --concurrency=4 \
        --crf=16 --log=error --timeout=240000 --props='{"preview":false}' > "$OUT/render_${id}_$a.log" 2>&1
      echo "CHUNK $id $a-$b exit=$? $(( $(date +%s)-s ))s" >> "$LOG"
      rm -rf /tmp/remotion-webpack-bundle-* /tmp/remotion-v4*-assets*
    fi
    echo "file '$(basename "$c")'" >> "$OUT/chunks/$id.txt"
  done
  ffmpeg -v error -y -f concat -safe 0 -i "$OUT/chunks/$id.txt" -i "out/final_v3/$id.mp4" \
    -map 0:v -map 1:a -c copy -movflags +faststart -shortest "$OUT/$id.mp4"
  echo "DONE $id exit=$?" >> "$LOG"
done
echo "BATCH FINISHED" >> "$LOG"
