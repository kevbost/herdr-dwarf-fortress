import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS, DEFAULT_MAP, mapById, buildWorld } from "../maps.js";
import { pointsOfInterest } from "../world.js";
import { tileNames } from "../tiles.js";
import { NEIGHBORS } from "../walk.js";

const everyCell = (world) => {
  const cells = [];
  for (let y = 0; y < world.height; y++) for (let x = 0; x < world.width; x++) cells.push({ x, y, cell: world.at(x, y) });
  return cells;
};

// Every walkable cell reachable from the clearing by single steps.
function reachable(world) {
  const seen = new Set([`${world.meeting.x},${world.meeting.y}`]);
  const queue = [world.meeting];
  while (queue.length) {
    const from = queue.pop();
    for (const [dx, dy] of NEIGHBORS) {
      const next = { x: from.x + dx, y: from.y + dy };
      const key = `${next.x},${next.y}`;
      if (seen.has(key) || !world.isWalkable(next.x, next.y)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return seen;
}

test("six maps ship, the meadow first and the default; an unknown id is the default", () => {
  assert.deepEqual(MAPS.map((map) => map.id), ["meadow", "settlement", "fortress", "volcano", "mountainside", "river"]);
  assert.equal(DEFAULT_MAP, "meadow");
  assert.equal(mapById("nope").id, "meadow");
  assert.equal(mapById(undefined).id, "meadow");
  assert.equal(new Set(MAPS.map((map) => map.name)).size, MAPS.length);
});

for (const map of MAPS) {
  test(`${map.id}: same every time, known kinds and tiles, open meeting place, everything reachable`, () => {
    const world = buildWorld(map.id);
    assert.deepEqual(everyCell(world).map(({ cell }) => cell), everyCell(buildWorld(map.id)).map(({ cell }) => cell), "the same every time");

    const tiles = new Set(tileNames());
    const kinds = new Set();
    for (const { cell } of everyCell(world)) {
      kinds.add(cell.kind);
      assert.ok(tiles.has(cell.tile), cell.tile);
      assert.equal(typeof cell.color, "string");
      assert.equal(typeof cell.walkable, "boolean");
    }
    for (const kind of kinds) assert.ok(map.kinds.includes(kind), `${kind} is not a kind of ${map.id}`);
    for (const kind of map.kinds) assert.ok(kinds.has(kind), `${map.id} has no ${kind}`);

    assert.equal(world.at(-1, 0), undefined, "outside the map there is nothing");
    assert.equal(world.isWalkable(world.width, 0), false);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -3; dx <= 3; dx++) assert.ok(world.isWalkable(world.meeting.x + dx, world.meeting.y + dy), `meeting place ${dx},${dy}`);

    const seen = reachable(world);
    const walkable = everyCell(world).filter(({ cell }) => cell.walkable).length;
    assert.ok(seen.size / walkable > 0.9, "most walkable cells can be reached from the meeting place");

    const all = pointsOfInterest(world, { x: 0, y: 0, w: world.width, h: world.height });
    assert.ok(all.length > 5, "there are things to do");
    for (const point of all) assert.ok(seen.has(`${point.x},${point.y}`), `${point.x},${point.y} cannot be reached`);

    const bounds = { x: 30, y: 13, w: 36, h: 14 };
    for (const point of pointsOfInterest(world, bounds)) {
      assert.ok(point.x >= bounds.x && point.x < bounds.x + bounds.w && point.y >= bounds.y && point.y < bounds.y + bounds.h, "points stay inside the bounds");
    }
    assert.deepEqual(pointsOfInterest(world, { x: 0, y: 0, w: 0, h: 0 }), []);
  });
}

test("the meadow is 96 x 40 and its default view has things to do", () => {
  const world = buildWorld("meadow");
  assert.equal(world.width, 96);
  assert.equal(world.height, 40);
  assert.ok(pointsOfInterest(world, { x: 30, y: 13, w: 36, h: 14 }).length > 5);
});

test("the settlement's walls take their box character from what they join, and every door opens onto open ground", () => {
  const world = buildWorld("settlement");
  const doors = everyCell(world).filter(({ cell }) => cell.kind === "door");
  assert.ok(doors.length >= 4, "buildings have doors");
  assert.ok(everyCell(world).some(({ cell }) => cell.kind === "gate"), "the walls have a gate");
  for (const { x, y } of doors) {
    const outside = NEIGHBORS.filter(([dx, dy]) => dx * dy === 0).map(([dx, dy]) => world.at(x + dx, y + dy)).filter((next) => next.kind === "road");
    assert.ok(outside.length >= 1, `the door at ${x},${y} opens onto no road`);
  }
  const corner = everyCell(world).find(({ cell }) => cell.kind === "wall" && cell.tile === "boxNW");
  assert.ok(corner, "walls have corners");
});

test("the fortress has a chasm that cannot be walked, stairs that lead nowhere, and a ramp out of reach", () => {
  const world = buildWorld("fortress");
  for (const kind of ["chasm", "stairs", "slope", "rock"]) {
    const cells = everyCell(world).filter(({ cell }) => cell.kind === kind);
    assert.ok(cells.length > 0, kind);
    for (const { cell } of cells) assert.equal(cell.walkable, false, kind);
  }
});

test("the volcano's magma cannot be walked but four bridges cross it; the mountain's rooms are 3 x 3 with a door, a bed, a cabinet and a chest; the river is crossed once, by a bridge, and falls off a cliff and off the middle level", () => {
  const kindsOf = (id, kind) => everyCell(buildWorld(id)).filter(({ cell }) => cell.kind === kind);
  const volcano = buildWorld("volcano");
  assert.ok(kindsOf("volcano", "magma").length > 50);
  for (const { cell } of kindsOf("volcano", "magma")) assert.equal(cell.walkable, false);
  const bridges = kindsOf("volcano", "bridge");
  assert.ok(bridges.length >= 12, "four bridges across the lake");
  for (const { cell } of bridges) assert.equal(cell.walkable, true);
  assert.ok(volcano.isWalkable(volcano.meeting.x, volcano.meeting.y), "the island is the meeting place");

  const mountain = buildWorld("mountainside");
  assert.equal(mountain.at(0, 0).kind === "rock", false, "the west is woods");
  assert.equal(mountain.at(94, 5).kind, "rock", "the east is rock, blank where it is not dug");
  const rockTiles = new Set(Array.from({ length: 40 }, (_unused, index) => mountain.at(90 + (index % 5), index % 4).tile));
  assert.ok(rockTiles.has("blank") && rockTiles.size > 1, "blank, with a dim mark here and there");
  assert.ok(everyCell(mountain).some(({ cell }) => cell.kind === "wall"), "a wall outlines what is dug");
  for (const kind of ["bed", "cabinet", "chest"]) assert.equal(kindsOf("mountainside", kind).length, 28, `a ${kind} in each of 28 rooms`);
  assert.equal(kindsOf("mountainside", "door").length, 29, "a door to each room and one in the mountain's face");

  const river = buildWorld("river");
  assert.equal(kindsOf("river", "bridge").length, 18, "the bridge is three cells wide, as long as the river is wide and a cell more on each bank");
  const fallRows = kindsOf("river", "waterfall").map(({ y }) => y);
  assert.ok(fallRows.some((y) => y <= 14) && fallRows.some((y) => y >= 26), "water falls off the higher ground and off the middle level");
  assert.ok(new Set(everyCell(river).filter(({ cell }) => cell.kind === "slope" && cell.tile === "rampDown" && cell.color !== "WHITE").map(({ y }) => y)).size > 1, "the edges are not ruled lines");
  for (const kind of ["river", "waterfall", "slope", "rock", "wall", "chasm"]) for (const { cell } of kindsOf("river", kind)) assert.equal(cell.walkable, false, kind);
  assert.ok(everyCell(river).filter(({ y }) => y > 27).every(({ cell }) => !cell.walkable), "the lower level cannot be walked");
  assert.ok(river.isWalkable(river.meeting.x - 10, 20) && river.isWalkable(95, 20), "the road runs across the bridge");
  assert.ok(reachable(river).has("95,20"), "the far bank is reached over the bridge");
  for (const kind of ["bed", "cabinet", "chest", "table"]) assert.equal(kindsOf("river", kind).length, 1, kind);
  assert.equal(kindsOf("river", "chair").length, 2);
  const door = kindsOf("river", "door");
  assert.equal(door.length, 1, "the cabin has one door");
  assert.equal(river.at(door[0].x, door[0].y + 1).kind, "road", "the door opens onto the road");
  assert.ok(reachable(river).has(`${door[0].x},${door[0].y - 1}`), "the cabin's room can be entered");
});

test("the meadow's embark wagon is 3 x 3 with its load down the middle; workshops are the wiki's 3 x 3 grids; bridges are outlined", async () => {
  const meadow = buildWorld("meadow");
  const wagon = everyCell(meadow).filter(({ cell }) => cell.kind === "wagon");
  assert.equal(wagon.length, 9);
  assert.deepEqual(wagon.filter(({ cell }) => cell.tile === "divide").map(({ x, y }) => `${x},${y}`), ["42,17", "42,18"]);
  assert.ok(wagon.every(({ cell }) => !cell.walkable));
  const { workshopCells, workshopNames } = await import("../workshops.js");
  for (const name of workshopNames()) {
    const cells = workshopCells(name, 10, 10);
    assert.equal(cells.length, 9, name);
    assert.ok(cells.every(({ cell }) => !cell.walkable && tileNames().includes(cell.tile)), name);
  }
  assert.throws(() => workshopCells("nope", 0, 0), /no workshop "nope"/);
  assert.equal(workshopCells("forge", 0, 0).find(({ x, y }) => x === 1 && y === 2).cell.tile, "forge", "the anvil is the forge's bottom-middle tile");
  const river = buildWorld("river");
  const bridge = everyCell(river).filter(({ cell }) => cell.kind === "bridge");
  assert.ok(bridge.some(({ cell }) => cell.tile === "boxNW") && bridge.some(({ cell }) => cell.tile === "boxSE"), "an outline with corners");
  assert.ok(bridge.some(({ cell }) => cell.tile === "smooth"), "floored inside with blocks");
});
