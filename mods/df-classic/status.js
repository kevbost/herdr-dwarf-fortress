// Role "status": the announcement line under the work area. Machine, branch,
// agent counts, the newest thing an agent wants said (a sentence in the game's
// voice, the newest that is still true: blocked or working while the agent is,
// finished until it works or needs you again), what Look found on the
// map while Look is on, and the palette hint. A click on the announcement opens
// the announcements list (everything said, kept in history.js).
// Forked from mods/workspace-status (Herdr 0.1.16): hint() is the shipped one.

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, agents, run, window, keys, shared, openOverlay } from "herdr";
import { pal, root } from "./kit.js";
import { chronicle, remember, shownLine } from "./history.js";

export default class Status {
  // The palette key as actually bound, not a hardcoded one; without a
  // binding the hint stays useful ("commands") instead of lying.
  hint() {
    const mac = window()?.platform === "macos";
    const mod = { cmd: mac ? "⌘" : "Ctrl+", ctrl: mac ? "⌃" : "Ctrl+", shift: mac ? "⇧" : "Shift+", alt: mac ? "⌥" : "Alt+", option: mac ? "⌥" : "Alt+" };
    const b = keys().find((k) => k.section === "global" && k.action === "app.palette");
    const parts = b && b.keys.endsWith("--") ? [...b.keys.slice(0, -2).split("-"), "-"] : b?.keys.split("-");
    const key = parts && parts.map((p) => mod[p.toLowerCase()] ?? p.toUpperCase()).join("");
    return key ? `${key}  commands` : "commands";
  }

  // The newest line that is still true; a newer one replaces it at once.
  announcement(list) {
    const kept = remember({ history: chronicle.history, statuses: chronicle.statuses, list, now: Date.now() });
    chronicle.history = kept.history;
    chronicle.statuses = kept.statuses;
    return shownLine({ history: chronicle.history, list });
  }

  render() {
    const c = pal();
    const space = spaces().find((s) => s.active);
    const list = agents();
    const needs = list.filter((a) => a.status === "blocked").length;
    // What Look found on the map, while Look is on, is said in place of an announcement.
    const look = shared("df.look");
    const note = this.announcement(list);
    const said = look?.text ? look : note;
    return root(h_flex().size_full().px(8).gap(16).items_center().whitespace_nowrap().bg(c.BLACK).text_color(c.LGRAY))
      .child(div().flex_none().text_color(c.WHITE).child(space?.machine ?? "This computer"))
      .when(Boolean(space?.branch), (el) => el.child(div().flex_none().max_w(280).truncate().text_color(c.YELLOW).child(space.branch)))
      .child(h_flex().flex_none().gap(8).items_center().child(`${list.length} agents`)
        .when(needs > 0, (el) => el.child(div().text_color(c.LRED).child(`${needs} needs you`))))
      .child(div().id("announcement").flex_1().min_w(0).truncate().cursor_pointer().text_color(said ? c[said.color] : c.BLACK)
        .on_click(() => openOverlay({ mod: "df-classic", kind: "dialog", width: 880, height: 560, frame: "none", props: { role: "announcements" } }))
        .child(said?.text ?? ""))
      .child(div().id("palette").flex_none().text_color(c.DGRAY).hover((s) => s.text_color(c.WHITE)).on_click(() => run("app.palette")).child(this.hint()));
  }
}
