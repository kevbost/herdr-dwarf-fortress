# Herdr Dwarf Fortress Classic

A Herdr App layout that draws Herdr as classic ASCII Dwarf Fortress, cloned from Herdr's `main` (0.1.16). The layout is `df-classic`: `layouts/df-classic.json`, `themes/df-classic.json` and `mods/df-classic/`. See `README.md` for the repo and `mods/df-classic/AGENTS.md` for the rules for changing the mod itself (read it before you edit any code).

## Before changing anything

- Herdr's own manual, `~/.config/herdr-app/AGENTS.md` (layouts, mods, keys, settings, limits), is loaded by `CLAUDE.md`. Don't answer Herdr questions from memory. Read `~/.config/herdr-app/herdr.d.ts` (the mod API) before touching mod code. `~/.config/herdr-app/gpui-kit.d.ts` is far too big to read: search it with `rg`. `herdr-app --skill`, `hc --skill` and `herdr-app commands` print more reference.
- **This repo is the source; the Herdr home is where it is deployed.** Edit `layouts/`, `themes/` and `mods/` here. The hooks in `.claude/` run `scripts/deploy-to-herdr.mjs` after each edit, which copies them into `~/.config/herdr-app/` (hot reload shows the change) and runs `herdr-app check`. A file changed both here and in the home is a conflict: nothing is overwritten and the file is named. A change the app makes itself (the "Menu to the right/left" row rewrites the layout file) stays in the home until you pull it with `scripts/sync-from-herdr.sh`, which overwrites the repo copy and refuses over uncommitted work. The root `RECIPE.md` and `preview.png` are copies of the ones in `mods/df-classic/` (`scripts/sync-gallery-copies.sh`): edit the mod folder's. Details: `DEVELOPMENT.md`.
- Never edit Herdr's shipped layouts or mods, the `.d.ts` files, or `~/.config/herdr-app/frame/` and the home's own `AGENTS.md`: Herdr rewrites them on every start.

## Rules

- The layout's file name is its label in Herdr's picker and in Settings, which overflows past about 17 characters, and a name with a space cannot be switched to. It stays `df-classic`; the theme carries the same name so Settings offers it only for this layout.
- Guidance files (`AGENTS.md`, `CLAUDE.md`, `DEVELOPMENT.md`, `mods/df-classic/AGENTS.md`, `.claude/`) do not name, link or quote other community layouts or mods: they cite Herdr's manual and this repo's files only. `scripts/scan-references.sh` checks it.
- Layout block ids must stay unique, and the ones the code looks up must stay (`mods/df-classic/AGENTS.md`).
- Colors are theme names or the game's own colors from `DF_COLORS` in `kit.js`; glyphs are tiles from `tiles.js`, chosen from `mods/df-classic/SYMBOLS.md` (the game's own glyphs). Never invent one the game has.
- Shared state keys are the layout's own under `df.` (`df.map`, `df.look`, `df.sidebar.width`); keys shared with Herdr's shipped mods (`space.colors`) keep Herdr's names.
- After a change: `cd mods/df-classic && node --test ".tests/*.test.mjs"` must pass (quote the glob; Node 22 or later), then `herdr-app check ~/.config/herdr-app/mods/df-classic`, then `herdr-app status` must show no errors. Changes to `scripts/` also need `node --test "scripts/.tests/*.test.mjs"` from the repo root. The Stop hook in `.claude/` runs all of these.
- If the mod gains a program it runs, a network call or a new file it writes, update "What it touches" in `mods/df-classic/README.md`.
- Screenshots (`layouts/df-classic.png`, `mods/df-classic/preview*.png`) must not show real space names, agent titles, emails or paths. See `DEVELOPMENT.md`, "Making the previews".

## Limits found so far

- `herdr-app check` renders `main.js` alone: dialog and popup roles are not drawn by it. See `mods/df-classic/AGENTS.md`, "Seeing it".
- A second Herdr window does not isolate anything: spaces live in herdr-core and are shared. Never stop or restart herdr-core, and never close the person's spaces to take a picture.
- A built element can be used once: never cache or reuse elements across renders.
- herdr.dev's gallery skips a layout whose `RECIPE.md` is 64 KB or larger; keep it well below.
- Installing leaves the recipe and previews out (the platform manual's rule): `scripts/install-to-herdr.sh` and the README commands skip `RECIPE.md` and `preview*.png`, so an installed copy has no `RECIPE.md` to read (it is in the repo).
