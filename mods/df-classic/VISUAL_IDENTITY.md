# Dwarf Fortress Classic: Visual Identity

> Shipped with the layout as the look reference. The screenshots it names are not included (they were collected from the community and the game's own pages); where it says **Seen**, that is what the screenshots showed. `SYMBOLS.md` holds the glyph table.

Scope: the original ASCII interface, v0.47.05 and earlier (pre-Steam, Bay 12 download, "old UI"). Visual identity and layout only. No gameplay, no controls beyond what is drawn on screen.

Not in scope: v50+ in any form. The free v50 "Classic" build keeps the ASCII glyphs but uses the new mouse UI, so it is not this look.

Evidence labels used below:

- **Seen**: visible in a screenshot in this directory.
- **Documented**: stated by a cited source, not checked against a screenshot here.
- **Inferred**: my reading, not confirmed by either.

## 1. Identity in one paragraph

A terminal. The whole window is one fixed grid of character cells, and every pixel on screen is a cell: map, menus, borders, numbers and titles are all drawn with the same 256-glyph bitmap font in one of 16 colors on a black ground. There are no icons, no gradients, no rounded corners, no shadows, no separate UI font and no overlapping windows. Regions are split by one-cell gray bars. Color carries meaning, glyph shape carries type, and density is very high.

## 2. The grid

- One uniform cell grid fills the window. Default is 80 x 25 cells (**Seen**: `Nightmare_cga_8x8.jpg`, `Zara_8x8.jpg`, `RDE_8x8_screencap.png` top half are all 80 columns wide).
- Later builds let the window resize, and the grid grows with it rather than scaling the glyphs (**Seen**: `Cheepicus_8x8_ss.png` is about 131 x 90 cells of 8 x 8 px).
- Every element snaps to cells. Nothing is positioned at sub-cell offsets.
- Cell shape depends on the tileset:
  - Default "curses" sets are rectangular, 8 x 12 px (640 x 300 window) and 10 x 12 px (800 x 600). Uppercase letters sit in a 7 x 9 box. The 8 x 12 font is close to Fixedsys / IBM MDA (**Documented**: Tileset repository).
  - Community sets are usually square: 6 x 6, 8 x 8, 16 x 16, 20 x 20 (**Seen**: file names in this directory).
- Rectangular cells give readable text and a horizontally squished map. Square cells give a true-proportion map and wide, letter-spaced text (**Seen**: `1600px-Bisasam_20x20_preview.png`, `Shaja_10-27-09.png`). That airy, tracked-out text is a recognizable part of the square-tileset look.

## 3. Glyphs

- 256 tiles, IBM Code Page 437, stored as a 16 x 16 sheet (**Documented**).
- The same sheet draws text and world. A `c` in a menu and a cat are the same tile.
- Glyph vocabulary seen across the screenshots:
  - Box drawing (single and double line) and solid blocks for walls.
  - `+` for smoothed floor, `.` `,` `'` `` ` `` for rough floor and ground.
  - `=` and `≡` for stockpiles and bars, `#` for grates and tracks.
  - `☺` for dwarves, letters for creatures (`c` cat, `d` dog).
  - `♠ ♣ τ "` for trees and plants, `▲ ▼` for ramps and slopes.
  - `≈ ~` for water and magma, digits `1`-`7` for fluid depth.
  - `☼` as the currency / masterwork mark, `Ω π ╤ Θ` for furniture.
  - `█ ▓ ▒ ░` shade blocks for fills, the depth bar and minimap.
- Tilesets may redraw glyphs as small pictures (barrels, skulls, beds in `1600px-Bisasam_20x20_mod_T_preview.png`), but the one-tile-per-cell rule holds.

## 4. Color

16 colors, each cell has one foreground and one background. Default scheme (**Documented**: DF2014:Color scheme, default `colors.txt`), identical to the 16 standard HTML colors:

| Dark    | Hex       | Bright   | Hex       |
| ------- | --------- | -------- | --------- |
| BLACK   | `#000000` | DGRAY    | `#808080` |
| BLUE    | `#000080` | LBLUE    | `#0000ff` |
| GREEN   | `#008000` | LGREEN   | `#00ff00` |
| CYAN    | `#008080` | LCYAN    | `#00ffff` |
| RED     | `#800000` | LRED     | `#ff0000` |
| MAGENTA | `#800080` | LMAGENTA | `#ff00ff` |
| BROWN   | `#808000` | YELLOW   | `#ffff00` |
| LGRAY   | `#c0c0c0` | WHITE    | `#ffffff` |

Rules of use:

- Background is BLACK almost everywhere. Unexplored space is pure black.
- Colors come in dark/bright pairs. A pair is how the game shows contrast and blinking (**Documented**).
- Background color is always from the dark half. Bright is foreground only (**Documented**: Color).
- Chrome uses LGRAY and DGRAY. Hotkeys use LGREEN. Body text is LGRAY or WHITE.
- Players swap the 16 values freely, so screenshots differ in hue (**Seen**: `DortenSolidex1.png` uses an orange/earth scheme, `Shizzle16x20Screenshot.png` a muted teal/brick one). Structure and roles stay the same.

Semantic color conventions (**Seen** unless marked):

- LGREEN on dark green: `*PAUSED*`.
- YELLOW on BROWN: `Idlers: N`.
- BLACK on LGRAY: the centered title, and header bars on full screens.
- WHITE on CYAN: `FPS: 50 (49)`.
- Report letters in the left border: `C` red (combat), `H` green (hunting), `S` blue (sparring) (**Documented**: DF2014:Interface; `C` and `H` seen).
- Water LBLUE, magma LRED, one level down shows the dark partner (**Documented**).
- Profession colors label dwarves and list rows (see section 7).
- DGRAY text marks a disabled or empty entry (`D: Depot Access`, `None`).

## 5. Frame and chrome

One-cell bars are the only chrome. All **Seen**.

- **Outer border**: a one-cell frame on all four sides, filled with LGRAY or DGRAY tiles. Depending on the tileset it reads as a flat gray bar (`Shizzle16x20Screenshot.png`), a row of beveled square studs (`1600px-Bisasam_20x20_mod_T_preview.png`) or a dithered texture (`DortenSolidex1.png`).
- **Dividers**: the same one-cell gray bar, vertical, between map, menu and minimap. No horizontal dividers on the main screen.
- **Labels sit inside the top border**, each as text on a colored background that replaces border cells:
  - top-left: `*PAUSED*` (only while paused)
  - after it: `FPS: 50 (49)` (only if enabled)
  - top-center: `Dwarf Fortress`, black on light gray, centered over the whole window, not over the map
  - top-right: `Idlers: 6`
- **Depth bar**: the last column inside the right border, one cell wide, full height. Solid color segments: cyan/teal for sky, brown for underground, a single yellow cell marking the viewed level. The z-level number is written vertically, one digit per cell, at the bottom (`149`, `100`). A small red mark or digit sits at the top.
- **Moon phase**: one glyph in the top-right corner cell (`)` in `Shizzle16x20Screenshot.png`) (**Documented** as moon phase: DF2014:Interface).
- **Report letters**: `C`, `H`, `S` stacked in the left border column, near the top.

Version drift (**Seen**): in the oldest shots (`Nightmare_*.jpg`, `Zara_8x8.jpg`, 80 x 25) `Idlers` sits in the bottom border at the right and `*PAUSED*` is repeated at the top-right over the menu. In later shots `Idlers` is top-right and `*PAUSED*` appears once.

## 6. Main screen layout variants

The main screen is a row of up to three panels inside the border. `Tab` cycles the arrangement (the menu itself says `Tab: Move this menu/map`).

### Variant A: map + menu (most common)

**Seen**: `Cheepicus_8x8_ss.png`, `Shizzle16x20Screenshot.png`, `1600px-Bisasam_20x20_mod_T_preview.png`, `1600px-Bisasam_20x20_preview.png`, `Nightmare_cga_8x8.jpg`, `Nightmare_6x6_v2.jpg`, `Zara_8x8.jpg`, `RDE_8x8_screencap.png` (top half).

```
┌*PAUSED*─FPS: 50 (49)────── Dwarf Fortress ──────────Idlers: 6─)┐
│C                                    │ a: View Announcements    ▓│
│H                                    │ b: Building   r: Reports ▓│
│                                     │ c: View Civilizations    ▓│
│               MAP                   │ d: Designations o: ...   █│
│                                     │ ...                      ░│
│                                     │                          ░│
│                                     │ Space: Resume .: One-Step1│
│                                     │                          4│
│                                     │                          9│
└─────────────────────────────────────┴───────────────────────────┘
```

- Menu is a fixed-width column on the right, about 31 cells wide on an 80-column grid (roughly 39%). On larger windows it stays narrow and the map takes the rest (about 24% in `Cheepicus_8x8_ss.png`).
- Map is flush to the border on its other three sides. No padding.
- Menu has a one-cell left margin and one blank row at the top.

### Variant B: map + menu + area map

**Seen**: `DortenSolidex1.png`.

- Three panels left to right: map, menu, area map, then the depth bar.
- Proportions in that shot: map about 52%, menu about 25%, area map about 19%.
- The area map is the whole embark at the current level in coarse glyphs (`n`, `∩`, `♠`, `≈`), vertically centered in its panel with black above and below. A yellow `X` marks the viewed spot.
- When a panel has spare cells, the tileset's "empty" tile fills it, so the panel can read as textured rather than black.

### Variant C: map only

**Seen**: `Df_anikki_2.png` (top half).

- Map spans the full width inside the border. Title and `Idlers` stay in the top border.
- The announcement line is visible at the bottom of the map.

### Other Tab states

**Documented**: the walkthrough says `Tab` "cycles through various menu arrangements", and the Controls page describes it as useful "for enlarging unreadable menus". A wider-menu state is therefore likely (**Inferred**), but no screenshot here shows it.

### Elements shared by all variants

- **Menu text**: one entry per row. Hotkey glyph in LGREEN, then `:`, then the label in LGRAY/WHITE. Short entries pack two to a row (`b: Building    r: Reports`). A blank row, then `Space: Resume  .: One-Step` as a footer. No selection highlight on the top menu, no boxes, no bullets.
- **Announcements**: a single line of colored text on black at the bottom row of the map, overwriting map cells (`The Woodcutter ... has organized a party at Well.`).
- **Cursor**: a yellow `X` on the map and area map.

## 7. Full-screen variants

Full screens replace the three-panel row. They keep the one-cell gray frame.

### Status screen

**Seen**: `Shaja_10-27-09.png`, `Df_anikki_2.png` (bottom half).

- Row 1: a light gray bar. Fortress name and translated name at the left (`Village Sigunthatthil, "Tourautumns"`), date at the right (`22nd Sandstone, 1060, Mid-Autumn`), both black on LGRAY, with a gap of border tiles between them.
- Rows 2-4: a black band holding a row of section names spaced like tabs: `Animals  Kitchen  Stone  Stocks ........ Justice`. Selected one is WHITE, others LGRAY. No tab shapes, only text.
- A one-cell gray bar, then the body: a black panel inset one cell from the frame.
- Body is three text columns:
  - left: wealth lines, each label in its own color (Weapons red, Armor cyan, Furniture blue, Other Objects green, Architecture gray, Displayed magenta, Held/Worn yellow), values in YELLOW with `☼`; then food stores in two sub-columns.
  - middle: `Population:` then profession groups, each name in its profession color, a one-cell unit glyph, a right-aligned count.
  - right: military ranks in color with counts, `None` in DGRAY.
- Label/value alignment is by cell columns. There are no rules or table lines.

### Embark: Choose Fortress Location

**Seen**: `RDE_8x8_screencap.png` (bottom half).

- Title centered in the top border, black on LGRAY.
- A row of three map panels labeled `Local`, `Region`, `World` in white above each, growing in width left to right, then a text column at the right with the site name, biome lines (`Temperature: Cold`, value colored) and soil/stone flags, one per row in different colors.
- Bottom rows: place names, then a block of key hints in the same green-key, gray-label format as the menu.

## 8. Window

- A plain OS window with the native title bar reading `Dwarf Fortress` (**Seen**: Windows XP, Windows 7 and Ubuntu frames in the screenshots). The game draws nothing outside its grid.
- Content starts at the window's top-left pixel. No margin around the grid.

## 9. Outliers in this directory

- `dwarf_stone_modded.webp`: an isometric 3D map with a TrueType menu. This is a third-party visualizer overlay on the classic game, not the native ASCII look (**Inferred** from the isometric sprites; the tool is most likely Stonesense). Useful only for the menu text content. TrueType interface text was an optional setting in classic (**Documented**: Graphics).
- `1600px-Bisasam_20x20_preview.png`, `Nightmare_*.jpg`, `Zara_8x8.jpg`: older builds. Menu wording differs (`Site a Building`, `x: Squads`, `V: Visualize`), layout rules are the same.

## 10. Screenshot index

| File | Size (px) | Shows |
| --- | --- | --- |
| `Cheepicus_8x8_ss.png` | 1052 x 724 | Variant A, large grid, 8 x 8 square tiles, FPS label |
| `Shizzle16x20Screenshot.png` | 1298 x 543 | Variant A, 16 x 20 tiles, clearest chrome and depth bar |
| `1600px-Bisasam_20x20_mod_T_preview.png` | 1600 x 1028 | Variant A, 20 x 20 pictorial tileset, studded border |
| `1600px-Bisasam_20x20_preview.png` | 1600 x 608 | Variant A, older build, wide-tracked text |
| `DortenSolidex1.png` | 1074 x 562 | Variant B, area map panel, custom color scheme |
| `Df_anikki_2.png` | 656 x 424 | Variant C over the status screen |
| `Shaja_10-27-09.png` | 1600 x 800 | Status screen, large tiles |
| `RDE_8x8_screencap.png` | 640 x 400 | Variant A over the embark screen, 80 columns |
| `Nightmare_cga_8x8.jpg` | 646 x 225 | Variant A, 80 x 25, old build, XP window |
| `Nightmare_6x6_v2.jpg` | 486 x 175 | Variant A, 80 x 25 at 6 x 6, smallest readable size |
| `Zara_8x8.jpg` | 646 x 225 | Variant A, 80 x 25, old build |
| `dwarf_stone_modded.webp` | 860 x 521 | Outlier: isometric visualizer |

## 11. Sources

- https://www.bay12games.com/dwarves/screens.html (official screenshots; the page has no text, thumbnails not reviewed here)
- https://dwarffortresswiki.org/index.php/DF2014:Interface
- https://dwarffortresswiki.org/index.php/DF2014:Graphics
- https://dwarffortresswiki.org/index.php/DF2014:Color_scheme
- https://dwarffortresswiki.org/index.php/DF2014:Controls
- https://dwarffortresswiki.org/color
- https://dwarffortresswiki.org/index.php/Tilesets
- https://dwarffortresswiki.org/Tileset_repository
- https://df-walkthrough.readthedocs.io/en/latest/chapters/chap01-setup-starting.html
