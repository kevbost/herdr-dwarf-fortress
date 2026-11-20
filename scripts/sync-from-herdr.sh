#!/bin/sh
# Copy the live layout, theme and mod from your Herdr home into this repo, then
# test the copy and refuse if it looks private. The Herdr home is where you edit
# (hot reload shows changes at once); this repo is what you publish.
#
#   scripts/sync-from-herdr.sh          sync, test, scan
#   scripts/sync-from-herdr.sh check    show what differs, change nothing
#
# HERDR_APP_HOME picks another home (default ~/.config/herdr-app).
set -eu
NAME=df-classic
REPO="$(cd "$(dirname "$0")/.." && pwd)"
LIVE="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
EXCLUDES="--exclude=.DS_Store --exclude=jsconfig.json --exclude=gpui-kit.d.ts --exclude=*.error"

for f in "$LIVE/layouts/$NAME.json" "$LIVE/themes/$NAME.json" "$LIVE/mods/$NAME/main.js"; do
  [ -e "$f" ] || { echo "missing $f: is $LIVE the right Herdr home?" >&2; exit 1; }
done

if [ "${1:-}" = "check" ]; then
  echo "differences (live -> repo), nothing changed:"
  rsync -ani --delete $EXCLUDES "$LIVE/mods/$NAME/" "$REPO/mods/$NAME/" | sed 's/^/  mod: /'
  for pair in "layouts/$NAME.json" "layouts/$NAME.png" "themes/$NAME.json"; do
    cmp -s "$LIVE/$pair" "$REPO/$pair" || echo "  differs: $pair"
  done
  exit 0
fi

mkdir -p "$REPO/layouts" "$REPO/themes" "$REPO/mods"
cp "$LIVE/layouts/$NAME.json" "$REPO/layouts/"
[ -e "$LIVE/layouts/$NAME.png" ] && cp "$LIVE/layouts/$NAME.png" "$REPO/layouts/"
cp "$LIVE/themes/$NAME.json" "$REPO/themes/"
rsync -a --delete $EXCLUDES "$LIVE/mods/$NAME/" "$REPO/mods/$NAME/"
echo "synced from $LIVE"

echo "tests:"
( cd "$REPO/mods/$NAME" && node --test ".tests/*.test.mjs" 2>&1 | grep -E "^# (pass|fail)|^ℹ (pass|fail)" )

echo "privacy scan:"
bad=0
scan() { # pattern, label
  if grep -rIlE "$1" "$REPO" --exclude-dir=.git --exclude=sync-from-herdr.sh --exclude=.private-words >/tmp/herdr-sync-hits 2>/dev/null; then
    echo "  FOUND $2 in:"; sed 's/^/    /' /tmp/herdr-sync-hits; bad=1
  fi
}
scan "$(printf '%s' "$HOME" | sed 's/[.[\*^$/]/\\&/g')" "your home path"
scan "[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.(com|net|org|io|dev)" "an email address"
if [ -f "$REPO/scripts/.private-words" ]; then
  while IFS= read -r w; do [ -n "$w" ] && scan "$w" "\"$w\""; done < "$REPO/scripts/.private-words"
fi
rm -f /tmp/herdr-sync-hits
[ "$bad" = 0 ] && echo "  clean" || { echo "fix the above before committing" >&2; exit 1; }
