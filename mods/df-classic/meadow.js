// The meadow: a static outdoor scene, the same every time. Grass, trees, shrubs
// and saplings, boulders, a brook, a pond and a rocky outcrop. No buildings, one
// level. Each cell is a pure function of its position. The embark wagon stands by
// the clearing, 3 x 3 in the game's wagon-body tile.

import { hashCell } from "./hash.js";
import { besideAny, cell, insideEllipse } from "./shapes.js";

const WIDTH = 96;
const HEIGHT = 40;

/** The clearing idle agents gather in; the panel shows the world around it. */
const MEETING = { x: 48, y: 20 };

/** Every kind of cell the meadow holds. */
export const OUTDOOR_KINDS = ["grass", "shrub", "sapling", "tree", "boulder", "brook", "pond", "ramp", "wagon"];

const WAGON = { x: 41, y: 16, w: 3, h: 3 };
const inWagon = (x, y) => x >= WAGON.x && x < WAGON.x + WAGON.w && y >= WAGON.y && y < WAGON.y + WAGON.h;

// The wagon as the game draws it at embark: hatched wagon body on the top row and both sides,
// and two of the load (÷) in black on brown down the middle.
const wagonCell = (x, y) =>
  x === WAGON.x + 1 && y > WAGON.y ? cell("wagon", "divide", "BLACK", false, "BROWN") : cell("wagon", "wagon", "BROWN", false);

const POND = { x: MEETING.x - 10, y: MEETING.y + 4 };
const OUTCROP = { x: MEETING.x - 13, y: MEETING.y - 5 };
const GRASS_TILES = ["grassDot", "grassComma", "grassTick", "grassBacktick"];

const either = (chance, first, second) => (chance < 0.5 ? first : second);

// The brook's west bank on each row: two sines make it wander.
const brookColumn = (y) => MEETING.x + 9 + Math.round(4 * Math.sin(y / 4.5) + 2 * Math.sin(y / 2.1 + 1));

// Trees come in patches: thick in some places, nearly none in others.
function treeChance(x, y) {
  const patch = hashCell(x >> 3, y >> 2, 7);
  return 0.02 + 0.16 * patch * patch;
}

export function cellAt(x, y) {
  if (inWagon(x, y)) return wagonCell(x, y);
  const brook = brookColumn(y);
  // A brook can be walked across, as in the game.
  if (x === brook || x === brook + 1) return cell("brook", either(hashCell(x, y, 8), "water", "ripple"), either(hashCell(x, y, 9), "LCYAN", "LBLUE"), true);
  if (insideEllipse(x, y, POND, 4, 2)) return cell("pond", either(hashCell(x, y, 10), "water", "ripple"), hashCell(x, y, 11) < 0.7 ? "LBLUE" : "BLUE", false);
  if (insideEllipse(x, y, OUTCROP, 2.5, 1.5)) return cell("ramp", "ramp", either(hashCell(x, y, 12), "LGRAY", "DGRAY"), false);
  const clearing = insideEllipse(x, y, MEETING, 5, 2.5);
  if (!clearing && hashCell(x, y, 1) < treeChance(x, y)) return cell("tree", either(hashCell(x, y, 13), "tree", "treeAlt"), either(hashCell(x, y, 14), "LGREEN", "GREEN"), false);
  if (!clearing && hashCell(x, y, 4) < 0.012) return cell("boulder", "boulder", "LGRAY", true);
  if (hashCell(x, y, 2) < 0.015) return cell("sapling", "sapling", "GREEN", true);
  if (hashCell(x, y, 3) < 0.03) return cell("shrub", "shrub", "GREEN", true);
  const grass = GRASS_TILES[Math.floor(hashCell(x, y, 5) * GRASS_TILES.length)];
  return cell("grass", grass, hashCell(x, y, 6) < 0.3 ? "LGREEN" : "GREEN", true);
}


/** Where a working agent has something to do: at a boulder, in the brook, under a tree, or unloading the wagon. */
export function works(at, x, y) {
  const kind = at(x, y).kind;
  return kind === "boulder" || kind === "brook" || at(x, y - 1)?.kind === "tree" || besideAny(at, x, y, ["wagon"]);
}

export const meadow = { id: "meadow", name: "The Velvet Vale", width: WIDTH, height: HEIGHT, meeting: MEETING, kinds: OUTDOOR_KINDS, cellAt, works };
