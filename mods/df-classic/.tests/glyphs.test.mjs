import { test } from "node:test";
import assert from "node:assert/strict";
import { AGENT_COLORS, DARK_PARTNER, FIRST, RACES, assignGlyphs, creatureInk, speciesChar, petChar } from "../glyphs.js";

const claude = (address) => ({ address, key: "claude", space: address });
const inSpace = (space, address, key = "claude") => ({ address, key, space });
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


test("races: the first agent in a space is its program's species, each added one cycles elf, goblin, human, kobold", () => {
  { // five in one space: the species, then every race once, in order
    const list = ["t1", "t2", "t3", "t4", "t5"].map((address) => inSpace("s1", address));
    const chars = list.map((agent) => assignGlyphs(list).glyphs.get(agent.address).char);
    assert.deepEqual(chars, ["☺", "e", "g", "U", "k"]);
    assert.deepEqual(RACES.map((race) => race.char), ["e", "g", "U", "k"]);
  }
  { // past the last race it starts again at the elf, never at the dwarf
    const list = ["t1", "t2", "t3", "t4", "t5", "t6", "t7"].map((address) => inSpace("s1", address));
    const assigned = assignGlyphs(list);
    assert.deepEqual(list.map((agent) => assigned.glyphs.get(agent.address).char), ["☺", "e", "g", "U", "k", "e", "g"]);
  }
  { // a space's first agent keeps the program's own character, and each space has its own first
    const list = [inSpace("s1", "t1", "codex"), inSpace("s1", "t2", "codex"), inSpace("s2", "t3"), inSpace("s2", "t4", "codex")];
    const assigned = assignGlyphs(list);
    assert.deepEqual(list.map((agent) => assigned.glyphs.get(agent.address).char), ["C", "e", "☺", "e"]);
  }
  { // the lowest address is the first, whatever order they are given in (all new at once)
    const list = [inSpace("s1", "t10"), inSpace("s1", "t2"), inSpace("s1", "t9")];
    const forward = assignGlyphs(list).races;
    assert.deepEqual(forward, assignGlyphs([...list].reverse()).races);
    assert.deepEqual(forward, { t2: FIRST, t9: "elf", t10: "goblin" });
  }
  { // an agent with no space is in the one space that has none
    const assigned = assignGlyphs([{ address: "t1", key: "claude" }, { address: "t2", key: "claude" }]);
    assert.equal(assigned.glyphs.get("t1").char, "☺");
    assert.equal(assigned.glyphs.get("t2").char, "e");
  }
});

test("races: remembered for life, the others stay when the first leaves, the next one added cycles", () => {
  { // arriving one at a time gives the same as arriving together, and nothing changes after
    let races = {};
    let live = [];
    for (const address of ["t1", "t2", "t3"]) {
      live = [...live, inSpace("s1", address)];
      races = assignGlyphs(live, {}, races).races;
    }
    assert.deepEqual(races, { t1: FIRST, t2: "elf", t3: "goblin" });
    live = live.filter((agent) => agent.address !== "t1");
    races = assignGlyphs(live, {}, races).races;
    assert.deepEqual(races, { t2: "elf", t3: "goblin" }, "the first left: no one else changes, only the living are remembered");
    live = [...live, inSpace("s1", "t4")];
    const assigned = assignGlyphs(live, {}, races);
    assert.equal(assigned.glyphs.get("t4").char, "U", "the next one added cycles on, it is not the first");
    assert.equal(assigned.glyphs.get("t2").char, "e");
  }
  { // a race left free by an agent that went is the next one taken
    const list = [inSpace("s1", "t1"), inSpace("s1", "t3")];
    const assigned = assignGlyphs([...list, inSpace("s1", "t4")], {}, { t1: FIRST, t2: "elf", t3: "goblin" });
    assert.equal(assigned.glyphs.get("t4").char, "e", "t2, the elf, is not here");
  }
  { // a space with no agents left starts afresh: the next one is the first again
    assert.equal(assignGlyphs([inSpace("s1", "t9")], {}, {}).glyphs.get("t9").char, "☺");
  }
  { // racesChanged says whether what must be remembered differs; remembered values that are not races are not trusted
    const first = assignGlyphs([inSpace("s1", "t1"), inSpace("s1", "t2")]);
    assert.equal(first.racesChanged, true);
    assert.equal(assignGlyphs([inSpace("s1", "t1"), inSpace("s1", "t2")], first.kept, first.races).racesChanged, false);
    assert.equal(assignGlyphs([inSpace("s1", "t1")], first.kept, first.races).racesChanged, true, "one left");
    assert.equal(assignGlyphs([], {}, {}).racesChanged, false);
    const distrust = assignGlyphs([inSpace("s1", "t1")], {}, { t1: "wizard" });
    assert.equal(distrust.races.t1, FIRST);
    assert.equal(assignGlyphs([inSpace("s1", "t1")], {}, null).races.t1, FIRST);
  }
  { // a race is a character of its own: its colors are kept apart from the others'
    const list = ["t1", "t2", "t3", "t4", "t5", "t6"].map((address, index) => inSpace(`s${index}`, address));
    const assigned = assignGlyphs(list);
    for (const agent of list) assert.equal(assigned.glyphs.get(agent.address).char, "☺");
    const elves = ["a1", "a2", "a3"].flatMap((address, index) => [inSpace(`s${index}`, `${address}x`), inSpace(`s${index}`, `${address}y`)]);
    const withElves = assignGlyphs(elves);
    const elfColors = elves.filter((agent) => agent.address.endsWith("y")).map((agent) => withElves.glyphs.get(agent.address).color);
    assert.equal(new Set(elfColors).size, elfColors.length, "three elves, three colors");
  }
});
