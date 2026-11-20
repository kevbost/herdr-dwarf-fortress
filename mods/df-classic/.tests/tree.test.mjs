import { test } from "node:test";
import assert from "node:assert/strict";
import { find, isRoleHidden, sideOf, swapMenuSide } from "../tree.js";

const block = (id, role, more = {}) => ({ id, type: "block", content: { mod: "df-classic", props: { role } }, ...more });
const layout = () => ({
  id: "root",
  type: "column",
  children: [
    block("top", "top"),
    { id: "body", type: "row", children: [
      { id: "work", type: "column", children: [block("tabs", "tabs")] },
      { id: "sidebar", type: "column", children: [block("map", "map"), block("agents", "agents")] },
      block("depth", "depth"),
    ] },
  ],
});

test("reading and swapping a layout tree: find, the menu's side, swapping twice, a tree without the pair", () => {
  { // find reaches a node at any depth, or nothing
    const tree = layout();
    assert.equal(find(tree, "root"), tree);
    assert.equal(find(tree, "map").content.props.role, "map");
    assert.equal(find(tree, "nope"), null);
    assert.equal(find(null, "root"), null);
  }
  { // the menu's side is the order of sidebar and work
    const tree = layout();
    assert.equal(sideOf(find(tree, "body")), "right");
    assert.ok(swapMenuSide(tree));
    assert.equal(sideOf(find(tree, "body")), "left");
    assert.deepEqual(find(tree, "body").children.map((node) => node.id), ["sidebar", "work", "depth"]);
  }
  { // swapping twice restores the tree, and everything else stays where it was
    const tree = layout();
    find(tree, "body").children.unshift(block("extra", "border"));
    const before = JSON.stringify(tree);
    swapMenuSide(tree);
    assert.deepEqual(find(tree, "body").children.map((node) => node.id), ["extra", "sidebar", "work", "depth"]);
    swapMenuSide(tree);
    assert.equal(JSON.stringify(tree), before);
  }
  { // a tree without the pair is left alone
    const tree = { id: "root", children: [{ id: "body", children: [{ id: "work" }] }] };
    const before = JSON.stringify(tree);
    assert.equal(swapMenuSide(tree), false);
    assert.equal(swapMenuSide({ id: "root" }), false);
    assert.equal(JSON.stringify(tree), before);
  }
});




test("hidden roles: a block or ancestor, a stack, a floating block, a role not in the tree", () => {
  { // a role is hidden when its block or an ancestor is
    const tree = layout();
    assert.equal(isRoleHidden(tree, "map"), false);
    find(tree, "sidebar").hidden = true;
    assert.equal(isRoleHidden(tree, "map"), true);
    assert.equal(isRoleHidden(tree, "tabs"), false);
    find(tree, "sidebar").hidden = false;
    find(tree, "map").hidden = true;
    assert.equal(isRoleHidden(tree, "map"), true);
  }
  { // behind a stack is hidden; in front is not
    const stack = { id: "panel-body", type: "stack", active: "files", children: [{ id: "files", type: "block", content: { mod: "files" } }, block("map", "map")] };
    const tree = { id: "root", children: [stack] };
    assert.equal(isRoleHidden(tree, "map"), true);
    stack.active = "map";
    assert.equal(isRoleHidden(tree, "map"), false);
  }
  { // a floating block counts, and one shown copy is enough
    const tree = { id: "root", floating: [block("map", "map")], children: [] };
    assert.equal(isRoleHidden(tree, "map"), false);
    const both = { id: "root", children: [block("a", "map", { hidden: true }), block("b", "map")] };
    assert.equal(isRoleHidden(both, "map"), false);
  }
  { // a role the tree does not hold is not known to be hidden
    assert.equal(isRoleHidden(layout(), "nowhere"), false);
    assert.equal(isRoleHidden(null, "map"), false);
    assert.equal(isRoleHidden(undefined, "map"), false);
  }
});



