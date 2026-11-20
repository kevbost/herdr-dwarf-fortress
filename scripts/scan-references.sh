#!/bin/sh
# Guidance files cite Herdr's own manual and this repo's files, never other
# community layouts or mods. Fails on, in those files:
#   - a github.com link other than this repo's
#   - a herdr.dev/layouts/<owner>/ or herdr.dev/mods/<owner>/ link
#   - any word listed in scripts/.community-names (one per line, git-ignored, so the
#     list itself is never published)
# Herdr's own site and manual (herdr.dev, the platform AGENTS.md) are fine.
# Used by the Stop hook and the pull script.
set -eu
REPO="$(cd "$(dirname "$0")/.." && pwd)"
OWN="github.com/kevbost/herdr-dwarf-fortress"

FILES="AGENTS.md CLAUDE.md DEVELOPMENT.md mods/df-classic/AGENTS.md .claude/settings.json"
for f in "$REPO"/.claude/hooks/*; do
  [ -f "$f" ] && FILES="$FILES ${f#"$REPO"/}"
done

out="$(mktemp)"
trap 'rm -f "$out"' EXIT

for rel in $FILES; do
  f="$REPO/$rel"
  [ -f "$f" ] || continue
  # this repo's own link is fine; a longer name that merely starts with it (a fork) is not
  sed -E "s#$OWN([^A-Za-z0-9_-]|\$)#\\1#g" "$f" | grep -nE 'github\.com/[A-Za-z0-9_.-]+' | sed "s|^|$rel:|; s|\$|  (a link to another GitHub project)|" >>"$out" || true
  grep -nE 'herdr\.dev/(layouts|mods)/[^/ ]+/' "$f" | sed "s|^|$rel:|; s|\$|  (a link to a gallery entry)|" >>"$out" || true
  if [ -f "$REPO/scripts/.community-names" ]; then
    while IFS= read -r w; do
      if [ -n "$w" ]; then
        grep -niwF -- "$w" "$f" | sed "s|^|$rel:|; s|\$|  (names another project)|" >>"$out" || true
      fi
    done <"$REPO/scripts/.community-names"
  fi
done

if [ -s "$out" ]; then
  echo "  FOUND references to other community projects in guidance files:"
  sed 's/^/    /' "$out"
  echo "remove them: guidance files cite Herdr's manual and this repo only" >&2
  exit 1
fi
echo "  clean"
