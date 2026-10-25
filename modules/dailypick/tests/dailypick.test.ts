// The daily's entries in full picked by the model (backend/pick.ts, through composeDaily's dailyPick socket): failure
// cases are an entry of the two days before left out of the pool, the model's order lost, a number it made up kept,
// a flash repeating a picked entry, and a broken answer that is not asked again or that leaves the daily unwritten.
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

const T = tag();
// Days no other test uses.
const DAY = "2012-03-12";
const BROKEN = "2012-04-12";
const SOURCES = ["甲报", "乙报", "丙报", "丁报", "戊报"].map((name, i) => ({ id: `dailypick-${T}-${i}`, name }));
const asked: string[] = [];
const answer = (content: string) => ({ id: "stub", model: "stub", choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } });
const model = await stub((_hit, req) => {
  const user = (JSON.parse(req.body) as { messages: Array<{ content: string }> }).messages.at(-1)!.content;
  asked.push(user);
  if (user.includes("坏稿")) return answer("{\"picks\": [");
  const n = new Map([...user.matchAll(/^(\d+)\. 【[^】]+】(\S+)/gmu)].map((m) => [m[2]!, Number(m[1])]));
  return answer(JSON.stringify({ picks: [{ n: n.get("今丁"), why: "" }, { n: n.get("前天甲"), why: "" }, { n: 99, why: "" }] }));
});
pointModels(model.url, ["deepseek-flash"]);
process.env.DAILY_PICK_MODEL = "deepseek-flash";
installModules([dailypick]);

/** A selected report of `source`, in the window of the daily of `date`. */
async function report(title: string, source: number, date: string, score: number) {
  const at = editionAt("daily", date, -3600);
  const { articleId } = await upsertMaterial({ sourceId: SOURCES[source]!.id, url: `https://example.com/${T}/${encodeURIComponent(title)}`, title, bodyText: `原文：${title}`, bodyStatus: "ok", via: "fetch", publishedAt: at, discoveredAt: at });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected)
            VALUES (${articleId}, 1, 'rule', 'pass', 'tip', ${title}, ${`${title}的导读`}, ${score}, true)`;
  assert.equal((await publishArticle(articleId, { now: at, releasedAt: at }))?.selected, true);
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
