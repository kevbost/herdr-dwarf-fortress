// The creatures on the map: one mover per agent, where it stands and where it
// is going. Working ones walk between things to do, idle ones come to rest
// near the clearing, blocked and done ones stay where they are. No two movers
// share a cell. Pure: the caller says who is alive and how far the view reaches.

import { hashString } from "./hash.js";
import { pointsOfInterest } from "./world.js";
import { step, findPath, sameCell, stepBudget, inBounds, spiralCells, edgeCells, pickGoal } from "./walk.js";

// How many steps a worker stays at what it walked to, least and most.
const LINGER = { least: 1, most: 4 };
// How far from the clearing's middle idle agents may come to rest.
export const REST_RADIUS = 6;
// An idle agent at rest sets out on a stroll now and then: each step it has this chance,
// so about one in fifty seconds. It goes up to STROLL_RADIUS cells, stays a moment, and
// comes back to rest near the meeting place.
const STROLL_CHANCE = 0.02;
export const STROLL_RADIUS = 2;
const STROLL_LINGER = { least: 2, most: 5 };
// Cells a worker moves each step, along its path: it reads as walking faster. Everyone else moves one.
const WORKER_STEPS = 2;

export const cellKey = (point) => `${point.x},${point.y}`;

export class Movers {
  constructor(world) {
    this.world = world;
    this.byAddress = new Map(); // address -> { at, goal, path, previous, budget, linger, status }
    this.goals = { key: null, points: [] }; // things to do in the view, kept until the view changes
  }

  get(address) {
    return this.byAddress.get(address);
  }

  /** Whether a cell is ground a creature may stand on, inside bounds { x, y, w, h }. */
  canEnter(bounds) {
    return (point) => inBounds(point, bounds) && this.world.isWalkable(point.x, point.y);
  }

  occupied() {
    return new Set([...this.byAddress.values()].map((mover) => cellKey(mover.at)));
  }

  /**
   * One mover per agent in list [{ address, status }], each on walkable ground
   * inside bounds. A new one arrives at a free cell of the edge, like a
   * migrant; one the bounds no longer hold arrives again. True when anyone
   * arrived or left, so that other views of the scene can redraw.
   */
  sync(list, bounds) {
    const canEnter = this.canEnter(bounds);
    const live = new Set(list.map((agent) => agent.address));
    let changed = false;
    for (const address of [...this.byAddress.keys()]) if (!live.has(address)) changed = this.byAddress.delete(address) || changed;
    for (const [address, mover] of [...this.byAddress]) if (!canEnter(mover.at)) changed = this.byAddress.delete(address) || changed;
    // Only someone arriving needs to know what is taken and where the edge is.
    let taken;
    let edge;
    for (const agent of list) {
      let mover = this.byAddress.get(agent.address);
      if (!mover) {
        taken ??= this.occupied();
        edge ??= edgeCells(bounds).filter(canEnter);
        const first = edge.length ? hashString(agent.address) % edge.length : 0;
        const spot = edge.map((_cell, offset) => edge[(first + offset) % edge.length]).find((cell) => !taken.has(cellKey(cell)));
        // No free ground at the edge: this one is not on the map for now.
        if (!spot) continue;
        mover = { at: spot, goal: null, path: null, previous: null, budget: 0, linger: 0, status: null, strolling: false };
        this.byAddress.set(agent.address, mover);
        taken.add(cellKey(spot));
        changed = true;
      }
      if (mover.status !== agent.status) Object.assign(mover, { status: agent.status, goal: null, path: null, linger: 0, strolling: false });
    }
    return changed;
  }

  pointsIn(bounds) {
    const key = JSON.stringify(bounds);
    if (this.goals.key !== key) this.goals = { key, points: pointsOfInterest(this.world, bounds) };
    return this.goals.points;
  }

  // A free spot near the middle of the clearing, or of the bounds when the clearing is outside them.
  restSpot(mover, bounds, isFree) {
    const meeting = this.world.meeting;
    const middle = inBounds(meeting, bounds) ? meeting : { x: bounds.x + Math.floor(bounds.w / 2), y: bounds.y + Math.floor(bounds.h / 2) };
    const others = [...this.byAddress.values()].filter((other) => other !== mover);
    const wanted = new Set(others.filter((other) => other.status === "idle" && other.goal).map((other) => cellKey(other.goal)));
    return spiralCells(middle, REST_RADIUS).find((spot) => (isFree(spot) || sameCell(spot, mover.at)) && !wanted.has(cellKey(spot))) ?? mover.at;
  }

  // Sends an idle mover at rest to a free cell a few steps away, if there is one.
  stroll(mover, isFree, random) {
    const spots = spiralCells(mover.at, STROLL_RADIUS).filter((spot) => !sameCell(spot, mover.at) && isFree(spot));
    const goal = pickGoal(spots, random);
    if (goal) Object.assign(mover, { goal, strolling: true, budget: stepBudget(mover.at, goal), previous: null, path: null });
  }

  // Moves one mover a cell, if it has somewhere to go. True when it moved.
  // canEnter: ground it may stand on. isFree: that, and nobody standing there.
  advanceOne(mover, bounds, { canEnter, isFree }, random) {
    const working = mover.status === "working";
    if (!working && mover.status !== "idle") return false;
    if (mover.linger > 0) {
      mover.linger--;
      return false;
    }
    if (!mover.goal) {
      mover.goal = working ? pickGoal(this.pointsIn(bounds), random) : this.restSpot(mover, bounds, isFree);
      if (!mover.goal) return false;
      Object.assign(mover, { budget: stepBudget(mover.at, mover.goal), previous: null, path: null });
    }
    if (sameCell(mover.at, mover.goal)) {
      // A worker does its work, then picks the next thing. A stroller looks about, then goes back to rest.
      // An idle one at rest stays, and now and then sets out on a stroll.
      if (working) Object.assign(mover, { goal: null, linger: LINGER.least + Math.floor(random() * (LINGER.most - LINGER.least + 1)) });
      else if (mover.strolling) Object.assign(mover, { goal: null, strolling: false, linger: STROLL_LINGER.least + Math.floor(random() * (STROLL_LINGER.most - STROLL_LINGER.least + 1)) });
      else if (random() < STROLL_CHANCE) this.stroll(mover, isFree, random);
      return false;
    }
    mover.path ??= findPath({ from: mover.at, goal: mover.goal, canEnter });
    if (mover.budget-- <= 0 || !mover.path) {
      // Couldn't get there: a worker tries something else, an idle one rests here.
      Object.assign(mover, { goal: working ? null : mover.at, strolling: false });
      return false;
    }
    let next = mover.path[0];
    if (isFree(next)) mover.path.shift();
    else {
      // Someone is standing in the way: step around, and find the way again from there.
      next = step({ from: mover.at, goal: mover.goal, previous: mover.previous, canEnter: isFree });
      mover.path = null;
      if (sameCell(next, mover.at)) return false;
    }
    mover.previous = mover.at;
    mover.at = next;
    // A worker goes on a second cell when the way is clear, and stops short rather than step through anyone.
    for (let more = working ? WORKER_STEPS - 1 : 0; more > 0 && mover.path?.length; more--) {
      const onward = mover.path[0];
      if (!isFree(onward)) break;
      mover.path.shift();
      mover.previous = mover.at;
      mover.at = onward;
      mover.budget--;
    }
    return true;
  }

  /** One step for everyone who is going somewhere. True when anyone moved. `random`: a function giving [0, 1). */
  advance(bounds, random) {
    const canEnter = this.canEnter(bounds);
    const taken = this.occupied();
    const isFree = (point) => canEnter(point) && !taken.has(cellKey(point));
    let moved = false;
    for (const mover of this.byAddress.values()) {
      const from = cellKey(mover.at);
      if (!this.advanceOne(mover, bounds, { canEnter, isFree }, random)) continue;
      taken.delete(from);
      taken.add(cellKey(mover.at));
      moved = true;
    }
    return moved;
  }
}
