# The game's glyphs, and which this layout draws

Every tile in this layout is one character of code page 437, drawn with the game's own meaning where the game has one. This is the reference the maps were checked against. When a glyph is chosen for the map, look here first; if the game has a glyph for it, use that one.

**Sources.** The main one is a fan page, ["Help! What do all these symbols mean?"](https://dorfs.weebly.com/help-what-do-all-these-symbols-mean.html) (dorfs.weebly.com), which lists what each of the 256 codes is used for. It carries no licence line, so this file is a condensed, reworded table of facts (which glyph means what), not a copy of the page. Its entries mix items, map tiles and world-map symbols, and it gives no colors. Checked against the reference screenshots the layout was built against (vanilla ASCII fortress views; not shipped). The Dwarf Fortress Wiki [Map legend](https://dwarffortresswiki.org/index.php/Map_legend) (GFDL and MIT) confirms the tree glyphs; it is the embark-map legend, not the in-fortress one.

**Not settled by any source I could read:** the drawbridge's raised look (it is not used), which workshop tiles can be walked through (all nine are blocked here), colors are the wiki's where it gives them; elsewhere they follow the material), and colors for most things (colors here follow the material: gray stone, brown wood, white foam).

## Ground and terrain

| Tile | Code | What the game uses it for | This layout |
| --- | --- | --- | --- |
| ` ` blank | 0, 32 | Unexplored rock; the black background. Unexplored rock also shows here and there as a dim `. , ' `` ` (also `%`) | Undug rock: blank, with a dim mark in about 1 cell in 16 |
| `. , ' `` ` | 46, 44, 39, 96 | Rough floor and ground | Grass, dirt, ash, dug floors |
| `+` | 43 | Smoothed or constructed floor; block bridge or road | Smoothed room floors |
| `▒ ▓ ░` | 177, 178, 176 | Partly dug rock, wall faces, various stones and soils | Wall faces around dug rooms and the mountain |
| `≈` | 247 | Water (with white flecks of foam here and there), magma, snow, sand, farm plot, rough stone road or bridge, sea foam | Water, magma, snow, waterfall foam, ploughed fields, the plaza |
| `~` | 126 | Flowing water, dirt road, furrowed soil, sand | Brook ripples, dirt roads |
| `·` | 250 | Open space; terrain at a lower level | The fortress chasm |
| `≥ ≤` | 242, 243 | Debris and ashes | Ash on the volcano's plains |
| `▲ ▼` | 30, 31 | Ramp up, ramp down | Slopes of hills and the volcano rim, the fortress ramp |
| `∞` | 236 | Boulder, dry brook (`•` 7 is stone) | Boulders are `•` (see below) |
| `•` | 7 | Stone; a solid workshop tile | Boulders (as in the screenshots) |

## Plants

| Tile | Code | What the game uses it for | This layout |
| --- | --- | --- | --- |
| `♣ ♠` | 5, 6 | Broadleaf and many other trees, fungi | Meadow and autumn trees |
| `↑` | 24 | Pine and larch | Gurgleford pines |
| `↨` | 23 | Cedar | Not used |
| `╞` | 198 | Winter trees, dead and undead trees | Dead trees on the plains and ash |
| `⌠` | 244 | Willow | Not used |
| `Γ` | 226 | Palm and other tropical trees | Not used |
| `τ` | 231 | Tree sapling, many small plants | Saplings |
| `ƒ` | 159 | Rope reed (a plant), splints | Rope reed on the forest floors of Gurgleford and the mountainside woods |
| `"` | 34 | Shrub | Shrubs, scrub |

## Buildings and furniture

| Tile | Code | What the game uses it for | This layout |
| --- | --- | --- | --- |
| `┼` | 197 | Doors (wooden doors are also `║`, metal doors `╪ ≡`) | Every door and gate |
| `═ ║ ╔ ╗ ╚ ╝ ╬ ╠ ╣ ╦ ╩` | 205, 186, 201 to 206 | Smooth and constructed walls; bridges | Walls (joined by neighbors), bridges |
| `Θ` | 233 | Bed | Beds |
| `╤` | 209 | Table | Tables |
| `╥` | 210 | Chair | Dining hall chairs |
| `π` | 227 | Cabinet | Bedroom cabinets |
| `Æ` | 146 | Coffer (chest), quiver, backpack | Bedroom chests |
| `Ω` | 234 | Statue | Statues |
| `○` | 9 | Well | The settlement well |
| `O` | 79 | Column; wall construction; trade depot post | Pillars, the settlement palisade |
| `=` | 61 | Empty stockpile | Stockpiles and the barn's hay |
| `< > X` | 60, 62, 88 | Stairs up, down, both | The fortress stair room |
| workshops |  | Each is a 3 x 3 grid of a few glyphs with their own colors, listed on its [wiki page](https://dwarffortresswiki.org/index.php/v0.31:Workshop) (the data is `art/wiki_workshop_grids.json`, refetched by `art/crawl_workshop_grids.py`) | The forge, magma forge, carpenter's, mason's and craftsdwarf's workshops, the smelter and magma smelter, drawn from those grids in `workshops.js` |
| `▓` | 178 | Wagon body (also tanner's and butcher's shops, marble, granite) | The embark wagon: hatched body on the top row and sides, two `÷` in black on brown down the middle (copied from an embark screenshot) |
| `╔═╗ ║ ║ ╚═╝` | 201 to 205 | A bridge: a double-line outline with the floor of what it is built of inside (`+` for blocks, `≈` for rough stone) | Bridges in the volcano and Gurgleford (both block, `+`) |
| `≈` or `+` | 247, 43 | A road, 3 cells wide here, in the color of the material it is built on | The Gurgleford road |
| `!` `#` | 33, 35 | Status text; floor grate | Not used |

There is no hearth or fireplace in the game, so none is drawn.

## Creatures (letters)

`☺` civilian dwarf (1), `☻` military dwarf (2), `@` adventurer, merchant or berserk dwarf (64), and the letters for animals and monsters: `c` cat, `d` dog, `g` goblin, `e` elf, `k` kobold, `h` harpy, `a` antman, `b` batman, `f` frogman, `i` fire imp, `m` mandrill, `r` ratman, `s` snakeman, `t` troglodyte, `w` wolf, `A` alligator, `B` bear, `C` cow, `D` dragon, `E` elephant, `H` horse, `L` leopard, `M` magma man or mule, `R` giant rat, `S` sasquatch or scorpion or spider, `U` human or unicorn. Letters not listed are only text in the game.

## Interface marks

`↑ ↓ → ←` (24 to 27) are bridge direction text, `↓` also marks hungry, thirsty or drowsy; `☼` (15) is the currency mark, a gem cluster, coal, webs and the sun; `‼` (19) a cage or the on-fire mark; `?` (63) a task assigned; `Z` (90) the sleep mark; `X` (88) also marks nausea, stunned, unconscious and migrants; the digits `1` to `7` (49 to 55) are fluid depth when the game's `SHOW_FLOW_AMOUNTS` is on (this layout leaves it off, as the vanilla screenshots do).

## Dwarf Fortress tiles in the world map (not used here)

`∩` hills (239), `⌂` low mountains (127), `▲` mountains, `n` grassland or hills (110), `ⁿ` savanna (252), `^` volcano or peak (94), `Ω` dwarven sites (234), `╞ ┤ ♠ ♣ ↑ ↨ Γ ⌠` forests by kind.
