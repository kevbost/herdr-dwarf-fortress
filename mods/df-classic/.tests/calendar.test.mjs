import { test } from "node:test";
import assert from "node:assert/strict";
import { MONTHS, dfDate } from "../calendar.js";

test("the game's calendar: twelve months, the real month, a 31-day month ends on the 28th", () => {
  { // twelve months of stone
    assert.equal(MONTHS.length, 12);
  }
  { // the real month is the game's, the season follows it
    assert.equal(dfDate(new Date(2026, 0, 31)), "28th Granite, 2026, Early-Spring");
    assert.equal(dfDate(new Date(2026, 10, 18)), "17th Opal, 2026, Mid-Winter");
    assert.equal(dfDate(new Date(2026, 8, 1)), "1st Timber, 2026, Late-Autumn");
  }
  { // a 31-day month still ends on the 28th, a 28-day one is unchanged
    assert.match(dfDate(new Date(2026, 4, 31)), /^28th /);
    assert.match(dfDate(new Date(2026, 1, 11)), /^11th /);
    assert.match(dfDate(new Date(2026, 1, 12)), /^12th /);
    assert.match(dfDate(new Date(2026, 1, 2)), /^2nd /);
    assert.match(dfDate(new Date(2026, 1, 3)), /^3rd /);
  }
});


