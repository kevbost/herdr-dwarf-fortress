// Role "top": the top border, with the game's labels set into it. *PAUSED* while
// no agent works, the agent count where FPS was, the active space as the title,
// Idlers at the right. Drags the window; draws the window buttons where the
// system draws none. Role "border" is a plain stretch of the same frame.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { agents, spaces, window, run, notify, nextCommand, checking, layout, settings } from "herdr";
import { pal, root, tag, moveMenu, find, CH } from "./kit.js";

// Room for the macOS window buttons, which sit over this bar and do not scale
// with zoom (the shipped tab bar's sum): from this bar's own left edge, which
// starts after the layout's left border (its "reports" block).
function lightsGap() {
  const tree = layout();
  const sidePadding = find(tree, "reports")?.size?.px ?? 0;
  const zoom = Number(settings()?.zoom) || 1;
  return Math.max(0, ((tree?.traffic_lights?.[0] ?? 0) + 64) / zoom - sidePadding);
}

export class Border {
  render() {
    return div().size_full().bg(pal().FRAME);
  }
}

export default class Top {
  // The layout's own commands, heard here because this bar is always shown:
  //   df-classic.move_menu   the menu column to the other side of the work area
  // (the footer's "Menu to the left / right" line does the same). Bind a key to
  // it in keys.json to have one.
  init(_props, cx) {
    if (checking()) return;
    cx.spawn(async (cx) => {
      for (;;) {
        const command = await nextCommand();
        if (command === "move_menu") {
          try { await moveMenu(); } catch (error) { notify({ title: "Couldn't move the menu", body: String(error?.message ?? error), level: "error" }); }
        }
        // Touching cx is also what ends this loop when the mod reloads.
        cx.notify();
      }
    });
  }

  render() {
    const c = pal();
    const w = window();
    const list = agents();
    const working = list.filter((a) => a.status === "working").length;
    const idlers = list.filter((a) => a.status === "idle").length;
    const space = spaces().find((s) => s.active);
    const lights = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen;
    const stop = (_e, cx) => cx.stop_propagation();
    const button = (id, label, action) => div().id(id).flex_none().h(CH).px(4).bg(c.LGRAY).text_color(c.BLACK).hover((s) => s.bg(c.WHITE))
      .on_mouse_down("left", stop).on_click(action).child(label);
    return root(h_flex().size_full().bg(c.FRAME).items_center().gap(8))
      .child(h_flex().flex_1().min_w(0).gap(8).items_center()
        .when(lights, (el) => el.pl(lightsGap()))
        .when(working === 0, (el) => el.child(tag("*PAUSED*", c.LGREEN, c.GREEN)))
        .child(tag(`Agents: ${list.length} (${working})`, c.WHITE, c.CYAN)))
      .child(tag(` ${space?.name ?? "Herdr"} `, c.BLACK, c.LGRAY).max_w(420).truncate())
      .child(h_flex().flex_1().min_w(0).gap(8).items_center().justify_end()
        .child(tag(`Idlers: ${idlers}`, c.YELLOW, c.BROWN))
        .when(w?.buttons, (el) => el
          .child(button("minimize", "_", () => run("window.minimize")))
          .child(button("maximize", w.maximized ? "=" : "#", () => run("window.maximize")))
          .child(button("close-window", "X", () => run("window.close")))));
  }
}
