// Role "announcements": the game's announcements list (the `a` screen). A light
// gray bar, then every line the announcement line has said, oldest at the top
// and the newest at the bottom where the list opens, each with its time in dark
// gray and its text in the color it was announced in.
// Props { role: "announcements" } as an overlay; Escape or a click on Esc closes it.

import { div } from "gpui-kit";
import { h_flex, v_flex, ScrollHandle } from "gpui-base";
import { props, closeOverlay } from "herdr";
import { pal, root, textButton, GLYPH_W, CH } from "./kit.js";
import { chronicle, clock } from "./history.js";

export default class Announcements {
  init() {
    this.scroll = ScrollHandle.new();
    this.shown = chronicle.history.length; // how many lines the list last drew
    if (this.shown > 0) this.scroll.scroll_to_item(this.shown - 1);
  }

  render() {
    const c = pal();
    const lines = chronicle.history;
    // A line that arrives while the list is open comes into view.
    if (lines.length !== this.shown) {
      this.shown = lines.length;
      if (lines.length > 0) this.scroll.scroll_to_item(lines.length - 1);
    }
    return root(v_flex().size_full().bg(c.FRAME).p(GLYPH_W))
      .child(v_flex().flex_1().min_h(0).bg(c.BLACK)
        .child(h_flex().h(CH).flex_none().px(GLYPH_W).items_center().justify_between().bg(c.LGRAY).text_color(c.BLACK).whitespace_nowrap()
          .child(div().child("Announcements"))
          .child(div().child(`${lines.length}`)))
        .child(v_flex().flex_1().min_h(0).overflow_y_scrollbar().track_scroll(this.scroll).id("announcement-list").px(GLYPH_W).pt(CH)
          .when(lines.length === 0, (el) => el.child(div().h(CH).flex_none().text_color(c.DGRAY).child("No announcements.")))
          .children(lines.map((line, i) => h_flex().id(`announcement-${i}`).h(CH).flex_none().items_center().whitespace_nowrap().gap(GLYPH_W)
            .child(div().flex_none().text_color(c.DGRAY).child(clock(line.at)))
            .child(div().flex_1().min_w(0).truncate().text_color(c[line.color]).child(line.text)))))
        .child(h_flex().h(CH).flex_none().px(GLYPH_W).items_center().whitespace_nowrap()
          .child(textButton(c, "announcements-done", "Esc").on_click(() => closeOverlay(props().overlay)))
          .child(div().text_color(c.LGRAY).child(": Done"))));
  }
}
