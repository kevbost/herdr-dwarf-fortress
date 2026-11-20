// The df-classic kit: what every role shares. The 16 Dwarf Fortress colors (read
// from the theme, so a theme pick reskins the layout as a colors.txt swap did the
// game), the row grid, the one place CP437 glyphs are drawn, and the menu bits.
//
// Text is the layout's ui_font; no font is named here. CP437 glyphs (the map,
// and every glyph cell) are tiles cut from the tileset sheet and tinted, so an
// agent's glyph in a list is the very one on the map.

import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { theme, layout, agents, run, shared, setShared, appHome, readTextFile, writeTextFile } from "herdr";
import { assignGlyphs } from "./glyphs.js";
import { charIndex } from "./tiles.js";
import { TILESET } from "./tileset.js";
import { find, sideOf, swapMenuSide, isRoleHidden as hiddenIn } from "./tree.js";

export { find } from "./tree.js";
export { creatureInk, speciesChar } from "./glyphs.js";

/** Chrome text size and the height of one text row, px. */
export const FS = 15;
export const CH = 18;

/** The cell a glyph is drawn in, px: the tileset's (tileset.js, written by art/slice_tileset.py). */
export const GLYPH_W = TILESET.cellWidth;
export const GLYPH_H = TILESET.cellHeight;

// The tileset: 256 tiles, 16 a row, as one image the app tints.
const SHEET = "mods/df-classic/tileset/sheet.svg";
const TILES_PER_ROW = 16;

const SIDEBAR_WIDTH = 324;
// The rail is wide enough to read: a space or an agent shows its number and the start of its name.
const RAIL_WIDTH = 108;
const RAIL_BELOW = 160;
// This layout's own keys. The shipped mods' "sidebar.width" belongs to layouts
// whose sidebar is another size.
const WIDTH_KEY = "df.sidebar.width";
// address -> color name: the color each live agent was given, so it keeps it.
const COLORS_KEY = "df.agent.colors";
// address -> "first" or a race name: the race each live agent was given, so it keeps it.
const RACES_KEY = "df.agent.races";

const ANSI = { BLACK: 0, RED: 1, GREEN: 2, BROWN: 3, BLUE: 4, MAGENTA: 5, CYAN: 6, LGRAY: 7, DGRAY: 8, LRED: 9, LGREEN: 10, YELLOW: 11, LBLUE: 12, LMAGENTA: 13, LCYAN: 14, WHITE: 15 };

// The game's colors for the menu, the map and the tiles. The theme's ANSI
// palette is the terminals': it is tuned to read on black, and would recolor
// the selection bar, hover and map if the menu took it from there. Black, dark
// gray and white are the same in both and come from the theme.
const DF_COLORS = {
  1: "#800000", 2: "#008000", 3: "#808000", 4: "#000080", 5: "#800080", 6: "#008080", 7: "#c0c0c0",
  9: "#ff0000", 10: "#00ff00", 11: "#ffff00", 12: "#0000ff", 13: "#ff00ff", 14: "#00ffff",
};

/** One of the 16 colors, the menu's: by its place in the palette. */
export const ansiColor = (t, index) => DF_COLORS[index] ?? t[`ansi${index}`];

/**
 * The 16 colors by their DF names, and FRAME: the border and divider gray. Read once per render.
 * @returns {Record<string, any>}
 */
export function pal() {
  const t = theme();
  const colors = { FRAME: t.canvas };
  for (const [name, index] of Object.entries(ANSI)) colors[name] = ansiColor(t, index);
  return colors;
}

/** Puts a role's root on the row grid. */
export const root = (el) => el.text_size(FS).line_height(`${CH}px`);

/**
 * One tile of the sheet, by its place in code page 437, in a color: the sheet
 * hangs behind a cell-sized window, moved so that tile shows.
 */
export function tileCell(index, color, background) {
  return div().relative().flex_none().w(GLYPH_W).h(GLYPH_H).overflow_hidden()
    .when(Boolean(background), (el) => el.bg(background))
    .child(svg(SHEET).absolute().left(-(index % TILES_PER_ROW) * GLYPH_W).top(-Math.floor(index / TILES_PER_ROW) * GLYPH_H)
      .w(TILES_PER_ROW * GLYPH_W).h(TILES_PER_ROW * GLYPH_H).text_color(color));
}

/** One CP437 character as its tile. */
export const glyphCell = (char, color, background) => tileCell(charIndex(char), color, background);

/** Text on a colored background: a label set into the border. */
export const tag = (text, color, background) =>
  div().flex_none().h(CH).whitespace_nowrap().bg(background).text_color(color).child(text);

/** DF's "several creatures here" spinner, for working. */
export const spinner = (color) => div().flex_none().text_color(color).frames(["-", "\\", "|", "/"], 150);

/**
 * A menu line as the game writes it: `a: View Announcements`, key in green.
 * `rail`: only the key, with the label as its tooltip. The caller adds on_click.
 */
export function menuRow({ c, id, hotkey, label, selected = false, rail = false }) {
  return h_flex().id(id).h(CH).flex_none().items_center().whitespace_nowrap().cursor_pointer()
    .when(selected, (el) => el.bg(c.BLUE))
    .hover((s) => s.bg(c.CYAN))
    .when(rail, (el) => el.justify_center().tooltip(label))
    .child(div().flex_none().text_color(c.LGREEN).child(hotkey))
    .when(!rail, (el) => el.child(div().flex_none().text_color(selected ? c.WHITE : c.LGRAY).child(`: ${label}`)));
}

/** Something to click, in the key color. */
export const textButton = (c, id, label) =>
  div().id(id).flex_none().whitespace_nowrap().cursor_pointer().text_color(c.LGREEN).hover((s) => s.bg(c.CYAN).text_color(c.WHITE)).child(label);

// ---- the layout

// The sidebar's rail goes by its width, not a flag: dragging its edge narrows it too.
export const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < RAIL_BELOW;

// To the rail, or back to the width it had.
export function toggleSidebar() {
  const width = find(layout(), "sidebar")?.size?.px;
  if (!narrow()) setShared(WIDTH_KEY, width);
  run("layout.resize", { id: "sidebar", px: narrow() ? (shared(WIDTH_KEY) ?? SIDEBAR_WIDTH) : RAIL_WIDTH });
}

/** "left" or "right": where the menu column is now. */
export const menuSide = () => sideOf(find(layout(), "body"));

// One move at a time: a second click while the file is being rewritten would
// read it half-way through and flip the menu back.
let moving = false;

/**
 * Moves the menu column to the other side of the work area, for good: the
 * shown layout's own file is rewritten (the app redraws from it), with its
 * sizes and everything else as they were.
 */
export async function moveMenu() {
  if (moving) return;
  moving = true;
  try {
    const name = String(shared("layout") ?? "");
    // A layout's name is a file name in layouts/: nothing that could point elsewhere.
    if (!/^[\w.-]+$/.test(name) || name.startsWith(".")) throw new Error(`"${name}" is not a layout name`);
    const path = `${appHome()}/layouts/${name}.json`;
    const text = await readTextFile(path);
    if (!text) throw new Error(`no layout file at ${path}`);
    const tree = JSON.parse(text);
    if (!swapMenuSide(tree)) throw new Error('this layout has no "sidebar" beside "work" in "body"');
    await writeTextFile(path, `${JSON.stringify(tree, null, 2)}\n`, text);
  } finally {
    moving = false;
  }
}

/** Whether every block of this role in the shown layout is hidden. A role outside the layout's tree is not. */
export const isRoleHidden = (role) => hiddenIn(layout(), role);

// ---- agents as creatures

/**
 * Map(address -> { char, color, dark }) for every agent, colors as values. The
 * list, the pane headers and the map all draw from this. The color an agent was
 * given is kept in shared state, so it is the same in every copy and for as long
 * as the agent lives.
 */
export function agentGlyphs(c) {
  const stored = (key) => {
    const value = shared(key);
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  };
  const list = agents();
  const assigned = assignGlyphs(list.map((a) => ({ address: a.address, key: a.program?.key, space: a.space })), stored(COLORS_KEY), stored(RACES_KEY));
  // Every copy works this out from the same inputs, so they all write the same thing.
  // With no agents (starting up, a core that is reconnecting) nothing is forgotten: they may be back.
  if (assigned.changed && list.length > 0) setShared(COLORS_KEY, assigned.kept);
  if (assigned.racesChanged && list.length > 0) setShared(RACES_KEY, assigned.races);
  return new Map([...assigned.glyphs].map(([address, glyph]) => [address, { char: glyph.char, color: c[glyph.color], dark: c[glyph.dark] }]));
}
