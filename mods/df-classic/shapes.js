// Pieces for laying a map out from rectangles: the cell shape every map shares,
// the double-line box character a wall takes from the walls it joins, and solid
// rock. Pure.

import { hashCell } from "./hash.js";

/** A cell of a map: its kind (Look's words and tests go by it), its tile and DF color, whether creatures can stand on it, and sometimes a DF background color. */
export const cell = (kind, tileName, color, walkable, background) => (background ? { kind, tile: tileName, color, walkable, background } : { kind, tile: tileName, color, walkable });

export const cellKey = (x, y) => `${x},${y}`;

/** The four cells beside a cell, as [dx, dy]. */
export const BESIDE = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/** Whether one of the four cells beside x, y is of one of these kinds (at(x, y): the world's cell there, or undefined). */
export const besideAny = (at, x, y, kinds) => BESIDE.some(([dx, dy]) => kinds.includes(at(x + dx, y + dy)?.kind));

/** Whether the cell (x, y) is inside the ellipse of this center and radii, in cells. */
export const insideEllipse = (x, y, center, radiusX, radiusY) => ((x - center.x) / radiusX) ** 2 + ((y - center.y) / radiusY) ** 2 <= 1;

/** The cells of a rectangle { x, y, w, h }, each with whether it is on the rectangle's edge. */
export function rectCells({ x, y, w, h }) {
  const cells = [];
  for (let row = y; row < y + h; row++) {
    for (let column = x; column < x + w; column++) {
      cells.push({ x: column, y: row, edge: row === y || row === y + h - 1 || column === x || column === x + w - 1 });
    }
  }
  return cells;
}

// Joined on the north, east, south, west: 1, 2, 4, 8.
const WALL_BY_JOINS = [
  "boxH", "boxV", "boxH", "boxSW", "boxV", "boxV", "boxNW", "boxTE",
  "boxH", "boxSE", "boxH", "boxTN", "boxNE", "boxTW", "boxTS", "boxX",
];

/** The tile name for a wall joined to walls north, east, south and west of it. */
export const wallTile = (north, east, south, west) => WALL_BY_JOINS[(north ? 1 : 0) + (east ? 2 : 0) + (south ? 4 : 0) + (west ? 8 : 0)];

const AROUND = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

// Rock nobody can see is the game's "unexplored underground": blank, with here and there a dim mark of its ground glyphs.
const MARKS = ["grassDot", "grassComma", "grassTick", "grassBacktick"];

/** A cell of rock that cannot be seen. */
export const blankRock = (x, y) =>
  hashCell(x, y, 45) < 0.06 ? cell("rock", MARKS[Math.floor(hashCell(x, y, 46) * MARKS.length)], "DGRAY", false) : cell("rock", "blank", "LGRAY", false);

/**
 * A cell of solid rock, as the game draws it: blank where nothing of it can be
 * seen (unexplored rock), and a shaded wall where it touches open ground
 * (isOpen(x, y): whether that cell is open).
 */
export function rockCell(x, y, isOpen) {
  if (!AROUND.some(([dx, dy]) => isOpen(x + dx, y + dy))) return blankRock(x, y);
  return cell("wall", hashCell(x, y, 42) < 0.7 ? "rock" : "rockLight", hashCell(x, y, 43) < 0.25 ? "WHITE" : "LGRAY", false);
}

/**
 * A cell of a bridge, as the game draws one: a double-line outline round the
 * bridge's edge, floored inside with the tile of what it is built of.
 * isBridge(x, y): whether that cell is part of the bridge.
 */
export function bridgeCell(x, y, isBridge, color, floorTile) {
  const ring = (px, py) => isBridge(px, py) && !BESIDE.every(([dx, dy]) => isBridge(px + dx, py + dy));
  if (!ring(x, y)) return cell("bridge", floorTile, color, true);
  return cell("bridge", wallTile(ring(x, y - 1), ring(x + 1, y), ring(x, y + 1), ring(x - 1, y)), color, true);
}
