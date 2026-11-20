import { test } from "node:test";
import assert from "node:assert/strict";
import { Movers, cellKey, REST_RADIUS, STROLL_RADIUS } from "../movers.js";
import { buildWorld as build } from "../maps.js";

const buildWorld = () => build("meadow");
const { meeting: MEETING, width: WORLD_WIDTH, height: WORLD_HEIGHT } = buildWorld();
import { distance, inBounds } from "../walk.js";

const VIEW = { x: 30, y: 13, w: 36, h: 14 };
const agent = (address, status) => ({ address, status });
const crowd = (count, status) => Array.from({ length: count }, (_unused, index) => agent(`t${index}`, status));

// A fixed sequence standing in for Math.random.
function sequence(seed = 1) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function run(movers, list, bounds, ticks, random = sequence()) {
  const movedAt = [];
  for (let tick = 0; tick < ticks; tick++) {
    movers.sync(list, bounds);
    if (movers.advance(bounds, random)) movedAt.push(tick);
  }
  return movedAt;
}

const positions = (movers) => [...movers.byAddress.values()].map((mover) => cellKey(mover.at));
const assertOnGround = (movers, world, bounds) => {
  for (const mover of movers.byAddress.values()) {
    assert.ok(inBounds(mover.at, bounds), `${cellKey(mover.at)} is outside the view`);
    assert.ok(world.isWalkable(mover.at.x, mover.at.y), `${cellKey(mover.at)} is not ground`);
  }
};

test("arrival and collision: one mover per agent at the edge, none share a cell, blocked and done stay", () => {
  { // every agent gets a mover, on walkable ground at the edge of the view
    const world = buildWorld();
    const movers = new Movers(world);
    movers.sync(crowd(5, "working"), VIEW);
    assert.equal(movers.byAddress.size, 5);
    assertOnGround(movers, world, VIEW);
    for (const mover of movers.byAddress.values()) {
      const onEdge = mover.at.x === VIEW.x || mover.at.y === VIEW.y || mover.at.x === VIEW.x + VIEW.w - 1 || mover.at.y === VIEW.y + VIEW.h - 1;
      assert.ok(onEdge, cellKey(mover.at));
    }
  }
  { // no two movers ever share a cell, even fifty that never move
    const world = buildWorld();
    const blocked = new Movers(world);
    blocked.sync(crowd(50, "blocked"), VIEW);
    assert.equal(blocked.byAddress.size, 50);
    assert.equal(new Set(positions(blocked)).size, 50);

    const mixed = new Movers(world);
    const list = [...crowd(20, "working"), ...Array.from({ length: 10 }, (_unused, index) => agent(`b${index}`, "blocked")), ...Array.from({ length: 10 }, (_unused, index) => agent(`i${index}`, "idle"))];
    const random = sequence(7);
    for (let tick = 0; tick < 200; tick++) {
      mixed.sync(list, VIEW);
      mixed.advance(VIEW, random);
      assert.equal(new Set(positions(mixed)).size, mixed.byAddress.size, `two movers on one cell at tick ${tick}`);
      assertOnGround(mixed, world, VIEW);
    }
  }
  { // blocked and done agents stay where they are
    const movers = new Movers(buildWorld());
    const list = [agent("t1", "blocked"), agent("t2", "done")];
    movers.sync(list, VIEW);
    const before = positions(movers);
    assert.deepEqual(run(movers, list, VIEW, 60), []);
    assert.deepEqual(positions(movers), before);
  }
});



test("idle agents settle near the clearing and now and then stroll, within the radius, and rest between", () => {
  { // idle agents walk to the clearing, then stay near it, now and then strolling a few cells and coming back
    const world = buildWorld();
    for (const count of [1, 3, 20]) {
      const movers = new Movers(world);
      const list = crowd(count, "idle");
      const movedAt = run(movers, list, VIEW, 600);
      assert.ok(movedAt.length > 0, "they walk in from the edge");
      assert.ok(movedAt.some((tick) => tick > 200), `${count} idle agents never strolled once settled`);
        assertOnGround(movers, world, VIEW);
      const near = [...movers.byAddress.values()].filter((mover) => distance(mover.at, MEETING) <= REST_RADIUS + STROLL_RADIUS + 1).length;
      assert.ok(near >= Math.ceil(count * 0.8), `${near} of ${count} stayed near the clearing`);
    }
  }
  { // a stroll goes no further than its radius from where it started, and it rests between strolls
    const world = buildWorld();
    const movers = new Movers(world);
    const list = [agent("t1", "idle")];
    const random = sequence(5);
    run(movers, list, VIEW, 150, random); // settle
    let farthest = 0;
    let rests = 0;
    for (let tick = 0; tick < 800; tick++) {
      movers.sync(list, VIEW);
      movers.advance(VIEW, random);
      const mover = movers.get("t1");
      farthest = Math.max(farthest, distance(mover.at, MEETING));
      if (!mover.strolling && sameCellAsGoal(mover)) rests++;
    }
    assert.ok(farthest <= REST_RADIUS + STROLL_RADIUS, `strolled ${farthest} from the clearing's middle`);
    assert.ok(rests > 0, "it rests between strolls");
  }
});


const sameCellAsGoal = (mover) => mover.goal && mover.goal.x === mover.at.x && mover.goal.y === mover.at.y;

test("workers keep walking in the view, up to two cells a step, never through anyone", () => {
  { // working agents keep walking, and stay in the view
    const world = buildWorld();
    const movers = new Movers(world);
    const list = crowd(4, "working");
    const movedAt = run(movers, list, VIEW, 300);
    assert.ok(movedAt.length > 100);
    assert.ok(movedAt.at(-1) > 250, "still going at the end");
    assertOnGround(movers, world, VIEW);
  }
  { // a worker moves up to two cells a step, along its path; an idle agent one
    const world = buildWorld();
    const longest = (status, ticks) => {
      const movers = new Movers(world);
      const list = [agent("t1", status)];
      const random = sequence(3);
      let farthest = 0;
      let twos = 0;
      for (let tick = 0; tick < ticks; tick++) {
        movers.sync(list, VIEW);
        const before = movers.get("t1")?.at;
        movers.advance(VIEW, random);
        const after = movers.get("t1").at;
        if (!before) continue;
        const moved = distance(before, after);
        farthest = Math.max(farthest, moved);
        if (moved === 2) twos++;
        assert.ok(world.isWalkable(after.x, after.y));
      }
      return { farthest, twos };
    };
    const worker = longest("working", 400);
    assert.equal(worker.farthest, 2);
    assert.ok(worker.twos > 20, `${worker.twos} double steps`);
    assert.equal(longest("idle", 800).farthest, 1);
  }
  { // a worker never steps through, or onto, another creature
    const world = buildWorld();
    const movers = new Movers(world);
    const list = crowd(12, "working");
    const random = sequence(11);
    for (let tick = 0; tick < 300; tick++) {
      movers.sync(list, VIEW);
      movers.advance(VIEW, random);
      assert.equal(new Set(positions(movers)).size, movers.byAddress.size, `two on one cell at tick ${tick}`);
    }
  }
});

test("a mover's life: gone with its agent, a new goal on a status change", () => {
  { // a mover whose agent is gone is gone; nobody at all means nothing moves
    const movers = new Movers(buildWorld());
    movers.sync(crowd(3, "working"), VIEW);
    movers.sync([agent("t1", "working")], VIEW);
    assert.deepEqual([...movers.byAddress.keys()], ["t1"]);
    movers.sync([], VIEW);
    assert.equal(movers.byAddress.size, 0);
    assert.equal(movers.advance(VIEW, sequence()), false);
  }
  { // a status change gives a new goal: a worker that goes idle heads for the clearing
    const movers = new Movers(buildWorld());
    run(movers, [agent("t1", "working")], VIEW, 80);
    const movedAt = run(movers, [agent("t1", "idle")], VIEW, 200);
    assert.ok(movedAt.length > 0);
    assert.ok(distance(movers.get("t1").at, MEETING) <= REST_RADIUS + STROLL_RADIUS + 1);
  }
});


test("views: shrinking re-arrives, tiny and oversized views, no free ground at the edge", () => {
  { // when the view shrinks, movers left outside arrive again inside it
    const world = buildWorld();
    const movers = new Movers(world);
    const list = crowd(8, "working");
    run(movers, list, VIEW, 50);
    const rail = { x: 46, y: 13, w: 4, h: 14 };
    movers.sync(list, rail);
    assertOnGround(movers, world, rail);
    run(movers, list, rail, 50);
    assertOnGround(movers, world, rail);
    movers.sync(list, VIEW);
    assertOnGround(movers, world, VIEW);
  }
  { // tiny, empty and oversized views do not break it
    const world = buildWorld();
    for (const bounds of [{ x: 48, y: 20, w: 1, h: 1 }, { x: 48, y: 20, w: 0, h: 0 }, { x: 30, y: 20, w: 36, h: 1 }, { x: 0, y: 0, w: WORLD_WIDTH, h: WORLD_HEIGHT }]) {
      const movers = new Movers(world);
      const list = [...crowd(3, "working"), agent("i1", "idle"), agent("b1", "blocked")];
      run(movers, list, bounds, 40);
      assertOnGround(movers, world, bounds);
      assert.ok(movers.byAddress.size <= list.length);
    }
  }
  { // with no free ground at the edge, the ones that do not fit are left off the map
    const movers = new Movers(buildWorld());
    const single = { x: 48, y: 20, w: 1, h: 1 };
    movers.sync(crowd(3, "blocked"), single);
    assert.equal(movers.byAddress.size, 1);
  }
});



test("on every map, a mixed crowd stays on open ground, never shares a cell, and the idle ones gather near the meeting place", async () => {
  const { MAPS } = await import("../maps.js");
  for (const map of MAPS) {
    const world = build(map.id);
    const movers = new Movers(world);
    const list = [...crowd(5, "working"), ...Array.from({ length: 4 }, (_unused, index) => agent(`i${index}`, "idle")), agent("b", "blocked")];
    for (const bounds of [VIEW, { x: 0, y: 0, w: world.width, h: world.height }]) {
      run(movers, list, bounds, 300);
      const cells = [...movers.byAddress.values()].map((mover) => cellKey(mover.at));
      assert.equal(new Set(cells).size, cells.length, `${map.id}: two share a cell`);
      for (const mover of movers.byAddress.values()) assert.ok(world.isWalkable(mover.at.x, mover.at.y), `${map.id}: ${cellKey(mover.at)} is not ground`);
      assert.equal(movers.byAddress.size, list.length, `${map.id}: someone is not on the map`);
    }
    for (let index = 0; index < 4; index++) assert.ok(distance(movers.get(`i${index}`).at, world.meeting) <= REST_RADIUS + STROLL_RADIUS + 1, `${map.id}: idle ${index} did not gather`);
  }
});



test("sync says whether anyone arrived or left", () => {
  const movers = new Movers(buildWorld());
  assert.equal(movers.sync([], VIEW), false);
  assert.equal(movers.sync(crowd(3, "idle"), VIEW), true, "three arrive");
  assert.equal(movers.sync(crowd(3, "idle"), VIEW), false, "nothing changed");
  assert.equal(movers.sync(crowd(2, "idle"), VIEW), true, "one leaves");
});
