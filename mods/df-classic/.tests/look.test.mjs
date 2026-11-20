import { test } from "node:test";
import assert from "node:assert/strict";
import { MAPS } from "../maps.js";
import { STATE_COLOR, duration, describeAgent, describePet, describeTerrain } from "../look.js";

test("describing: durations, an agent, a pet", () => {
  { // durations are short
    assert.equal(duration(0), "<1m");
    assert.equal(duration(59_999), "<1m");
    assert.equal(duration(5 * 60_000), "5m");
    assert.equal(duration(125 * 60_000), "2h 5m");
    assert.equal(duration(120 * 60_000), "2h");
    assert.equal(duration(49 * 3_600_000), "2d");
    assert.equal(duration(-5), "<1m");
  }
  { // an agent is described in its state's color, with how long when known
    const known = describeAgent({ program: "Claude Code", space: "herdr", status: "blocked", since: 0, now: 180_000 });
    assert.deepEqual(known, { color: "LRED", text: "Claude Code at herdr: blocked for 3m." });
    const unknown = describeAgent({ program: "Codex", space: "x", status: "idle", since: null, now: 5 });
    assert.equal(unknown.text, "Codex at x: idle.");
    assert.equal(unknown.color, STATE_COLOR.idle);
  }
  { // a pet says whose it is
    assert.match(describePet({ name: "t4", program: "Claude Code", space: "herdr" }).text, /sub-agent of Claude Code at herdr/);
  }
});



test("every kind of cell of every map has words", () => {
  for (const kind of MAPS.flatMap((map) => map.kinds)) assert.notEqual(describeTerrain({ kind, color: "GREEN" }).text, "Nothing of note.", kind);
});
