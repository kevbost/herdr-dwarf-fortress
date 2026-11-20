import { test } from "node:test";
import assert from "node:assert/strict";
import { ANNOUNCED, announced, who, where } from "../announce.js";

test("each announced state has wording, and an unknown status has none", () => {
  { // each announced state is worded in the game's voice and color
    assert.deepEqual(Object.keys(ANNOUNCED), ["blocked", "done", "working"]);
    assert.equal(ANNOUNCED.blocked.text("Claude Code", "herdr"), "Claude Code needs you at herdr!");
    assert.equal(ANNOUNCED.done.text("Claude Code", "herdr"), "Claude Code has finished at herdr.");
    assert.equal(ANNOUNCED.working.text("Claude Code", "herdr"), "Claude Code has started working at herdr.");
    assert.deepEqual(Object.values(ANNOUNCED).map((said) => said.color), ["LRED", "LGREEN", "LBLUE"]);
  }
  { // a status the table does not know has no wording, even one named like an object method
    assert.equal(Object.hasOwn(ANNOUNCED, "constructor"), false);
    assert.equal(Object.hasOwn(ANNOUNCED, "toString"), false);
  }
});


test("the place falls back from space to title to address, the name from program to app", () => {
  assert.equal(where({ address: "t9", space_name: "", title: "fix login" }), "fix login");
  assert.equal(where({ address: "t9" }), "t9");
  assert.equal(who({ program: { name: "Claude Code" }, app: "claude-code" }), "Claude Code");
  assert.equal(who({ app: "pi" }), "pi");
  assert.equal(who({}), "An agent");
});

test("working to idle in an unfocused pane counts as done; in the focused pane it does not", () => {
  assert.equal(announced("working", { status: "idle", focused: false }), "done");
  assert.equal(announced("working", { status: "idle", focused: true }), "idle");
  assert.equal(announced("idle", { status: "idle", focused: false }), "idle");
  assert.equal(announced("blocked", { status: "idle", focused: false }), "idle");
  assert.equal(announced("idle", { status: "working", focused: false }), "working");
});
