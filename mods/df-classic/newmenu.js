// Role "newmenu": the menu the + beside Files and Changes opens, for the space
// whose row's + was pressed (props { space }). It looks as the shipped one does
// and its terminals and agents open as panes of that space's shown tab, split
// in beside the last one, or as a tab each as the shipped menu does.
// A Panel/Tab switch at the top picks which; it is kept in shared state.
// Forked from mods/new-menu (Herdr 0.1.16): only where the target space comes
// from, the switch, and `open` below, differ.

import { div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, spaces, panes, knownAgents, run, openOverlay, closeOverlay, props, window, keys, shared, setShared, checking } from "herdr";

// The last agents each machine reported, shown at once while knownAgents() checks again.
// The shipped menu's key, so both show the same list at once.
const KNOWN = "new-menu.agents";

function shortcut(name) {
  const k = keys().find(b => b.section === "global" && b.action === name);
  if (!k?.keys.trim()) return "";
  const mac = window()?.platform === "macos";
  const names = mac ? { ctrl: "⌃", alt: "⌥", shift: "⇧", cmd: "⌘", fn: "fn" } : { ctrl: "Ctrl", alt: "Alt", shift: "Shift", cmd: "Super", fn: "Fn" };
  const alias = { secondary: mac ? "cmd" : "ctrl", super: "cmd", win: "cmd" };
  return k.keys.trim().split(/\s+/).map(stroke => {
    const parts = stroke.split("-");
    let key = parts.pop();
    if (key === "") { key = "-"; parts.pop(); }
    const held = new Set(parts.map(m => alias[m.toLowerCase()] ?? m.toLowerCase()));
    if (/^[A-Z]$/.test(key)) held.add("shift");
    const label = key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1).toLowerCase();
    return [...Object.keys(names).filter(m => held.has(m)).map(m => names[m]), label].join(mac ? "" : "+");
  }).join(" ");
}

// Where a new terminal or agent goes, kept across menus and restarts: "pane" or "tab".
const MODE_KEY = "df.newmenu.mode";
const MODES = [{ id: "pane", label: "Panel" }, { id: "tab", label: "Tab" }];
const modeOf = () => (shared(MODE_KEY) === "tab" ? "tab" : "pane");

// A terminal or an agent as a pane of the space's shown tab, split to the right
// of its last terminal; with none to split beside, or when the menu is set to
// tabs, as a tab.
function open(space, name, argv) {
  if (!space) return;
  if (modeOf() === "tab") return run("tab.new", { name, space: space.id, argv });
  const tab = space.tabs.find(c => c.active) ?? space.tabs[0];
  const pane = panes().filter(p => p.tab === tab?.id && p.terminal).at(-1)?.pane;
  run("space.select", { id: space.id });
  if (pane) run("pane.split", { direction: "right", pane, argv });
  else run("tab.new", { name, space: space.id, argv });
}

export default class NewMenu {
  init(given, cx) {
    const mine = props() ?? given ?? {};
    this.space = spaces().find(s => s.id === mine.space) ?? spaces().find(s => s.active);
    const machine = this.space?.machine;
    const where = machine ?? "";
    this.agents = shared(KNOWN)?.[where] ?? [];
    this.handle = cx.focus_handle();
    this.handle.focus();
    if (checking()) return;
    cx.spawn(async cx => {
      try {
        this.agents = await knownAgents({ on: machine });
        setShared(KNOWN, { ...shared(KNOWN), [where]: this.agents });
      }
      catch { this.failed = true; }
      cx.notify();
    });
  }
  row(id, icon, name, action, hint = "", enabled = true) {
    const t = theme();
    return h_flex().id(id).h(31).px(9).gap(10).rounded(7).items_center().flex_none()
      .text_color(enabled ? t.foreground : t.dim).when(enabled, el => el.hover(s => s.bg(t.selected)))
      .on_click(() => { if (enabled) { closeOverlay(props().overlay); action(); } })
      .child(icon).child(div().flex_1().child(name)).child(div().text_size(11).text_color(t.dim).child(hint));
  }
  // The Panel/Tab switch: one choice for every item below.
  modeSwitch() {
    const t = theme();
    const on = modeOf();
    return h_flex().h(31).gap(4).flex_none().items_center().children(MODES.map(m =>
      h_flex().id(`mode-${m.id}`).flex_1().h(27).rounded(7).items_center().justify_center()
        .text_color(m.id === on ? t.foreground : t.dim)
        .when(m.id === on, el => el.bg(t.selected))
        .when(m.id !== on, el => el.hover(s => s.bg(t.hover)))
        .on_click(() => setShared(MODE_KEY, m.id))
        .child(m.label)));
  }
  render() {
    const t = theme();
    const space = this.space;
    const installed = this.agents.filter(a => a.installed);
    const choices = this.failed ? installed : [...installed, ...this.agents.filter(a => !a.installed).slice(0, 2)];
    return v_flex().min_h(0).w_full().h(Math.min(491, 198 + Math.max(1, choices.length + (this.failed ? 1 : 0)) * 31)).bg(t.popover).p(5).text_size(12.8)
      .id("new-menu").track_focus(this.handle)
      .on_key_down((e) => {
        if (e.modifiers.control || e.modifiers.platform || e.modifiers.alt) return;
        const agent = /^[1-9]$/.test(e.key) ? installed[Number(e.key) - 1] : null;
        if (!agent) return;
        closeOverlay(props().overlay);
        open(space, agent.name, agent.run);
      })
      .child(this.modeSwitch())
      .child(this.row("terminal", svg("icons/shell.svg").size(14), "Terminal", () => open(space), shortcut("tab.new")))
      .child(div().px(9).pt(8).pb(4).text_size(11).text_color(t.dim).child("Start an agent"))
      .child(v_flex().flex_1().min_h(0).overflow_y_scrollbar()
        .children(choices.map((a, i) => this.row(a.key, a.tint ? svg(a.icon).size(14).text_color(t.foreground) : image(a.icon).size(14), a.name,
          () => open(space, a.name, a.run), a.installed ? (i < 9 ? String(i + 1) : "") : "not installed", a.installed)))
        .when(this.failed || this.agents.length === 0, el => el.child(div().px(9).py(6).text_color(t.dim).child(this.failed ? "Could not check installed agents" : "Checking installed agents…"))))
      .child(div().h(1).mx(4).my(5).bg(t.border))
      .child(this.row("space", div().w(14).child("+"), "New space", () => run("space.new"), shortcut("space.new")))
      .child(this.row("worktree", svg("mods/workspace-chrome/branch.svg").size(14), "New worktree…", () => openOverlay({ mod: "worktree", kind: "dialog", width: 460, height: 280, props: { space: space?.id, folder: space.active ? panes().find(p => p.focused)?.cwd : undefined, action: "new" } }), "", Boolean(space)))
      .child(this.row("worktree-open", svg("mods/workspace-chrome/branch.svg").size(14), "Open worktree…", () => openOverlay({ mod: "worktree", kind: "dialog", width: 560, height: 480, props: { space: space?.id, folder: space.active ? panes().find(p => p.focused)?.cwd : undefined, action: "open" } }), "", Boolean(space)));
  }
}
