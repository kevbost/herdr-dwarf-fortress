import test from "node:test";
import assert from "node:assert/strict";
import { planDeploy } from "../deploy-plan.mjs";

const plan = (repo, live, base) => planDeploy({ repo, live, base });
const only = (p, key, ...paths) => {
  for (const k of Object.keys(p)) assert.deepEqual(p[k], k === key ? paths : [], `${k} of ${JSON.stringify(p)}`);
};

test("repo unchanged since the last deploy: keep, even when live differs", () => {
  only(plan({ a: "1" }, { a: "2" }, { a: "1" }), "keep", "a");
});

test("repo unchanged and live gone: keep (nothing is restored behind the person's back)", () => {
  only(plan({ a: "1" }, {}, { a: "1" }), "keep", "a");
});

test("repo changed, live still at the last deploy: write", () => {
  only(plan({ a: "2" }, { a: "1" }, { a: "1" }), "write", "a");
});

test("repo changed, live already identical: only record it", () => {
  only(plan({ a: "2" }, { a: "2" }, { a: "1" }), "record", "a");
});

test("repo changed and live changed differently: conflict", () => {
  const p = plan({ a: "2" }, { a: "3" }, { a: "1" });
  assert.equal(p.conflicts.length, 1);
  assert.equal(p.conflicts[0].path, "a");
  assert.deepEqual(p.write, []);
});

test("repo changed and the live file was deleted: write it back", () => {
  only(plan({ a: "2" }, {}, { a: "1" }), "write", "a");
});

test("new repo file with no live file: write", () => {
  only(plan({ a: "1" }, {}, {}), "write", "a");
});

test("new repo file and a different live file that no deploy wrote: conflict", () => {
  assert.equal(plan({ a: "1" }, { a: "9" }, {}).conflicts.length, 1);
});

test("new repo file and an identical live file: record", () => {
  only(plan({ a: "1" }, { a: "1" }, {}), "record", "a");
});

test("removed in the repo, live still at the last deploy: remove", () => {
  only(plan({}, { a: "1" }, { a: "1" }), "remove", "a");
});

test("removed in the repo, live already gone: forget", () => {
  only(plan({}, {}, { a: "1" }), "forget", "a");
});

test("removed in the repo, live changed: conflict", () => {
  const p = plan({}, { a: "2" }, { a: "1" });
  assert.equal(p.conflicts.length, 1);
  assert.deepEqual(p.remove, []);
});

test("live-only files are ignored", () => {
  only(plan({}, { "jsconfig.json": "x", cache: "y" }, {}));
});

test("paths come out sorted and each lands in one list", () => {
  const p = plan({ b: "2", a: "2", c: "1" }, { b: "1", a: "1", c: "1" }, { b: "1", a: "1", c: "1" });
  assert.deepEqual(p.write, ["a", "b"]);
  assert.deepEqual(p.keep, ["c"]);
});
