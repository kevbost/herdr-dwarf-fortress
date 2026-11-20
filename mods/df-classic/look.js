// What the game's Look cursor says about what is under it, in the game's
// voice. Pure.

/** The DF color name each agent state is written in, wherever the state is shown. */
export const STATE_COLOR = { working: "LBLUE", blocked: "LRED", done: "LGREEN", idle: "LGRAY" };

/** "<1m", "5m", "2h 5m", "3d": how long, from milliseconds. */
export function duration(ms) {
  const minutes = Math.floor(Math.max(0, ms) / 60000);
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}m` : `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** An agent: { color, text }. since: when it entered its state, ms, or null when not known. */
export function describeAgent({ program, space, status, since, now }) {
  const how = since === null ? "" : ` for ${duration(now - since)}`;
  return { color: STATE_COLOR[status] ?? "LGRAY", text: `${program} at ${space}: ${status}${how}.` };
}

/** A sub-agent, walking beside its parent like a pet. */
export const describePet = ({ name, program, space }) => ({ color: "LGRAY", text: `${name}, a sub-agent of ${program} at ${space}.` });

/** What Look says when it is turned on, before anything is clicked. */
export const LOOK_ON = { text: "Look: click the map.", color: "LGRAY" };

const TERRAIN = {
  grass: "Grass.",
  shrub: "Shrub.",
  sapling: "Sapling.",
  reed: "Rope reed.",
  tree: "Tree.",
  boulder: "Boulder.",
  brook: "Brook.",
  pond: "Pond: deep water.",
  ramp: "Rocky outcrop.",
  road: "Dirt road.",
  bridge: "Bridge.",
  wall: "Wall.",
  floor: "Floor.",
  door: "Door.",
  table: "Table.",
  workshop: "Workshop.",
  wagon: "Embark wagon.",
  chair: "Chair.",
  bed: "Bed.",
  rock: "Solid rock.",
  smooth: "Smoothed stone floor.",
  stockpile: "Stockpile.",
  pillar: "Pillar.",
  stairs: "Stairs, to a level you cannot reach.",
  slope: "A slope to a level you cannot reach.",
  chasm: "Open space: a drop to the level below.",
  dirt: "Dry ground.",
  scrub: "Scrub.",
  plaza: "Cobbled plaza.",
  well: "Well.",
  palisade: "Palisade of logs.",
  gate: "Gate.",
  field: "Ploughed field.",
  statue: "Statue.",
  forge: "Forge.",
  cabinet: "Cabinet.",
  chest: "Chest.",
  ash: "Ash.",
  magma: "Magma, in the crater on the level below.",
  snow: "Snow.",
  river: "River: deep water.",
  waterfall: "Waterfall: the river drops to the level below.",
};

/** A cell of the world by its kind: { color, text }, in the cell's own color. */
export const describeTerrain = ({ kind, color }) => ({ color, text: TERRAIN[kind] ?? "Nothing of note." });
