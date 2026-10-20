#!/usr/bin/env bash
# Draft PREVIEW renders (24fps, draft quality, downscaled to 540x960) for review.
# These are not the final deliverables — final render: `npx hyperframes render -q delivery` inside each short.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/previews"
for dir in "$ROOT"/shorts/*/; do
  slug="$(basename "$dir")"
  [ $# -gt 0 ] && [[ ! " $* " =~ " $slug " ]] && continue
  tmp="$ROOT/previews/.${slug}.full.mp4"
  (cd "$dir" && npx --yes hyperframes@0.8.181 render -q draft -f 24 -w 4 --quiet -o "$tmp" >/dev/null)
  ffmpeg -v error -y -i "$tmp" -vf scale=540:960 -c:v libx264 -preset veryfast -crf 26 -c:a aac -b:a 128k -movflags +faststart "$ROOT/previews/${slug}-PREVIEW.mp4"
  rm -f "$tmp"
  echo "preview: previews/${slug}-PREVIEW.mp4"
done
