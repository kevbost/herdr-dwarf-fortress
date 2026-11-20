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

/**
 * The races the agents after the first in a space cycle through, in this order,
 * each with the character the game draws it with. The first agent in a space
 * is not in the list: it keeps `speciesChar`.
 */
export const RACES = [
  { id: "elf", char: "e" },
  { id: "goblin", char: "g" },
  { id: "human", char: "U" },
  { id: "kobold", char: "k" },
];

/** What is remembered for the first agent a space had, in place of a race id. */
export const FIRST = "first";

const isRemembered = (value) => value === FIRST || RACES.some((race) => race.id === value);

/** A sub-agent walks beside its parent like a pet: the game's d (dog) or c (cat), one for good by its address. */
export const petChar = (address) => (hashString(address) % 2 ? "c" : "d");

// Shorter addresses first, then by text: "t9" before "t10", so a later agent sorts later.
const byAddress = (a, b) => {
  if (a.address.length !== b.address.length) return a.address.length - b.address.length;
  if (a.address === b.address) return 0;
  return a.address < b.address ? -1 : 1;
};

/**
 * agents: [{ address, key, space }] (key: the program's table key; space: the
 * space it is in).
 * kept: { address: colorName } and keptRaces: { address: FIRST | raceId }, as
 * returned last time ({} at first).
 * Returns { glyphs: Map(address -> { char, color, dark }), kept, changed,
 * races, racesChanged }.
 *
 * The race (which character) of an agent is chosen once: the first agent a
 * space has is the program's own species (`speciesChar`); each one added to a
 * space that has any then takes the next race of `RACES` not yet in that space,
 * cycling past the end. An agent in `keptRaces` keeps its race, so when the first
 * leaves, the others do not change and the next one added cycles.
 * An agent in `kept` keeps its color. A new one prefers the color its address
 * hashes to and, finding it taken by one of its character, takes the next free,
 * while any is free. `kept` and `keptRaces` hold only the agents given;
 * `changed` and `racesChanged` say each differs from what came in.
 */
export function assignGlyphs(agents, kept = {}, keptRaces = {}) {
  const ordered = [...agents].sort(byAddress);
  const spaceOf = (agent) => agent.space ?? "";

  const rememberedRace = (agent) => (isRemembered(keptRaces?.[agent.address]) ? keptRaces[agent.address] : null);
  const racesInSpace = new Map();
  const racesOf = (space) => {
    if (!racesInSpace.has(space)) racesInSpace.set(space, []);
    return racesInSpace.get(space);
  };
  // Races already owned are spoken for before any new agent picks.
  for (const agent of ordered) if (rememberedRace(agent)) racesOf(spaceOf(agent)).push(rememberedRace(agent));

  const nextRaces = {};
  for (const agent of ordered) {
    let race = rememberedRace(agent);
    if (!race) {
      const inSpace = racesOf(spaceOf(agent));
      if (inSpace.length === 0) race = FIRST;
      else {
        const added = inSpace.filter((id) => id !== FIRST);
        race = (RACES.find((candidate) => !inSpace.includes(candidate.id)) ?? RACES[added.length % RACES.length]).id;
      }
      inSpace.push(race);
    }
    nextRaces[agent.address] = race;
  }
  const charOf = (agent) => (nextRaces[agent.address] === FIRST ? speciesChar(agent.key) : RACES.find((race) => race.id === nextRaces[agent.address]).char);

  const remembered = (agent) => (AGENT_COLORS.includes(kept?.[agent.address]) ? kept[agent.address] : null);
  const takenByChar = new Map();
  const takenFor = (char) => {
    if (!takenByChar.has(char)) takenByChar.set(char, new Set());
    return takenByChar.get(char);
  };
  // Colors already owned are spoken for before any new agent picks.
  for (const agent of ordered) if (remembered(agent)) takenFor(charOf(agent)).add(remembered(agent));

  const next = {};
  const glyphs = new Map();
  for (const agent of ordered) {
    const char = charOf(agent);
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
  const differs = (before, after) => {
    const keys = Object.keys(before ?? {});
    return keys.length !== Object.keys(after).length || keys.some((address) => before[address] !== after[address]);
  };
  return { glyphs, kept: next, changed: differs(kept, next), races: nextRaces, racesChanged: differs(keptRaces, nextRaces) };
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
