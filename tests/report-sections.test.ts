// Where a daily's flashes go (site.ts REPORTS.flashPlacement): each into its own section after the entries
// in full, with no 快讯 at the end, or (the default) all into 快讯. Failure cases: a flash lands in another
// section or before an entry in full; a section with nothing in it appears; the issue still has a 快讯; the
// masthead counts only the entries in full; a weekly compiles the flashes as picks; an issue saved with a 快讯
// loses it; a category correction puts an entry in full behind the flashes of its new section; the Agent
// answer gives a flash's summary; a flash leads once the entries in full before it are withdrawn.
import { editionAt, tag } from "./setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { CATEGORIES } from "@aihot/industry/taxonomy";
import { REPORTS } from "@aihot/site";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { dailyAnswer } from "@aihot/backend/publication/agent";
import { dailyWithNotes, loadReport } from "@aihot/backend/publication/reports";
import { composeDaily } from "@aihot/backend/reports/compose";
import { correctReportClassification } from "@aihot/backend/reports/correct";
import { periodEntries, SECTION_ORDER } from "@aihot/backend/reports/edition";

const T = tag();
const SOURCE = `report-sections-${T}`;
const IN_SECTIONS = REPORTS.flashPlacement === "sections";
/** The first three sections, and a category of each. */
const [SX, SY, SZ] = SECTION_ORDER as [string, string, string];
const [X, Y, Z] = [SX, SY, SZ].map((section) => CATEGORIES.find((c) => c.section === section)!.key) as [string, string, string];

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier) VALUES (${SOURCE}, 'Sections', 'rss', 'T1')`;
});
after(async () => { await stopBoss(); await closeDb(); });

/** A public item of one source in the window of the daily dated `date`; one source fills at most two entries in full. */
async function item(date: string, category: string, score: number) {
  const id = `sections-${tag()}`;
  const at = editionAt("daily", date, -12 * 3600);
  await sql`INSERT INTO articles (id, source_id, identity_key, url, title, discovered_at, timeline_at)
    VALUES (${id}, ${SOURCE}, ${id}, ${`https://example.com/${id}`}, ${id}, ${at}, ${at})`;
  await sql`INSERT INTO publications (article_id, title, summary, category, source_id, channel, url, discovered_at, timeline_at, sort_at, eligible, selected, visible_after, visibility, score)
    VALUES (${id}, ${`标题 ${id}`}, ${`摘要 ${id}`}, ${category}, ${SOURCE}, 'news', ${`https://example.com/${id}`}, ${at}, ${at}, ${at}, true, true, ${at}, 'public', ${score})`;
  return id;
}

async function saved(date: string) {
  const [row] = await sql<{ content: Record<string, any> }[]>`SELECT content FROM reports WHERE kind = 'daily' AND key = ${date}`;
  return row!.content;
}
/** Each section with its entries, and whether each is a flash listed in it. */
const placed = (content: Record<string, any>) => content.sections.map((s: any) => [s.label, s.items.map((i: any) => [i.itemId, i.brief === true])]);

test("a daily's flashes follow the entries in full of their own sections, or stand together at the end", async () => {
  const date = "2024-03-02";
  const a1 = await item(date, X, 95);
  const a2 = await item(date, Y, 94);
  const a3 = await item(date, X, 93);
  const a4 = await item(date, Z, 92);
  const a5 = await item(date, Y, 91);
  await composeDaily(date);
  const content = await saved(date);
  const report = (await loadReport("daily", date))!;
  const shown = report.sections.map((s) => [s.label, s.items.map((c) => [c.itemId, c.brief === true])]);
  if (IN_SECTIONS) {
    const expected = [[SX, [[a1, false], [a3, true]]], [SY, [[a2, false], [a5, true]]], [SZ, [[a4, true]]]];
    assert.deepEqual(placed(content), expected);
    assert.deepEqual(content.flashes, []);
    assert.equal(content.metrics.totalEvents, 5, "the masthead counts every entry the sections carry");
    assert.deepEqual(shown, expected, "the page tells a flash from an entry in full");
    assert.deepEqual(report.flashes, []);
  } else {
    assert.deepEqual(placed(content), [[SX, [[a1, false]]], [SY, [[a2, false]]]]);
    assert.deepEqual(content.flashes.map((f: any) => f.itemId), [a3, a4, a5]);
    assert.equal(content.metrics.totalEvents, 2);
    assert.deepEqual(shown, placed(content));
    assert.deepEqual(report.flashes.map((c) => c.itemId), [a3, a4, a5]);
  }
  assert.equal(content.leadItemId, a1);
  // A weekly compiles a daily's entries in full, wherever its flashes stand.
  assert.deepEqual(new Set((await periodEntries(date, date)).entries.map((e) => e.itemId)), new Set([a1, a2]));
  // The Agent answer gives a flash by its title and source, as the page does.
  const { body, notes } = (await dailyWithNotes(date))!;
  const answer = dailyAnswer(body.report, "http", notes);
  assert.ok(answer.includes(`摘要 ${a2}`) && answer.includes(`标题 ${a3}`), answer);
  assert.ok(!answer.includes(`摘要 ${a3}`), answer);
});

test("a daily whose entries in full are withdrawn leads with none of the flashes in its sections", { skip: !IN_SECTIONS && "the site keeps its flashes at the end" }, async () => {
  const date = "2024-03-08";
  const a1 = await item(date, X, 95);
  const a2 = await item(date, Y, 94);
  const a3 = await item(date, X, 93);
  await composeDaily(date);
  assert.deepEqual(placed(await saved(date)), [[SX, [[a1, false], [a3, true]]], [SY, [[a2, false]]]]);
  await sql`UPDATE publications SET visibility = 'withdrawn' WHERE article_id IN ${sql([a1, a2])}`;
  const report = (await loadReport("daily", date))!;
  assert.equal(report.leadItemId, null);
  assert.equal(report.lead, null);
});

test("a category correction puts an entry in full before the flashes of its new section", { skip: !IN_SECTIONS && "the site keeps its flashes at the end" }, async () => {
  const date = "2024-03-04";
  const a1 = await item(date, X, 95);
  const a2 = await item(date, Y, 94);
  const a3 = await item(date, Z, 93);
  await composeDaily(date);
  assert.deepEqual(placed(await saved(date)), [[SX, [[a1, false]]], [SY, [[a2, false]]], [SZ, [[a3, true]]]]);
  await sql`UPDATE publications SET category = ${Z} WHERE article_id = ${a1}`;
  assert.equal(await sql.begin((tx) => correctReportClassification(tx, a1, "test")), true);
  assert.deepEqual(placed(await saved(date)), [[SY, [[a2, false]]], [SZ, [[a1, false], [a3, true]]]]);
});

test("an issue saved with its flashes at the end keeps them there, and a weekly compiles none of them", async () => {
  const date = "2024-03-06";
  const a = await item(date, X, 90);
  const b = await item(date, Y, 80);
  const entry = (id: string) => ({
    itemId: id, factId: null, storyPublicId: null, title: `标题 ${id}`, summary: `摘要 ${id}`, sourceName: "Sections", sourceUrl: `https://example.com/${id}`,
    sourceId: SOURCE, firstParty: true, role: "官方", score: 90, publishedAt: editionAt("daily", date, -12 * 3600).toISOString(), sources: 1,
  });
  const content = { date, lead: { title: `标题 ${a}`, leadParagraph: `摘要 ${a}` }, leadItemId: a, highlights: [], sections: [{ label: SX, items: [entry(a)] }], flashes: [entry(b)], metrics: { totalEvents: 1, sourcesCount: 1 } };
  await sql`INSERT INTO reports (kind, key, window_start, window_end, content, generated_at, origin)
    VALUES ('daily', ${date}, now(), now(), ${sql.json(content as never)}, now(), 'imported')`;
  const report = (await loadReport("daily", date))!;
  assert.deepEqual(report.sections.map((s) => [s.label, s.items.map((c) => c.itemId)]), [[SX, [a]]]);
  assert.deepEqual(report.flashes.map((c) => c.itemId), [b]);
  assert.deepEqual((await periodEntries(date, date)).entries.map((e) => e.itemId), [a]);
});
