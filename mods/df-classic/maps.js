// The maps the layout ships with, and how to get a world from one. The shown
// map is the shared "df.map"; the first is the default. Pure.

import { meadow } from "./meadow.js";
import { settlement } from "./settlement.js";
import { fortress } from "./fortress.js";
import { volcano } from "./volcano.js";
import { mountainside } from "./mountainside.js";
import { river } from "./river.js";
import { makeWorld } from "./world.js";

export const MAPS = [meadow, settlement, fortress, volcano, mountainside, river];
export const DEFAULT_MAP = meadow.id;

/** The map with this id; anything else is the default. */
export const mapById = (id) => MAPS.find((map) => map.id === id) ?? MAPS[0];

/** The world of the map with this id. */
export const buildWorld = (id) => makeWorld(mapById(id));
