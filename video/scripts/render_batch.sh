#!/usr/bin/env bash
# Sequential preview renders with a progress log (out/render.log).
cd "$(dirname "$0")/.." || exit 1
: > out/render.log
for id in "$@"; do
  s=$(date +%s)
  ./scripts/render_previews.sh "$id" > "out/render_$id.log" 2>&1
  echo "DONE $id exit=$? $(( $(date +%s)-s ))s" >> out/render.log
done
echo "BATCH FINISHED" >> out/render.log
