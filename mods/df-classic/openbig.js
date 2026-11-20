// Opening the big map's dialog: one place for its size, so the footer's Map and a
// click on the map open the same thing. The dialog is the map's own room plus a
// sidebar with the list of maps.

import { openOverlay } from "herdr";
import { GLYPH_W } from "./kit.js";

/** The width of the map list down the big map's right side, px. */
export const MAPS_SIDEBAR_W = 22 * GLYPH_W;

const MAP_ROOM = { width: 882, height: 694 };

export const openBigMap = () =>
  openOverlay({ mod: "df-classic", kind: "dialog", width: MAP_ROOM.width + MAPS_SIDEBAR_W, height: MAP_ROOM.height, frame: "none", props: { role: "bigmap" } });
