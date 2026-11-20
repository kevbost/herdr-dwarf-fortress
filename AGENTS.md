# Herdr Dwarf Fortress Classic

A Herdr App layout that draws Herdr as classic ASCII Dwarf Fortress, cloned from Herdr's `main` (0.1.16). The layout is `df-classic`: `layouts/df-classic.json`, `themes/df-classic.json` and `mods/df-classic/`. See `README.md` for the repo and `mods/df-classic/AGENTS.md` for the rules for changing the mod itself (read it before you edit any code).

## Before changing anything

- Read `~/.config/herdr-app/AGENTS.md` (layouts, mods, keys, settings, limits) and `~/.config/herdr-app/herdr.d.ts` (the mod API). Don't answer Herdr questions from memory.
- **The live Herdr home is the source; this repo is a snapshot.** Edit in `~/.config/herdr-app/` (hot reload shows changes at once), then run `scripts/sync-from-herdr.sh` here (copies, tests, scans for private strings). Edits to `layouts/`, `themes/`, `mods/`, or the root `RECIPE.md` and `preview.png` (copies the sync makes for the gallery) are overwritten by the next sync. Only `README.md`, `DEVELOPMENT.md`, `AGENTS.md`, `CLAUDE.md`, `LICENSE`, `scripts/` and `.gitignore` are edited here. Details: `DEVELOPMENT.md`.
- Never edit Herdr's shipped layouts or mods, the `.d.ts` files, or `~/.config/herdr-app/frame/` and the home's own `AGENTS.md`: Herdr rewrites them on every start.

## Rules

- The layout's file name is its label in Herdr's picker and in Settings, which overflows past about 17 characters, and a name with a space cannot be switched to. It stays `df-classic`; the theme carries the same name so Settings offers it only for this layout.
- Layout block ids must stay unique, and the ones the code looks up must stay (`mods/df-classic/AGENTS.md`).
- Colors are theme names or the game's own colors from `DF_COLORS` in `kit.js`; glyphs are tiles from `tiles.js`, chosen from `mods/df-classic/SYMBOLS.md` (the game's own glyphs). Never invent one the game has.
- Shared state keys are the layout's own under `df.` (`df.map`, `df.look`, `df.sidebar.width`); keys shared with Herdr's shipped mods (`space.colors`) keep Herdr's names.
- After a change: `cd mods/df-classic && node --test ".tests/*.test.mjs"` must pass (quote the glob; Node 22 or later), then `herdr-app check ~/.config/herdr-app/mods/df-classic`, then `herdr-app status` must show no errors.
- If the mod gains a program it runs, a network call or a new file it writes, update "What it touches" in `mods/df-classic/README.md`.
- Screenshots (`layouts/df-classic.png`, `mods/df-classic/preview*.png`) must not show real space names, agent titles, emails or paths. See `DEVELOPMENT.md`, "Making the previews".

## Limits found so far

- `herdr-app check` renders `main.js` alone: dialog and popup roles are not drawn by it. See `mods/df-classic/AGENTS.md`, "Seeing it".
- A second Herdr window does not isolate anything: spaces live in herdr-core and are shared. Never stop or restart herdr-core, and never close the person's spaces to take a picture.
- A built element can be used once: never cache or reuse elements across renders.
- herdr.dev's gallery skips a layout whose `RECIPE.md` is 64 KB or larger; keep it well below.
- Installing leaves the recipe and previews out (the platform manual's rule): `scripts/install-to-herdr.sh` and the README commands skip `RECIPE.md` and `preview*.png`, so an installed copy has no `RECIPE.md` to read (it is in the repo).
