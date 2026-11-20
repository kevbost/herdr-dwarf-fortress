import { test } from "node:test";
import assert from "node:assert/strict";
import { hashCell, hashString } from "../hash.js";

test("hashString and hashCell are stable, in range and spread out", () => {
  { // hashString is stable, unsigned and tells strings apart
    assert.equal(hashString("t8"), hashString("t8"));
    assert.notEqual(hashString("t8"), hashString("t9"));
    assert.equal(hashString(""), 0x811c9dc5);
    // Published FNV-1a 32-bit vectors.
    assert.equal(hashString("a"), 0xe40c292c);
    assert.equal(hashString("foobar"), 0xbf9cf968);
    for (const text of ["t1", "vps/t7", "a much longer terminal address"]) {
      const hash = hashString(text);
      assert.ok(Number.isInteger(hash) && hash >= 0 && hash <= 0xffffffff);
    }
  }
  { // hashCell is stable, within [0, 1), and spread out
    assert.equal(hashCell(3, 4, 5), hashCell(3, 4, 5));
    assert.notEqual(hashCell(3, 4, 5), hashCell(3, 4, 6));
    let below = 0;
    const total = 96 * 40;
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 96; x++) {
        const value = hashCell(x, y, 1);
        assert.ok(value >= 0 && value < 1);
        if (value < 0.5) below++;
      }
    }
    assert.ok(below / total > 0.45 && below / total < 0.55, `${below} of ${total} below one half`);
  }
});

