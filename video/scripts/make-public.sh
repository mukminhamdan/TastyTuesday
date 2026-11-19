#!/usr/bin/env bash
# make-public.sh <dir> <footage-glob>  -> hard-linked public folder with fonts/sfx/music/thumbs + selected footage
set -euo pipefail
dir=$1; shift
rm -rf "$dir"; mkdir -p "$dir/footage"
for d in fonts sfx music thumbs; do [ -d "public/$d" ] && cp -al "public/$d" "$dir/$d"; done
for f in "$@"; do ln -f "$f" "$dir/footage/$(basename "$f")"; done
du -sh "$dir"
