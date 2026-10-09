import { editionAt, tag } from "./setup.ts";
// A daily of the whole pool (site.ts REPORTS.dailyScope = "pool"): a report listed in the pool but not selected is
// carried by its day's daily, a report taken out of the pool is not, and the weeklies' and monthlies' count of selected
// reports (candidates) still counts the selected ones only.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { publishArticle } from "@aihot/backend/publication/publish";
import { arrangeDaily, candidates, dailyEdition } from "@aihot/backend/reports/edition";
import { REPORTS } from "@aihot/site";

const T = tag();
const SOURCE = `test-report-pool-${T}`;

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at)
            VALUES (${SOURCE}, 'Report pool test', 'rss', 'T2', 'editorial', '2100-01-01')`;
});
after(async () => {
  await stopBoss();
  await closeDb();
});

async function published(label: string, at: Date, selected: boolean, score = 40): Promise<string> {
  const { articleId } = await upsertMaterial({
    sourceId: SOURCE, url: `https://example.com/report-pool-${T}-${label}`, title: `Report pool ${label}`,
    bodyText: `Report pool ${label} body`, bodyStatus: "ok", publishedAt: at, discoveredAt: at, via: "fetch",
  });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected)
            VALUES (${articleId}, 1, 'rule', 'pass', 'industry', ${`标题 ${label}`}, ${`摘要 ${label}`}, ${score}, ${selected})`;
  await publishArticle(articleId, { now: at, releasedAt: at });
  return articleId;
}

test("a daily of the whole pool carries the reports listed in the pool, selected or not", { skip: REPORTS.dailyScope !== "pool" }, async () => {
  const at = editionAt("daily", "2020-03-02", -120);
  const unselected = await published("unselected", at, false);
  const selected = await published("selected", at, true);
  const [row] = await sql<{ eligible: boolean; selected: boolean }[]>`SELECT eligible, selected FROM publications WHERE article_id = ${unselected}`;
  assert.deepEqual({ ...row }, { eligible: true, selected: false });
  const [start, end] = [editionAt("daily", "2020-03-01"), editionAt("daily", "2020-03-02")];
  const carried = async () => new Set((await dailyEdition("2020-03-02", start, end)).entries.map((e) => e.entry.itemId));
  assert.deepEqual([(await carried()).has(unselected), (await carried()).has(selected)], [true, true]);
  assert.deepEqual((await candidates(start, end)).map((c) => c.itemId), [selected], "candidates count the selected only");

  await sql`UPDATE publications SET eligible = false WHERE article_id = ${unselected}`;
  assert.equal((await carried()).has(unselected), false);
});

test("a daily of the whole pool gives its entries in full to selected events, the rest of the pool are flashes", { skip: REPORTS.dailyScope !== "pool" }, async () => {
  const at = editionAt("daily", "2020-04-02", -120);
  // Scored higher, but not selected: a flash; the selected one takes the full entry.
  const loud = await published("loud", at, false, 90);
  const chosen = await published("chosen", at, true, 50);
  const { entries } = await dailyEdition("2020-04-02", editionAt("daily", "2020-04-01"), editionAt("daily", "2020-04-02"));
  const { main, flashes } = arrangeDaily(entries);
  assert.deepEqual(main.map((e) => e.entry.itemId), [chosen]);
  assert.deepEqual(flashes.map((e) => e.entry.itemId), [loud]);
});
