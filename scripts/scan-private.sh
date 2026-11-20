#!/bin/sh
# Refuse if a file in this repo carries a private string: your home path, an email
# address, or a word listed in scripts/.private-words (one per line, git-ignored).
# Used by sync-from-herdr.sh and by the Stop hook.
set -eu
REPO="$(cd "$(dirname "$0")/.." && pwd)"

bad=0
scan() { # pattern, label
  if grep -rIlE "$1" "$REPO" --exclude-dir=.git --exclude=sync-from-herdr.sh --exclude=scan-private.sh --exclude=.private-words >/tmp/herdr-sync-hits 2>/dev/null; then
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
