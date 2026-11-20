import { test } from "node:test";
import assert from "node:assert/strict";
import { CP437, tile, tileIndex, tileNames } from "../tiles.js";

test("the tile table: 256 characters, one character each, the classic and structure tiles", () => {
  { // code page 437 has its 256 characters in order
    assert.equal([...CP437].length, 256);
    assert.equal(CP437.length, 256, "every character is one UTF-16 unit, so text.length counts cells");
    const known = { 1: "☺", 2: "☻", 5: "♣", 6: "♠", 7: "•", 15: "☼", 24: "↑", 25: "↓", 30: "▲", 65: "A", 126: "~", 127: "⌂", 176: "░", 179: "│", 219: "█", 231: "τ", 247: "≈", 254: "■" };
    for (const [index, char] of Object.entries(known)) assert.equal(CP437[index], char, `index ${index}`);
  }
  { // every tile is exactly one character of code page 437
    assert.ok(tileNames().length > 0);
    for (const name of tileNames()) {
      const char = tile(name);
      assert.equal([...char].length, 1, name);
      assert.equal(CP437[tileIndex(name)], char, name);
    }
  }
  { // the tiles the layout relies on are the classic ones
    assert.equal(tile("dwarf"), "☺");
    assert.equal(tile("tree"), "♣");
    assert.equal(tile("treeAlt"), "♠");
    assert.equal(tile("sapling"), "τ");
    assert.equal(tile("water"), "≈");
    assert.equal(tile("ramp"), "▲");
    assert.equal(tile("sun"), "☼");
    assert.equal(tile("block"), "█");
  }
  { // the structure tiles are the box-drawing, stair and floor characters of the game
    const expected = { boxH: "═", boxV: "║", boxNW: "╔", boxNE: "╗", boxSW: "╚", boxSE: "╝", boxTE: "╠", boxTW: "╣", boxTS: "╦", boxTN: "╩", boxX: "╬", smooth: "+", door: "┼", road: "~", stoneRoad: "≈", openSpace: "·", stockpile: "=", table: "╤", chair: "╥", ropeReed: "ƒ", workshop: "◘", wagon: "▓", shadeLight: "░", bars: "≡", floorTile: "]", divide: "÷", lineH: "─", bed: "Θ", cabinet: "π", chest: "Æ", pillar: "O", pine: "↑", rampDown: "▼", deadTree: "╞", ashes: "≥", ashesAlt: "≤", stairUp: "<", stairDown: ">", stairBoth: "X", well: "○", furrow: "≈", statue: "Ω", forge: "σ", rock: "▓", rockLight: "▒", blank: " " };
    for (const [name, char] of Object.entries(expected)) assert.equal(tile(name), char, name);
  }
});



test("lookups: an unknown tile throws, a missing character is a question mark", async () => {
  { // an unknown tile name throws
    assert.throws(() => tile("magma"), /no tile "magma"/);
    assert.throws(() => tileIndex("magma"), /no tile "magma"/);
  }
  { // a character is found in code page 437, and one it lacks is a question mark
    const { charIndex } = await import("../tiles.js");
    assert.equal(charIndex("☺"), 1);
    assert.equal(charIndex("A"), 65);
    assert.equal(charIndex("7"), 55);
    assert.equal(charIndex("!"), 33);
    assert.equal(charIndex("≈"), 247);
    assert.equal(charIndex("€"), 63);
    assert.equal(CP437[charIndex("€")], "?");
  }
});


