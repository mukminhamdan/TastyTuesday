#!/usr/bin/env bash
# Rebuild every short from shorts/specs: fetch the live (if missing), extract the
# 16k audio used to snap cuts to silence, then cut media + write each index.html.
set -euo pipefail
cd "$(dirname "$0")/.."
DRIVE_ID="14bqHsCfScSWV2OSewatSGhr5YCAfOMHP"
mkdir -p source
if [ ! -f source/live.mp4 ]; then
  curl -sSL -o source/live.mp4 "https://drive.usercontent.google.com/download?id=${DRIVE_ID}&export=download&confirm=t"
fi
if [ ! -f source/audio16k.wav ]; then
  ffmpeg -v error -y -i source/live.mp4 -vn -ac 1 -ar 16000 source/audio16k.wav
fi
export TT_SOURCE="$PWD/source/live.mp4" TT_AUDIO="$PWD/source/audio16k.wav"
for spec in shorts/specs/*.json; do
  python3 tools/build_short.py "$spec"
done
