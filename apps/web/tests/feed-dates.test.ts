// Dates as readers see them (lib/format.ts). Failure cases: an archived item from 2019 reads as this year's
// "2月19日"; the year is decided by the server's or reader's own clock instead of Beijing's, so the last half hour of
// a Beijing year (or the first of the next) is dated wrong.
import assert from "node:assert/strict";
import { test } from "node:test";
import { monthDay } from "../app/lib/format.ts";

const beijing = (at: string) => Date.parse(`${at}+08:00`);

test("a day of this Beijing year has no year; another year's carries it", () => {
  const now = beijing("2026-10-05T09:00:00");
  assert.equal(monthDay("2026-10-05", now), "10月5日");
  assert.equal(monthDay("2026-01-01", now), "1月1日");
  assert.equal(monthDay("2019-02-19", now), "2019年2月19日");
  assert.equal(monthDay("2025-12-31", now), "2025年12月31日");
});

test("the year turns at Beijing midnight, whatever the clock it is read on", () => {
  // 23:30 on 31 December in Beijing is 15:30 UTC; 00:30 on 1 January in Beijing is still 31 December in UTC.
  const lastHalfHour = beijing("2026-12-31T23:30:00");
  const firstHalfHour = beijing("2027-01-01T00:30:00");
  assert.equal(new Date(firstHalfHour).getUTCFullYear(), 2026);
  assert.equal(monthDay("2026-12-31", lastHalfHour), "12月31日");
  assert.equal(monthDay("2027-01-01", lastHalfHour), "2027年1月1日");
  assert.equal(monthDay("2026-12-31", firstHalfHour), "2026年12月31日");
  assert.equal(monthDay("2027-01-01", firstHalfHour), "1月1日");
});
