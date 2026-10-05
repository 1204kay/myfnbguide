// Dates as readers see them (lib/format.ts). Failure cases: an archived item from 2019 reads as this year's
// "2月19日"; the year is decided by the server's or reader's own clock instead of Beijing's, so the last half hour of
// a Beijing year (or the first of the next) is dated wrong; a site that spaces its dates (site.ts DATES.spaced)
// gets "10月5日", or spaces inside a number; the chart's "M月D日 HH:mm" loses the single space it splits on.
import assert from "node:assert/strict";
import { test } from "node:test";
import { DATES } from "@aihot/site";
import { monthDay, monthDayTime, weekdayShort } from "../app/lib/format.ts";

/** Runs `fn` with the site's date spacing set to `spaced`. */
function spacing(spaced: boolean, fn: () => void) {
  const was = DATES.spaced;
  DATES.spaced = spaced;
  try {
    fn();
  } finally {
    DATES.spaced = was;
  }
}

const beijing = (at: string) => Date.parse(`${at}+08:00`);

test("a day of this Beijing year has no year; another year's carries it", () => {
  const now = beijing("2026-10-05T09:00:00");
  spacing(false, () => {
    assert.equal(monthDay("2026-10-05", now), "10月5日");
    assert.equal(monthDay("2026-01-01", now), "1月1日");
    assert.equal(monthDay("2019-02-19", now), "2019年2月19日");
    assert.equal(monthDay("2025-12-31", now), "2025年12月31日");
  });
});

test("the year turns at Beijing midnight, whatever the clock it is read on", () => {
  // 23:30 on 31 December in Beijing is 15:30 UTC: still 2026 there.
  const lastHalfHour = beijing("2026-12-31T23:30:00");
  // 00:30 on 1 January in Beijing is still 31 December in UTC.
  const firstHalfHour = beijing("2027-01-01T00:30:00");
  assert.equal(new Date(firstHalfHour).getUTCFullYear(), 2026);
  spacing(false, () => {
    assert.equal(monthDay("2026-12-31", lastHalfHour), "12月31日");
    assert.equal(monthDay("2027-01-01", lastHalfHour), "2027年1月1日");
    assert.equal(monthDay("2026-12-31", firstHalfHour), "2026年12月31日");
    assert.equal(monthDay("2027-01-01", firstHalfHour), "1月1日");
  });
});

test("a site that spaces its dates puts one space between digits and characters, none inside a number", () => {
  const now = beijing("2026-10-05T09:00:00");
  spacing(true, () => {
    assert.equal(monthDay("2026-10-05", now), "10 月 5 日");
    assert.equal(monthDay("2026-12-31", now), "12 月 31 日");
    assert.equal(monthDay("2019-02-19", now), "2019 年 2 月 19 日");
  });
  assert.equal(weekdayShort("2026-10-03"), "周六");
});

test("the charts' day and time keep one space between them", () => {
  spacing(true, () => {
    const [day, time, ...rest] = monthDayTime("2026-10-04T02:51:00.000Z").split(" ");
    assert.deepEqual([day, time, rest], ["10月4日", "10:51", []]);
  });
});
