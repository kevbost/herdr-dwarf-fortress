// The game's workshops, as the Dwarf Fortress Wiki draws each in its 3 x 3 tile
// grid (v0.31 pages; the data is art/wiki_workshop_grids.json, refetched by art/crawl_workshop_grids.py): a cell is
// [tile, color, background], or null where the workshop draws nothing and the
// tile is blank. The whole 3 x 3 is the building, which creatures cannot enter. Pure.

import { cell } from "./shapes.js";

const WORKSHOPS = {
  // Metalsmith's forge
  forge: [
    [["rampDown", "BROWN", "BLACK"], null, null],
    [["boulder", "LRED", "LGRAY"], null, ["boulder", "BLUE", "LGRAY"]],
    [null, ["forge", "DGRAY", "BLACK"], ["bars", "DGRAY", "BLACK"]],
  ],
  // Magma forge
  magmaForge: [
    [["backslash", "DGRAY", "BLACK"], null, null],
    [["workshop", "DGRAY", "RED"], ["lineH", "DGRAY", "BLACK"], ["workshop", "DGRAY", "RED"]],
    [null, ["forge", "DGRAY", "BLACK"], null],
  ],
  // Carpenter's workshop
  carpenter: [
    [null, ["shrub", "LGRAY", "BLACK"], ["stockpile", "BROWN", "BLACK"]],
    [["shadeLight", "DGRAY", "LGRAY"], null, null],
    [["shadeLight", "DGRAY", "LGRAY"], ["floorTile", "DGRAY", "BLACK"], ["shadeLight", "DGRAY", "LGRAY"]],
  ],
  // Mason's workshop
  mason: [
    [["semicolon", "WHITE", "BLACK"], null, ["shadeLight", "DGRAY", "LGRAY"]],
    [["shadeLight", "DGRAY", "LGRAY"], ["bracket", "DGRAY", "BLACK"], ["shadeLight", "DGRAY", "LGRAY"]],
    [null, ["roundO", "LGRAY", "BLACK"], null],
  ],
  // Craftsdwarf's workshop
  craftsdwarf: [
    [null, ["dash", "WHITE", "BLACK"], ["shadeLight", "DGRAY", "LGRAY"]],
    [["shadeLight", "DGRAY", "LGRAY"], ["floorTile", "DGRAY", "BLACK"], null],
    [["shadeLight", "DGRAY", "LGRAY"], ["shadeLight", "DGRAY", "LGRAY"], null],
  ],
  // Smelter
  smelter: [
    [null, ["boulder", "LRED", "LGRAY"], ["floorTile", "DGRAY", "BLACK"]],
    [["stockpile", "BROWN", "BLACK"], null, null],
    [null, null, ["roundO", "DGRAY", "BLACK"]],
  ],
  // Magma smelter
  magmaSmelter: [
    [null, ["boulder", "LRED", "LGRAY"], ["floorTile", "DGRAY", "BLACK"]],
    [["stockpile", "BROWN", "BLACK"], null, null],
    [null, null, ["roundO", "DGRAY", "BLACK"]],
  ],
};

// What each is called when Look is on it: the forges are forges.
const KIND = { forge: "forge", magmaForge: "forge" };

/** The names of the workshops that can be built: "forge", "magmaForge", "carpenter", "mason", "craftsdwarf", "smelter", "magmaSmelter". */
export const workshopNames = () => Object.keys(WORKSHOPS);

/** The nine cells of the named workshop whose top-left corner is x, y: [{ x, y, cell }]. */
export function workshopCells(name, x, y) {
  const grid = WORKSHOPS[name];
  if (!grid) throw new Error(`df-classic: no workshop "${name}"`);
  const kind = KIND[name] ?? "workshop";
  return grid.flatMap((row, dy) => row.map((found, dx) => ({ x: x + dx, y: y + dy, cell: found ? cell(kind, found[0], found[1], false, found[2]) : cell(kind, "blank", "BLACK", false) })));
}
