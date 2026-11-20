#!/bin/sh
# herdr.dev's gallery reads RECIPE.md and preview.png from the repo root. The source
# files live in mods/df-classic/; copy them up when they differ. Prints only what it copied.
set -eu
REPO="$(cd "$(dirname "$0")/.." && pwd)"
for f in RECIPE.md preview.png; do
  cmp -s "$REPO/mods/df-classic/$f" "$REPO/$f" || { cp "$REPO/mods/df-classic/$f" "$REPO/$f"; echo "copied $f to the repo root"; }
done
