# df-classic: notes for agents

This mod, `layouts/df-classic.json` and `themes/df-classic.json` are one thing: Herdr drawn as classic ASCII Dwarf Fortress. `README.md` here says what each file is and what the person can change. `../../AGENTS.md` is the platform manual and wins on anything about Herdr itself. This file is the rules for changing this mod without breaking it. The copy of this mod in the Herdr home is deployed from the repo (`scripts/deploy-to-herdr.mjs`): edit the repo copy, not the one in `~/.config/herdr-app`.

## The one rule that matters

**Every function of the `main` layout must keep working here.** The person said so in those words. Looking like the game comes second.

## Before you change anything

- `tabs.js`, `pane.js`, `spaces.js`, `agents.js`, `chrome.js` and `status.js` are forks of shipped mods (`../tabs`, `../pane`, `../spaces`, `../agents`, `../workspace-chrome`, `../workspace-status`). Their logic is the shipped code, copied. Only the element drawing was rewritten. Keep it that way: restyle freely, but do not rewrite, reorder or "clean up" the logic, and keep the shipped names in it so it can be compared.
- Never edit a shipped mod or a shipped layout. Herdr replaces them at start.
- Keep these node ids in the layout file: `sidebar`, `work`, `body`, `tabs`, `main`, `panel`, `panel-body`, `files`, `changes`, `status`, `spaces`, `agents`, `map`, `reports`, `shell`, `frame-right`. Key bindings and the roles find nodes by them (`cmd-b` toggles `sidebar`; the menu-side option looks for `sidebar` and `work` inside `body`).
- Do not set `font` in the layout. Terminal panes stay in the person's terminal font. Chrome text comes from `ui_font`.

## How drawing works here

- One role per file, plain classes with `init(props, cx)` and `render(cx)`. `main.js` is the only `View`; it picks the role from `props().role`.
- Colors: `const c = pal()` once per render, then `c.LGREEN`, `c.BLACK` and so on. They are the theme's 16 terminal colors under their DF names. No hex literals in roles.
- Text sits on 18 px rows: wrap a role's root in `root(...)`.
- Glyphs are tiles, not characters in a font. Draw one with `glyphCell(char, color, background)` or `tileCell(index, color, background)` from `kit.js`. Never put a CP437 symbol (`☺ ♣ ☼ ▲` ...) into ordinary text: the chrome font lacks most of them.
- A tile is named in `tiles.js` and asked for with `tile("dwarf")`.
- An agent looks the same everywhere: get it from `agentGlyphs(c)` and ink it with `creatureInk(c, glyph, agent)`. The list, the pane header and the map all do. Do not compute a glyph or a color for an agent anywhere else.
- Selected is a blue bar with white text; hover is teal; the focused pane's header is black on light gray.
- Animate natively (`.frames`, `.loop`, `.transition`), never with a timer. The map's one timer moves creatures and calls `cx.notify()` only when one actually changed cell. Keep that property: every notify redraws the window.

## The tileset

- `tileset/sheet.svg` and `tileset.js` are written by `art/slice_tileset.py`. Do not edit them by hand; run the script.
- `GLYPH_W` and `GLYPH_H` come from `tileset.js`. Do not hardcode 9 or 16.

## Pure modules

`tiles.js`, `glyphs.js`, `world.js`, `walk.js`, `movers.js`, `scene.js`, `maps.js`, `meadow.js`, `settlement.js`, `fortress.js`, `volcano.js`, `mountainside.js`, `river.js`, `workshops.js`, `shapes.js`, `tree.js`, `announce.js`, `history.js`, `log.js`, `look.js`, `calendar.js` and `hash.js` import nothing from `herdr` or `gpui-kit`, so Node can test them. Keep them that way and keep their tests in `.tests/` passing. Logic that can be wrong belongs in one of them, not in a role file. Every map must stay the same on every run (no `Math.random` in a map module). To add a map: write it as a module exporting `{ id, name, width, height, meeting, kinds, cellAt, works }` (see `fortress.js`), list it in `maps.js`, give each new cell kind words in `look.js`, and the map tests in `.tests/world.test.mjs` run on it by themselves. Draw things with the game's own glyph: check `SYMBOLS.md` first, and if the game has a glyph that `tiles.js` lacks, add the tile rather than inventing one. Changing the map is a right-click on the sidebar's map (`mapmenu.js`) or the list down the big map's side (`bigmap.js`), never a control on the screen.

## Changing more than one file

The app reloads the mod on every save. A change that spans files (a function moved, a signature changed) must land in an order that loads at each step, or all at once from one script. A half-saved change shows the person an error in their window.

## After every change

```sh
herdr-app check ~/.config/herdr-app/mods/df-classic
cd ~/.config/herdr-app/mods/df-classic && node --test ".tests/*.test.mjs"
herdr-app status          # "errors" must be empty
herdr-app shot /tmp/x.png # then look at it
```

If you touched a forked role, also run `tools/parity.sh`: it lists any command, overlay or shared key the shipped mod uses that the role no longer does. The deliberate differences are listed in `README.md` under "Forked from Herdr 0.1.16" (the `layout.resize` and `sidebar.*` lines are `toggleSidebar` living in `kit.js`; the agents sort popup opens `df-classic`).

## Seeing it

- `herdr-app check` renders `main.js` with no props, so it never draws a dialog or popup role (`bigmap`, `announcements`, `statusscreen`, `mapmenu`, `newmenu`). To see one, use a throwaway probe mod: `mods/df-probe/mod.json` `{"place":"none","overlay":{"width":10,"height":10}}` and a `main.js` whose `init` (skip it when `checking()`) calls `openOverlay({ mod: "df-classic", kind: "dialog", width, height, frame: "none", props: { role: "bigmap" } })` then `closeOverlay(props().overlay)`. Open it with `herdr-app do mod.open '{"name":"df-probe"}'`, `herdr-app shot`, close the dialog with `herdr-app do overlay.close` (repeat until `herdr-app status` shows no overlays), then **delete the probe folder**.
- `herdr-app shot` writes the window at about 2x its logical size (5000 px wide on a laptop). Crop or downscale (Pillow) before looking at it; the map and rail are small. Saving a shot is not a test: look at it.
- `herdr-app do ...` acts on the person's real window. Closing a space ends its terminals, agents included. Do not close, rename or move their spaces to take a picture unless they asked. A second window (`HERDR_APP_HOME=...`) does **not** isolate: spaces live in herdr-core and are shared, so it shows the same spaces. Never stop or restart herdr-core (`hc server stop`) for a test.
- The map is chosen by a right-click or the big map's list; there is no command that sets the shared `df.map`. Do not edit `shared.json` or `layouts/.state/` by hand.

## Making a map

1. A module like `fortress.js` or `river.js`: `{ id, name, width: 96, height: 40, meeting, kinds, cellAt, works }`, deterministic (`hashCell`, never `Math.random`), with stamped or carved parts worked out on first use, not at import.
2. Put the variety within about 18 columns and 10 rows of `meeting`: that is what the sidebar shows. Keep the 7 x 3 cells around `meeting` walkable.
3. Glyphs from `SYMBOLS.md` only; add a tile to `tiles.js` (and the expected table in `.tests/tiles.test.mjs`) when the game has one we lack. Buildings: `workshops.js`. Rock: `rockCell` / `blankRock` in `shapes.js`. Bridges: `bridgeCell`.
4. Words for every new kind in `look.js`; a map's name is a short whimsical DF-style phrase of at most 16 characters (the menu and the big map's list are that wide).
5. List it in `maps.js` (the popup grows with the list). Run the tests: they check determinism, known kinds and tiles, the open meeting place, reachability of everything walkable and of every point of interest.
6. Update `README.md` ("Map"), `RECIPE.md` and `SYMBOLS.md` if a glyph is new.

## Publishing

The repo is the source of truth; the Herdr home is where it is deployed. See `DEVELOPMENT.md` in the repo (`scripts/deploy-to-herdr.mjs` copies the repo into the home, `scripts/sync-from-herdr.sh` pulls an app-made change back and scans for private strings, and `scripts/sync-gallery-copies.sh` copies `RECIPE.md` and `preview.png` from this folder to the repo root, where herdr.dev's gallery reads them). Screenshots must not show real space names, agent titles, emails or paths: use generic demo spaces and mask the rest. If a change makes the mod run a new program, reach the network or write a new file, update "What it touches" in `README.md`.

## Things that look wrong but are meant

- The menu's green marks (`► ☼ X ▲ ○ +`, tile glyphs) are not keys: they bind nothing and each line is a click target. The sort popup in `agents.js` still shows letters (`p`, `g`) that bind nothing either.
- `sidebar.width` is not used; `df.sidebar.width` is, so this layout does not change the width `main` remembers.
- Agents use only some of the sixteen colors (`AGENT_COLORS` in `glyphs.js`): blue cannot be read on black, green is lost in the grass, and no agent color may be another's dark partner.
- Role classes do not extend `View`.
- A built element is used once; never cache or reuse elements across renders (see `RECIPE.md`, "Watch out"). Cache data.
- The footer has no row to fold the sidebar; the rail is reached by dragging the edge, and `»` unfolds it. The rail's footer rows are bare marks with tooltips.
- A drawbridge is not drawn (the plain bridge is the game's block bridge); waterfalls are static foam; colors do not follow materials. These were decided, not missed.
- The layout's file name is the picker label: keep `df-classic` (see `RECIPE.md`).
