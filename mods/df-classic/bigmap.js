// Role "bigmap": the map in a dialog, big enough for the whole world. It is the
// map role itself (its own copy, props { big: true }) inside the status screen's
// frame, sharing one scene with the sidebar map, so the same creatures stand in
// the same places. A light gray bar with the space, the map with a list of the
// maps beside it (a click or its number picks one; the right-click menu is only
// on the sidebar's map), and a bottom row with Esc: Done and a Look switch:
// Look's text shows here, since the announcement line is under the dialog.
// Props { role: "bigmap" } as an overlay; Escape or a click on Esc closes it.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, props, closeOverlay, shared, setShared } from "herdr";
import { pal, root, textButton, menuRow, GLYPH_W, CH } from "./kit.js";
import { LOOK_ON } from "./look.js";
import { MAPS, mapById } from "./maps.js";
import { MAPS_SIDEBAR_W } from "./openbig.js";
import MapPanel from "./map.js";

export default class BigMap {
  init(given, cx) {
    this.map = new MapPanel();
    this.map.init({ ...given, big: true }, cx);
    this.handle = cx.focus_handle();
    this.handle.focus();
  }

  // The map copy inside stops saying it is shown, so creatures walk the sidebar's view again at once.
  close(cx) {
    this.map.close(cx);
  }

  render(cx) {
    const c = pal();
    const space = spaces().find((s) => s.active);
    const look = shared("df.look");
    const shown = mapById(shared("df.map")).id;
    return root(v_flex().size_full().bg(c.FRAME).p(GLYPH_W))
      .id("bigmap").track_focus(this.handle)
      .on_key_down((e) => {
        // Only the bare digit: alt+1 and the like are Herdr's own keys.
        const bare = !e.modifiers?.control && !e.modifiers?.alt && !e.modifiers?.platform;
        const map = bare && /^[1-9]$/.test(e.key) ? MAPS[Number(e.key) - 1] : null;
        if (map) setShared("df.map", map.id);
      })
      .child(v_flex().flex_1().min_h(0).bg(c.BLACK)
        .child(h_flex().h(CH).flex_none().px(GLYPH_W).items_center().bg(c.LGRAY).text_color(c.BLACK).whitespace_nowrap()
          .child(div().child(space ? `${space.name}${space.machine ? ` on ${space.machine}` : ""}` : "Herdr")))
        .child(h_flex().flex_1().min_h(0)
          .child(div().flex_1().min_w(0).h_full().child(this.map.render(cx)))
          .child(v_flex().flex_none().w(MAPS_SIDEBAR_W).h_full().bg(c.BLACK).border_l(GLYPH_W).border_color(c.FRAME)
            .child(h_flex().h(CH).flex_none().px(GLYPH_W).items_center().bg(c.LGRAY).text_color(c.BLACK).whitespace_nowrap().child(div().child("Maps")))
            .child(v_flex().px(GLYPH_W).pt(GLYPH_W / 2)
              .children(MAPS.map((map, index) => menuRow({ c, id: `bigmap-map-${map.id}`, hotkey: String(index + 1), label: map.name, selected: map.id === shown })
                .on_click(() => setShared("df.map", map.id)))))))
        .child(h_flex().h(CH).flex_none().px(GLYPH_W).gap(GLYPH_W * 2).items_center().whitespace_nowrap()
          .child(h_flex().flex_none().child(textButton(c, "bigmap-done", "Esc").on_click(() => closeOverlay(props().overlay))).child(div().text_color(c.LGRAY).child(": Done")))
          .child(h_flex().flex_none().child(textButton(c, "bigmap-look", "X").on_click(() => setShared("df.look", look ? null : LOOK_ON))).child(div().text_color(look ? c.YELLOW : c.LGRAY).child(look ? ": Look (click again to stop)" : ": Look")))
          .child(div().flex_1().min_w(0).truncate().text_color(look?.text ? c[look.color] : c.BLACK).child(look?.text ?? ""))));
  }
}
