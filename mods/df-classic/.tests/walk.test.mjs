import { test } from "node:test";
import assert from "node:assert/strict";
import { distance, edgeCells, findPath, inBounds, pickGoal, sameCell, spiralCells, step, stepBudget } from "../walk.js";
import { pointsOfInterest } from "../world.js";
import { buildWorld as build } from "../maps.js";

const buildWorld = () => build("meadow");
const { meeting: MEETING } = buildWorld();


const anywhere = () => true;

function walk({ from, goal, canEnter, limit }) {
  let at = from;
  let previous = null;
  const path = [at];
  while (!sameCell(at, goal) && path.length <= limit) {
    const next = step({ from: at, goal, previous, canEnter });
    previous = at;
    at = next;
    path.push(at);
  }
  return path;
}

test("a step: one cell, open ground takes the distance, never enters, walks around a tree, stays at the goal, turns back only when it must", () => {
  { // a step moves at most one cell on each axis
    const next = step({ from: { x: 0, y: 0 }, goal: { x: 9, y: 4 }, previous: null, canEnter: anywhere });
    assert.ok(Math.abs(next.x) <= 1 && Math.abs(next.y) <= 1);
    assert.equal(distance({ x: 0, y: 0 }, next), 1);
  }
  { // on open ground a walk takes exactly the distance
    const from = { x: 2, y: 9 };
    const goal = { x: 11, y: 3 };
    const path = walk({ from, goal, canEnter: anywhere, limit: 100 });
    assert.equal(path.length - 1, distance(from, goal));
  }
  { // a step never enters a cell it may not
    const bounds = { x: 0, y: 0, w: 5, h: 5 };
    const blocked = new Set(["2,2", "3,2", "2,3"]);
    const canEnter = (point) => inBounds(point, bounds) && !blocked.has(`${point.x},${point.y}`);
    const path = walk({ from: { x: 0, y: 0 }, goal: { x: 4, y: 4 }, canEnter, limit: 40 });
    for (const point of path.slice(1)) assert.ok(canEnter(point), `${point.x},${point.y}`);
    assert.ok(sameCell(path.at(-1), { x: 4, y: 4 }));
  }
  { // a tree in the way is walked around
    const tree = { x: 5, y: 0 };
    const canEnter = (point) => !sameCell(point, tree);
    const from = { x: 0, y: 0 };
    const goal = { x: 10, y: 0 };
    const path = walk({ from, goal, canEnter, limit: 40 });
    assert.ok(sameCell(path.at(-1), goal));
    assert.ok(path.length - 1 <= distance(from, goal) + 2);
  }
  { // at the goal, or boxed in, it stays put
    const here = { x: 3, y: 3 };
    assert.equal(step({ from: here, goal: here, previous: null, canEnter: anywhere }), here);
    assert.equal(step({ from: here, goal: { x: 9, y: 9 }, previous: null, canEnter: () => false }), here);
  }
  { // it turns back only when there is no other way
    const corridor = (point) => point.y === 0 && point.x >= 0 && point.x <= 3;
    const next = step({ from: { x: 0, y: 0 }, goal: { x: -5, y: 0 }, previous: { x: 1, y: 0 }, canEnter: corridor });
    assert.deepEqual(next, { x: 1, y: 0 });
  }
  { // it does not turn back while another way is open
    const next = step({ from: { x: 5, y: 5 }, goal: { x: 0, y: 5 }, previous: { x: 4, y: 5 }, canEnter: () => true });
    assert.notDeepEqual(next, { x: 4, y: 5 });
    assert.equal(distance(next, { x: 5, y: 5 }), 1);
  }
});






test("step budgets in the real world: things to do, every edge to the clearing, growth with distance", () => {
  { // in the real world a walker reaches things to do within its step budget
    const world = buildWorld();
    const bounds = { x: 30, y: 13, w: 36, h: 14 };
    const canEnter = (point) => inBounds(point, bounds) && world.isWalkable(point.x, point.y);
    const goals = pointsOfInterest(world, bounds);
    let reached = 0;
    for (const goal of goals) {
      if (sameCell(walk({ from: MEETING, goal, canEnter, limit: stepBudget(MEETING, goal) }).at(-1), goal)) reached++;
    }
    assert.ok(reached / goals.length > 0.9, `${reached} of ${goals.length} reached`);
  }
  { // from every edge cell of the view, the clearing is reached within the step budget
    const world = buildWorld();
    const bounds = { x: 30, y: 13, w: 36, h: 14 };
    const canEnter = (point) => inBounds(point, bounds) && world.isWalkable(point.x, point.y);
    const starts = edgeCells(bounds).filter(canEnter);
    assert.ok(starts.length > 50);
    for (const from of starts) {
      const path = findPath({ from, goal: MEETING, canEnter });
      assert.ok(path, `no way from ${from.x},${from.y}`);
      assert.ok(path.length <= stepBudget(from, MEETING), `${path.length} steps from ${from.x},${from.y}`);
      for (const cell of path) assert.ok(canEnter(cell));
    }
  }
  { // the step budget grows with the distance and is never zero
    assert.ok(stepBudget({ x: 0, y: 0 }, { x: 0, y: 0 }) > 0);
    assert.ok(stepBudget({ x: 0, y: 0 }, { x: 10, y: 0 }) > stepBudget({ x: 0, y: 0 }, { x: 2, y: 0 }));
    assert.ok(stepBudget({ x: 0, y: 0 }, { x: 10, y: 3 }) >= 10);
  }
});

test("findPath: shortest, around a wall, no way", () => {
  { // findPath gives the shortest way, cell by cell, ending at the goal
    const from = { x: 2, y: 9 };
    const goal = { x: 11, y: 3 };
    const bounds = { x: 0, y: 0, w: 20, h: 20 };
    const path = findPath({ from, goal, canEnter: (point) => inBounds(point, bounds) });
    assert.equal(path.length, distance(from, goal));
    assert.deepEqual(path.at(-1), goal);
    let at = from;
    for (const cell of path) {
      assert.equal(distance(at, cell), 1);
      at = cell;
    }
    assert.deepEqual(findPath({ from, goal: from, canEnter: () => true }), []);
  }
  { // findPath goes around a wall, and says so when there is no way
    const bounds = { x: 0, y: 0, w: 9, h: 9 };
    const wall = (gap) => (point) => inBounds(point, bounds) && (point.x !== 4 || point.y === gap);
    const through = findPath({ from: { x: 0, y: 4 }, goal: { x: 8, y: 4 }, canEnter: wall(0) });
    assert.ok(through.some((cell) => cell.x === 4 && cell.y === 0), "it uses the gap");
    for (const cell of through) assert.ok(wall(0)(cell));
    assert.equal(findPath({ from: { x: 0, y: 4 }, goal: { x: 8, y: 4 }, canEnter: wall(-1) }), null);
    assert.equal(findPath({ from: { x: 0, y: 0 }, goal: { x: 1, y: 0 }, canEnter: () => false }), null);
  }
});





test("helpers: spiral cells, edge cells, pickGoal", () => {
  { // spiral cells start at the center and grow by rings
    const cells = spiralCells({ x: 5, y: 5 }, 2);
    assert.deepEqual(cells[0], { x: 5, y: 5 });
    assert.equal(cells.length, 25);
    assert.equal(new Set(cells.map((cell) => `${cell.x},${cell.y}`)).size, 25);
    for (let index = 1; index < cells.length; index++) assert.ok(distance(cells[index], cells[0]) >= distance(cells[index - 1], cells[0]));
  }
  { // edge cells are the border of the bounds
    const bounds = { x: 2, y: 3, w: 4, h: 3 };
    const cells = edgeCells(bounds);
    assert.equal(cells.length, 10);
    for (const cell of cells) assert.ok(inBounds(cell, bounds));
    assert.deepEqual(edgeCells({ x: 0, y: 0, w: 0, h: 0 }), []);
    assert.equal(edgeCells({ x: 0, y: 0, w: 1, h: 1 }).length, 1);
  }
  { // pickGoal picks from the candidates, or nothing
    const candidates = [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
    assert.equal(pickGoal(candidates, () => 0), candidates[0]);
    assert.equal(pickGoal(candidates, () => 0.999), candidates[2]);
    assert.equal(pickGoal(candidates, () => 1), candidates[2]);
    assert.equal(pickGoal([], () => 0.5), null);
  }
});


