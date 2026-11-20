// The map's one scene, shared by every copy of the map role (the sidebar's and
// the big map's): the shown map's world, who stands where, and which part of it each copy
// shows. One walk for all of them, so the big map shows the very creatures the
// sidebar map does. Pure: no host calls.

import { buildWorld, mapById, DEFAULT_MAP } from "./maps.js";
import { Movers } from "./movers.js";

/** How long a copy's view counts after it last said it was there, ms. A closed map stops saying it. */
export const VIEW_STALE_MS = 4000;

export const scene = {
  mapId: DEFAULT_MAP,
  world: buildWorld(DEFAULT_MAP),
  movers: null,
  cursor: null, // Look's X: { x, y } in the world, shared so every copy of the map draws the same one
  version: 0, // counts changes of who stands where, so each copy knows when to redraw
  steppedAt: 0, // when the creatures last took a step, ms
  views: new Map(), // copy id -> { x, y, w, h, at }
  nextId: 1,
};
scene.movers = new Movers(scene.world);

/**
 * Shows the map with this id (anything unknown is the default). The creatures
 * are put on it afresh, as migrants. False when it is the map already shown.
 */
export function selectMap(id) {
  const next = mapById(id).id;
  if (next === scene.mapId) return false;
  scene.mapId = next;
  scene.world = buildWorld(next);
  scene.movers = new Movers(scene.world);
  scene.cursor = null;
  scene.version++;
  return true;
}

/** Notes that copy `id` shows `bounds` ({ x, y, w, h }) at `now`, and forgets copies that have gone quiet. */
export function register(views, id, bounds, now) {
  for (const [other, view] of [...views]) if (now - view.at > VIEW_STALE_MS) views.delete(other);
  views.set(id, { ...bounds, at: now });
}

/** Where creatures may walk: the largest view any copy still shows, or null with none. */
export function pickBounds(views, now) {
  let best = null;
  for (const view of views.values()) {
    if (now - view.at > VIEW_STALE_MS) continue;
    if (!best || view.w * view.h > best.w * best.h) best = view;
  }
  return best && { x: best.x, y: best.y, w: best.w, h: best.h };
}

/** Whether the creatures are due a step: copies tick at their own times, so one step is not taken twice. */
export const isDue = (steppedAt, now, stepMs) => now - steppedAt >= stepMs * 0.8;
