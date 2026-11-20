// The settlement: a walled frontier town on dry plains, its own ground and not
// the meadow's. The town is packed toward the middle of the map, where the
// sidebar's view looks: a cobbled plaza with a well and market stalls where the
// two streets cross; round it a tavern, a smithy, a shop, a barn and four
// houses; a log palisade with a gate on each street; ploughed fields and dry
// scrub outside. Walls are the double-line box characters picked by what each
// joins; furniture blocks, and a working agent stands beside a workshop or a
// table. One level. Pure.

import { hashCell } from "./hash.js";
import { besideAny, cell, cellKey, rectCells, wallTile } from "./shapes.js";
import { workshopCells } from "./workshops.js";

const WIDTH = 96;
const HEIGHT = 40;
const MEETING = { x: 48, y: 20 };

// The palisade's ring, and so what is inside the town.
const RING = { x: 26, y: 8, w: 45, h: 25 };
const GATES = [[26, 20], [70, 20], [48, 8], [48, 32]];

const DIRT_TILES = ["grassDot", "grassComma", "grassTick", "grassBacktick"];
const inside = (x, y) => x >= RING.x && x < RING.x + RING.w && y >= RING.y && y < RING.y + RING.h;

// The plains: dry ground, scrub, boulders, and a few dead trees well outside the walls.
function plainsCell(x, y) {
  if (!inside(x, y) && hashCell(x, y, 51) < 0.014) return cell("tree", "deadTree", "BROWN", false);
  if (hashCell(x, y, 54) < 0.01) return cell("boulder", "boulder", "LGRAY", true);
  if (hashCell(x, y, 55) < 0.03) return cell("scrub", "shrub", "BROWN", true);
  const tile = DIRT_TILES[Math.floor(hashCell(x, y, 56) * DIRT_TILES.length)];
  const shade = hashCell(x, y, 57);
  return cell("dirt", tile, shade < 0.12 ? "YELLOW" : shade < 0.35 ? "DGRAY" : "BROWN", true);
}

const ROADS = [
  { x: 8, y: 20, w: 83, h: 1 }, // east to west, out past both gates
  { x: 48, y: 3, w: 1, h: 35 }, // north to south, out past both gates
  { x: 31, y: 19, w: 1, h: 1 }, { x: 31, y: 21, w: 1, h: 1 }, { x: 64, y: 19, w: 1, h: 1 }, { x: 64, y: 21, w: 1, h: 1 }, // house steps
];
const PLAZA = { x: 43, y: 18, w: 11, h: 5 };
const FIELDS = [{ x: 74, y: 11, w: 16, h: 6 }, { x: 74, y: 24, w: 16, h: 6 }, { x: 6, y: 11, w: 16, h: 6 }, { x: 6, y: 24, w: 16, h: 6 }];

// Every door opens onto a road cell. Furniture is [kind, x, y]; workshops (3 x 3) are [kind, x, y] of their top-left corner.
const row = (kind, xs, y) => xs.map((x) => [kind, x, y]);
const BUILDINGS = [
  { x: 38, y: 11, w: 10, h: 6, doors: [[47, 14]], furniture: [...row("table", [40, 42, 44], 13), ...row("table", [41, 43, 45], 15)] }, // the tavern
  { x: 49, y: 11, w: 9, h: 6, doors: [[49, 14]], furniture: [], workshops: [["forge", 51, 12], ["smelter", 54, 12]] }, // the smithy
  { x: 38, y: 24, w: 10, h: 6, doors: [[47, 26]], furniture: row("stockpile", [44, 45, 46], 27), workshops: [["craftsdwarf", 40, 25]] }, // the shop
  { x: 49, y: 24, w: 10, h: 6, doors: [[49, 26]], furniture: [], hay: true }, // the barn, hay inside
  { x: 28, y: 13, w: 8, h: 6, doors: [[31, 18]], furniture: [["bed", 29, 14], ["bed", 34, 14]] },
  { x: 28, y: 22, w: 8, h: 6, doors: [[31, 22]], furniture: [["bed", 29, 24]] },
  { x: 61, y: 13, w: 8, h: 6, doors: [[64, 18]], furniture: [["bed", 62, 14], ["bed", 67, 14]] },
  { x: 61, y: 22, w: 8, h: 6, doors: [[64, 22]], furniture: [["bed", 62, 24]] },
];

const FURNITURE = {
  table: () => cell("table", "table", "BROWN", false),
  bed: () => cell("bed", "bed", "BROWN", false),
  stockpile: () => cell("stockpile", "stockpile", "BROWN", true),
};
const STALLS = [[50, 18], [52, 18], [44, 22], [46, 22], [50, 22], [52, 22]];

function stamp() {
  const over = new Map();
  const set = (x, y, found) => over.set(cellKey(x, y), found);
  for (const field of FIELDS) for (const { x, y } of rectCells(field)) set(x, y, cell("field", "furrow", hashCell(x, y, 58) < 0.3 ? "YELLOW" : "BROWN", true));
  for (const road of ROADS) for (const { x, y } of rectCells(road)) set(x, y, cell("road", "road", hashCell(x, y, 59) < 0.25 ? "YELLOW" : "BROWN", true));
  for (const { x, y } of rectCells(PLAZA)) set(x, y, cell("plaza", "stoneRoad", hashCell(x, y, 60) < 0.3 ? "DGRAY" : "LGRAY", true));
  set(44, 18, cell("well", "well", "LCYAN", false));
  for (const [x, y] of STALLS) set(x, y, FURNITURE.table());
  for (const { x, y, edge } of rectCells(RING)) if (edge) set(x, y, cell("palisade", "pillar", "BROWN", false));
  for (const [x, y] of GATES) set(x, y, cell("gate", "door", "BROWN", true));
  for (const building of BUILDINGS) {
    // A barn's floor is hay; the others' is boards.
    const { hay = false } = building;
    for (const { x, y, edge } of rectCells(building)) set(x, y, edge ? cell("wall", "boxH", "LGRAY", false) : hay ? FURNITURE.stockpile() : cell("floor", "smooth", "BROWN", true));
    for (const [x, y] of building.doors) set(x, y, cell("door", "door", "BROWN", true));
    for (const [kind, x, y] of building.furniture) set(x, y, FURNITURE[kind]());
    for (const [kind, x, y] of building.workshops ?? []) for (const { x: cx, y: cy, cell: found } of workshopCells(kind, x, y)) set(cx, cy, found);
  }
  // A wall takes its box character from the walls and doors it joins.
  const joins = (x, y) => ["wall", "door"].includes(over.get(cellKey(x, y))?.kind);
  for (const [key, found] of over) {
    if (found.kind !== "wall") continue;
    const [x, y] = key.split(",").map(Number);
    over.set(key, cell("wall", wallTile(joins(x, y - 1), joins(x + 1, y), joins(x, y + 1), joins(x - 1, y)), "LGRAY", false));
  }
  return over;
}

// The town's stamped cells are worked out the first time the map is used, not when the mod loads.
let placed;
const cellAt = (x, y) => (placed ??= stamp()).get(cellKey(x, y)) ?? plainsCell(x, y);

const works = (at, x, y) => {
  const kind = at(x, y).kind;
  return kind === "boulder" || at(x, y - 1)?.kind === "tree" || besideAny(at, x, y, ["workshop", "forge", "table", "well"]);
};

export const settlement = {
  id: "settlement",
  name: "The Dusty Moot",
  width: WIDTH,
  height: HEIGHT,
  meeting: MEETING,
  kinds: ["dirt", "scrub", "tree", "boulder", "road", "plaza", "well", "palisade", "gate", "field", "wall", "floor", "door", "table", "workshop", "forge", "bed", "stockpile"],
  cellAt,
  works,
};
