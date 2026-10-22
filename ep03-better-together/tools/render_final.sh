#!/usr/bin/env bash
# Resumable FINAL render: short videos, then the YouTube cut in parts (joined).
# Usage: tools/render_final.sh OUT_DIR
set -u
OUT=$1; ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$OUT/youtube-parts"
for v in reels menu-1-pes-sup menu-2-red-velvet menu-3-siakap-stim menu-4-ubi-lambung bloopers; do
  f="$OUT/TastyTuesday-EP3-$v.mp4"
  [ -s "$f" ] && continue
  ( cd "$ROOT/videos/$v" && npx --prefix /home/user/tools hyperframes render -q high -f 25 --crf 18 -o "$f.tmp.mp4" > "$OUT/$v.log" 2>&1 ) \
    && mv "$f.tmp.mp4" "$f" && echo "FINAL $v" >> "$OUT/progress.log" || { echo "FAILED $v" >> "$OUT/progress.log"; exit 1; }
done
"$ROOT/tools/render_parts.sh" "$OUT/youtube-parts" high crf:20 || exit 1
mv -f "$OUT/youtube-parts/youtube-full.mp4" "$OUT/TastyTuesday-EP3-youtube-full.mp4" && \
mv -f "$OUT/youtube-parts/youtube-full-720p.mp4" "$OUT/TastyTuesday-EP3-youtube-full-720p.mp4" && echo "FINAL youtube-full" >> "$OUT/progress.log"
