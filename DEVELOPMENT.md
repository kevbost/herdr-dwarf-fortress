# Developing it

Where things live and how to keep the repo and your Herdr in step. Rules for changing the mod's code are in `mods/df-classic/AGENTS.md`.

## Why the live home is the source

Most layout repos do the reverse: the repo is the source and a script copies it into `~/.config/herdr-app`. Here the live home is the source, for two reasons. Saving a file in the Herdr home reloads the mod at once, with no script between you and the result. And the mod's "Menu to the right/left" row rewrites the layout file in the Herdr home, so copying the repo over it would undo a person's choice of side.

Herdr only reads its own home (`~/.config/herdr-app`). This repo is a snapshot for publishing, not something Herdr runs.

- **Edit in the Herdr home**, in `layouts/df-classic.json`, `themes/df-classic.json` and `mods/df-classic/`. Saving a file reloads the mod at once, so you see changes live.
- **Sync into the repo before you commit.** It also copies `RECIPE.md` and `preview.png` to the repo root, where herdr.dev's gallery looks for them beside `layouts/` and `mods/`:
  ```sh
  scripts/sync-from-herdr.sh         # copy, run the tests, scan for private strings
  scripts/sync-from-herdr.sh check   # only show what differs
  ```
  The scan refuses a home path or an email address in any file, and any word listed in `scripts/.private-words` (one per line; that file is git-ignored, so keep your own names there).
- **Do not symlink the repo into the Herdr home.** Another layout reports the same from experience (`2code`'s `AGENTS.md`: "Install by copying, not symlinking", because Herdr won't hot-reload or load SVGs through a symlink; I haven't tested that here). The mod's "Menu to the right/left" row rewrites the layout file, which would replace a symlink with a plain file, and Herdr writes `jsconfig.json` and `gpui-kit.d.ts` into every mod folder.
- **Install elsewhere** (a new machine, or a test home) with `scripts/install-to-herdr.sh`. It never overwrites, and leaves out `RECIPE.md` and the previews as the platform manual says; `HERDR_APP_HOME=/some/home` picks another home.
- **After pulling someone's change into the repo,** copy it back into the Herdr home by hand (or remove the old copy and run the install script), then `herdr-app check ~/.config/herdr-app/mods/df-classic`.
- **Changed only the repo by mistake?** `scripts/sync-from-herdr.sh check` shows the drift, and the next sync overwrites the repo copy with the live one.

## Making the previews

`layouts/df-classic.png` (shown by Herdr's settings screen) and `mods/df-classic/preview*.png` (the README's gallery) are screenshots of the real window, so they can leak. To make them:

1. Use generic spaces, not your real ones, and tell the person or yourself before closing anything: closing a space ends its terminals. A second Herdr window does not isolate you (spaces live in herdr-core and are shared), so rename spaces, or make throwaway ones with whimsical names, and put them back afterwards.
2. Demo agents: start `claude --setting-sources project,local --model haiku` in throwaway folders with a short in-theme task. A fresh folder stops at Claude's trust prompt, which shows the red "needs you" mark; a folder under one you already trust runs and finishes. Take the main shot from the first space before clicking others (a finished agent blinks until you look at it).
3. `herdr-app shot` writes about 2x size; mask anything private (emails in an agent's banner, titles, paths), then resize to about 1600 px wide with Pillow. Check the mask by zooming in.
4. Put the main shot in `layouts/df-classic.png` and `mods/df-classic/preview.png` (the sync copies the latter to the repo root as `preview.png`, where the gallery reads it), the others as `preview-bigmap.png`, `preview-announcements.png`, `preview-status.png`. Then close the demo spaces and delete their folders.
