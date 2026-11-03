#!/usr/bin/env bash
# Low-res preview renders (PREVIEW bug on). Final renders: drop --scale and set preview:false.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/preview
for id in "$@"; do
  npx remotion render "$id" "out/preview/$id.mp4" --scale=0.5 --concurrency=4 --crf=26 \
    --audio-bitrate=128k --log=error
done
