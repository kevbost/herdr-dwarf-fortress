# Developing it

Where things live and how the repo and a live Herdr stay in step. Rules for changing the mod's code are in `mods/df-classic/AGENTS.md`.

## Why the repo is the source

The repo is under git and is what gets published. Herdr only reads its own home (`~/.config/herdr-app`), so the repo reaches it by a copy (`scripts/deploy-to-herdr.mjs`). Two things shaped that copy:

- **Hot reload.** Saving a file in the Herdr home reloads the mod at once. The hooks in `.claude/` copy every repo edit there as it happens, so there is still no step between an edit and the result.
- **The app writes one of these files.** The mod's "Menu to the right/left" row rewrites `layouts/df-classic.json` in the Herdr home. A plain copy from the repo would undo a person's choice of side. So the deploy compares three things per file: the repo copy, the home copy, and what the last deploy left (recorded in `.deploy-state/base.json`, git-ignored, never written into the home).

| repo copy, compared with the last deploy | home copy | what the deploy does |
|---|---|---|
| unchanged | anything | nothing (a home-only change, such as the menu side, stays) |
| changed | same as the last deploy, or missing | copies the repo file |
| changed | already the same as the repo | records it |
| changed | changed some other way | conflict: overwrites nothing, names the file, exits 2 |
| removed | same as the last deploy | deletes the home file |
| removed | changed | conflict |

Files only the home has (`jsconfig.json`, `gpui-kit.d.ts`, `*.error`, `art/.wiki-cache/`) are never touched. `RECIPE.md` and `preview*.png` are never deployed (the platform manual keeps them out of an installed copy).

- **Edit in the repo:** `layouts/df-classic.json`, `themes/df-classic.json` and `mods/df-classic/`. In a Claude Code session here the hooks in `.claude/` do the rest:
  - after an edit to those paths, and after any Bash command, they run the deploy, and `herdr-app check` when the mod changed; a failure goes back to the agent;
  - at the end of a turn, when the working tree changed since the last passing run, they run the tests (`scripts/.tests` and the mod's), `herdr-app check`, `herdr-app status` (its errors must be empty) and both scans;
  - at session start they run the deploy, which picks up a `git pull`, a branch switch or an edit made outside Claude.

  Outside a Claude session nothing runs by itself: `node scripts/deploy-to-herdr.mjs`.
- **First time, or after you settle a conflict by hand:** `node scripts/deploy-to-herdr.mjs baseline` records "repo and home are the same" and refuses if they are not. `scripts/sync-from-herdr.sh check` shows what differs.
- **Pull a change the app made** (the menu side): `scripts/sync-from-herdr.sh` copies the home into the repo, records the baseline and runs the tests and both scans. It overwrites the repo copy, so it refuses while `layouts/`, `themes/`, `mods/` or the root `RECIPE.md` and `preview.png` have uncommitted changes.
- **Gallery files.** The sources are `mods/df-classic/RECIPE.md` and `mods/df-classic/preview.png`. `scripts/sync-gallery-copies.sh` copies them to the repo root, where herdr.dev's gallery looks for them beside `layouts/` and `mods/`, and a test fails if the copies differ.
- **The scans.** `scripts/scan-private.sh` refuses a home path or an email address in any file, and any word listed in `scripts/.private-words` (one per line; git-ignored, so keep your own names there). `scripts/scan-references.sh` keeps the guidance files (`AGENTS.md`, `CLAUDE.md`, `DEVELOPMENT.md`, `mods/df-classic/AGENTS.md`, `.claude/`) free of links to, and names of, other community layouts and mods; its optional list of names is `scripts/.community-names` (git-ignored).
- **Do not symlink the repo into the Herdr home.** Copy. Whether Herdr hot-reloads or loads SVGs through a symlink is untested here. The mod's "Menu to the right/left" row rewrites the layout file, which would replace a symlink with a plain file, and Herdr writes `jsconfig.json` and `gpui-kit.d.ts` into every mod folder.
- **Herdr's manual is loaded for you.** `CLAUDE.md` imports `~/.config/herdr-app/AGENTS.md`, the file a session in the Herdr home gets automatically, so Herdr's reference is in context from the start. An import from outside the repo needs a one-time approval in an interactive session (Claude Code asks). A headless `claude -p` run cannot approve it and loads none of the manual (tested here). What happens when that file is missing is untested.
- **Install elsewhere** (a new machine, or a test home) with `scripts/install-to-herdr.sh`. It never overwrites, and leaves out `RECIPE.md` and the previews as the platform manual says; `HERDR_APP_HOME=/some/home` picks another home.
- **After a `git pull` or a branch switch,** start a session here (the session-start hook deploys) or run `node scripts/deploy-to-herdr.mjs`, then `herdr-app check ~/.config/herdr-app/mods/df-classic`.
- **Edited the Herdr home by mistake?** A home-only change is left alone. If the repo copy of that file changed too, the deploy reports a conflict and overwrites nothing. To keep the repo copy, `cp` it over the home file; the next deploy records it. To keep the home copy, commit or stash the repo change, then run `scripts/sync-from-herdr.sh` (it pulls the whole mod folder, not one file).
- **A file missing from the home** is not put back while its repo copy is unchanged since the last deploy (a layout you set aside with Herdr's escape hatch, say). Edit the repo file, or copy it over by hand, to redeploy it.
- **A repo that has lost the layout, the theme or `mods/df-classic/main.js`** (an old checkout, `git stash -u`) deploys nothing and says why, instead of deleting them from the home.

## Making the previews

`layouts/df-classic.png` (shown by Herdr's settings screen) and `mods/df-classic/preview*.png` (the README's gallery) are screenshots of the real window, so they can leak. To make them:

1. Use generic spaces, not your real ones, and tell the person or yourself before closing anything: closing a space ends its terminals. A second Herdr window does not isolate you (spaces live in herdr-core and are shared), so rename spaces, or make throwaway ones with whimsical names, and put them back afterwards.
2. Demo agents: start `claude --setting-sources project,local --model haiku` in throwaway folders with a short in-theme task. A fresh folder stops at Claude's trust prompt, which shows the red "needs you" mark; a folder under one you already trust runs and finishes. Take the main shot from the first space before clicking others (a finished agent blinks until you look at it).
3. `herdr-app shot` writes about 2x size; mask anything private (emails in an agent's banner, titles, paths), then resize to about 1600 px wide with Pillow. Check the mask by zooming in.
4. Put the main shot in `layouts/df-classic.png` and `mods/df-classic/preview.png` (`scripts/sync-gallery-copies.sh` copies the latter to the repo root as `preview.png`, where the gallery reads it), the others as `preview-bigmap.png`, `preview-announcements.png`, `preview-status.png`. Then close the demo spaces and delete their folders.
