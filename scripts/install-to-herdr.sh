#!/bin/sh
# Install this layout into a Herdr home (default ~/.config/herdr-app), never
# overwriting what is there, then check the mod.
#   HERDR_APP_HOME=/some/home scripts/install-to-herdr.sh
set -eu
NAME=df-classic
REPO="$(cd "$(dirname "$0")/.." && pwd)"
HOME_DIR="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
for d in "layouts/$NAME.json" "themes/$NAME.json" "mods/$NAME"; do
  [ ! -e "$HOME_DIR/$d" ] || { echo "$HOME_DIR/$d already exists: rename it or remove it first" >&2; exit 1; }
done
mkdir -p "$HOME_DIR/layouts" "$HOME_DIR/themes" "$HOME_DIR/mods"
cp "$REPO/layouts/$NAME.json" "$HOME_DIR/layouts/"
cp "$REPO/themes/$NAME.json" "$HOME_DIR/themes/"
# Installing leaves the recipe and the previews out (the platform manual's rule); they stay in the repo.
rsync -a --exclude=RECIPE.md --exclude="preview*.png" --exclude=.DS_Store "$REPO/mods/$NAME" "$HOME_DIR/mods/"
HERDR_APP_HOME="$HOME_DIR" herdr-app check "$HOME_DIR/mods/$NAME"
echo "installed. Switch with: herdr-app do layout.switch --name $NAME   (or ctrl-shift-l)"
