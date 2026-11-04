#!/usr/bin/env bash
# Append the branded end shot (assets/endshot.mp4) to finished renders with a short crossfade.
# Usage: append_endshot.sh <in.mp4> <out.mp4>   (vertical 1080x1920 or wide 1920x1080 auto-detected)
set -euo pipefail
cd "$(dirname "$0")/.."
in=$1; out=$2; X=0.4
EL=6.7   # end shot cut before the "Tasty Tuesday" -> "Tuesday" logo change
FO=0.5   # fade out at the very end
END=assets/endshot.mp4
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$in")
read -r w h < <(ffprobe -v error -select_streams v -show_entries stream=width,height -of csv=s=x:p=0 "$in" | tr x ' ')
off=$(python3 -c "print(round($dur-$X,3))")
base="trim=0:$EL,setpts=PTS-STARTPTS,crop=688:1223:16:28,fps=30,setsar=1"
if [ "$w" -gt "$h" ]; then
  # wide: blurred fill behind the centred vertical shot
  ev="[1:v]$base,split[a][b];[a]scale=1920:-2,crop=1920:1080,boxblur=40:3,eq=brightness=-0.06[bg];[b]scale=-2:1080[fg];[bg][fg]overlay=(W-w)/2:0,fade=out:st=$(python3 -c "print($EL-$FO)"):d=$FO,format=yuv420p[e]"
else
  ev="[1:v]$base,scale=${w}:${h}:flags=lanczos,fade=out:st=$(python3 -c "print($EL-$FO)"):d=$FO,format=yuv420p[e]"
fi
ffmpeg -nostdin -v error -y -i "$in" -i "$END" -filter_complex \
  "[0:v]fps=30,setsar=1,format=yuv420p[v0];$ev;[v0][e]xfade=transition=fade:duration=$X:offset=$off[v];\
   [1:a]atrim=0:$EL,asetpts=PTS-STARTPTS,aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,afade=out:st=$(python3 -c "print($EL-$FO)"):d=$FO[ea];[0:a]aresample=48000[a0];[a0][ea]acrossfade=d=$X[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -preset medium -crf 18 -threads ${THREADS:-2} -pix_fmt yuv420p \
  -c:a aac -b:a 320k -ar 48000 -movflags +faststart "$out"
