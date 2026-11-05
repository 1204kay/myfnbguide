// The daily's entries in full picked by the model (backend/pick.ts, through composeDaily's dailyPick socket): failure
// cases are an entry of the two days before left out of the pool, the model's order lost, a number it made up kept,
// a flash repeating a picked entry, a broken answer that is not asked again or that leaves the daily unwritten, and
// a pick of nothing usable written as an empty issue. Its entries that are not selected get the points the engine writes only for the
// selection (backend/points.ts): one that has none is written once and shown, one already written or selected is left alone, and a
// daily entry still without points three hours after the edition is an alert.
import { editionAt, pointModels, stub, tag } from "../../../tests/setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { publishArticle } from "@aihot/backend/publication/publish";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { composeDaily } from "@aihot/backend/reports/compose";
import { addDays } from "@aihot/contracts/time";
import dailypick from "../server.ts";
import { pointsFindings, writeWaiting } from "../backend/points.ts";
import { beijingAt } from "@aihot/contracts/time";
import { ITEM_TYPES } from "@aihot/industry/taxonomy";

const T = tag();
// Days no other test uses.
const DAY = "2012-03-12";
const BROKEN = "2012-04-12";
const NONE = "2012-05-12";
// After the first daily picked from the whole pool (points.ts POINTS_FROM).
const POINTS = "2031-03-12";
const SOURCES = ["甲报", "乙报", "丙报", "丁报", "戊报"].map((name, i) => ({ id: `dailypick-${T}-${i}`, name }));
const asked: string[] = [];
const answer = (content: string) => ({ id: "stub", model: "stub", choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } });
const model = await stub((_hit, req) => {
  const user = (JSON.parse(req.body) as { messages: Array<{ content: string }> }).messages.at(-1)!.content;
  asked.push(user);
  if (user.includes("补要点")) return answer(JSON.stringify({ itemType: ITEM_TYPES[0], authorRole: "principal", tags: [], editorialJudgment: "原文第一条做法\n原文第二条做法，涨了 3 成", titleZh: "模型另写的标题", summaryZh: "模型另写的导读。" }));
  if (user.includes("坏稿")) return answer("{\"picks\": [");
  if (user.includes("空挑")) return answer(JSON.stringify({ picks: [{ n: 99, why: "" }] }));
  const n = new Map([...user.matchAll(/^(\d+)\. 【[^】]+】(\S+)/gmu)].map((m) => [m[2]!, Number(m[1])]));
  return answer(JSON.stringify({ picks: [{ n: n.get("今丁"), why: "" }, { n: n.get("前天甲"), why: "" }, { n: 99, why: "" }] }));
});
pointModels(model.url, ["deepseek-flash"]);
process.env.DAILY_PICK_MODEL = "deepseek-flash";
process.env.UNDERSTAND_MODEL = "deepseek-flash";
installModules([dailypick]);

/** A report of `source`, in the window of the daily of `date`: selected, unless its score is below the bar. */
async function report(title: string, source: number, date: string, score: number, selected = true) {
  const at = editionAt("daily", date, -3600);
  const { articleId } = await upsertMaterial({ sourceId: SOURCES[source]!.id, url: `https://example.com/${T}/${encodeURIComponent(title)}`, title, bodyText: `原文：${title}`, bodyStatus: "ok", via: "fetch", publishedAt: at, discoveredAt: at });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, reason_zh, score, selected)
            VALUES (${articleId}, 1, 'rule', 'pass', 'tip', ${title}, ${`${title}的导读`}, ${selected ? `${title}的要点` : null}, ${score}, ${selected})`;
  assert.equal((await publishArticle(articleId, { now: at, releasedAt: at }))?.selected, selected);
  return articleId;
}

before(async () => {
  for (const s of SOURCES) await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at) VALUES (${s.id}, ${s.name}, 'rss', 'T1', 'editorial', '2100-01-01')`;
  await report("前天甲", 0, addDays(DAY, -2), 40);
  await report("昨天乙", 1, addDays(DAY, -1), 40);
  await report("今丙", 2, DAY, 90);
  await report("今丁", 3, DAY, 30);
  await report("今戊", 4, DAY, 60);
  await report("坏稿一", 0, BROKEN, 90);
  await report("坏稿二", 1, BROKEN, 50);
  await report("空挑一", 2, NONE, 90);
  await report("空挑二", 3, NONE, 50);
});
after(async () => {
  installModules([]); await model.close(); await stopBoss(); await closeDb();
});

type Daily = { model: string | null; content: { lead: { title: string }; sections: Array<{ items: Array<{ title: string }> }>; flashes: Array<{ title: string }> } };
const daily = async (key: string) => (await sql<Daily[]>`SELECT model, content FROM reports WHERE kind = 'daily' AND key = ${key}`)[0]!;
const titles = (d: Daily) => ({ main: d.content.sections.flatMap((s) => s.items.map((i) => i.title)), flashes: d.content.flashes.map((f) => f.title) });

test("the entries in full are the model's pick, in its order, from the day and the two before it; the day's rest are flashes", async () => {
  await composeDaily(DAY);
  assert.equal(asked.length, 1);
  for (const t of ["前天甲", "昨天乙", "今丙", "今丁", "今戊"]) assert.match(asked[0]!, new RegExp(`】${t}\\n`), `${t} is offered`);
  const d = await daily(DAY);
  assert.deepEqual(titles(d), { main: ["今丁", "前天甲"], flashes: ["今丙", "今戊"] }, "the number it made up is dropped; flashes stay the day's own, most important first");
  assert.equal(d.content.lead.title, "今丁");
  assert.equal(d.model, "deepseek-flash");
});

test("a broken answer is asked again, and after the last try the daily is arranged by rule", async () => {
  const before = asked.length;
  await composeDaily(BROKEN);
  assert.equal(asked.length - before, 3);
  assert.deepEqual(titles(await daily(BROKEN)).main, ["坏稿一", "坏稿二"]);
  assert.equal((await daily(BROKEN)).model, null);
});

test("a pick naming none of what it was given leaves the daily to the rule", async () => {
  await composeDaily(NONE);
  assert.deepEqual(titles(await daily(NONE)).main, ["空挑一", "空挑二"]);
  assert.equal((await daily(NONE)).model, null);
});

test("an entry in full that is not selected gets its points once, shown on its page; a daily without them past three hours is an alert", async () => {
  const chosen = await report("补要点甲", 0, POINTS, 20, false);
  const picked = await report("入选乙", 1, POINTS, 90);
  const flash = await report("补要点丙", 2, POINTS, 20, false);
  // An editor's points written against the original (11-03): shown once republished, never rewritten by the model.
  const edited = await report("补要点丁", 3, POINTS, 20, false);
  await sql`INSERT INTO editorial_overrides (article_id, fields, reason, version, updated_by) VALUES (${edited}, ${sql.json({ reason: "编辑对着原文写的要点" } as never)}, '核对', 1, 'editor')`;
  const entry = (itemId: string) => ({ itemId, title: itemId });
  const end = beijingAt(POINTS, "08:00");
  await sql`INSERT INTO reports (kind, key, window_start, window_end, content, generated_at)
            VALUES ('daily', ${POINTS}, ${new Date(end.getTime() - 86400000)}, ${end},
                    ${sql.json({ sections: [{ label: "店家经验", items: [entry(chosen), entry(picked), entry(edited)] }], flashes: [entry(flash)] } as never)}, ${end})`;
  const later = end.getTime() + 4 * 3600_000;
  const before = await pointsFindings(later);
  assert.deepEqual(before.map((f) => [f.key, f.level]), [["dailypick.points", "today"]]);
  assert.match(before[0]!.detail!, new RegExp(`${chosen}.*${edited}|${edited}.*${chosen}`));
  assert.doesNotMatch(before[0]!.detail!, new RegExp(`${picked}|${flash}`), "a selected entry has its points; a flash is not an entry in full");
  assert.deepEqual(await pointsFindings(end.getTime() + 3600_000), [], "within three hours it is still being written");

  const calls = asked.length;
  assert.deepEqual(await writeWaiting(40, POINTS), { written: 1, held: 0, none: 0, failed: 0, shown: 1 });
  assert.equal(asked.length - calls, 1, "one understanding call for the one entry");
  const rows = await sql<{ article_id: string; title: string; summary: string; reason: string | null }[]>`
    SELECT article_id, title, summary, reason FROM publications WHERE article_id IN ${sql([chosen, picked, flash, edited])}`;
  const by = new Map(rows.map((r) => [r.article_id, r]));
  assert.deepEqual(by.get(chosen), { article_id: chosen, title: "补要点甲", summary: "补要点甲的导读", reason: "原文第一条做法\n原文第二条做法，涨了 3 成" }, "only the points are new");
  assert.equal(by.get(picked)!.reason, "入选乙的要点");
  assert.equal(by.get(flash)!.reason, null);
  assert.equal(by.get(edited)!.reason, "编辑对着原文写的要点");
  assert.deepEqual(await pointsFindings(later), []);
  assert.deepEqual(await writeWaiting(40, POINTS), { written: 0, held: 0, none: 0, failed: 0, shown: 0 }, "written once");
  assert.equal(asked.length - calls, 1);
});
