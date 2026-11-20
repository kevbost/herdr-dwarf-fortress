// How a creature gets about: one cell at a time. findPath is the way to a
// goal around the ground's obstacles (trees, the pond, the outcrop); step is
// the single greedy move used to get around another creature standing in it.

export const NEIGHBORS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];

export const sameCell = (a, b) => a.x === b.x && a.y === b.y;

/** Steps a king would need: the least a walk between two cells can take. */
export const distance = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export const inBounds = (point, bounds) =>
  point.x >= bounds.x && point.x < bounds.x + bounds.w && point.y >= bounds.y && point.y < bounds.y + bounds.h;

const neighborsOf = (point) => NEIGHBORS.map(([dx, dy]) => ({ x: point.x + dx, y: point.y + dy }));
const straightLine = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/**
 * The next cell from `from` towards `goal`: the enterable neighbor nearest the
 * goal, never straight back to `previous` unless that is the only way. Returns
 * `from` itself at the goal or when boxed in.
 */
export function step({ from, goal, previous, canEnter }) {
  if (sameCell(from, goal)) return from;
  const open = neighborsOf(from).filter(canEnter);
  const onward = open.filter((option) => !previous || !sameCell(option, previous));
  const options = onward.length ? onward : open;
  if (!options.length) return from;
  return options.reduce((best, option) => (straightLine(option, goal) < straightLine(best, goal) ? option : best));
}

/**
 * The shortest way from `from` to `goal` over cells `canEnter` allows, as the
 * cells to walk through, `goal` last ([] when already there). Null when there
 * is no way. `canEnter` must be false somewhere all around: it bounds the search.
 */
export function findPath({ from, goal, canEnter }) {
  if (sameCell(from, goal)) return [];
  const key = (point) => `${point.x},${point.y}`;
  const cameFrom = new Map([[key(from), null]]);
  let frontier = [from];
  while (frontier.length) {
    const reached = [];
    for (const point of frontier) {
      for (const next of neighborsOf(point)) {
        if (cameFrom.has(key(next)) || !canEnter(next)) continue;
        cameFrom.set(key(next), point);
        if (sameCell(next, goal)) {
          const path = [];
          for (let cell = next; cell && !sameCell(cell, from); cell = cameFrom.get(key(cell))) path.unshift(cell);
          return path;
        }
        reached.push(next);
      }
    }
    frontier = reached;
  }
  return null;
}

/** Cells around `center`, nearest ring first, out to `radius`. */
export function spiralCells(center, radius) {
  const cells = [];
  for (let ring = 0; ring <= radius; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === ring) cells.push({ x: center.x + dx, y: center.y + dy });
      }
    }
  }
  return cells;
}

/** The cells along the inside edge of bounds { x, y, w, h }. */
export function edgeCells(bounds) {
  const cells = [];
  for (let y = bounds.y; y < bounds.y + bounds.h; y++) {
    for (let x = bounds.x; x < bounds.x + bounds.w; x++) {
      const onEdge = x === bounds.x || y === bounds.y || x === bounds.x + bounds.w - 1 || y === bounds.y + bounds.h - 1;
      if (onEdge) cells.push({ x, y });
    }
  }
  return cells;
}

/** How many steps a walk from `from` to `goal` gets before it is given up: room to go around things. */
export const stepBudget = (from, goal) => 4 * distance(from, goal) + 20;

/** One of `candidates`, or null when there are none. `random`: a function giving [0, 1). */
export function pickGoal(candidates, random) {
  if (!candidates.length) return null;
  return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
}
