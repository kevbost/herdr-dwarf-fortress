// Dwarf Fortress Classic: the whole layout's chrome is this one mod, in roles.
// The layout (layouts/df-classic.json) gives each copy props { role }:
//   top      the top border: *PAUSED*, the agent count, the title, Idlers
//   border   a plain stretch of the frame
//   tabs     the tab row
//   pane     a pane's header (the layout's pane header)
//   map      the outdoor map the agents walk on
//   spaces   the spaces list
//   agents   the agents list (its sort popup too: { role: "agents", sortMenu: true })
//   footer   the menu column's last lines: sidebar, options, look, add machine
//   status   the announcement line
//   depth    the depth bar: the active space's tabs as levels
//   statusscreen  the game's status screen, an overlay the menu's Status opens
//   announcements the game's announcements list, an overlay a click on the announcement line opens
//   bigmap        the map in a dialog, the whole world, an overlay the menu's Map opens
//   mapmenu       the popup a right-click on the map opens, to pick the map
//   reports  the left border: the report letters (C needs you, H finished, S started)
//   newmenu  the menu a space row's + opens: { role: "newmenu", space }
// kit.js holds what they share. See README.md.

import { View, div } from "gpui-kit";
import { v_flex } from "gpui-base";
import { props, checking } from "herdr";
import Top, { Border } from "./top.js";
import Tabs from "./tabs.js";
import Pane from "./pane.js";
import MapPanel from "./map.js";
import Spaces from "./spaces.js";
import Agents from "./agents.js";
import Footer from "./chrome.js";
import Status from "./status.js";
import Depth from "./depth.js";
import NewMenu from "./newmenu.js";
import Reports from "./reports.js";
import StatusScreen from "./statusscreen.js";
import Announcements from "./announcements.js";
import BigMap from "./bigmap.js";
import MapMenu from "./mapmenu.js";

const ROLES = { top: Top, border: Border, tabs: Tabs, pane: Pane, map: MapPanel, spaces: Spaces, agents: Agents, footer: Footer, status: Status, depth: Depth, newmenu: NewMenu, reports: Reports, statusscreen: StatusScreen, announcements: Announcements, bigmap: BigMap, mapmenu: MapMenu };

export default class DfClassic extends View {
  init(given, cx) {
    const mine = props() ?? given ?? {};
    // `herdr-app check` loads the mod with no props: there, every role is set up
    // and drawn once, so the check covers them all and not just the line below.
    const everyRole = checking() ? Object.keys(ROLES) : [];
    const names = Object.hasOwn(ROLES, mine.role ?? "") ? [mine.role] : everyRole;
    this.roles = names.map((name) => new ROLES[name]());
    for (const role of this.roles) role.init?.(mine, cx);
  }

  async close(cx) {
    for (const role of this.roles) await role.close?.(cx);
  }

  render(cx) {
    if (this.roles.length === 0) return div().child(`df-classic: no role "${props()?.role}"`);
    if (this.roles.length === 1) return this.roles[0].render(cx);
    return v_flex().children(this.roles.map((role) => div().flex_none().child(role.render(cx))));
  }
}
