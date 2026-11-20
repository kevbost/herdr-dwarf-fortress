// The mountainside: autumn woods on the left, and on the right the inside of a
// mountain. The mountain is solid rock, blank where it is not dug and outlined
// by a wall where it meets the woods or a room, with one door in its face. Behind it a hallway runs east, a second one
// crosses it, and 3 x 3 bedrooms line both sides of both, each with its door on
// the hallway, a bed at the far corner and a cabinet and a chest against the far
// wall, the layout players use for bedrooms. One level. Pure.

import { hashCell } from "./hash.js";
import { besideAny, cell, cellKey, insideEllipse, rectCells, rockCell } from "./shapes.js";

const WIDTH = 96;
const HEIGHT = 40;
const MEETING = { x: 42, y: 20 };

// The mountain's face: its west edge on each row, wandering.
const faceColumn = (y) => 50 + Math.round(2 * Math.sin(y / 3.7) + Math.sin(y / 1.7));
const DOOR = { x: faceColumn(MEETING.y), y: MEETING.y };

const GRASS_TILES = ["grassDot", "grassComma", "grassTick", "grassBacktick"];
const LEAVES = ["YELLOW", "BROWN", "BROWN", "LRED"];
const pick = (list, x, y, salt) => list[Math.floor(hashCell(x, y, salt) * list.length)];

function woodsCell(x, y) {
  const clearing = insideEllipse(x, y, MEETING, 5, 2.5);
  const patch = hashCell(x >> 3, y >> 2, 81);
  const foothill = faceColumn(y) - x <= 4;
  if (!clearing && hashCell(x, y, 82) < 0.02 + 0.15 * patch * patch) return cell("tree", hashCell(x, y, 83) < 0.5 ? "tree" : "treeAlt", pick(LEAVES, x, y, 84), false);
  if (!clearing && hashCell(x, y, 85) < (foothill ? 0.05 : 0.012)) return cell("boulder", "boulder", "LGRAY", true);
  if (hashCell(x, y, 86) < 0.03) return cell("shrub", "shrub", "BROWN", true);
  if (hashCell(x, y, 91) < 0.025) return cell("sapling", "sapling", pick(LEAVES, x, y, 92), true);
  if (hashCell(x, y, 93) < 0.02) return cell("reed", "ropeReed", "LGREEN", true);
  return cell("grass", pick(GRASS_TILES, x, y, 87), pick(LEAVES, x, y, 88), true);
}

const ROUGH_TILES = ["grassDot", "grassComma", "grassTick"];
const rough = (x, y) => cell("floor", pick(ROUGH_TILES, x, y, 89), hashCell(x, y, 90) < 0.6 ? "LGRAY" : "DGRAY", true);
const smooth = () => cell("smooth", "smooth", "LGRAY", true);
const door = () => cell("door", "door", "BROWN", true);
const FURNITURE = {
  bed: () => cell("bed", "bed", "BROWN", false),
  cabinet: () => cell("cabinet", "cabinet", "BROWN", false),
  chest: () => cell("chest", "chest", "BROWN", false),
};

// A bedroom is 3 x 3 from its top-left corner x, y. Its door is on the side it faces (the hallway):
// a cell is (across, deep), deep 0 nearest the door. The bed is in the far left corner, the cabinet and the chest on the far wall's right.
const BEDROOM = [["bed", 0, 2], ["cabinet", 2, 2], ["chest", 2, 1]];
const PLACE = {
  s: (x, y, across, deep) => [x + across, y + 2 - deep], // door below
  n: (x, y, across, deep) => [x + across, y + deep], // door above
  e: (x, y, across, deep) => [x + 2 - deep, y + across], // door to the right
  w: (x, y, across, deep) => [x + deep, y + across], // door to the left
};
const DOOR_AT = { s: (x, y) => [x + 1, y + 3], n: (x, y) => [x + 1, y - 1], e: (x, y) => [x + 3, y + 1], w: (x, y) => [x - 1, y + 1] };

function carve() {
  const over = new Map();
  const put = (x, y, make) => over.set(cellKey(x, y), make(x, y));
  const fill = (rect, make) => rectCells(rect).forEach(({ x, y }) => put(x, y, make));
  const bedroom = (x, y, facing) => {
    fill({ x, y, w: 3, h: 3 }, smooth);
    for (const [kind, across, deep] of BEDROOM) put(...PLACE[facing](x, y, across, deep), FURNITURE[kind]);
    put(...DOOR_AT[facing](x, y), door);
  };

  put(DOOR.x, DOOR.y, door); // the door in the mountain's face
  fill({ x: DOOR.x + 1, y: 20, w: 91 - DOOR.x, h: 1 }, rough); // the hallway, east
  fill({ x: 72, y: 3, w: 1, h: 35 }, rough); // the hallway across it, north to south
  for (const x of [54, 58, 62, 78, 82, 86]) { bedroom(x, 16, "s"); bedroom(x, 22, "n"); } // along the first
  for (const y of [4, 8, 12, 16, 22, 26, 30, 34]) { bedroom(68, y, "e"); bedroom(74, y, "w"); } // along the second
  return over;
}

// The carved cells are worked out the first time the map is used, not when the mod loads.
let carved;
const isOpen = (x, y) => carved.has(cellKey(x, y)) || x < faceColumn(y);
const cellAt = (x, y) => (carved ??= carve()).get(cellKey(x, y)) ?? (x < faceColumn(y) ? woodsCell(x, y) : rockCell(x, y, isOpen));

const WORK_KINDS = ["bed", "cabinet", "chest"];
/** Where a working agent has something to do: at a boulder, under a tree, or beside a bed, a cabinet or a chest. */
const works = (at, x, y) => at(x, y).kind === "boulder" || at(x, y - 1)?.kind === "tree" || besideAny(at, x, y, WORK_KINDS);

export const mountainside = {
  id: "mountainside",
  name: "Snoring Halls",
  width: WIDTH,
  height: HEIGHT,
  meeting: MEETING,
  kinds: ["grass", "shrub", "sapling", "reed", "tree", "boulder", "rock", "wall", "floor", "smooth", "door", "bed", "cabinet", "chest"],
  cellAt,
  works,
};
