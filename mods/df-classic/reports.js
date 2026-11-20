// Role "reports": the left border's report letters, as the game stacks them
// near the top of its border. A letter appears when an agent needs you (red C),
// finishes (green H) or starts work (blue S), newest on top, and goes after a
// minute or so. Click one to go to that agent. The border it fills is the
// layout's "reports" block, one tile wide.

import { div } from "gpui-kit";
import { v_flex } from "gpui-base";
import { agents, run, checking } from "herdr";
import { pal, glyphCell, GLYPH_H } from "./kit.js";
import { REPORTS, report, nextExpiry } from "./log.js";
import { who, where } from "./announce.js";

export default class Reports {
  init(_props, cx) {
    this.log = [];
    this.statuses = null;
    this.expiresAt = null;
    // A letter going needs a redraw at that moment and nothing else does.
    if (checking()) return;
    cx.timer.every(1000, (cx) => {
      if (this.expiresAt !== null && Date.now() >= this.expiresAt) cx.notify();
    });
  }

  render() {
    const c = pal();
    const list = agents();
    const seen = report({ log: this.log, statuses: this.statuses, list, now: Date.now() });
    this.log = seen.log;
    this.statuses = seen.statuses;
    this.expiresAt = nextExpiry(this.log);
    const letters = [...this.log].reverse().map((entry, i) => {
      const about = list.find((a) => a.address === entry.address);
      const kind = REPORTS[entry.status];
      return div().id(`report-${entry.address}-${entry.at}-${i}`).flex_none().h(GLYPH_H).cursor_pointer()
        .tooltip(`${who(about ?? {})} at ${where(about ?? { address: entry.address })}: ${entry.status}`)
        .on_click(() => about && run("pane.focus", { pane: about.pane }))
        .child(glyphCell(kind.letter, c[kind.color], c.FRAME));
    });
    return v_flex().size_full().overflow_hidden().bg(c.FRAME).pt(GLYPH_H).children(letters);
  }
}
