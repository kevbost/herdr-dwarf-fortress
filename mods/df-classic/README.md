# Dwarf Fortress Classic

A layout for Herdr that looks like the original ASCII Dwarf Fortress
(v0.47.05 and earlier): `layouts/df-classic.json` + `themes/df-classic.json`
+ this mod. One mod, many roles (`main.js`); `kit.js` holds what they share.

The layout is a clone of `main` and keeps everything `main` can do. The look
is described in `VISUAL_IDENTITY.md` here; the game's glyphs, with sources and
which this layout draws, are in `SYMBOLS.md`; `RECIPE.md` is the brief to
rebuild it from scratch. Working on this mod: read `AGENTS.md` here first.

## Roles

| Role | File | What it draws | Forked from |
|---|---|---|---|
| `top` | `top.js` | The top border: `*PAUSED*`, `Agents: N (W)`, the space as title, `Idlers: N`. Drags the window. | new (takes over `tabs`' window buttons and traffic-light room) |
| `border` | `top.js` | A plain stretch of the frame (the bottom border). | new |
| `tabs` | `tabs.js` | The tab row: `1: name`, the shown tab on a blue bar. | `mods/tabs` |
| `pane` | `pane.js` | A pane's one-row header. | `mods/pane` |
| `map` | `map.js` | The map the agents walk on. Its height is draggable (the line under it, 96 to 640 px); a click on it opens the big map; a right-click on it opens the map menu. Each map is 96 x 40 cells. | new |
| `mapmenu` | `mapmenu.js` | The popup a right-click on the map opens: The Velvet Vale, The Dusty Moot, Cheesedelve, Smolderpot, Snoring Halls, Gurgleford, the shown one on a blue bar, a click or its number picks it (shared `df.map`, kept across restarts). Deliberately not on the screen until asked for: not in the footer. | new |
| `bigmap` | `bigmap.js` | The map in a dialog the menu's Map, or a click on the sidebar's map, opens, with a list of the maps down its right side (a click or a digit picks one; no right-click menu there), big enough for the whole world. A second copy of the map role in the status screen's frame, sharing one scene (`scene.js`) with the sidebar map, so the same creatures stand in the same places. Has its own Look switch. | new |
| `spaces` | `spaces.js` | The spaces list. Branch follows the name; a `+` at the row's end opens the new terminal/agent menu for that space. | `mods/spaces` |
| `agents` | `agents.js` | The agents list, each row starting with its map glyph. | `mods/agents` |
| `footer` | `chrome.js` | The menu's last lines: sidebar, menu side, status, options, look, map, find, add machine. | `mods/workspace-chrome` |
| `status` | `status.js` | The announcement line: one sentence in the game's voice (`Claude Code needs you at herdr!`, `... has finished at herdr.`, `... has started working at herdr.`; the newest that is still true: needs you or started working while the agent is, finished until it works or needs you again; a newer one replaces it at once). Says what Look found while Look is on. | `mods/workspace-status` |
| `reports` | `reports.js` | The left border's report letters: red `C` an agent needs you, green `H` finished, blue `S` started work. Newest on top, each gone after 90 s, at most 12. Click one to go to that agent. | new |
| `announcements` | `announcements.js` | The game's announcements list, a dialog a click on the announcement line opens: a gray bar with the count, every needs-you, started-working and finished line the announcement line has said (time in dark gray, text in the color it was said in), oldest at the top and the list opened at the newest. Kept in memory only, the last 200 lines, so a restart or a save of the mod empties it. | new |
| `statusscreen` | `statusscreen.js` | The game's status screen, a dialog the menu's Status opens: a gray bar with the space and the game's date (the real month is the game's month), sections Agents and Spaces, three text columns (totals, who is here by program, agents by state with `None` in dark gray). | new |
| `depth` | `depth.js` | The depth bar: the active space's tabs as levels. | new |
| `newmenu` | `newmenu.js` | The menu a space row's `+` opens. Terminals and agents open as panes of that space's shown tab, not as tabs. | `mods/new-menu` |

Not forked, used as shipped (they follow the theme and `ui_font`): `files`,
`changes`, `menu`, `picker`, `prompt`, `confirm`, `help`, `toast`,
`peek`, `worktree`, `machine-add`.

Pure modules, no `herdr` or `gpui-kit` imports: `tiles.js` (CP437 and the
named tiles), `glyphs.js` (which glyph and color an agent is), `world.js` (a map made into
a world), `maps.js` (the six maps and which is shown), `meadow.js`, `settlement.js`, `fortress.js`, `volcano.js`, `mountainside.js`, `river.js` (the maps),
`shapes.js` (cells, rectangles, wall characters, bridges), `workshops.js` (the game's 3 x 3 workshops), `walk.js` (path and stepping), `movers.js` (who stands where on the map), `scene.js` (the one scene every copy of the map shares),
`tree.js` (reading and changing a layout tree), `announce.js` (how an agent's states
are worded), `history.js` (the announcements list's lines), `log.js` (the report letters), `look.js` (what Look says), `calendar.js`
(the game's date), `hash.js`. `tileset.js` is written by the slicer.

## Options

- **Menu on the left or the right.** Click `<: Menu to the left` /
  `>: Menu to the right` at the foot of the menu, or run
  `herdr-app do df-classic.move_menu`. It rewrites the shown layout's file,
  so it sticks. To have a key for it, add to `keys.json`:
  `"layout:df-classic": { "<your key>": "df-classic.move_menu" }`.
  By hand: swap `sidebar` and `work` in `body`'s `children`.
- **Where the map is.** The `map` block sits at the top of `sidebar`. Move
  that block anywhere in the layout file: the role draws at any size.
- **Colors.** Pick any theme in Settings; every role, the map's tiles
  included, takes the 16 terminal colors from it, as the game read
  `colors.txt`. `df-classic` is the default DF palette.
- **Tileset.** See below.
- **Chrome font.** See below.

## Tileset

Every CP437 glyph (the whole map, and each glyph cell in the lists, pane
headers, tab row and depth bar) is a tile cut from a tileset sheet in the
Dwarf Fortress tileset layout. The one in use is `art/PxPlus9x16.png`, drawn
by `art/render_pxplus.py` from the bundled PxPlus IBM VGA 9x16 font (VileR,
CC BY-SA 4.0, so the sheet is too: see `fonts/NOTICE.md`): 16 x 16 tiles of
9 x 16 px. It matches the earlier IBM VGA sheet pixel for pixel except 11
Greek and math tiles (for example the sapling, tile 231).

`art/slice_tileset.py` turns a tileset into `tileset/sheet.svg`, the whole
sheet as one path (runs of pixels joined into rectangles, 24 KB). The app tints that image with any color, so one file
serves every color and follows the theme. A cell is a window onto the sheet,
moved so the wanted tile shows (`tileCell` in `kit.js`). No font is involved.

To redraw the sheet from the font, or use another tileset (needs Python with Pillow):

```sh
cd ~/.config/herdr-app/mods/df-classic
python3 -I art/render_pxplus.py                               # draws art/PxPlus9x16.png from the font
python3 -I art/slice_tileset.py art/PxPlus9x16.png              # turns it into the sheet
python3 -I art/slice_tileset.py path/to/tileset.png            # another tileset, at the tile's own size
python3 -I art/slice_tileset.py path/to/8x8.png --cell 16x16   # drawn larger
```

It rewrites `tileset/sheet.svg` and `tileset.js` (the cell size); the mod
reloads by itself. Then fit the layout file to the new cell: `depth` is one
cell wide, `map` a whole number of cells high. A cell taller than 18 px
overflows the text rows it shares with glyph cells.

What carries over from the game's tinting: white is the foreground color,
gray a darker shade of it, magenta or transparency the background. Black
pixels are left out (the layout draws on black). A tile's own colors are
not kept: everything is tinted, so full-color graphic sets come out in one
color.

## Fonts

| Where | Font | Set by |
|---|---|---|
| Terminal panes | the person's own | `settings.json` `font`. The layout never sets `font`. |
| Chrome text | `PxPlus IBM VGA 9x16`, 16 px on 18 px rows | the layout's `ui_font`; `FS` and `CH` are in `kit.js` |
| Glyphs | none: the tileset | `tileset/sheet.svg` |

The font is bundled in `fonts/` (Herdr loads it at start, no system install):
PxPlus IBM VGA 9x16 by VileR, CC BY-SA 4.0, included unmodified. See
`fonts/NOTICE.md` and `fonts/LICENSE-PxPlus.txt`. Its letters match the
tileset's. The layout sets `ui_font`, so it wins over the person's
`settings.json` `ui_font` and the settings font picker has no effect on chrome
text. To let settings choose instead, delete `"ui_font"` from
`layouts/df-classic.json`: the chrome then falls back to Herdr's Geist, which is
proportional, so the number labels and `+` buttons stop sitting on a character
grid.

No layout size depends on the chrome font's character width (see "Sizes in the
layout file"), so any monospaced `ui_font` works; a wider one truncates names
sooner. `FS` in `kit.js` is 16, the IBM font's pixel size (rows stay 18 px);
any other `ui_font` may want another value. The layout leaves `font` unset: terminal panes stay in the
person's own terminal font. The previews in this folder show the IBM look.

## Sizes in the layout file

All in px at zoom 1. Change them together if the chrome font or the tileset
changes.

| Node | Size | Why |
|---|---|---|
| `top`, `tabs`, `status`, pane header | 18 | one text row (`CH`) |
| `map` | 224 (draggable, min 96, max 640) | 14 glyph rows of 16; 640 is the whole world's height |
| `sidebar` | 324 | 36 glyph columns of 9 |
| `sidebar-footer` | 126 (locked) | 7 text rows |
| `depth`, `reports`, `frame-right` | 9 | one glyph column: the report letters live in `reports`, the left border |
| dividers, `bottom` | 8 | about one chrome character |
| `traffic_lights` | `[8, 3]` | the 12 px macOS buttons inside the 18 px top row |

## Map

- Six maps ship, each 96 x 40 cells and the same every time. Right-click the
  sidebar's map to pick one (the big map has a list of maps down its right
  side instead, a click or digit 1 to 6 picks one); the choice is kept in
  `df.map`. The panel shows the part around the meeting place that fits.
  - **The Velvet Vale** (the meadow, the default): grass, trees, a brook, a pond, a rocky outcrop, and the embark wagon by the clearing: 3 x 3, hatched brown body with the load (`÷`) down the middle.
  - **The Dusty Moot** (the settlement): a walled frontier town on dry plains, its own ground and
    not the meadow's (dirt, scrub, boulders, a few dead trees, ploughed fields
    outside the walls). The town is packed toward the middle, where the
    sidebar's view looks: a cobbled plaza with a well and market stalls where
    two streets cross, with a tavern, a smithy, a shop and a barn round it and
    four houses beyond, inside a log palisade with a gate on each street.
    Walls are the double-line box characters picked by what each joins; doors
    open onto roads.
  - **Cheesedelve** (the fortress): rooms carved into solid rock (shaded blocks), dug floor
    rough (`. , '`) and finished floor smooth (`+`), packed toward the middle:
    a great hall with a statue and pillars, a cavern hall below it around a
    chasm, a stair room, a dining hall with tables and chairs, two bedrooms, barracks,
    two workshops and a smithy with forges, and a stockroom. Workshops are the
    game's own 3 x 3 grids (`workshops.js`). The chasm is the
    level below, drawn dim and not walkable; the stairs and the ramp up are
    drawn and lead nowhere (one level only). The box characters, shaded
    blocks, `+` and `. , '` follow the game's own glyphs (VISUAL_IDENTITY.md);
    doors, furniture, statues, forges and the rest follow the game's glyph
    table, listed with sources in `SYMBOLS.md`. Rock you have not dug is
    blank, and a wall of shaded blocks outlines every room, as the game
    draws a dug fortress.
  - **Smolderpot** (the volcano): seen from the rim of its crater, the one level creatures can
    stand on. A ledge of ash (edged by slopes down) rings the crater; inside it
    the ground falls away to the magma far below, drawn dim in the dark partner
    colors and not walkable, with a stone island at the rim's level joined to the
    ledge by four bridges (outlined in double lines, floored with blocks). The
    island holds two magma forges, a craftsdwarf's workshop, a magma smelter and
    four statues. Outside the cone the plains are a level lower, dim and out
    of reach. The rings are uneven.
  - **Snoring Halls** (the mountainside): autumn woods (yellow, brown and red leaves) on the left;
    on the right the inside of a mountain: blank rock (with a dim mark here and there, as the game shows unexplored rock), outlined by a wall where it
    meets the woods or a room, with one door in its face. A hallway runs east and a second crosses it; 28 bedrooms
    of 3 x 3 (a door on the hallway, a bed in the far corner, a cabinet and a
    chest on the far wall) line both sides of both.
  - **Gurgleford** (the river): a conifer forest (pines are the game's `↑`) on a ridge of
    three levels, seen from the middle one, the only one creatures can walk.
    North the ground is a level higher: blank rock outlined by a wall, with the
    river coming off its edge in a waterfall (white and cyan foam). South the
    ground is a level lower, drawn dim and out of reach, and the river drops off
    the edge of the middle level in a second waterfall. A 3-wide brown road runs
    across, over the river on a bridge (a double-line outline floored with `+` blocks); small hills (rings of slopes, blank rock inside)
    stand on both banks. A one-room cabin (bed, cabinet, chest, a table and two chairs, its door onto the road) stands north of the road, west of the bridge. The river carries flecks of white foam and the forest
    floor is busy with saplings, rope reed and shrubs.
  - Furniture blocks. A working agent walks to stand beside a workbench or a
    table (in the meadow, to a boulder, the brook or a tree; on the plains, a boulder or a tree). Idle agents
    gather at each map's meeting place; blocked and done ones stop where they are.
  - Switching puts the creatures on the new map afresh, arriving at its edge.
- An agent's glyph is its species: Claude Code agents are dwarves (`☺`), any
  other program is its first letter. Its color is its own for as long as it
  lives (remembered in shared state under `df.agent.colors`), picked from the
  bright colors that read on black and are not lost in the grass; two live
  agents of one species do not share a color while any is free.
- No two creatures share a cell. They walk the shortest way around trees,
  the pond and the outcrop, and step around each other.
- Working: walks between a tree, a boulder and the brook (or a bench or table), staying a second to four at each. Idle: walks to the clearing and stands, in the dark half of
  its color, now and then strolling up to two cells and coming back. Blocked: stops on a red cell, blinking with `!`. Done: stops,
  blinking with `☼`. The focused agent is drawn inverted.
- Sub-agents without a pane stand beside their parent as its pets, a `d` or a `c` (one for good, by address; the agents list draws the same), in the parent's dark color.
- Look (the menu's Look): while on, a click on any cell puts a yellow `X` (blinking with what is under it) there and the announcement line says what is: an agent's program, space, state and how long this window has seen it in that state; a pet; or the ground. Click Look again to stop. It does not outlive the window.
- One step a second (a working creature moves up to two cells in it, the rest one). The timer redraws only when someone actually moved, and
  not at all while the map's block is hidden or the window is not in front. The blink is a native opacity
  loop, not a timer.

## What it touches

For anyone installing it (a Herdr home rule is to say so before adding a mod):

- **Runs programs:** `git` in the folders of your spaces (branch, ahead and behind in the spaces list) and `hc`, the herdr-core command line (machines).
- **Watches folders:** the folders of your spaces, for git changes.
- **Writes outside its own folder:** only the menu's "Menu to the right/left" row, which rewrites this layout's own file, `layouts/<layout name>.json`, to put the menu on the other side. Nothing else.
- **Shared state:** keys starting `df.` (`df.map`, `df.look`, `df.agent.colors`) and the shared `space.colors`. It never touches the shipped layouts' `sidebar.width` keys.
- **Network:** none.

## Checks

```sh
herdr-app check ~/.config/herdr-app/mods/df-classic
cd ~/.config/herdr-app/mods/df-classic && node --test ".tests/*.test.mjs"   # quote the glob: the folder form fails
herdr-app status                       # "errors" must be empty
tools/parity.sh                        # forked roles against the shipped mods, see "Forked from Herdr"
```

The tests cover only the pure modules (maps, movers, history, tiles and so on).
Roles that draw (`map.js`, `bigmap.js`, the dialogs) are not rendered by
`herdr-app check`, which renders `main.js` alone; open them in the app, or with a
probe mod (see `AGENTS.md`, "Seeing it").

`herdr-app check` gives the mod no props, so `main.js` sets up and draws
every role there. `.tests/` is hidden so saving a test does not reload the mod.

## Forked from Herdr 0.1.16

`tabs`, `pane`, `spaces`, `agents`, `footer` and `status` are copies of the
shipped mods with only the drawing rewritten. They do not pick up later
changes to the shipped mods. After an app update, compare what each shipped
mod calls with what its role calls (the parity script is in the plan's
Validation Commands). At the time of the fork the only differences are
deliberate:

- `sidebar.width` and `sidebar.collapsed` (shared keys) are replaced by
  `df.sidebar.width`: this layout's sidebar is another width, and writing the
  shared keys would change `main`'s.
- The agents sort popup opens `df-classic` with `{ role: "agents", sortMenu:
  true }` instead of the `agents` mod.
- `find`, `narrow` and `toggleSidebar`, which three shipped mods each carry a
  copy of, are once in `kit.js`. The rail is 108 px on every platform (a space or an agent shows its number and the start of its name; the footer rows are their keys, with the label as a tooltip): the
  macOS window buttons sit over `top`, not over the sidebar.
- `tabs`' room for the macOS window buttons and its window buttons are in
  `top`. `workspace-chrome`'s search and sidebar buttons are lines in `footer`.
- Program icons (SVG) are not drawn. An agent is its glyph.
- `spaces` and `map` do not start timers, `hc` or `git` under
  `herdr-app check`.

`localStorage` belongs to each copy of a mod, so what the shipped mods
remembered there (the side panel per space, folded groups, when an agent
last changed) starts empty in this layout. Pins are on the terminal and carry
over.

## Known gaps

- Not settled by any source I could read, so chosen: the drawbridge's raised
  look (no drawbridge is drawn; Gurgleford has a plain bridge); which workshop
  tiles can be walked through (all nine are blocked); a waterfall's animation
  (it is static foam); and colors, which the game takes from the material (one
  fixed color per kind here).

- Overlays that are not forked keep Herdr's rounded frame and shadow.
- `files` and `changes` keep their SVG icons.
- Pure DF blue (`#0000ff`, and `#000080` darker) is hard to read on black:
  a space numbered in blue, the pond. The theme's `ansi` palette is the
  terminals': it holds the iTerm2 colors (the `KB Default` profile), so a shell
  prompt or statusline reads on black. The menu, the map and the tiles do not
  use it: they take the game's own colors from `DF_COLORS` in `kit.js` (black,
  dark gray and white come from the theme, and are the same), so the selection
  bar and hover look as in the game and a theme change recolors terminals only.
  `minimum_contrast` is left at 1.
- The green marks in the menu (`► ☺ ☼ X ▲ ○ +`) are tile glyphs, not keys. Each
  line is a click target; this layout binds no keys. The agents sort popup
  still shows letters (`p`, `g`) that bind nothing.
- Seen working by hand: the blocked and done creatures
  (the blink shows when Herdr reports `done`: another space or tab, not a split
  pane of the shown tab; the line, list and `H` letter also treat working to idle
  in an unfocused pane as finished), the `C` letter,
  Look's cursor, pets, the announcements dialog, the Panel | Tab switch, the
  sort popup, reorder, pin and the space and tab context menus.
