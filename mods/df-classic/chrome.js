// Role "footer": the foot of the menu column, written as the game writes its
// menu. The green marks are tile glyphs, not key letters: each line is a click
// target, nothing here binds a key. Status opens the status screen; Map opens the
// whole world in a dialog; Look turns
// on the map's cursor (shared "df.look"); Find is the picker the shipped brand
// row's search opened. Forked from mods/workspace-chrome (Herdr 0.1.16): its footer
// (Settings, Add machine) and its brand row's two buttons (search, the sidebar
// toggle), which have no row of their own in this layout.

import { div } from "gpui-kit";
import { v_flex } from "gpui-base";
import { run, updates, notify, openOverlay, shared, setShared } from "herdr";
import { pal, root, narrow, glyphCell, menuRow, menuSide, moveMenu } from "./kit.js";
import { tile } from "./tiles.js";
import { LOOK_ON } from "./look.js";
import { openBigMap } from "./openbig.js";

export default class Footer {
  render() {
    const c = pal();
    const collapsed = narrow();
    const row = (id, hotkey, label, action) => menuRow({ c, id, hotkey, label, rail: collapsed }).on_click(action);
    const onRight = menuSide() === "right";
    const looking = Boolean(shared("df.look"));
    const move = (_e, cx) => cx.spawn(async () => {
      try { await moveMenu(); } catch (error) { notify({ title: "Couldn't move the menu", body: String(error?.message ?? error), level: "error" }); }
    });
    return root(v_flex().size_full().bg(c.BLACK).px(collapsed ? 0 : 8))
      .child(row("menu-side", glyphCell(onRight ? "◄" : "►", c.LGREEN), onRight ? "Menu to the left" : "Menu to the right", move))
      .child(row("status", glyphCell(tile("dwarf"), c.LGREEN), "Status", () => openOverlay({ mod: "df-classic", kind: "dialog", width: 880, height: 560, frame: "none", props: { role: "statusscreen" } })))
      .child(row("settings", glyphCell("☼", c.LGREEN), "Options", () => run("app.settings"))
        .when(Boolean(updates().app.ready), (el) => el.child(div().flex_none().text_color(c.YELLOW).child(collapsed ? "*" : " * update ready"))))
      .child(row("look", glyphCell("X", looking ? c.YELLOW : c.LGREEN), looking ? "Look (click again to stop)" : "Look", () => setShared("df.look", looking ? null : LOOK_ON)))
      .child(row("bigmap", glyphCell(tile("ramp"), c.LGREEN), "Map", openBigMap))
      .child(row("search", glyphCell("○", c.LGREEN), "Find", () => run("mod.open", { name: "picker" })))
      .child(row("machine", glyphCell("+", c.LGREEN), "Add machine", () => run("mod.open", { name: "machine-add" })));
  }
}
