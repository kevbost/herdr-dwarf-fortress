import test from "node:test";
import assert from "node:assert/strict";
import { remember, clock, shownLine, HISTORY_MAX } from "../history.js";

const agent = (address, status, focused = true) => ({ address, status, focused, program: { name: "Claude Code" }, space_name: "herdr" });
const step = (state, list, now) => remember({ ...state, list, now });
const begin = (list, now = 0) => step({ history: [], statuses: null }, list, now);

test("what is written down: first look, each change once, focused and unfocused panes", () => {
  { // blocked and done are written down at the first look, working is not
    const { history } = begin([agent("t1", "blocked"), agent("t2", "working"), agent("t3", "done")], 5);
    assert.deepEqual(history.map((line) => line.text), ["Claude Code needs you at herdr!", "Claude Code has finished at herdr."]);
  }
  { // blocked, working and done are all written down, each once
    let state = begin([agent("t1", "idle")], 1);
    state = step(state, [agent("t1", "working")], 2);
    state = step(state, [agent("t1", "working")], 3);
    state = step(state, [agent("t1", "blocked")], 4);
    state = step(state, [agent("t1", "done")], 5);
    assert.deepEqual(state.history.map((line) => [line.status, line.at]), [["working", 2], ["blocked", 4], ["done", 5]]);
    assert.equal(state.history[0].color, "LBLUE");
  }
  { // work that ends in the focused pane (working to idle) is not announced
    let state = begin([agent("t1", "idle")], 1);
    state = step(state, [agent("t1", "working")], 2);
    state = step(state, [agent("t1", "idle")], 3);
    assert.deepEqual(state.history.map((line) => line.status), ["working"]);
  }
  { // work that ends in a shown pane without the focus counts as finished
    let state = begin([agent("t1", "idle", false)], 1);
    state = step(state, [agent("t1", "working", false)], 2);
    state = step(state, [agent("t1", "idle", false)], 3);
    assert.deepEqual(state.history.map((line) => line.status), ["working", "done"]);
    assert.equal(state.history[1].text, "Claude Code has finished at herdr.");
  }
});




test("kept lines: the text outlives the agent, the cap, the clock", () => {
  { // the text is kept after the agent is gone
    let state = begin([agent("t1", "idle")], 1);
    state = step(state, [agent("t1", "done")], 2);
    state = step(state, [], 3);
    assert.equal(state.history[0].text, "Claude Code has finished at herdr.");
  }
  { // the oldest lines go past the cap
    let state = { history: [], statuses: new Map([["t1", "idle"]]) };
    for (let i = 0; i < HISTORY_MAX + 5; i++) state = step(state, [agent("t1", i % 2 ? "blocked" : "done")], i);
    assert.equal(state.history.length, HISTORY_MAX);
    assert.equal(state.history.at(-1).at, HISTORY_MAX + 4);
  }
  { // clock is HH:MM:SS
    assert.match(clock(0), /^\d\d:\d\d:\d\d$/);
  }
});



const line = (address, status, at) => ({ at, color: "LRED", text: `${address} ${status}`, address, status });

test("which line shows: working or blocked while true, finished until worked again, newest true wins", () => {
  { // a working or blocked line shows while its agent is in that state, then goes
    const history = [line("t1", "working", 1)];
    assert.equal(shownLine({ history, list: [agent("t1", "working")] })?.status, "working");
    assert.equal(shownLine({ history, list: [agent("t1", "idle")] }), null);
    assert.equal(shownLine({ history, list: [] }), null);
  }
  { // a finished line shows until its agent works or is blocked again
    const history = [line("t1", "done", 1)];
    assert.equal(shownLine({ history, list: [agent("t1", "idle")] })?.status, "done");
    assert.equal(shownLine({ history, list: [] })?.status, "done");
    assert.equal(shownLine({ history, list: [agent("t1", "working")] }), null);
    assert.equal(shownLine({ history, list: [agent("t1", "blocked")] }), null);
  }
  { // the newest true line wins; one that stops being true gives way to an older true one
    const history = [line("t1", "working", 1), line("t2", "done", 2)];
    const list = [agent("t1", "working"), agent("t2", "idle")];
    assert.equal(shownLine({ history, list }).address, "t2");
    assert.equal(shownLine({ history, list: [agent("t1", "working"), agent("t2", "working")] }).address, "t1");
  }
});



test("an agent that appears after the list was empty is a new arrival, not a first look", () => {
  let state = begin([agent("t1", "idle")], 1);
  state = step(state, [], 2);
  state = step(state, [agent("t2", "working")], 3);
  assert.deepEqual(state.history.map((line) => line.status), ["working"]);
});
