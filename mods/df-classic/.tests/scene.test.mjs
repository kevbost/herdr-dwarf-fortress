import test from "node:test";
import assert from "node:assert/strict";
import { register, pickBounds, isDue, scene, VIEW_STALE_MS } from "../scene.js";

const box = (w, h) => ({ x: 0, y: 0, w, h });

test("which view and step decide the walk: largest view, stale views, no view, one step for many copies", () => {
  { // the largest view that is still shown decides where creatures walk
    const views = new Map();
    register(views, 1, box(36, 14), 1000);
    register(views, 2, box(96, 40), 1000);
    assert.deepEqual(pickBounds(views, 1500), box(96, 40));
  }
  { // a copy that stops saying it is there is forgotten, and the smaller view is used again
    const views = new Map();
    register(views, 1, box(36, 14), 0);
    register(views, 2, box(96, 40), 0);
    register(views, 1, box(36, 14), VIEW_STALE_MS + 10);
    assert.deepEqual(pickBounds(views, VIEW_STALE_MS + 10), box(36, 14));
    assert.equal(views.has(2), false);
  }
  { // no view at all means no bounds
    assert.equal(pickBounds(new Map(), 0), null);
  }
  { // a step is due after most of the step time, and only once however many copies tick
    assert.equal(isDue(0, 700, 1000), false);
    assert.equal(isDue(0, 800, 1000), true);
    assert.equal(isDue(1000, 1100, 1000), false);
  }
});




test("choosing a map swaps the world and puts the creatures on it afresh; the same map or an unknown one changes nothing more", async () => {
  const { selectMap } = await import("../scene.js");
  assert.equal(scene.mapId, "meadow");
  scene.movers.byAddress.set("t1", { at: { x: 1, y: 1 } });
  const before = scene.version;
  scene.cursor = { x: 3, y: 4 };
  assert.equal(selectMap("fortress"), true);
  assert.equal(scene.cursor, null, "Look's X belongs to the map it was put on");
  assert.equal(scene.mapId, "fortress");
  assert.equal(scene.world.id, "fortress");
  assert.equal(scene.movers.byAddress.size, 0);
  assert.equal(scene.version, before + 1);
  assert.equal(selectMap("fortress"), false);
  assert.equal(selectMap("nope"), true, "an unknown id falls back to the default, which is a change from the fortress");
  assert.equal(scene.mapId, "meadow");
  assert.equal(selectMap(undefined), false);
});
