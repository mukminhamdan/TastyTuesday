#!/usr/bin/env bash
# Apply the Tasty Tuesday grade to every footage clip of a project.
#   base: brighter, cleaner food-pop look with a little contrast and a soft vignette
#   warm: shots lit by the grill element get cooler white balance and an HSL key
#         that pulls the orange spill off the hijab, skin and wall tiles
set -euo pipefail
proj="$1"
BASE='{"preset":"food-pop","intensity":0.55,"adjust":{"exposure":0.08,"contrast":0.1,"highlights":-0.15,"shadows":0.12,"blacks":-0.05,"temperature":-0.04,"tint":0.02,"vibrance":0.08,"saturation":0.02},"details":{"vignette":0.12}}'
WARM='{"preset":"food-pop","intensity":0.45,"adjust":{"exposure":0.05,"contrast":0.08,"highlights":-0.25,"shadows":0.14,"blacks":-0.05,"temperature":-0.14,"tint":0.05,"vibrance":0,"saturation":-0.04},"secondaries":[{"key":{"hue":{"center":16,"range":16,"softness":14},"saturation":{"min":0.4,"max":1,"softness":0.12},"luma":{"min":0.1,"max":1,"softness":0.08}},"correction":{"hueShift":-22,"saturation":-0.55,"luma":-0.08}}],"details":{"vignette":0.12}}'
cd "$proj"
npx hyperframes media-treatment --project . --file index.html --selector 'video.cam' --clear --json >/dev/null
npx hyperframes media-treatment --project . --file index.html --selector 'video.cam:not(.warm)' --grading "$BASE" --apply --json | python3 -c 'import json,sys; d=json.load(sys.stdin); print("base", d.get("ok"), d.get("count"))'
if grep -q 'cam warm' index.html; then
  npx hyperframes media-treatment --project . --file index.html --selector 'video.warm' --grading "$WARM" --apply --json | python3 -c 'import json,sys; d=json.load(sys.stdin); print("warm", d.get("ok"), d.get("count"))'
fi
