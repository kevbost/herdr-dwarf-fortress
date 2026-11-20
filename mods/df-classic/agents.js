// Role "agents": the agents as the game's unit list. Each row starts with the
// agent's creature glyph, the same character in the same color as on the map,
// then its name and what it is doing. Grouped or priority views; parents take
// their most urgent sub-agent's place.
// Forked from mods/agents (Herdr 0.1.16): everything but the drawing is the
// shipped code. The sidebar helpers it shared with other mods are in kit.js.

import { div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { agents, terminals, panes, focused, spaces, run, shared, setShared, setAgentOrder, openOverlay, closeOverlay, props } from "herdr";
import { CH, pal, root, narrow, toggleSidebar, glyphCell, spinner, menuRow, textButton, agentGlyphs, creatureInk } from "./kit.js";
import { tile } from "./tiles.js";
import { petChar } from "./glyphs.js";

// Drops what an agent puts before its title: a status glyph or spinner and the separator
// after it ("✦  Working", "⠋ - Thinking"), and Codex's blinking "[ ! ] " / "[ . ] " mark.
// Stops at an opening bracket or quote, so a title that starts with one ("[web] login") keeps it.
const clean = (s) => (s ?? "").replace(/^[^\p{L}\p{N}\p{Ps}\p{Pi}]+/u, "").replace(/^\[ [!.] \] /, "").trim();

function leadPanes(all) {
  const leads = new Map();
  for (const p of all) {
    if (!p.terminal) continue;
    const current = leads.get(p.tab);
    // First agent, else first focused terminal, else first terminal in the tab.
    if (!current || (!current.program?.agent && (p.program?.agent || (!current.focused && p.focused)))) leads.set(p.tab, p);
  }
  return leads;
}

function title(tab, l) {
  const prog = l?.program?.name;
  const live = clean(l?.title);
  // clean() would strip a path's leading ~ or /: test the title with only its status glyph gone.
  const path = /^[~/]|^[A-Za-z]:\\/.test((l?.title ?? "").replace(/^[^\p{L}\p{N}~/]+/u, ""));
  const telling = live && live !== (l?.terminal ?? l?.address) && live !== prog && !path && !live.includes("@") && live.toLowerCase() !== l?.program?.key;
  return (tab.name === prog || !tab.named) && telling ? live : tab.name;
}
const RANK = { blocked: 4, done: 3, working: 2, idle: 1 };
// A sub-agent without a pane isn't in agents(): its raw word, error counting as
// blocked. It's never done: it reports to its parent, and the parent's done is the news.
const kidStatus = (k, listed) => {
  const s = listed.get(k.address) ?? k.status;
  return s === "error" ? "blocked" : s === "done" ? "idle" : s;
};
const SORTS = [
  { id: "priority", label: "Priority", hotkey: "p" },
  { id: "grouped", label: "Grouped by space", hotkey: "g" },
];
const sortOf = () => SORTS.find((s) => s.id === shared("agents.sort")) ?? SORTS[0];
const SECTION = { 4: "Needs you", 3: "Done", 2: "Working", 1: "Idle" };
const SECTION_STATUS = { 4: "blocked", 3: "done", 2: "working" };
// A status as a DF color name: what a section header and a folded count are written in.
const STATUS_COLOR = { blocked: "LRED", done: "LGREEN", working: "LCYAN" };
// The tree lines in front of a sub-agent, as box-drawing text.
const BRANCH = { "└": "└", "├": "├", "│": "│", "": " " };

function duration(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

export default class Agents {
  init(_props, cx) {
    if (props()?.sortMenu) return;
    this.folded = new Set();
    // Each agent's last state and when it changed (ms), kept across restarts.
    try { this.changed = JSON.parse(localStorage.getItem("changed") ?? "{}"); } catch { this.changed = {}; }
    if (!this.changed || typeof this.changed !== "object" || Array.isArray(this.changed)) this.changed = {};
    try { this.pendingPins = JSON.parse(localStorage.getItem("pins") ?? "[]"); } catch { this.pendingPins = []; }
    if (!Array.isArray(this.pendingPins)) this.pendingPins = [];
    if (!this.pendingPins.length) localStorage.removeItem("pins");
    this.migratingPins = new Set();
    cx.timer.every(30000, (cx) => cx.notify());
  }

  // Stamps agents whose state changed. Done and idle count as one: looking at a
  // finished agent turns done into idle, and looking isn't the agent doing anything.
  track(list, now) {
    let dirty = false;
    for (const a of list) {
      const s = a.status === "done" ? "idle" : a.status;
      if (this.changed[a.address]?.s === s) continue;
      this.changed[a.address] = { s, at: now };
      dirty = true;
    }
    if (!dirty) return;
    // Gone and old: the list alone is empty right after a start.
    const listed = new Set(list.map((a) => a.address));
    for (const [k, c] of Object.entries(this.changed)) if (!listed.has(k) && now - c.at > 30 * 86400000) delete this.changed[k];
    localStorage.setItem("changed", JSON.stringify(this.changed));
  }

  // Keep offline pins until their terminal returns, and keep each pending until
  // core echoes the label so a failed write doesn't erase the old pin.
  migratePins(all) {
    const listed = new Map(all.filter((t) => t.state === "live").map((t) => [t.address, t]));
    const pending = this.pendingPins.filter((address) => {
      const terminal = listed.get(address);
      if (!terminal) return true;
      if (terminal.labels?.["herdr.pinned"]) return false;
      if (!this.migratingPins.has(address)) {
        this.migratingPins.add(address);
        run("terminal.pin", { terminal: address, pinned: true });
      }
      return true;
    });
    if (pending.length === this.pendingPins.length) return;
    this.pendingPins = pending;
    if (pending.length) localStorage.setItem("pins", JSON.stringify(pending));
    else localStorage.removeItem("pins");
  }

  since(a) {
    return this.changed[a.address]?.at ?? 0;
  }

  rank(a) {
    return RANK[a.status] ?? 0;
  }

  sortMenu(c) {
    const on = sortOf().id;
    return root(v_flex().w_full().p(4).bg(c.BLACK))
      .child(div().h(CH).flex_none().text_color(c.WHITE).child("Sort agents"))
      .children(SORTS.map((s) => menuRow({ c, id: `sort-${s.id}`, hotkey: s.hotkey, label: s.label, selected: s.id === on })
        .on_click(() => {
          setShared("agents.sort", s.id);
          closeOverlay(props().overlay);
        })));
  }

  peek(addr) {
    run("terminal.peek", { terminal: addr });
  }

  // Live sub-agents of `addr`, depth first, each with the tree lines in front of it.
  tree(all, addr, lead = []) {
    const kids = all.filter((k) => k.parent === addr && k.state === "live");
    return kids.flatMap((k, i) => {
      const last = i === kids.length - 1;
      return [
        { t: k, lines: [...lead, last ? "└" : "├"] },
        ...this.tree(all, k.address, [...lead, last ? "" : "│"]),
      ];
    });
  }

  // A sub-agent is drawn in its parent's dark color, on the map too.
  // `lead`: the columns of the space tree the agent hangs in, kept so its
  // sub-agents sit under it.
  subRow(c, s, shown, compact, parent, lead = "") {
    const k = s.t;
    const st = kidStatus(k, this.listed);
    const on = k.address === shown;
    return h_flex()
      .id(`sub-${k.address}`)
      .px(4)
      .h(CH)
      .flex_none()
      .gap(8)
      .items_center()
      .whitespace_nowrap()
      .when(on, (el) => el.bg(c.BLUE))
      .hover((s) => s.bg(c.CYAN))
      .on_click(() => (this.listed.has(k.address) ? run("pane.focus", { terminal: k.address }) : this.peek(k.address)))
      .child(div().flex_none().text_color(c.DGRAY).child(`${lead} ${s.lines.map((l) => BRANCH[l] ?? " ").join("")}`))
      .child(glyphCell(petChar(k.address), parent?.dark ?? c.DGRAY))
      .child(div().flex_1().min_w(0).truncate().text_color(on ? c.WHITE : c.LGRAY).child(k.name || k.template || k.program?.name || k.address))
      .child(this.status(c, { status: st }, compact));
  }

  // What the agent is doing, as the unit list's job column. compact: a mark
  // only, where a header already says the state.
  status(c, a, compact = false) {
    if (a.status === "working") return spinner(c.LCYAN);
    if (a.status === "blocked") return div().flex_none().text_color(c.LRED).child(compact ? "!" : "Needs you!");
    if (a.status === "done") return compact ? glyphCell(tile("sun"), c.YELLOW) : div().flex_none().text_color(c.LGREEN).child("Done");
    return div().flex_none().text_color(c.YELLOW).child(compact ? "" : "No Job");
  }

  render() {
    const c = pal();
    if (props()?.sortMenu) return this.sortMenu(c);
    const collapsed = narrow();
    const sort = sortOf();
    let list = agents();
    this.listed = new Map(list.map((a) => [a.address, a.status]));
    const glyphs = agentGlyphs(c);
    const all = terminals();
    this.migratePins(all);
    const shown = focused()?.agent;
    const now = Date.now();
    this.track(list, now);
    // A kept sub-agent (one with a pane) is in agents() too: where a tree shows
    // it, it gets no row of its own, unless it's pinned.
    const nested = new Set(collapsed ? [] : list.flatMap((a) => this.tree(all, a.address).map((s) => s.t.address)));
    list = list.filter((a) => a.pinned || !nested.has(a.address));
    const tabCounts = new Map();
    for (const a of list) tabCounts.set(a.tab, (tabCounts.get(a.tab) ?? 0) + 1);
    const byPriority = sort.id === "priority";
    const urgency = new Map(list.map((a) => [a.address, Math.max(this.rank(a), ...this.tree(all, a.address).map((s) => RANK[kidStatus(s.t, this.listed)] ?? 0))]));
    const rankOf = (a) => urgency.get(a.address);
    if (byPriority) list = [...list].sort((x, y) => rankOf(y) - rankOf(x) || this.since(y) - this.since(x) || y.seq - x.seq);
    const pinned = list.filter((a) => a.pinned);
    const rest = list.filter((a) => !a.pinned);
    list = [...pinned, ...rest];
    setAgentOrder(list.map((a) => a.address));

    const withKids = (a, i) => {
      const subs = collapsed ? [] : this.tree(all, a.address);
      const r = row(a, i, subs);
      if (this.folded.has(a.address)) return [r];
      const lead = !branch.has(a.address) ? "" : branch.get(a.address) === "├─" ? " │ " : "   ";
      return [r, ...subs.map((s) => this.subRow(c, s, shown, byPriority, glyphs.get(a.address), lead))];
    };

    // The fold mark; folded, the count too, colored by the most urgent one.
    const fold = (a, subs) => {
      const sts = subs.map((s) => kidStatus(s.t, this.listed));
      const top = sts.reduce((m, s) => ((RANK[s] ?? 0) > (RANK[m] ?? 0) ? s : m), null);
      const open = !this.folded.has(a.address);
      return div()
        .id(`fold-${a.address}`)
        .flex_none()
        .text_color(open ? c.DGRAY : (c[STATUS_COLOR[top]] ?? c.DGRAY))
        .cursor_pointer()
        .hover((s) => s.text_color(c.WHITE))
        .on_click((_e, cx) => {
          cx.stop_propagation();
          open ? this.folded.add(a.address) : this.folded.delete(a.address);
          cx.notify();
        })
        .child(open ? "v" : `>${subs.length}`);
    };

    // A row reads "space · detail": the detail is a tab someone named or the
    // agent's own title, never an automatic tab number unless two rows would
    // otherwise read the same.
    // Read the pane snapshot once: every host read copies the whole list into JS.
    const leads = leadPanes(panes());
    const tabs = new Map(spaces().flatMap(s => s.tabs).map(tab => [tab.id, tab]));
    const labels = new Map(list.map(a => {
      const tab = tabs.get(a.tab);
      const many = tabCounts.get(a.tab) > 1;
      return [a.address, tab ? title(many ? { ...tab, named: false } : tab, many ? a : leads.get(a.tab)) : (a.title || a.program?.name || "")];
    }));
    const label = (a) => labels.get(a.address);
    const detail = new Map(list.map(a => [a.address, /^\d+$/.test(label(a)) ? null : label(a)]));
    const seen = {};
    for (const a of list) { const k = `${a.space_name}\u0000${detail.get(a.address) ?? ""}`; seen[k] = (seen[k] ?? 0) + 1; }
    for (const a of list) {
      if (detail.get(a.address) == null && seen[`${a.space_name}\u0000`] > 1) detail.set(a.address, label(a));
    }

    // The agent's creature: the character and ink the map draws it with.
    const creature = (a) => {
      const glyph = glyphs.get(a.address);
      if (!glyph) return glyphCell(" ", c.BLACK);
      const ink = creatureInk(c, glyph, a);
      return glyphCell(glyph.char, ink.color, ink.background);
    };

    const row = (a, i, subs = []) => {
      const more = detail.get(a.address);
      // An agent on another machine (`vps/t7`) says which.
      const machine = a.address.includes("/") ? a.address.split("/")[0] : null;
      if (collapsed) {
        return h_flex()
          .id(`ag-${a.address}`)
          .h(CH)
          .px(4)
          .flex_none()
          .items_center()
          .gap(4)
          .hover((s) => s.bg(c.CYAN))
          .on_click(() => run("pane.focus", { pane: a.pane }))
          .whitespace_nowrap()
          .tooltip(`${a.space_name || label(a)}: ${a.status}`)
          .child(div().flex_none().text_color(c.LGRAY).child(String(i + 1)))
          .child(creature(a))
          .child(div().flex_1().min_w(0).truncate().text_color(a.focused ? c.WHITE : a.status === "idle" ? c.DGRAY : c.LGRAY).child(a.space_name || label(a)))
          .child(h_flex().w(9).flex_none().items_center().justify_center().child(this.status(c, a, true)));
      }
      const when = this.since(a);
      const idle = a.status === "idle" && !a.focused;
      const isPinned = a.pinned;
      const pin = textButton(c, `pin-${a.address}`, isPinned ? "unpin" : "pin")
        .tooltip(isPinned ? "Unpin" : "Pin to the top")
        .on_click((_e, cx) => {
          cx.stop_propagation();
          run("terminal.pin", { terminal: a.address, pinned: !isPinned });
          // The row moves away from under the pointer, and no hover-out comes.
          this.hovered = null;
          cx.notify();
        });
      // Under a space header the space goes without saying; an automatic tab number says nothing.
      // Without a space header above (priority, pinned) the row names its space.
      const full = byPriority || isPinned;
      const name = full ? a.space_name || label(a) : more ?? (/^\d+$/.test(label(a)) ? a.program?.name || label(a) : label(a));
      const nameInk = a.focused ? c.WHITE : idle ? c.DGRAY : c.LGRAY;
      return h_flex()
        .id(`ag-${a.address}`)
        .px(4)
        .h(CH)
        .flex_none()
        .items_center()
        .gap(8)
        .whitespace_nowrap()
        .when(a.focused, (el) => el.bg(c.BLUE))
        .cursor_pointer()
        .hover((s) => s.bg(c.CYAN))
        .on_hover((on, cx) => {
          if (on) this.hovered = a.address;
          else if (this.hovered === a.address) this.hovered = null;
          cx.notify();
        })
        .on_click(() => run("pane.focus", { pane: a.pane }))
        .when(branch.has(a.address), el => el.child(div().flex_none().text_color(c.DGRAY).child(` ${branch.get(a.address)}`)))
        .child(div().id(`agent-fold-${a.address}`).flex_none()
          .when(subs.length > 0, el => el.on_click((_e, cx) => {
            cx.stop_propagation();
            this.folded.has(a.address) ? this.folded.delete(a.address) : this.folded.add(a.address);
            cx.notify();
          })).child(creature(a)))
        .child(h_flex().flex_1().min_w(0).gap(4).items_center()
          .child(div().min_w(0).when(full && Boolean(more), (el) => el.max_w(120)).truncate().text_color(nameInk).child(name))
          .when(full && Boolean(more), el => el.child(div().flex_1().min_w(0).truncate().text_color(c.DGRAY).child(`· ${more}`))))
        .when(Boolean(machine), el => el.child(div().flex_none().text_color(c.DGRAY).child(machine)))
        .when(subs.length > 0, el => el.child(fold(a, subs)))
        .when(this.hovered === a.address, el => el.child(pin))
        .when(this.hovered !== a.address && Boolean(when), el => el.child(div().flex_none().text_color(c.DGRAY).child(duration(now - when))))
        .child(this.status(c, a, byPriority && !isPinned));
    };

    // Groups in list order: spaces (grouped) or priority sections. Agents of a
    // space are next to each other in agents(), so neighbours make a group.
    const groups = pinned.length ? [{ id: "pinned", label: "Pinned", status: null, members: pinned }] : [];
    for (const a of rest) {
      const r = rankOf(a) || RANK.idle;
      const id = byPriority ? `sec-${r}` : `sp-${a.space}`;
      if (groups.at(-1)?.id === id) groups.at(-1).members.push(a);
      else groups.push({ id, label: byPriority ? SECTION[r] : a.space_name || "", status: byPriority ? SECTION_STATUS[r] : null, members: [a] });
    }

    // Grouped by space, each agent hangs under its group's header like a
    // worktree under its repo in the spaces list: `├─`, the last one `└─`.
    const branch = new Map();
    if (!collapsed && !byPriority) {
      for (const g of groups) g.members.forEach((a, n) => branch.set(a.address, n === g.members.length - 1 ? "└─" : "├─"));
    }

    // A group's header; it folds the group. Folded, it says how many and the most urgent state.
    const header = (g) => {
      const open = !this.folded.has(g.id);
      const top = g.members.reduce((m, a) => ((RANK[a.status] ?? 0) > (RANK[m] ?? 0) ? a.status : m), null);
      return h_flex()
        .id(g.id)
        .px(4)
        .h(CH)
        .flex_none()
        .gap(8)
        .items_center()
        .whitespace_nowrap()
        .cursor_pointer()
        .hover((s) => s.bg(c.CYAN))
        .on_click((_e, cx) => {
          open ? this.folded.add(g.id) : this.folded.delete(g.id);
          cx.notify();
        })
        .child(div().min_w(0).truncate().text_color(c[STATUS_COLOR[g.status]] ?? c.DGRAY).child(g.label))
        .when(byPriority || !open, (el) => el.child(div().flex_none().text_color(c.DGRAY).child(String(g.members.length))))
        .child(div().flex_1())
        .when(!open, (el) => el
          .when(!byPriority && top && top !== "idle", (el) => el.child(this.status(c, { status: top }, true)))
          .child(div().flex_none().text_color(c.DGRAY).child(">")));
    };
    const rows = collapsed
      ? list.flatMap(withKids)
      : groups.flatMap((g) => [header(g), ...(this.folded.has(g.id) ? [] : g.members.flatMap(withKids))]);

    return root(v_flex().size_full().min_h(0).bg(c.BLACK))
      .when(!collapsed, (el) =>
        el.child(
          h_flex()
            .px(8)
            .h(CH)
            .flex_none()
            .items_center()
            .justify_between()
            .child(div().text_color(c.WHITE).child("Agents"))
            .child(
              textButton(c, "ag-sort", `[${sort.label}]`)
                .on_click(() => openOverlay({ mod: "df-classic", kind: "popup", width: 240, height: 68, props: { role: "agents", sortMenu: true } }))
                .tooltip(`Sort agents: ${sort.label}`),
            ),
        ),
      )
      .when(list.length === 0 && !collapsed, (el) =>
        el.child(div().px(8).text_color(c.DGRAY).child("No agent status yet. Agents show up here when they report their status. Older versions and agents inside tmux may not.")),
      )
      .child(v_flex().id("ag-list").flex_1().min_h(0).px(collapsed ? 0 : 4).overflow_y_scrollbar().mode("always").children(rows))
      .when(collapsed, (el) =>
        el.child(
          h_flex()
            .h(CH)
            .flex_none()
            .items_center()
            .justify_center()
            .child(textButton(c, "collapse", "»").on_click(toggleSidebar)),
        ),
      );
  }
}
