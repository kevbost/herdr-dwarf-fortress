// Role "map": a small outdoor scene in the game's glyphs, and every agent a
// creature on it. Working agents walk between things to do (a tree, a boulder,
// the brook), idle ones gather in the clearing and stand in their dark color,
// blocked and done ones stop where they are and blink with their mark.
// Sub-agents walk beside their parent as pets (c, d). Click a creature to go to
// its pane. While Look is on (the menu's Look, shared "df.look") a click puts
// the game's yellow X on that spot and the announcement line says what is there.
//
// The scene is tiles: every cell is one tile of the tileset in its color, with
// the creatures standing in theirs. Movement is one cell at a time, as the game
// moves creatures, on a slow timer that redraws only when someone actually
// moved. Who stands where is movers.js; this file draws it.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, terminals, run, window, checking, shared, setShared, settings, openOverlay } from "herdr";
import { pal, agentGlyphs, creatureInk, isRoleHidden, tileCell, glyphCell, GLYPH_W, GLYPH_H, CH } from "./kit.js";
import { tile, tileIndex } from "./tiles.js";
import { petChar } from "./glyphs.js";
import { describeAgent, describePet, describeTerrain } from "./look.js";
import { who, where } from "./announce.js";
import { NEIGHBORS } from "./walk.js";
import { cellKey } from "./movers.js";
import { MAPS } from "./maps.js";
import { openBigMap } from "./openbig.js";
import { scene, register, pickBounds, isDue, selectMap } from "./scene.js";

const STEP_MS = 1000;
// The popup a right-click opens (mapmenu.js), px: a row for each map and the popup's own padding.
const MAP_MENU = { width: 220, height: 42 + CH * MAPS.length };
const FLASH_MS = 500;
// Opacity swung far past its ends is 0 or 1 nearly all the time: a native blink.
const SHOWN_FIRST = { from: 7, to: -6, period: 2 * FLASH_MS, easing: "linear" };
const SHOWN_SECOND = { from: -6, to: 7, period: 2 * FLASH_MS, easing: "linear" };
// What a stopped agent blinks with its own glyph.
const MARK = { blocked: () => "!", done: () => tile("sun") };

export default class MapPanel {
  // props { big: true } for the big map's copy, which is shown in a dialog.
  init(props, cx) {
    this.big = Boolean(props?.big);
    this.id = scene.nextId++;
    this.seen = scene.version; // the last version of the scene this copy drew
    this.size = null; // the panel, px: known after the first layout
    this.since = new Map(); // address -> { status, at }: when this copy first saw it in that state
    // `herdr-app check` runs init for real: nothing should walk there.
    if (checking()) return;
    // Look does not outlive the window it was turned on in; the big map opens inside that window.
    if (!this.big && shared("df.look")) setShared("df.look", null);
    cx.timer.every(STEP_MS, (cx) => this.tick(cx));
  }

  // Shows the map the person chose (shared "df.map"), the same in every copy of the map.
  followMap() {
    const wanted = shared("df.map");
    if (typeof wanted === "string") selectMap(wanted);
  }

  // The part of the world the panel shows, in cells, around the clearing.
  view() {
    this.followMap();
    if (!this.size) return null;
    // The panel's size comes in screen px, which the zoom has scaled; a cell is GLYPH_W x GLYPH_H at zoom 1.
    const zoom = Number(settings()?.zoom) || 1;
    const w = Math.max(0, Math.floor(Math.round(this.size.width / zoom) / GLYPH_W));
    const h = Math.max(0, Math.floor(Math.round(this.size.height / zoom) / GLYPH_H));
    const { meeting, width, height } = scene.world;
    const origin = (center, shown, total) => Math.max(0, Math.min(total - shown, Math.round(center - shown / 2)));
    return { x: origin(meeting.x, w, width), y: origin(meeting.y, h, height), w, h };
  }

  // Where creatures may be: the shown part of the world itself.
  bounds(view) {
    return { x: view.x, y: view.y, w: Math.min(view.w, scene.world.width - view.x), h: Math.min(view.h, scene.world.height - view.y) };
  }

  // When each agent entered the state it is in, as far as this copy has seen.
  track(list) {
    const now = Date.now();
    const live = new Set(list.map((a) => a.address));
    for (const address of [...this.since.keys()]) if (!live.has(address)) this.since.delete(address);
    for (const a of list) if (this.since.get(a.address)?.status !== a.status) this.since.set(a.address, { status: a.status, at: now });
  }

  // The map copy stops saying it is shown (the big map closing), so the creatures' room is the other copies' view.
  close() {
    scene.views.delete(this.id);
  }

  // Puts the X on a spot and says what is there.
  look(x, y, said) {
    scene.cursor = { x, y };
    setShared("df.look", said);
  }

  // Nobody walks while the map can't be seen: its block hidden, or the window behind others.
  // Every copy of the map ticks, but the creatures take one step for all of them.
  tick(cx) {
    const view = this.view();
    if (!view || view.w < 1 || view.h < 1 || (!this.big && isRoleHidden("map")) || !window()?.active) return;
    const now = Date.now();
    register(scene.views, this.id, this.bounds(view), now);
    const bounds = pickBounds(scene.views, now);
    this.track(agents());
    if (scene.movers.sync(agents(), bounds)) scene.version++;
    if (isDue(scene.steppedAt, now, STEP_MS)) {
      scene.steppedAt = now;
      if (scene.movers.advance(bounds, Math.random)) scene.version++;
    }
    if (scene.version !== this.seen) {
      this.seen = scene.version;
      cx.notify();
    }
  }

  // Who stands where: cell -> what to draw there.
  occupants(c, list, bounds) {
    const glyphs = agentGlyphs(c);
    const listed = new Set(list.map((a) => a.address));
    const canEnter = scene.movers.canEnter(bounds);
    const all = terminals();
    const cells = new Map();
    for (const a of list) {
      const mover = scene.movers.get(a.address);
      const glyph = glyphs.get(a.address);
      if (!mover || !glyph) continue;
      const ink = creatureInk(c, glyph, a);
      cells.set(cellKey(mover.at), {
        id: a.address,
        char: glyph.char,
        mark: Object.hasOwn(MARK, a.status) ? MARK[a.status]() : null,
        color: ink.color,
        background: ink.background,
        tip: `${where(a)}: ${a.status}`,
        look: describeAgent({ program: who(a), space: where(a), status: a.status, since: this.since.get(a.address)?.at ?? null, now: Date.now() }),
        go: () => run("pane.focus", { pane: a.pane }),
      });
    }
    // Sub-agents without a pane of their own, each on a free cell beside its parent.
    for (const a of list) {
      const mover = scene.movers.get(a.address);
      const glyph = glyphs.get(a.address);
      if (!mover || !glyph) continue;
      for (const kid of all.filter((k) => k.parent === a.address && k.state === "live" && !listed.has(k.address))) {
        const beside = NEIGHBORS.map(([dx, dy]) => ({ x: mover.at.x + dx, y: mover.at.y + dy })).find((spot) => canEnter(spot) && !cells.has(cellKey(spot)));
        if (!beside) break;
        cells.set(cellKey(beside), {
          id: kid.address,
          char: petChar(kid.address),
          mark: null,
          color: glyph.dark,
          background: null,
          tip: `${kid.name || kid.template || kid.program?.name || kid.address} (sub-agent)`,
          look: describePet({ name: kid.name || kid.template || kid.program?.name || kid.address, program: who(a), space: where(a) }),
          go: () => run("terminal.peek", { terminal: kid.address }),
        });
      }
    }
    return cells;
  }

  // Two things in one cell, shown in turn.
  blinking(first, second) {
    const layer = (node, blink) => div().absolute().left(0).top(0).child(node).loop("opacity", blink);
    return div().relative().flex_none().w(GLYPH_W).h(GLYPH_H).child(layer(first, SHOWN_FIRST)).child(layer(second, SHOWN_SECOND));
  }

  // A creature in its cell. One that has stopped to say something shows its
  // glyph and its mark in turn; under Look's X (cursor: the X's color) its glyph and the X.
  creature(who, cursor) {
    const cell = div().id(`creature-${who.id}`).relative().flex_none().w(GLYPH_W).h(GLYPH_H).cursor_pointer()
      .when(Boolean(who.background), (el) => el.bg(who.background))
      .tooltip(who.tip)
      .on_click((_e, cx) => {
        cx.stop_propagation();
        who.go();
      });
    if (cursor) return cell.child(this.blinking(glyphCell(who.char, who.color), glyphCell("X", cursor)));
    if (!who.mark) return cell.child(glyphCell(who.char, who.color));
    const layer = (char, blink) => div().absolute().left(0).top(0).child(glyphCell(char, who.color)).loop("opacity", blink);
    return cell.child(layer(who.char, SHOWN_FIRST)).child(layer(who.mark, SHOWN_SECOND));
  }

  render() {
    const c = pal();
    const panel = v_flex().id("df-map").size_full().overflow_hidden().bg(c.BLACK)
      // A click on the sidebar's map opens the big one (a creature or a Look click is its own). Changing the map is a
      // right-click on it, not a control on the screen; the big map has its own list of maps instead.
      .when(!this.big, (el) => el
        .cursor_pointer()
        .on_click(() => { if (!shared("df.look")) openBigMap(); })
        .on_mouse_down("right", (e) => openOverlay({ mod: "df-classic", kind: "popup", at: { x: e.position.x, y: e.position.y }, width: MAP_MENU.width, height: MAP_MENU.height, frame: "none", props: { role: "mapmenu" } })))
      .on_size_change((size, cx) => {
        this.size = size;
        cx.notify();
      });
    const view = this.view();
    if (!view || view.w < 1 || view.h < 1) return panel;
    const bounds = pickBounds(scene.views, Date.now()) ?? this.bounds(view);
    const list = agents();
    this.track(list);
    if (scene.movers.sync(list, bounds)) scene.version++;
    this.seen = scene.version;
    const occupants = this.occupants(c, list, bounds);
    const looking = Boolean(shared("df.look"));
    if (!looking) scene.cursor = null;
    const row = (y) => {
      const drawn = [];
      for (let x = view.x; x < view.x + view.w; x++) {
        const who = occupants.get(`${x},${y}`);
        const cell = scene.world.at(x, y);
        const atCursor = scene.cursor?.x === x && scene.cursor?.y === y;
        if (who) drawn.push(this.creature(looking ? { ...who, go: () => this.look(x, y, who.look) } : who, atCursor ? c.YELLOW : null));
        else if (cell) {
          const ground = tileCell(tileIndex(cell.tile), c[cell.color], cell.background ? c[cell.background] : undefined);
          const shown = atCursor ? this.blinking(ground, glyphCell("X", c.YELLOW)) : ground;
          drawn.push(looking
            ? div().id(`look-${x}-${y}`).flex_none().w(GLYPH_W).h(GLYPH_H).cursor_pointer().on_click((_e, cx) => {
              cx.stop_propagation();
              this.look(x, y, describeTerrain(cell));
            }).child(shown)
            : shown);
        }
        // Past the edge of the world there is nothing to draw, and nothing after it on this row.
        else break;
      }
      return h_flex().h(GLYPH_H).flex_none().children(drawn);
    };
    return panel.children(Array.from({ length: view.h }, (_unused, offset) => row(view.y + offset)));
  }
}
