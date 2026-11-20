import { test } from "node:test";
import assert from "node:assert/strict";
import { REPORTS, REPORT_TTL, REPORT_MAX, report, nextExpiry } from "../log.js";

const agent = (address, status) => ({ address, status, focused: true });
const start = { log: [], statuses: null };

test("report letters: the three letters, a change adds one, unchanged adds none, the first look", () => {
  { // the game's three letters
    assert.deepEqual(Object.values(REPORTS).map((r) => r.letter), ["C", "H", "S"]);
  }
  { // a change into a reported state adds a letter; idle adds none
    const first = report({ ...start, list: [agent("t1", "idle")], now: 0 });
    const second = report({ ...first, list: [agent("t1", "working")], now: 10 });
    assert.deepEqual(second.log, [{ address: "t1", status: "working", at: 10 }]);
    const third = report({ ...second, list: [agent("t1", "idle")], now: 20 });
    assert.equal(third.log.length, 1);
  }
  { // an unchanged state adds nothing
    const first = report({ ...start, list: [agent("t1", "blocked")], now: 0 });
    assert.equal(report({ ...first, list: [agent("t1", "blocked")], now: 5 }).log.length, 1);
  }
  { // at the first look only blocked and done count
    const first = report({ ...start, list: [agent("t1", "working"), agent("t2", "blocked"), agent("t3", "done")], now: 0 });
    assert.deepEqual(first.log.map((e) => e.address), ["t2", "t3"]);
  }
});




test("letters go after the ttl, and the oldest beyond the cap", () => {
  const first = report({ ...start, list: [agent("t1", "blocked")], now: 0 });
  assert.equal(nextExpiry(first.log), REPORT_TTL);
  assert.equal(report({ ...first, list: [agent("t1", "blocked")], now: REPORT_TTL }).log.length, 0);
  let state = report({ ...start, list: [agent("t0", "idle")], now: 0 });
  for (let i = 0; i < 2 * (REPORT_MAX + 3); i++) {
    state = report({ ...state, list: [agent("t0", i % 2 ? "idle" : "working")], now: i + 1 });
  }
  assert.equal(state.log.length, REPORT_MAX);
  assert.equal(nextExpiry([]), null);
});

test("working to idle without the focus gives the finished letter; with it, none", () => {
  const run = (focused) => {
    const first = report({ ...start, list: [{ address: "t1", status: "idle", focused }], now: 0 });
    const second = report({ ...first, list: [{ address: "t1", status: "working", focused }], now: 1 });
    return report({ ...second, list: [{ address: "t1", status: "idle", focused }], now: 2 }).log.map((entry) => entry.status);
  };
  assert.deepEqual(run(false), ["working", "done"]);
  assert.deepEqual(run(true), ["working"]);
});

test("a letter is made for an agent that appears after the list was empty", () => {
  let state = report({ ...start, list: [agent("t1", "idle")], now: 0 });
  state = report({ ...state, list: [], now: 1 });
  state = report({ ...state, list: [agent("t2", "working")], now: 2 });
  assert.deepEqual(state.log.map((entry) => entry.status), ["working"]);
});
