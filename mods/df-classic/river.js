// The river: a conifer forest on a ridge of three levels, seen from the middle
// one, which is the only one creatures can stand on. North, the ground is a level
// higher: blank rock, outlined by a wall, and the river comes off its edge in a
// waterfall (white and cyan foam, as in the game's own waterfall pictures) and
// lands in the middle level. South, the ground is a level lower, drawn dim in the
// dark partner colors and out of reach, and the river drops off the edge of the
// middle level in a second waterfall. A bridge crosses the river on the dirt road,
// and small hills (a ring of slopes up to a level you cannot reach, the rock inside
// blank) stand here and there. A one-room cabin stands north of the road, west of the
// bridge. Pines are the game's ↑. One level to walk on. Pure.

import { hashCell } from "./hash.js";
import { BESIDE, besideAny, blankRock, bridgeCell, cell, insideEllipse, rockCell, wallTile } from "./shapes.js";

const WIDTH = 96;
const HEIGHT = 40;
const MEETING = { x: 50, y: 20 };

const RIVER_WIDTH = 4;
const BRIDGE_ROW = 20;
// The road and the bridge are three cells wide, as in the game: the road is ≈ in brown, the bridge is built of blocks (+), also brown.
const onRoad = (y) => Math.abs(y - BRIDGE_ROW) <= 1;
const CLIFF = 13; // about the first row of the middle level: the higher ground is north of it
const FALL_SHEET = 2; // rows of falling water on the cliff face
const DROP = 27; // about the last row of the middle level: the lower ground is south of it

// The two edges are not ruled lines: each wanders a row either way along its length.
const edge = (x, salt) => Math.round(0.8 * Math.sin(x / 4.3 + salt) + 0.5 * Math.sin(x / 1.9 + 2 * salt));
const cliffRow = (x) => CLIFF + edge(x, 1);
const dropRow = (x) => DROP + edge(x, 4);

// The river's west bank on each row: two sines make it wander, except where the bridge crosses, where it runs straight.
const STRAIGHT = { from: 16, to: 24 };
const along = (y) => (y < STRAIGHT.from ? y : y > STRAIGHT.to ? y - (STRAIGHT.to - STRAIGHT.from) : STRAIGHT.from);
const riverColumn = (y) => 59 + Math.round(2 * Math.sin(along(y) / 4.7) + Math.sin(along(y) / 2.3 + 1));
const inRiver = (x, y) => x >= riverColumn(y) && x < riverColumn(y) + RIVER_WIDTH;
// A bridge is a rectangle: as long as the river is wide where the road crosses it, and a cell more on each bank.
const BRIDGE_X = riverColumn(BRIDGE_ROW);
const isBridge = (x, y) => onRoad(y) && x >= BRIDGE_X - 1 && x < BRIDGE_X + RIVER_WIDTH + 1;

const foam = (x, y, salt, lower) => cell("waterfall", hashCell(x, y, salt) < 0.6 ? "water" : "ripple", hashCell(x, y, salt + 1) < 0.5 ? (lower ? "LGRAY" : "WHITE") : "CYAN", false);

// Small hills on both banks of the middle level: [center x, center y, radius x, radius y].
const HILLS = [[40, 16, 2.6, 1.4], [67, 24, 2.6, 1.4], [24, 17, 3, 1.5], [30, 24, 3, 1.4], [76, 16, 3, 1.5], [84, 23, 3, 1.4], [14, 23, 2.4, 1.3], [90, 17, 2.4, 1.3]];
const inHill = (x, y) => HILLS.some(([cx, cy, rx, ry]) => insideEllipse(x, y, { x: cx, y: cy }, rx, ry));
const hillCell = (x, y) => {
  if (!inHill(x, y)) return null;
  if (BESIDE.every(([dx, dy]) => inHill(x + dx, y + dy))) return blankRock(x, y);
  return cell("slope", hashCell(x, y, 91) < 0.5 ? "ramp" : "rampDown", hashCell(x, y, 92) < 0.3 ? "LGREEN" : "GREEN", false);
};

// The cabin: walls round a room of 6 x 3, its door on the south wall opening onto the road. Furniture is [kind, x, y].
const CABIN = { x: 47, y: 14, w: 8, h: 5, door: [51, 18] };
const FURNITURE = new Map([
  ["bed", [48, 15]], ["cabinet", [52, 15]], ["chest", [53, 15]],
  ["chair", [49, 16]], ["table", [50, 16]], ["chair2", [51, 16]],
].map(([kind, at]) => [`${at[0]},${at[1]}`, kind.replace("2", "")]));
const FURNISHED = { bed: () => cell("bed", "bed", "BROWN", false), cabinet: () => cell("cabinet", "cabinet", "BROWN", false), chest: () => cell("chest", "chest", "BROWN", false), chair: () => cell("chair", "chair", "BROWN", true), table: () => cell("table", "table", "BROWN", false) };
function cabinCell(x, y) {
  if (x < CABIN.x || x >= CABIN.x + CABIN.w || y < CABIN.y || y >= CABIN.y + CABIN.h) return null;
  if (x === CABIN.door[0] && y === CABIN.door[1]) return cell("door", "door", "BROWN", true);
  const onEdge = x === CABIN.x || x === CABIN.x + CABIN.w - 1 || y === CABIN.y || y === CABIN.y + CABIN.h - 1;
  if (!onEdge) return FURNISHED[FURNITURE.get(`${x},${y}`)]?.() ?? cell("floor", "grassDot", "BROWN", true);
  const joins = (px, py) => px >= CABIN.x && px < CABIN.x + CABIN.w && py >= CABIN.y && py < CABIN.y + CABIN.h && (px === CABIN.x || px === CABIN.x + CABIN.w - 1 || py === CABIN.y || py === CABIN.y + CABIN.h - 1);
  return cell("wall", wallTile(joins(x, y - 1), joins(x + 1, y), joins(x, y + 1), joins(x - 1, y)), "LGRAY", false);
}

const GROUND_TILES = ["grassDot", "grassComma", "grassTick", "grassBacktick"];
const pines = (x, y) => hashCell(x, y, 98) < 0.03 + 0.2 * hashCell(x >> 3, y >> 2, 97) ** 2;

// The higher ground: blank rock with a wall wherever it meets the middle level or the falling water.
const isOpenNorth = (x, y) => y >= cliffRow(x) || (y >= cliffRow(x) - FALL_SHEET && inRiver(x, y));
function higherCell(x, y) {
  if (y >= cliffRow(x) - FALL_SHEET && inRiver(x, y)) return foam(x, y, 93, false);
  return rockCell(x, y, isOpenNorth);
}

// The lower ground: the same forest and river, seen from above in the dark partner colors, and out of reach.
function lowerCell(x, y) {
  if (inRiver(x, y)) {
    if (y === dropRow(x) + 1) return foam(x, y, 95, true);
    return cell("chasm", hashCell(x, y, 94) < 0.5 ? "water" : "ripple", "BLUE", false);
  }
  if (pines(x, y)) return cell("chasm", "pine", "GREEN", false);
  return cell("chasm", GROUND_TILES[Math.floor(hashCell(x, y, 102) * GROUND_TILES.length)], hashCell(x, y, 103) < 0.7 ? "GREEN" : "DGRAY", false);
}

function middleCell(x, y) {
  if (isBridge(x, y)) return bridgeCell(x, y, isBridge, "BROWN", "smooth");
  if (inRiver(x, y)) {
    if (y === cliffRow(x)) return foam(x, y, 104, false);
    if (y === dropRow(x)) return foam(x, y, 106, false);
    // Here and there a white fleck of foam on the water, as in the game.
    const shade = hashCell(x, y, 95);
    return cell("river", hashCell(x, y, 94) < 0.5 ? "water" : "ripple", shade < 0.06 ? "WHITE" : shade < 0.6 ? "LBLUE" : "CYAN", false);
  }
  // The edge of the middle level is a slope down.
  if (y === dropRow(x)) return cell("slope", "rampDown", hashCell(x, y, 107) < 0.5 ? "LGREEN" : "GREEN", false);
  if (onRoad(y)) return cell("road", "stoneRoad", hashCell(x, y, 96) < 0.25 ? "YELLOW" : "BROWN", true);
  const house = cabinCell(x, y);
  if (house) return house;
  const hill = hillCell(x, y);
  if (hill) return hill;
  const clearing = insideEllipse(x, y, MEETING, 5, 2.5);
  if (!clearing && pines(x, y)) return cell("tree", "pine", hashCell(x, y, 100) < 0.6 ? "GREEN" : "LGREEN", false);
  if (!clearing && hashCell(x, y, 101) < 0.012) return cell("boulder", "boulder", "LGRAY", true);
  // The forest floor is busy: saplings, rope reed and shrubs among the grass.
  const growth = hashCell(x, y, 110);
  if (growth < 0.03) return cell("sapling", "sapling", hashCell(x, y, 111) < 0.5 ? "GREEN" : "LGREEN", true);
  if (growth < 0.06) return cell("reed", "ropeReed", "LGREEN", true);
  if (growth < 0.09) return cell("shrub", "shrub", "GREEN", true);
  const shade = hashCell(x, y, 108);
  return cell("grass", GROUND_TILES[Math.floor(hashCell(x, y, 109) * GROUND_TILES.length)], shade < 0.55 ? "GREEN" : shade < 0.85 ? "LGREEN" : "BROWN", true);
}

export function cellAt(x, y) {
  if (y < cliffRow(x)) return higherCell(x, y);
  if (y > dropRow(x)) return lowerCell(x, y);
  return middleCell(x, y);
}

const WATER_KINDS = ["river", "waterfall", "bridge", "table", "bed", "cabinet", "chest"];
/** Where a working agent has something to do: on the bridge, at the river's edge, beside the cabin's furniture, at a boulder or under a pine. */
const works = (at, x, y) => at(x, y).kind === "boulder" || at(x, y).kind === "bridge" || at(x, y - 1)?.kind === "tree" || besideAny(at, x, y, WATER_KINDS);

export const river = {
  id: "river",
  name: "Gurgleford",
  width: WIDTH,
  height: HEIGHT,
  meeting: MEETING,
  kinds: ["grass", "sapling", "reed", "shrub", "tree", "boulder", "river", "waterfall", "bridge", "road", "slope", "rock", "wall", "chasm", "floor", "door", "bed", "cabinet", "chest", "chair", "table"],
  cellAt,
  works,
};
