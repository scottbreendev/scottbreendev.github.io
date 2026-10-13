#!/bin/bash
# Export the stencils, then copy them to iCloud Drive. The repo keeps source only;
# finished social assets live in iCloud, the same way the app repos do it.
#   root = $SBD_OUTPUT if set, else ~/Library/Mobile Documents/com~apple~CloudDocs/Dev/Scott Breen Dev
#   <root>/social/profile-pic-1080.png   the Instagram profile picture
#   <root>/social/stencils/              one sample PNG per stencil
# Finished posts go in <root>/social/<YYYY-MM-slug>/ with a caption.txt, by hand.
set -euo pipefail
cd "$(dirname "$0")"

ROOT="${SBD_OUTPUT:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/Dev/Scott Breen Dev}"

node render.mjs

mkdir -p "$ROOT/social/stencils"
cp out/profile-picture.png "$ROOT/social/profile-pic-1080.png"
for f in out/*.png; do
  case "$(basename "$f")" in
    profile-picture.png|og-image.png) continue ;;
  esac
  cp "$f" "$ROOT/social/stencils/"
done

echo "Published to $ROOT/social"
