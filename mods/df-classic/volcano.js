// The volcano, seen from the rim of its crater, the one level creatures can stand
// on. Round the crater the cone's top is a ledge of ash, edged by slopes down. Inside it the ground falls
// away to the magma far below, drawn dim in the dark partner colors (red, not
// walkable), with a stone island standing in the middle at the rim's level, joined
// to the ledge by four bridges. Outside the cone the plains are a level lower still,
// dim and out of reach. The island holds two forges, two workshops and four statues
// round a clear middle. The rings are uneven, as a real crater is. Pure.

import { hashCell } from "./hash.js";
import { BESIDE, besideAny, bridgeCell, cell } from "./shapes.js";
import { workshopCells } from "./workshops.js";

const WIDTH = 96;
const HEIGHT = 40;
const MEETING = { x: 48, y: 20 };

// The rings, as distance from the middle in rows. A cell is twice as tall as it is wide, so the columns count half.
const ISLAND = 5;
const CRATER = 9;
const LEDGE = 12;
const radius = (x, y) => Math.hypot((x - MEETING.x) / 2, y - MEETING.y);
// The crater's and the ledge's edges wander by up to a row and a half, by the direction from the middle.
const wander = (x, y) => {
  const turn = Math.atan2(y - MEETING.y, (x - MEETING.x) / 2);
  return 0.9 * Math.sin(3 * turn + 0.5) + 0.6 * Math.sin(5 * turn + 2);
};

const GROUND_TILES = ["grassDot", "grassComma", "grassTick", "grassBacktick"];
// The ledge is ash: ground glyphs with some of the game's ash (≥ ≤) lying on it.
const ashCell = (x, y) => {
  const shade = hashCell(x, y, 71);
  const tileName = hashCell(x, y, 79) < 0.22 ? (hashCell(x, y, 80) < 0.5 ? "ashes" : "ashesAlt") : GROUND_TILES[Math.floor(hashCell(x, y, 72) * GROUND_TILES.length)];
  return cell("ash", tileName, shade < 0.6 ? "LGRAY" : shade < 0.8 ? "WHITE" : "BROWN", true);
};

// The island's buildings and statues: the forges on the middle row's north side, the workshops on its south side. Built the first time the map is used.
let island;
function islandAt(x, y) {
  if (!island) {
    island = new Map();
    for (const { x: bx, y: by, cell: found } of [...workshopCells("magmaForge", 40, 17), ...workshopCells("magmaForge", 54, 17), ...workshopCells("craftsdwarf", 40, 21), ...workshopCells("magmaSmelter", 54, 21)]) island.set(`${bx},${by}`, found);
    for (const [sx, sy] of [[46, 17], [50, 17], [46, 23], [50, 23]]) island.set(`${sx},${sy}`, cell("statue", "statue", "WHITE", false));
  }
  return island.get(`${x},${y}`);
}

// The magma is a level down: the dark partner of LRED, with a little of the dark partner of YELLOW.
const magmaCell = (x, y) => {
  const heat = hashCell(x, y, 73);
  return cell("magma", heat < 0.5 ? "water" : "ripple", heat < 0.15 ? "BROWN" : "RED", false);
};


// The plains are a level lower than the ledge: the same ground in dim colors, out of reach.
const plainsCell = (x, y) => {
  if (hashCell(x, y, 76) < 0.012) return cell("chasm", "deadTree", "DGRAY", false);
  const tileName = hashCell(x, y, 81) < 0.15 ? "ashes" : GROUND_TILES[Math.floor(hashCell(x, y, 82) * GROUND_TILES.length)];
  return cell("chasm", tileName, "DGRAY", false);
};

// Where the ground is a level below the ledge: the crater and the plains.
const isLower = (x, y) => {
  const away = radius(x, y);
  const wandering = away - wander(x, y);
  return away > ISLAND && (wandering <= CRATER || wandering > LEDGE);
};
// Four bridges of three cells' width run along the row and the column through the middle.
const onBridgeAxis = (x, y) => Math.abs(y - MEETING.y) <= 1 || Math.abs(x - MEETING.x) <= 1;
const isBridge = (x, y) => {
  const away = radius(x, y);
  return away > ISLAND && away - wander(x, y) <= CRATER && onBridgeAxis(x, y);
};

export function cellAt(x, y) {
  const away = radius(x, y);
  if (away <= ISLAND) return islandAt(x, y) ?? cell("smooth", "smooth", "LGRAY", true);
  const wandering = away - wander(x, y);
  if (wandering <= CRATER) return onBridgeAxis(x, y) ? bridgeCell(x, y, isBridge, "LGRAY", "smooth") : magmaCell(x, y);
  if (wandering > LEDGE) return plainsCell(x, y);
  // The edge of the ledge, inside and out, is a slope down, except where a bridge starts.
  if (!onBridgeAxis(x, y) && BESIDE.some(([dx, dy]) => isLower(x + dx, y + dy))) return cell("slope", hashCell(x, y, 84) < 0.5 ? "ramp" : "rampDown", "LGRAY", false);
  return hashCell(x, y, 77) < 0.03 ? cell("boulder", "boulder", "LGRAY", true) : ashCell(x, y);
}

const WORK_KINDS = ["forge", "workshop", "statue"];
/** Where a working agent has something to do: beside a forge, a workshop or a statue, or at a boulder. */
export const works = (at, x, y) => at(x, y).kind === "boulder" || besideAny(at, x, y, WORK_KINDS);

export const volcano = {
  id: "volcano",
  name: "Smolderpot",
  width: WIDTH,
  height: HEIGHT,
  meeting: MEETING,
  kinds: ["smooth", "forge", "workshop", "statue", "magma", "bridge", "ash", "slope", "boulder", "chasm"],
  cellAt,
  works,
};
