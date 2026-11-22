#!/usr/bin/env bash
# make-proxy.sh <proxy_dir> <raw.mp4> [...]
# 1080x1920 30fps H.264 proxies (rotation baked in, GOP 30 for fast seeking) with cleaned, normalised clip audio,
# hard-linked into public/footage (the Remotion bundler does not follow symlinks).
set -euo pipefail
dir=$1; shift; mkdir -p "$dir" public/footage
for f in "$@"; do
  b=$(basename "$f")
  ffmpeg -nostdin -v error -y -i "$f" -vf "scale=1080:1920,fps=30" -c:v libx264 -preset veryfast -crf 20 -g 30 \
    -pix_fmt yuv420p -af "highpass=f=90,afftdn=nr=14:nf=-40:tn=1,loudnorm=I=-15:TP=-1.5:LRA=11,alimiter=limit=0.89" \
    -c:a aac -b:a 192k -ar 48000 "$dir/$b"
  ln -f "$dir/$b" "public/footage/$b"
  echo "$b ok"
done
