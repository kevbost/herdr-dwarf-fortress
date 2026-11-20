#!/bin/sh
# Pull the live layout, theme and mod from your Herdr home into this repo, then
# test the copy and refuse if it looks private. The repo is the source and
# scripts/deploy-to-herdr.mjs copies it into the home as you work; use this only to
# bring in a change the app made itself (the "Menu to the right/left" row rewrites
# the layout file), because it overwrites the repo copy.
#
#   scripts/sync-from-herdr.sh          pull, test, scan
#   scripts/sync-from-herdr.sh check    show what differs, change nothing
#
# HERDR_APP_HOME picks another home (default ~/.config/herdr-app).
set -eu
NAME=df-classic
REPO="$(cd "$(dirname "$0")/.." && pwd)"
LIVE="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
# RECIPE.md and the previews are the repo's (the home may hold old copies); the root copies come from sync-gallery-copies.sh.
EXCLUDES="--exclude=.DS_Store --exclude=jsconfig.json --exclude=gpui-kit.d.ts --exclude=*.error --exclude=*.deploy-tmp --exclude=RECIPE.md --exclude=preview*.png"

for f in "$LIVE/layouts/$NAME.json" "$LIVE/themes/$NAME.json" "$LIVE/mods/$NAME/main.js"; do
  [ -e "$f" ] || { echo "missing $f: is $LIVE the right Herdr home?" >&2; exit 1; }
done

if [ "${1:-}" = "check" ]; then
  echo "differences (live -> repo), nothing changed:"
  # content, not times: a deploy gives the home copy new modification times, and rsync
  # lists those as "." lines (nothing would be updated)
  rsync -rlpcni --delete $EXCLUDES "$LIVE/mods/$NAME/" "$REPO/mods/$NAME/" | grep -v '^\.' | sed 's/^/  mod: /'
  for pair in "layouts/$NAME.json" "layouts/$NAME.png" "themes/$NAME.json"; do
    cmp -s "$LIVE/$pair" "$REPO/$pair" || echo "  differs: $pair"
  done
  exit 0
fi

# A pull overwrites the repo copy: refuse over uncommitted work.
if git -C "$REPO" rev-parse --git-dir >/dev/null 2>&1 && [ -n "$(git -C "$REPO" status --porcelain -- layouts themes mods RECIPE.md preview.png)" ]; then
  echo "uncommitted changes in layouts/, themes/, mods/ or the root RECIPE.md and preview.png: commit or stash them first, a pull would overwrite them" >&2
  exit 1
fi

mkdir -p "$REPO/layouts" "$REPO/themes" "$REPO/mods"
cp "$LIVE/layouts/$NAME.json" "$REPO/layouts/"
[ -e "$LIVE/layouts/$NAME.png" ] && cp "$LIVE/layouts/$NAME.png" "$REPO/layouts/"
cp "$LIVE/themes/$NAME.json" "$REPO/themes/"
rsync -a --delete $EXCLUDES "$LIVE/mods/$NAME/" "$REPO/mods/$NAME/"
echo "synced from $LIVE"
node "$REPO/scripts/deploy-to-herdr.mjs" baseline
"$REPO/scripts/sync-gallery-copies.sh"

echo "tests:"
( cd "$REPO/mods/$NAME" && node --test ".tests/*.test.mjs" 2>&1 | grep -E "^# (pass|fail)|^ℹ (pass|fail)" )

echo "privacy scan:"
"$REPO/scripts/scan-private.sh"

echo "references scan:"
"$REPO/scripts/scan-references.sh"
