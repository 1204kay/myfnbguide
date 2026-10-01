import "./setup.ts";
// Catch-up fills missed issues; a missed period with nothing selected stays unwritten, so a new site
// does not open with a week of blank dailies, an empty weekly and an empty monthly.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { catchUpReports } from "@aihot/backend/reports/compose";

after(async () => {
  await stopBoss();
  await closeDb();
});

test("catch-up writes no issue for a missed period without selected items", async () => {
  // Wednesday 2099-06-17 12:00 Beijing: a week of dailies, the last week and the last month are all
  // due, and no test puts anything in that range.
  const r = await catchUpReports(new Date("2099-06-17T04:00:00Z"));
  assert.deepEqual(r.generated, []);
  const [row] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM reports WHERE key >= '2099'`;
  assert.equal(row!.n, 0);
});
