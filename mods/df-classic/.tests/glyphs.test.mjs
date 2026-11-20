import { test } from "node:test";
import assert from "node:assert/strict";
import { AGENT_COLORS, DARK_PARTNER, assignGlyphs, creatureInk, speciesChar, petChar } from "../glyphs.js";

const claude = (address) => ({ address, key: "claude" });
const colorsOf = (assigned) => Object.fromEntries([...assigned.glyphs].map(([address, glyph]) => [address, glyph.color]));

test("glyph basics: dwarves and first letters, one address one glyph, no agents no glyphs, cats and dogs", () => {
  { // Claude agents are dwarves, other programs their first letter
    assert.equal(speciesChar("claude"), "☺");
    assert.equal(speciesChar("claude-code"), "☺");
    assert.equal(speciesChar("codex"), "C");
    assert.equal(speciesChar("gemini"), "G");
    assert.equal(speciesChar("9router"), "9");
    assert.equal(speciesChar(""), "?");
    assert.equal(speciesChar(undefined), "?");
    assert.equal(speciesChar("--"), "?");
  }
  { // one address is one glyph
    assert.equal(assignGlyphs([claude("t1"), { address: "t1", key: "codex" }]).glyphs.size, 1);
  }
  { // no agents, no glyphs
    assert.equal(assignGlyphs([]).glyphs.size, 0);
  }
  { // a sub-agent is a cat or a dog, the same one every time
    assert.ok(["c", "d"].includes(petChar("t4")));
    assert.equal(petChar("t4"), petChar("t4"));
    assert.deepEqual(new Set(["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"].map(petChar)), new Set(["c", "d"]));
  }
});

test("remembered colors: same in any order, kept as others come and go, changed, untrusted values", () => {
  { // the same agents give the same glyphs, in any order
    const list = [claude("t8"), claude("t1c"), { address: "vps/t7", key: "codex" }];
    const first = assignGlyphs(list);
    const again = assignGlyphs([...list].reverse());
    assert.deepEqual(colorsOf(first), colorsOf(again));
    assert.equal(first.glyphs.get("vps/t7").char, "C");
    assert.equal(first.glyphs.get("t8").char, "☺");
  }
  { // an agent keeps its color when others arrive and leave
    let kept = {};
    let live = [];
    const seen = {};
    const settle = () => {
      const assigned = assignGlyphs(live, kept);
      kept = assigned.kept;
      for (const [address, glyph] of assigned.glyphs) {
        seen[address] ??= glyph.color;
        assert.equal(glyph.color, seen[address], `${address} changed color`);
      }
      return assigned;
    };
    for (const address of ["t1", "t2", "t11", "t3", "t10", "t2b"]) {
      live = [...live, claude(address)];
      settle();
    }
    for (const gone of ["t1", "t11", "t3"]) {
      live = live.filter((agent) => agent.address !== gone);
      settle();
    }
    assert.deepEqual(Object.keys(kept).sort(), ["t10", "t2", "t2b"], "only the living are remembered");
  }
  { // changed says whether what must be remembered differs
    const first = assignGlyphs([claude("t1"), claude("t2")], {});
    assert.equal(first.changed, true);
    assert.equal(assignGlyphs([claude("t1"), claude("t2")], first.kept).changed, false);
    assert.equal(assignGlyphs([claude("t1")], first.kept).changed, true, "one left");
    assert.equal(assignGlyphs([], {}).changed, false);
  }
  { // a remembered color that is not an agent color is not trusted
    const assigned = assignGlyphs([claude("t1")], { t1: "BLUE" });
    assert.ok(AGENT_COLORS.includes(assigned.glyphs.get("t1").color));
    assert.equal(assigned.changed, true);
    assert.ok(AGENT_COLORS.includes(assignGlyphs([claude("t1")], null).glyphs.get("t1").color));
  }
});




test("color assignment: different while free, past the number of colors, species apart, dark partners", () => {
  { // agents of one species get different colors while any are free
    const list = AGENT_COLORS.map((_color, index) => claude(`t${index}`));
    const colors = Object.values(colorsOf(assignGlyphs(list)));
    assert.equal(new Set(colors).size, AGENT_COLORS.length);
  }
  { // past the number of colors, the first ones are still all different
    const list = Array.from({ length: 50 }, (_unused, index) => claude(`t${index}`));
    const assigned = assignGlyphs(list);
    assert.equal(assigned.glyphs.size, 50);
    for (const glyph of assigned.glyphs.values()) assert.ok(AGENT_COLORS.includes(glyph.color));
    const firstFew = list.slice(0, AGENT_COLORS.length).map((agent) => assigned.glyphs.get(agent.address).color);
    assert.equal(new Set(firstFew).size, AGENT_COLORS.length);
  }
  { // species do not compete for colors
    const dwarves = AGENT_COLORS.map((_color, index) => claude(`t${index}`));
    const preferred = assignGlyphs([{ address: "x1", key: "codex" }]).glyphs.get("x1").color;
    const crowded = assignGlyphs([...dwarves, { address: "x1", key: "codex" }]).glyphs.get("x1").color;
    assert.equal(crowded, preferred, "a codex agent's color does not depend on how many dwarves there are");
  }
  { // every color has a dark partner, and no dark partner is itself an agent color
    for (const color of AGENT_COLORS) {
      assert.ok(DARK_PARTNER[color], color);
      assert.ok(!AGENT_COLORS.includes(DARK_PARTNER[color]), `${DARK_PARTNER[color]} would look like another agent`);
    }
    assert.equal(new Set(Object.values(DARK_PARTNER)).size, AGENT_COLORS.length, "idle agents stay distinct too");
    for (const glyph of assignGlyphs([claude("t1"), claude("t2"), claude("t3")]).glyphs.values()) assert.equal(glyph.dark, DARK_PARTNER[glyph.color]);
  }
});






test("a creature's ink: idle dark, focused inverted, blocked on red", () => {
  const colors = { BLACK: "#000", RED: "#800", LRED: "#f00" };
  const glyph = { color: "#0ff", dark: "#088" };
  assert.deepEqual(creatureInk(colors, glyph, { status: "working", focused: false }), { color: "#0ff", background: null });
  assert.deepEqual(creatureInk(colors, glyph, { status: "idle", focused: false }), { color: "#088", background: null });
  assert.deepEqual(creatureInk(colors, glyph, { status: "done", focused: false }), { color: "#0ff", background: null });
  assert.deepEqual(creatureInk(colors, glyph, { status: "working", focused: true }), { color: "#000", background: "#0ff" });
  assert.deepEqual(creatureInk(colors, glyph, { status: "idle", focused: true }), { color: "#000", background: "#088" });
  assert.deepEqual(creatureInk(colors, glyph, { status: "blocked", focused: false }), { color: "#0ff", background: "#800" });
  assert.deepEqual(creatureInk(colors, glyph, { status: "blocked", focused: true }), { color: "#000", background: "#f00" });
});

