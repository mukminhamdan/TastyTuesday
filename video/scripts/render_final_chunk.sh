#!/usr/bin/env bash
# Final Full-YouTube in muted frame chunks (each job < 2h). Usage: render_final_chunk.sh a-b [c-d ...]
cd "$(dirname "$0")/.." || exit 1
mkdir -p out/final/chunks
for r in "$@"; do
  s=$(date +%s); a=${r%-*}; b=${r#*-}
  npx remotion render Full-YouTube "out/final/chunks/full_$(printf %06d $a).mp4" --frames=$a-$b --muted \
    --concurrency=4 --crf=18 --log=error --timeout=180000 --props='{"preview":false}' > "out/final/render_full_$a.log" 2>&1
  echo "CHUNK $r exit=$? $(( $(date +%s)-s ))s" >> out/final/final.log
  rm -rf /tmp/remotion-webpack-bundle-* /tmp/remotion-v4*-assets*
done
echo "BATCH FINISHED" >> out/final/final.log
