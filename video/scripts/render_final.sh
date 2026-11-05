#!/usr/bin/env bash
# Final full-resolution renders (no PREVIEW bug, hi-res proxy). Log: out/final/final.log
cd "$(dirname "$0")/.." || exit 1
OUT=${OUT:-out/final}
mkdir -p "$OUT"
for id in "$@"; do
  s=$(date +%s)
  npx remotion render "$id" "$OUT/$id.mp4" --concurrency=4 --crf=18 --audio-bitrate=320k \
    --log=error --timeout=180000 --props='{"preview":false}' > "$OUT/render_$id.log" 2>&1
  echo "DONE $id exit=$? $(( $(date +%s)-s ))s" >> "$OUT/final.log"
  rm -rf /tmp/remotion-webpack-bundle-* /tmp/remotion-v4*-assets*
done
echo "BATCH FINISHED" >> "$OUT/final.log"
