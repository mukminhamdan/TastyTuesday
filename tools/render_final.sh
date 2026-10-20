#!/usr/bin/env bash
# FINAL renders: 1080x1920, 30fps, delivery quality -> renders/<slug>.mp4
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/renders"
for dir in "$ROOT"/shorts/*/; do
  slug="$(basename "$dir")"
  [ $# -gt 0 ] && [[ ! " $* " =~ " $slug " ]] && continue
  (cd "$dir" && npx --yes hyperframes@0.8.181 render -q delivery -f 30 -w 4 --quiet -o "$ROOT/renders/${slug}.mp4" >/dev/null)
  echo "final: renders/${slug}.mp4"
done
