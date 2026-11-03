#!/usr/bin/env bash
# Render one frame range of the full YouTube preview (muted) — keeps each job short.
set -euo pipefail
cd "$(dirname "$0")/.."
a=$1; b=$2
npx remotion render Full-YouTube "out/chunks/full_${a}.mp4" --frames=${a}-${b} --muted --scale=0.5 \
  --concurrency=4 --crf=26 --log=error --timeout=120000 --props='{"lo":true}'
echo "CHUNK ${a}-${b} DONE" >> out/render.log
