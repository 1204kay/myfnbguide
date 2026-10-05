import { editionAt, tag } from "./setup.ts";
// A daily of the whole pool (site.ts REPORTS.dailyScope = "pool"): a report listed in the pool but not selected is a
// candidate of its period, and a report taken out of the pool is not.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { publishArticle } from "@aihot/backend/publication/publish";
import { candidates } from "@aihot/backend/reports/edition";
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

async function published(label: string, at: Date, selected: boolean): Promise<string> {
  const { articleId } = await upsertMaterial({
    sourceId: SOURCE, url: `https://example.com/report-pool-${T}-${label}`, title: `Report pool ${label}`,
    bodyText: `Report pool ${label} body`, bodyStatus: "ok", publishedAt: at, discoveredAt: at, via: "fetch",
  });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected)
            VALUES (${articleId}, 1, 'rule', 'pass', 'industry', ${`标题 ${label}`}, ${`摘要 ${label}`}, 40, ${selected})`;
  await publishArticle(articleId, { now: at, releasedAt: at });
  return articleId;
}

test("a daily of the whole pool carries the reports listed in the pool, selected or not", { skip: REPORTS.dailyScope !== "pool" }, async () => {
  const at = editionAt("daily", "2020-03-02", -120);
  const unselected = await published("unselected", at, false);
  const selected = await published("selected", at, true);
  const [row] = await sql<{ eligible: boolean; selected: boolean }[]>`SELECT eligible, selected FROM publications WHERE article_id = ${unselected}`;
  assert.deepEqual({ ...row }, { eligible: true, selected: false });
  const ids = async () => new Set((await candidates(editionAt("daily", "2020-03-01"), editionAt("daily", "2020-03-02"))).map((c) => c.itemId));
  assert.deepEqual([(await ids()).has(unselected), (await ids()).has(selected)], [true, true]);

  await sql`UPDATE publications SET eligible = false WHERE article_id = ${unselected}`;
  assert.equal((await ids()).has(unselected), false);
});
