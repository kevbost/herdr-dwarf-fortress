// Reading and changing a layout tree (layouts/<name>.json, or layout()). Pure.

export function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

/** "left" or "right": which side of "work" the "sidebar" is on, among `body`'s children. */
export function sideOf(body) {
  const ids = (body?.children ?? []).map((node) => node.id);
  return ids.indexOf("sidebar") < ids.indexOf("work") ? "left" : "right";
}

/**
 * Swaps "sidebar" and "work" inside the node "body", in place: every other
 * child keeps its position. False when the tree has no such pair.
 */
export function swapMenuSide(tree) {
  const children = find(tree, "body")?.children ?? [];
  const sidebar = children.findIndex((node) => node.id === "sidebar");
  const work = children.findIndex((node) => node.id === "work");
  if (sidebar === -1 || work === -1) return false;
  [children[sidebar], children[work]] = [children[work], children[sidebar]];
  return true;
}

// "shown", "hidden", or null when no block of that role is in the tree.
function seek(node, role, hidden) {
  if (!node) return null;
  const nowHidden = hidden || Boolean(node.hidden);
  if (node.content?.props?.role === role) return nowHidden ? "hidden" : "shown";
  const children = node.children ?? [];
  const visible = children.filter((child) => !child.hidden);
  const front = node.type === "stack" ? visible.find((child) => child.id === node.active) ?? visible[0] : null;
  let found = null;
  for (const child of [...children, ...(node.floating ?? [])]) {
    const behind = node.type === "stack" && children.includes(child) && child !== front;
    const state = seek(child, role, nowHidden || behind);
    if (state === "shown") return "shown";
    found ??= state;
  }
  return found;
}

/**
 * True only when the tree holds blocks of this role and every one is hidden
 * (itself, an ancestor, or behind a stack). A role the tree does not hold at
 * all (a pane, an overlay) is not known to be hidden.
 */
export const isRoleHidden = (tree, role) => seek(tree, role, false) === "hidden";
