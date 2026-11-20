// Which character and color an agent is, wherever it is drawn. The character
// is the species (the program it runs); the color is the individual, and stays
// its own for as long as it lives. Pure: the caller keeps what must be remembered.

import { hashString } from "./hash.js";
import { tile } from "./tiles.js";

/** DF color names an agent can be: the bright ones that read on black and are not lost in the grass (blue and green are). */
export const AGENT_COLORS = ["LCYAN", "YELLOW", "LMAGENTA", "WHITE", "LRED"];

/** The dark half of each color's pair: what an idle agent is drawn in. None is itself an agent color. */
export const DARK_PARTNER = {
  LCYAN: "CYAN",
  YELLOW: "BROWN",
  LMAGENTA: "MAGENTA",
  WHITE: "LGRAY",
  LRED: "RED",
};

/** Claude Code agents are the dwarves; any other program is its first letter, as DF draws other creatures. */
export function speciesChar(programKey) {
  const key = String(programKey ?? "");
  if (key.startsWith("claude")) return tile("dwarf");
  const letter = key.match(/[a-z0-9]/i)?.[0];
  return letter ? letter.toUpperCase() : "?";
}

/** A sub-agent walks beside its parent like a pet: the game's d (dog) or c (cat), one for good by its address. */
export const petChar = (address) => (hashString(address) % 2 ? "c" : "d");

// Shorter addresses first, then by text: "t9" before "t10", so a later agent sorts later.
const byAddress = (a, b) => {
  if (a.address.length !== b.address.length) return a.address.length - b.address.length;
  if (a.address === b.address) return 0;
  return a.address < b.address ? -1 : 1;
};

/**
 * agents: [{ address, key }] (key: the program's table key).
 * kept: { address: colorName } as returned last time ({} at first).
 * Returns { glyphs: Map(address -> { char, color, dark }), kept, changed }.
 * An agent in `kept` keeps its color. A new one prefers the color its address
 * hashes to and, finding it taken by one of its species, takes the next free,
 * while any is free. `kept` holds only the agents given; `changed` says it
 * differs from what came in.
 */
export function assignGlyphs(agents, kept = {}) {
  const ordered = [...agents].sort(byAddress);
  const remembered = (agent) => (AGENT_COLORS.includes(kept?.[agent.address]) ? kept[agent.address] : null);
  const takenBySpecies = new Map();
  const takenFor = (char) => {
    if (!takenBySpecies.has(char)) takenBySpecies.set(char, new Set());
    return takenBySpecies.get(char);
  };
  // Colors already owned are spoken for before any new agent picks.
  for (const agent of ordered) if (remembered(agent)) takenFor(speciesChar(agent.key)).add(remembered(agent));

  const next = {};
  const glyphs = new Map();
  for (const agent of ordered) {
    const char = speciesChar(agent.key);
    const taken = takenFor(char);
    let color = remembered(agent);
    if (!color) {
      let pick = hashString(agent.address) % AGENT_COLORS.length;
      if (taken.size < AGENT_COLORS.length) while (taken.has(AGENT_COLORS[pick])) pick = (pick + 1) % AGENT_COLORS.length;
      color = AGENT_COLORS[pick];
      taken.add(color);
    }
    next[agent.address] = color;
    glyphs.set(agent.address, { char, color, dark: DARK_PARTNER[color] });
  }
  const before = Object.keys(kept ?? {});
  const changed = before.length !== Object.keys(next).length || before.some((address) => kept[address] !== next[address]);
  return { glyphs, kept: next, changed };
}

/**
 * How a creature is inked, the same wherever it is drawn. colors: every DF
 * color name to its value. glyph: { color, dark } as values. Idle is the dark
 * partner; the one in focus is inverted; blocked stands on red (brighter red
 * when it is also the one in focus).
 */
export function creatureInk(colors, glyph, { status, focused }) {
  const own = status === "idle" ? glyph.dark : glyph.color;
  if (status === "blocked") return focused ? { color: colors.BLACK, background: colors.LRED } : { color: own, background: colors.RED };
  if (focused) return { color: colors.BLACK, background: own };
  return { color: own, background: null };
}
