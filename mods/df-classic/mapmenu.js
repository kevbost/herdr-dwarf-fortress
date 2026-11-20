// Role "mapmenu": the popup a right-click on the map opens. One line per map,
// the shown one on a blue bar, set as the game writes a menu (a green number,
// a colon, the name). A click or its number picks the map (shared "df.map") and
// closes the popup; every copy of the map follows. There is no other way to
// change the map on purpose: it is not on the screen until asked for.
// Props { role: "mapmenu" } as a popup.

import { div } from "gpui-kit";
import { v_flex } from "gpui-base";
import { props, closeOverlay, shared, setShared } from "herdr";
import { pal, root, menuRow, GLYPH_W } from "./kit.js";
import { MAPS, mapById } from "./maps.js";

export default class MapMenu {
  init(_props, cx) {
    this.handle = cx.focus_handle();
    this.handle.focus();
  }

  choose(id) {
    setShared("df.map", id);
    closeOverlay(props().overlay);
  }

  render() {
    const c = pal();
    const shown = mapById(shared("df.map")).id;
    return root(v_flex().size_full().bg(c.FRAME).p(GLYPH_W))
      .id("map-menu").track_focus(this.handle)
      .on_key_down((e) => {
        // Only the bare digit: alt+1 and the like are Herdr's own keys.
        const bare = !e.modifiers?.control && !e.modifiers?.alt && !e.modifiers?.platform;
        const map = bare && /^[1-9]$/.test(e.key) ? MAPS[Number(e.key) - 1] : null;
        if (map) this.choose(map.id);
      })
      .child(v_flex().flex_1().min_h(0).bg(c.BLACK).px(GLYPH_W).py(GLYPH_W / 2)
        .children(MAPS.map((map, index) => menuRow({ c, id: `map-${map.id}`, hotkey: String(index + 1), label: map.name, selected: map.id === shown })
          .on_click(() => this.choose(map.id)))));
  }
}
