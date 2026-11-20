// Role "depth": the game's depth bar, one cell wide at the right edge. The
// levels are the active space's tabs, top to bottom: sky above the shown tab, a
// yellow cell at it, earth below, and its number written down the foot of the
// bar. A click on a level shows that tab.

import { div } from "gpui-kit";
import { v_flex } from "gpui-base";
import { spaces, run } from "herdr";
import { pal, glyphCell, GLYPH_H } from "./kit.js";

export default class Depth {
  render() {
    const c = pal();
    const tabs = spaces().find((s) => s.active)?.tabs ?? [];
    const shown = tabs.findIndex((tab) => tab.active);
    // Every level shares the bar; only the shown one insists on room, for its yellow cell.
    const level = (tab, i) => v_flex().id(`depth-${tab.id}`).flex_1().min_h(i === shown ? GLYPH_H : 1).w_full().bg(i < shown ? c.CYAN : c.BROWN).cursor_pointer()
      .tooltip(`${tab.index}: ${tab.name}`)
      .on_click(() => run("tab.select", { id: tab.id }))
      .when(i === shown, (el) => el
        .child(div().flex_1().bg(c.CYAN))
        .child(div().flex_none().h(GLYPH_H).bg(c.YELLOW))
        .child(div().flex_1().bg(c.BROWN)));
    const digits = shown >= 0 ? [...String(tabs[shown].index)] : [];
    return v_flex().size_full().overflow_hidden().bg(c.BLACK)
      .children(tabs.map(level))
      .when(tabs.length === 0, (el) => el.child(div().flex_1().bg(c.BROWN)))
      .children(digits.map((digit) => glyphCell(digit, c.LGRAY, c.BLACK)));
  }
}
