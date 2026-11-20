// The CP437 tiles this layout draws, by name. A tile is an index into code page
// 437, the 256 characters classic Dwarf Fortress draws everything with (the same
// order as tilesets such as VGA9x16.png: 16 tiles a row). Code asks for
// tile("dwarf"), never for a literal character.

const LOW = " ☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼";
const ASCII = Array.from({ length: 95 }, (_unused, offset) => String.fromCharCode(0x20 + offset)).join("");
const HIGH =
  "⌂" +
  "ÇüéâäàåçêëèïîìÄÅ" +
  "ÉæÆôöòûùÿÖÜ¢£¥₧ƒ" +
  "áíóúñÑªº¿⌐¬½¼¡«»" +
  "░▒▓│┤╡╢╖╕╣║╗╝╜╛┐" +
  "└┴┬├─┼╞╟╚╔╩╦╠═╬╧" +
  "╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀" +
  "αßΓπΣσµτΦΘΩδ∞φε∩" +
  "≡±≥≤⌠⌡÷≈°∙·√ⁿ²■ ";

/** Code page 437: CP437[index] is that tile's character. */
export const CP437 = LOW + ASCII + HIGH;

const TILE_INDEX = {
  // Letters of the game's own glyph table, by what the game draws with them: see SYMBOLS.md.
  blank: 0,
  dwarf: 1,
  tree: 5,
  treeAlt: 6,
  boulder: 7,
  sun: 15,
  up: 24,
  down: 25,
  pine: 24,
  ramp: 30,
  rampDown: 31,
  shrub: 34,
  grassTick: 39,
  grassComma: 44,
  grassDot: 46,
  grassBacktick: 96,
  ripple: 126,
  block: 219,
  sapling: 231,
  ropeReed: 159,
  water: 247,
  // Structures. Walls are the double-line box characters, picked by what a wall joins.
  boxH: 205, boxV: 186, boxNW: 201, boxNE: 187, boxSW: 200, boxSE: 188,
  boxTE: 204, boxTW: 185, boxTS: 203, boxTN: 202, boxX: 206,
  smooth: 43,
  door: 197,
  road: 126,
  stoneRoad: 247,
  openSpace: 250,
  rock: 178,
  rockLight: 177,
  stockpile: 61,
  table: 209,
  chair: 210,
  workshop: 8,
  shadeLight: 176,
  bars: 240,
  floorTile: 93,
  bracket: 91,
  semicolon: 59,
  roundO: 111,
  dash: 45,
  divide: 246,
  infinity: 236,
  mechanism: 128,
  caret: 94,
  house: 127,
  epsilon: 238,
  parenL: 40,
  lineH: 196,
  backslash: 92,
  wagon: 178,
  bed: 233,
  cabinet: 227,
  chest: 146,
  pillar: 79,
  stairUp: 60,
  stairDown: 62,
  stairBoth: 88,
  well: 9,
  furrow: 247,
  statue: 234,
  forge: 229,
  deadTree: 198,
  ashes: 242,
  ashesAlt: 243,
};

/** Every tile name. */
export const tileNames = () => Object.keys(TILE_INDEX);

/** A tile's place in code page 437. */
export function tileIndex(name) {
  const index = TILE_INDEX[name];
  if (index === undefined) throw new Error(`df-classic: no tile "${name}"`);
  return index;
}

/** A tile's character. */
export const tile = (name) => CP437[tileIndex(name)];

/** Where a character is in code page 437; one the page lacks is drawn as "?". */
export function charIndex(char) {
  const index = CP437.indexOf(char);
  return index === -1 ? CP437.indexOf("?") : index;
}
