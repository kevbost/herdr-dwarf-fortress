// The fortress: a hall and its rooms carved into solid rock, as the game's
// fortress mode draws it. Rock you have not dug is blank, a wall of shaded blocks
// outlines every room, dug floor is rough (. , ') and finished floor is smoothed
// (+). Packed toward the middle: a great hall with a statue, a cavern below it
// that opens onto a chasm (open space: the level beneath, drawn dim, it cannot
// be walked), a stair room, a dining hall with tables and chairs, bedrooms,
// barracks, workshops with forges, and a stockroom. Stairs and the ramp up are drawn but lead nowhere:
// creatures live on this one level. One level. Pure.

import { hashCell } from "./hash.js";
import { besideAny, cell, cellKey, rectCells, rockCell } from "./shapes.js";
import { workshopCells } from "./workshops.js";

const WIDTH = 96;
const HEIGHT = 40;
const MEETING = { x: 48, y: 20 };

const ROUGH_TILES = ["grassDot", "grassComma", "grassTick"];
const rough = (x, y) => cell("floor", ROUGH_TILES[Math.floor(hashCell(x, y, 41) * ROUGH_TILES.length)], hashCell(x, y, 44) < 0.6 ? "LGRAY" : "DGRAY", true);
const smooth = () => cell("smooth", "smooth", "LGRAY", true);
const stockpile = () => cell("stockpile", "stockpile", "BROWN", true);
const table = () => cell("table", "table", "BROWN", false);
const chair = () => cell("chair", "chair", "BROWN", true);
const bed = () => cell("bed", "bed", "BROWN", false);
const pillar = () => cell("pillar", "pillar", "LGRAY", false);
const stairs = (tileName) => cell("stairs", tileName, "LGRAY", false);
const slope = () => cell("slope", "ramp", "LGRAY", false);
const statue = () => cell("statue", "statue", "WHITE", false);

// What is carved, in order: later things are cut over earlier ones. Everything of
// interest is packed toward the middle, where the sidebar's view looks: the great
// hall with a dining hall, workshops, stair room, bedrooms and stockroom round it
// and the cavern with its chasm below.
function carve() {
  const over = new Map();
  const fill = (rect, make) => rectCells(rect).forEach(({ x, y }) => over.set(cellKey(x, y), make(x, y)));
  const put = (x, y, make) => over.set(cellKey(x, y), make(x, y));
  const stamp = (cells) => cells.forEach(({ x, y, cell: found }) => over.set(cellKey(x, y), found));

  fill({ x: 3, y: 20, w: 93, h: 1 }, rough); // the long corridor, out to the east edge
  fill({ x: 0, y: 20, w: 3, h: 1 }, slope); // the ramp up to the surface, out of reach

  fill({ x: 41, y: 16, w: 15, h: 9 }, smooth); // the great hall
  for (const [x, y] of [[43, 18], [53, 18], [43, 22], [53, 22]]) put(x, y, pillar);
  put(48, 17, statue);

  fill({ x: 48, y: 13, w: 1, h: 3 }, rough); // up to the stair room
  fill({ x: 44, y: 8, w: 9, h: 5 }, smooth); // the stair room
  put(46, 9, () => stairs("stairUp"));
  put(48, 9, () => stairs("stairBoth"));
  put(50, 9, () => stairs("stairDown"));

  fill({ x: 29, y: 18, w: 11, h: 7 }, smooth); // the dining hall, west of the great hall
  for (let x = 31; x <= 38; x += 2) { put(x, 19, table); put(x, 20, chair); put(x, 22, chair); put(x, 23, table); }

  fill({ x: 28, y: 10, w: 6, h: 5 }, smooth); // two bedrooms north of it
  fill({ x: 35, y: 10, w: 6, h: 5 }, smooth);
  for (const x of [29, 32, 36, 39]) put(x, 11, bed);
  fill({ x: 30, y: 15, w: 1, h: 3 }, rough);
  fill({ x: 37, y: 15, w: 1, h: 3 }, rough);

  fill({ x: 57, y: 15, w: 9, h: 5 }, smooth); // the workshops, east of it, open to the corridor
  stamp(workshopCells("carpenter", 58, 16));
  stamp(workshopCells("mason", 62, 16));
  fill({ x: 57, y: 21, w: 9, h: 5 }, smooth);
  stamp(workshopCells("craftsdwarf", 58, 22));
  stamp(workshopCells("forge", 62, 22));

  fill({ x: 56, y: 9, w: 11, h: 5 }, stockpile); // the stockroom, above the workshops
  fill({ x: 60, y: 14, w: 1, h: 1 }, rough);

  fill({ x: 41, y: 25, w: 15, h: 9 }, smooth); // the cavern hall, below the great hall
  fill({ x: 44, y: 27, w: 9, h: 5 }, () => {
    return cell("chasm", "openSpace", "DGRAY", false);
  });
  fill({ x: 48, y: 34, w: 1, h: 6 }, rough); // a way out to the south edge

  fill({ x: 29, y: 27, w: 9, h: 5 }, smooth); // barracks, south-west of the dining hall
  for (const x of [30, 32, 34, 36]) { put(x, 28, bed); put(x, 30, bed); }
  fill({ x: 33, y: 25, w: 1, h: 2 }, rough);

  fill({ x: 57, y: 28, w: 9, h: 5 }, smooth); // a smithy, south-east of the workshops
  stamp(workshopCells("forge", 58, 29));
  stamp(workshopCells("smelter", 62, 29));
  fill({ x: 61, y: 26, w: 1, h: 2 }, rough);
  return over;
}

// The carved cells are worked out the first time the map is used, not when the mod loads.
let carved;
const cellAt = (x, y) => (carved ??= carve()).get(cellKey(x, y)) ?? rockCell(x, y, (nx, ny) => carved.has(cellKey(nx, ny)));

const works = (at, x, y) => besideAny(at, x, y, ["workshop", "table", "stairs", "forge"]);

export const fortress = {
  id: "fortress",
  name: "Cheesedelve",
  width: WIDTH,
  height: HEIGHT,
  meeting: MEETING,
  kinds: ["rock", "wall", "floor", "smooth", "stockpile", "table", "chair", "workshop", "bed", "pillar", "stairs", "slope", "chasm", "statue", "forge"],
  cellAt,
  works,
};
