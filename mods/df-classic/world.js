// A map made into a world creatures can walk on. A map is { id, name, width,
// height, meeting, kinds, cellAt(x, y) -> cell, works(at, x, y) -> boolean }, in
// maps.js; every cell is a pure function of its position, so a map is the same
// every time. Cells are made when first asked for. Pure.

/**
 * The world of a map: { id, name, width, height, meeting, kinds, at(x, y) -> cell
 * or undefined, isWalkable(x, y), isWork(x, y) }. isWork: somewhere a working
 * agent has something to do, always on walkable ground.
 */
export function makeWorld({ id, name, width, height, meeting, kinds, cellAt, works = () => false }) {
  // A cell is made the first time it is asked for: the sidebar's view asks for a few hundred of
  // the 3,840, and only the big map, or a long walk, asks for them all.
  const cells = new Array(width * height);
  const at = (x, y) => (x >= 0 && y >= 0 && x < width && y < height ? (cells[y * width + x] ??= cellAt(x, y)) : undefined);
  const isWalkable = (x, y) => at(x, y)?.walkable === true;
  return { id, name, width, height, meeting, kinds, at, isWalkable, isWork: (x, y) => isWalkable(x, y) && works(at, x, y) };
}

/** Where a working agent has something to do inside bounds { x, y, w, h }. Every point is walkable. */
export function pointsOfInterest(world, bounds) {
  const points = [];
  for (let y = bounds.y; y < bounds.y + bounds.h; y++) {
    for (let x = bounds.x; x < bounds.x + bounds.w; x++) if (world.isWork(x, y)) points.push({ x, y });
  }
  return points;
}
