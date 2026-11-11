#!/usr/bin/env bash
# Rebuilds everything that is not committed: footage proxies, SFX, music.
# Run from the video/ folder.  Needs: curl, ffmpeg, python3 (+ pyarrow, fsspec, aiohttp).
set -euo pipefail
MEDIA=${MEDIA:-$HOME/media}
mkdir -p "$MEDIA"/{raw,proxy} public/{footage,sfx,music}

# 1) Raw footage from the shared Google Drive folder 1hQPTwdVUCl9tLqPQ3KIKwpKQRrYt8DxT
while read -r id name; do
  [ -s "$MEDIA/raw/$name.mp4" ] || curl -sSL -o "$MEDIA/raw/$name.mp4" \
    "https://drive.usercontent.google.com/download?id=$id&export=download&confirm=t"
done <<'LIST'
1MVNedT4h9a_xM45EwXFqsd4lTFplZiXF v132807
1Gb8yvDUzKtMpejdkCtwojugmU4bwxVwx v195221
1kjliGuiEZD4IzbqzXJJt-Xvab12yPCOA v195943
1cgKw5HB0Ik3jpCWmEswkMIEWTalSB_uR v200030
1SE-qUIg2v6z48FZOms05t6kcJc8ZAGnB v202235
16KwFU7Lfk39Igq1XIZN_0Xh6i3_0X9xz v203156
1paLkHs9g3SMKPiPY66EhPL20QMukurag v203532
LIST

# 2) 30fps 1080x1920 proxies (rotation baked in), clip audio cleaned + normalised
for f in "$MEDIA"/raw/*.mp4; do
  b=$(basename "$f")
  [ -s "$MEDIA/proxy/$b" ] || ffmpeg -nostdin -v error -y -i "$f" \
    -vf "scale=1080:1920,fps=30" -c:v libx264 -preset veryfast -crf 20 -g 30 -pix_fmt yuv420p \
    -af "highpass=f=90,afftdn=nr=14:nf=-40:tn=1,loudnorm=I=-15:TP=-1.5:LRA=11,alimiter=limit=0.89" -c:a aac -b:a 192k -ar 48000 \
    "$MEDIA/proxy/$b"
  ln -f "$MEDIA/proxy/$b" "public/footage/$b"   # hard link: the bundler does not follow symlinks
done

# 3) SFX: CC0 "wyzowl/sfx-kit" (Hugging Face), peak-normalised to -3 dBFS
HF=https://huggingface.co/datasets/wyzowl/sfx-kit/resolve/main/sounds
while read -r src dst; do
  curl -sSL -o /tmp/sfx.wav "$HF/$src.wav"
  p=$(ffmpeg -nostdin -i /tmp/sfx.wav -af volumedetect -f null - 2>&1 | awk '/max_volume/{print $5}')
  ffmpeg -nostdin -v error -y -i /tmp/sfx.wav -af "volume=$(python3 -c "print(-3-($p))")dB" -ar 48000 -ac 2 "public/sfx/$dst.wav"
done < scripts/sfx-list.txt

# 4) Music: CC0 "mrfakename/cc0-music-captioned" (Hugging Face), loudnorm -16 LUFS
python3 scripts/get-music.py
