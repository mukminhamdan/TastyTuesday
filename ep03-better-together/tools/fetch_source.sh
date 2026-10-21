#!/usr/bin/env bash
# Download the raw live recording (Google Drive) to $TT_SOURCE (default /home/user/media/raw/source.mp4)
set -euo pipefail
DEST="${TT_SOURCE:-/home/user/media/raw/source.mp4}"
mkdir -p "$(dirname "$DEST")"
curl -sSL --retry 5 -C - -o "$DEST" \
  "https://drive.usercontent.google.com/download?id=1G1nzHok6uNQyW-3AYEjz2gAiHLJe_8Lc&export=download&confirm=t"
ls -la "$DEST"
