#!/usr/bin/env bash
# contact-sheet.sh <clip.mp4> <out.jpg> <every_seconds> <cols>x<rows> [start] [duration] [crop]
# Tiles frames with a timestamp so you can map the footage (open the JPG with the Read tool).
# crop example (counter area of a wide shot): "crop=iw*0.7:ih*0.42:iw*0.15:ih*0.24,"
set -euo pipefail
clip=$1; out=$2; every=$3; tile=$4; start=${5:-0}; dur=${6:-100000}; crop=${7:-}
ffmpeg -nostdin -v error -y -ss "$start" -t "$dur" -i "$clip" \
  -vf "fps=1/$every,${crop}scale=150:-2,drawtext=text='%{eif\:t+$start\:d}':x=3:y=3:fontsize=16:fontcolor=yellow:box=1:boxcolor=black,tile=$tile" \
  -frames:v 1 "$out"
echo "$out"
