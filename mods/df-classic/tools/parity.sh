#!/usr/bin/env bash
# Parity check for the forked roles. tabs, pane, spaces, agents, footer and status are
# copies of shipped mods (see README, "Forked from Herdr"); after a Herdr update the
# shipped ones may call something new. For each shipped mod this lists the commands,
# overlay mods, shared keys and names it uses that the replacing role no longer does.
# Expected output today: only the moves README lists (see "Forked from Herdr").
#   mods/df-classic/tools/parity.sh            (any folder; HERDR_APP_HOME picks the home)
set -u
HOME_DIR="${HERDR_APP_HOME:-$HOME/.config/herdr-app}"
MODS="$HOME_DIR/mods"
ME=df-classic
parity() { # $1 shipped mod, rest: the role files that replaced it
  src="$MODS/$1/main.js"; shift
  for pat in 'run\("[A-Za-z_.-]+"' 'openOverlay\(\{ ?mod: "[a-z-]+"' '(setShared|shared)\("[A-Za-z_.-]+"' 'name: "[a-z-]+"'; do
    comm -23 <(rg -o --no-filename "$pat" "$src" | sort -u) \
             <(cd "$MODS/$ME" && rg -o --no-filename "$pat" "$@" | sort -u)
  done
}
echo "workspace-status -> status.js";            parity workspace-status status.js
echo "pane -> pane.js";                          parity pane pane.js
echo "tabs -> tabs.js top.js";                   parity tabs tabs.js top.js
echo "workspace-chrome -> chrome.js top.js";     parity workspace-chrome chrome.js top.js
echo "spaces -> spaces.js";                      parity spaces spaces.js
echo "agents -> agents.js (expect only: mod: \"agents\", the sort popup opens $ME)"; parity agents agents.js
