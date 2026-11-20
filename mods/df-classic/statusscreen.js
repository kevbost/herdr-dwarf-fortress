// Role "statusscreen": the game's status screen, for the work in hand. A light
// gray bar with the active space on the left and the game's date on the right,
// a black band of section names, then three text columns: totals (the game's
// wealth lines), who is here by program (its professions), and the agents by
// state (its military ranks, "None" in dark gray). Opened by the menu's Status.
// Props { role: "statusscreen" } as an overlay; Escape or a click on Done closes it.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, spaces, terminals, machines, run, props, closeOverlay } from "herdr";
import { pal, root, agentGlyphs, glyphCell, creatureInk, speciesChar, textButton, GLYPH_W, CH } from "./kit.js";
import { tile } from "./tiles.js";
import { dfDate } from "./calendar.js";
import { STATE_COLOR } from "./look.js";

const SECTIONS = [{ id: "agents", label: "Agents" }, { id: "spaces", label: "Spaces" }];
const RANKS = [["blocked", "Needs you"], ["done", "Finished"], ["working", "Working"], ["idle", "Idle"]];
const cells = (n) => n * GLYPH_W;

export default class StatusScreen {
  init() {
    this.section = "agents";
  }

  // A label in its own color, a gap, a value at the right.
  line(c, label, color, value, valueColor = "YELLOW", lead = null) {
    return h_flex().h(CH).flex_none().items_center().whitespace_nowrap().gap(GLYPH_W)
      .when(Boolean(lead), (el) => el.child(lead))
      .child(div().flex_1().min_w(0).truncate().text_color(c[color]).child(label))
      .child(div().flex_none().text_color(c[valueColor]).child(value));
  }

  column(width, heading, c, rows) {
    return v_flex().flex_none().w(cells(width)).child(div().h(CH).flex_none().text_color(c.WHITE).child(heading)).children(rows);
  }

  agentsBody(c) {
    const list = agents();
    const glyphs = agentGlyphs(c);
    const all = terminals();
    const totals = [
      ["Machines", "LGRAY", new Set(spaces().map((s) => s.machine ?? "")).size],
      ["Spaces", "LGREEN", spaces().length],
      ["Tabs", "LCYAN", spaces().reduce((n, s) => n + s.tabs.length, 0)],
      ["Terminals", "LMAGENTA", all.filter((t) => t.state === "live").length],
      ["Agents", "LRED", list.length],
      ["Sub-agents", "BROWN", all.filter((t) => t.parent && t.state === "live").length],
    ];
    const groups = new Map();
    for (const a of list) {
      const key = a.program?.key ?? a.app ?? "agent";
      if (!groups.has(key)) groups.set(key, { key, name: a.program?.name ?? a.app ?? "Agent", first: a, count: 0 });
      groups.get(key).count++;
    }
    return h_flex().flex_1().items_start().gap(cells(3)).px(GLYPH_W).pt(CH)
      .child(this.column(26, "Totals:", c, totals.map(([label, color, value]) => this.line(c, label, color, `${value}`, "YELLOW", glyphCell(tile("sun"), c.YELLOW)))))
      .child(this.column(30, "Population:", c, groups.size === 0
        ? [this.line(c, "None", "DGRAY", "", "DGRAY")]
        : [...groups.values()].map((g) => {
          const glyph = glyphs.get(g.first.address);
          return this.line(c, g.name, "LGRAY", `${g.count}`, "WHITE", glyph ? glyphCell(speciesChar(g.key), creatureInk(c, glyph, { status: "working" }).color) : null);
        })))
      .child(this.column(26, "Ranks:", c, RANKS.map(([status, label]) => {
        const n = list.filter((a) => a.status === status).length;
        return n ? this.line(c, label, STATE_COLOR[status], `${n}`, "WHITE") : this.line(c, label, "DGRAY", "None", "DGRAY");
      })));
  }

  spacesBody(c) {
    const head = (text, width) => div().flex_none().w(cells(width)).text_color(c.DGRAY).child(text);
    const row = (s) => h_flex().id(`status-space-${s.id}`).h(CH).flex_none().items_center().whitespace_nowrap().cursor_pointer()
      .hover((st) => st.bg(c.CYAN))
      .on_click(() => { closeOverlay(props().overlay); run("space.select", { id: s.id }); })
      .child(div().flex_none().w(cells(4)).text_color(c.LGRAY).child(`${s.index}:`))
      .child(div().flex_none().w(cells(24)).truncate().text_color(c[STATE_COLOR[s.status] ?? "DGRAY"]).child(s.name))
      .child(div().flex_none().w(cells(16)).truncate().text_color(c.LGRAY).child(s.machine ?? "This computer"))
      .child(div().flex_none().w(cells(28)).truncate().text_color(c.YELLOW).child(s.branch ?? ""))
      .child(div().flex_none().w(cells(8)).text_color(c.WHITE).child(`${agents().filter((a) => a.space === s.id).length}`))
      .child(div().flex_none().text_color(c[STATE_COLOR[s.status] ?? "DGRAY"]).child(s.status ?? "None"));
    return v_flex().flex_1().min_h(0).overflow_y_scrollbar().px(GLYPH_W).pt(CH)
      .child(h_flex().h(CH).flex_none().whitespace_nowrap().child(head("", 4)).child(head("Space", 24)).child(head("Machine", 16)).child(head("Branch", 28)).child(head("Agents", 8)).child(head("State", 8)))
      .children(spaces().map(row));
  }

  render(cx) {
    const c = pal();
    const space = spaces().find((s) => s.active);
    const bar = (left, right) => h_flex().h(CH).flex_none().px(GLYPH_W).items_center().justify_between().bg(c.LGRAY).text_color(c.BLACK).whitespace_nowrap()
      .child(div().child(left)).child(div().child(right));
    return root(v_flex().size_full().bg(c.FRAME).p(GLYPH_W).gap(0))
      .child(v_flex().flex_1().min_h(0).bg(c.BLACK)
        .child(bar(space ? `${space.name}${space.machine ? ` on ${space.machine}` : ""}` : "Herdr", dfDate(new Date())))
        .child(h_flex().h(CH * 3).flex_none().px(GLYPH_W).pt(CH).gap(cells(3)).whitespace_nowrap()
          .children(SECTIONS.map((s) => div().id(`status-tab-${s.id}`).flex_none().cursor_pointer()
            .text_color(this.section === s.id ? c.WHITE : c.LGRAY).hover((st) => st.text_color(c.WHITE))
            .on_click((_e, cx) => { this.section = s.id; cx.notify(); }).child(s.label))))
        .child(div().h(GLYPH_W).flex_none().bg(c.FRAME))
        .child(this.section === "agents" ? this.agentsBody(c) : this.spacesBody(c))
        .child(h_flex().h(CH).flex_none().px(GLYPH_W).items_center().whitespace_nowrap()
          .child(textButton(c, "status-done", "Esc").on_click(() => closeOverlay(props().overlay)))
          .child(div().text_color(c.LGRAY).child(": Done"))));
  }
}
