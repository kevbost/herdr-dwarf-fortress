// Role "pane": a pane's header, one text row. The agent's creature glyph (the
// one on the map), the program or title, the folder, the agent's status; on
// hover, buttons that split, zoom and close this pane. The focused pane's header
// is black on light gray, as the game writes its title. Props from the app:
// { pane, terminal }. Click: focus the pane.
// Forked from mods/pane (Herdr 0.1.16): paneFrame, folder and me are the shipped ones.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, home, layout } from "herdr";
import { pal, root, glyphCell, spinner, agentGlyphs, creatureInk } from "./kit.js";
import { tile } from "./tiles.js";

// Match the first visible tab frame, including the active child of a stack.
function paneFrame(node) {
  if (!node || node.hidden) return null;
  if (node.content?.tab && node.content.pane) return node.content.pane;
  let children = node.children ?? [];
  if (node.type === "stack") {
    const visible = children.filter(child => !child.hidden);
    children = [visible.find(child => child.id === node.active) ?? visible[0]];
  }
  for (const child of children) {
    const frame = paneFrame(child);
    if (frame) return frame;
  }
  return null;
}

function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

export default class Pane {
  init() { this.hovered = false; }

  me() {
    return panes().find((p) => p.pane === props()?.pane);
  }

  button(c, ink, id, label, tip, command, args) {
    return div()
      .id(id)
      .flex_none()
      .text_color(ink)
      .hover((s) => s.bg(c.CYAN).text_color(c.WHITE))
      .tooltip(tip)
      .on_click((_e, cx) => {
        cx.stop_propagation();
        run(command, args);
      })
      .child(label);
  }

  render() {
    const c = pal();
    const p = this.me();
    if (!p) return div();
    const name = ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const glyph = p.terminal ? agentGlyphs(c).get(p.terminal) : null;
    const st = p.status;
    const pane = p.pane;
    const bottom = paneFrame(layout())?.header?.position === "bottom";
    const ink = p.focused ? c.BLACK : c.LGRAY;
    const dim = p.focused ? c.BLACK : c.DGRAY;
    const keyInk = p.focused ? c.BLACK : c.LGREEN;
    return root(h_flex()
      .id(`pane-head-${pane}`)
      .size_full()
      .px(8)
      .gap(8)
      .items_center()
      .whitespace_nowrap()
      .bg(p.focused ? c.LGRAY : c.BLACK)
      .when(bottom, el => el.border_t(1))
      .when(!bottom, el => el.border_b(1))
      .border_color(c.DGRAY))
      .on_hover((hovered, cx) => { this.hovered = hovered; cx.notify(); })
      .on_click(() => run("pane.focus", { pane }))
      .when(Boolean(glyph), (el) => {
        const drawn = creatureInk(c, glyph, { status: st, focused: false });
        return el.child(glyphCell(glyph.char, drawn.color, drawn.background ?? c.BLACK));
      })
      .child(div().flex_none().truncate().max_w(260).text_color(ink).child(name))
      .child(div().flex_1().min_w(0).truncate().text_color(dim).child(folder(p.cwd)))
      .when(st === "working", el => el.child(spinner(p.focused ? c.BLACK : c.LCYAN)))
      .when(st === "blocked", el => el.child(div().flex_none().text_color(p.focused ? c.RED : c.LRED).child("Needs you!")))
      .when(st === "done", el => el.child(glyphCell(tile("sun"), p.focused ? c.BLACK : c.YELLOW)))
      .when(this.hovered, el => el
        .child(this.button(c, keyInk, `ph-r-${pane}`, "[|]", "Split right", "pane.split", { direction: "right", pane }))
        .child(this.button(c, keyInk, `ph-d-${pane}`, "[-]", "Split down", "pane.split", { direction: "down", pane }))
        .child(this.button(c, keyInk, `ph-z-${pane}`, p.zoomed ? "[z]" : "[Z]", p.zoomed ? "Unzoom" : "Zoom", "pane.zoom", { pane }))
        .child(this.button(c, keyInk, `ph-x-${pane}`, "[X]", "Close", "pane.close", { pane })));
  }
}
