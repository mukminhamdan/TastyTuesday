#!/usr/bin/env bash
# Low-res preview renders (PREVIEW bug on). Final renders: drop --scale and set preview:false.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p out/preview
for id in "$@"; do
  npx remotion render "$id" "out/preview/$id.mp4" --scale=0.5 --concurrency=4 --crf=26 \
    --audio-bitrate=128k --log=error --timeout=120000 --props='{"lo":true}'
  rm -rf /tmp/remotion-webpack-bundle-* /tmp/remotion-v4*-assets* # bundles copy public/ (GBs)
done
