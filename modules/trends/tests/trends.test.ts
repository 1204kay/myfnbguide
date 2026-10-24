// The weekly trends (backend/compose.ts): failure cases are a topic told by fewer than three publishers (two feeds of
// one publisher count once), a sentence naming what its report does not, a sentence the checker still finds wrong
// leaving a topic short, a week filled in after the newest weekly (§15), and a page showing a week with nothing.
import { editionAt, pointModels, stub, tag } from "../../../tests/setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { publishArticle } from "@aihot/backend/publication/publish";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { buildApp } from "../../../apps/api/src/app.ts";
import checker from "@aihot/checker/server";
import trends from "../server.ts";
import { composeWeek, countTopics, lineGrounded, weekToCompose, type PoolItem } from "../backend/compose.ts";
import { publisherOf } from "../backend/publishers.ts";

const T = tag();
// A week no other test uses: the pool is every listed report of the week.
const START = "2011-05-02";
const END = "2011-05-08";
const KEY = "2011-W18";
const answer = (out: unknown) => ({ id: "stub", model: "stub", choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } });
const asked: string[] = [];
/** Pool numbers by title, read off the find call's lines ("[n] 来源 | 标题 | 导读"). */
const numbers = (user: string) => new Map([...user.matchAll(/^\[(\d+)\] [^|]+\| (\S+)/gmu)].map((m) => [m[2]!, Number(m[1])]));
const model = await stub((_hit, req) => {
  const body = JSON.parse(req.body) as { messages: Array<{ role: string; content: string }> };
  const system = body.messages[0]!.content;
  const user = body.messages.at(-1)!.content;
  if (user.includes("中文稿：")) {
    asked.push("check");
    // The sentence on 小店丙 is wrong and cannot be mended; the one on 门店乙 is mended.
    if (user.includes("原题：小店丙")) return answer({ problems: [{ field: "point", point: 1, severity: "serious", why: "原文没这么说", fix: "" }] });
    if (user.includes("原题：门店乙") && !user.includes("缩小了一半")) return answer({ problems: [{ field: "point", point: 1, severity: "misleading", fix: "门店乙把店面缩小了一半。" }] });
    return answer({ problems: [] });
  }
  const n = numbers(user);
  const at = (...titles: string[]) => titles.map((t) => n.get(t)!);
  if (system.includes("把它们摆在一起")) {
    asked.push("write");
    const lines = [...n.keys()].map((t, i) => ({ n: i + 1, text: t === "门店丁" ? "门店丁说 Acme 开了 845 家。" : `${t.replace(/-.*/, "")}说了这件事。` }));
    return answer({ heading: user.includes("门店") ? "店面越开越小" : "小店在涨价", lines });
  }
  asked.push("find");
  return answer({ topics: [
    { name: "店面变小", items: at("门店甲", "门店乙", "门店丙", "门店丁"), why: "" },
    { name: "两家讲的", items: at("双店甲", "双店乙", "双店丙"), why: "" },
    { name: "小店涨价", items: at("小店甲", "小店乙", "小店丙"), why: "" },
  ] });
});
pointModels(model.url, ["deepseek-flash"]);
process.env.TRENDS_MODEL = "deepseek-flash";
process.env.CHECK_MODEL = "deepseek-flash";
// The site's copy check (copyCheck) is this site's checker module; each line goes to it.
installModules([trends, checker]);
const app = await buildApp();

const sources = ["甲报", "乙报", "丙报", "丁报"].map((name, i) => ({ id: `trends-${T}-${i}`, name }));
/** A listed report of `source`, on day `d` of the week. */
async function report(title: string, source: number, d: number) {
  const at = editionAt("daily", `2011-05-0${d}`, -3600);
  const { articleId } = await upsertMaterial({ sourceId: sources[source]!.id, url: `https://example.com/${T}/${encodeURIComponent(title)}`, title, bodyText: `原文：${title}`, bodyStatus: "ok", via: "fetch", publishedAt: at, discoveredAt: at });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected)
            VALUES (${articleId}, 1, 'rule', 'pass', 'tip', ${title}, ${`${title}的导读`}, 50, false)`;
  await publishArticle(articleId, { now: at, releasedAt: at });
}

before(async () => {
  for (const s of sources) await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at) VALUES (${s.id}, ${s.name}, 'rss', 'T1', 'editorial', '2100-01-01')`;
  for (const [i, t] of ["门店甲", "门店乙", "门店丙", "门店丁"].entries()) await report(t, i, 3);
  // Two feeds of 乙报 under one name: two publishers, not three.
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at) VALUES (${`${sources[1]!.id}-b`}, '乙报 · 二台', 'rss', 'T1', 'editorial', '2100-01-01')`;
  sources.push({ id: `${sources[1]!.id}-b`, name: "乙报 · 二台" });
  await report("双店甲", 0, 4); await report("双店乙", 1, 4); await report("双店丙", 4, 4);
  for (const [i, t] of ["小店甲", "小店乙", "小店丙"].entries()) await report(t, i, 5);
});
after(async () => {
  await sql`DELETE FROM trends_issues WHERE key = ANY(${[KEY, "9999-W52"]})`;
  await sql`DELETE FROM reports WHERE kind = 'weekly' AND key = '9999-W52'`;
  installModules([]); await app.close(); await model.close(); await stopBoss(); await closeDb();
});

test("publishers are counted by name, and a topic with fewer than three is left out", () => {
  assert.equal(publisherOf("x", "乙报 · 二台"), "乙报");
  assert.equal(publisherOf("x", "乙报（英文）"), "乙报");
  assert.equal(publisherOf("web-qsrmedia-asia", "Asia's food news"), "QSR Media");
  const pool = ["甲", "乙", "乙"].map((publisher, i) => ({ id: `${i}`, title: "", summary: null, sourceId: "", sourceName: "", publisher })) satisfies PoolItem[];
  assert.deepEqual(countTopics([{ name: "x", items: [1, 2, 3, 9] }], pool), { kept: [], dropped: [{ name: "x", ids: ["0", "1", "2"], why: "只有 2 家来源" }] });
});

test("a sentence names only what its report names, and keeps to its length", () => {
  const item: PoolItem = { id: "1", title: "门店甲开了 845 家", summary: "Acme 的新店", sourceId: "", sourceName: "", publisher: "" };
  assert.ok(lineGrounded("门店甲说 Acme 开了 845 家。", item));
  assert.ok(!lineGrounded("门店甲说 Nova 开了 845 家。", item));
  assert.ok(!lineGrounded("门店甲说开了 900 家。", item));
  assert.ok(!lineGrounded("说".repeat(121), item));
});

test("a week's topics are found, written, checked, kept once, and shown under its weekly", async () => {
  assert.deepEqual(await composeWeek(KEY, START, END), { topics: 1, dropped: 2, pool: 10 });
  assert.deepEqual(asked.filter((a) => a !== "check"), ["find", "write", "write"], "the topic two publishers told is not written");
  const [row] = await sql<{ topics: Array<{ heading: string; lines: Array<{ text: string }> }>; dropped: Array<{ name: string; why: string }> }[]>`SELECT topics, dropped FROM trends_issues WHERE key = ${KEY}`;
  assert.deepEqual(row!.topics.map((t) => [t.heading, t.lines.map((l) => l.text)]), [["店面越开越小", ["门店甲说了这件事。", "门店乙把店面缩小了一半。", "门店丙说了这件事。"]]], "门店丁's sentence names what its report does not; 门店乙's is mended");
  assert.deepEqual(row!.dropped.map((d) => [d.name, d.why]), [["两家讲的", "只有 2 家来源"], ["小店涨价", "核对后只剩 2 家来源"]]);

  const page = JSON.parse((await app.inject(`/api/trends/${KEY}`)).body);
  assert.equal(page.topics[0].items[1].summary, "门店乙把店面缩小了一半。", "our sentence in the summary's place");
  assert.equal(page.topics[0].items[1].title, "门店乙");
  assert.match(page.topics[0].items[1].sourceUrl, /^https:\/\/example\.com\//);
  assert.deepEqual(JSON.parse((await app.inject(`/api/trends/${KEY}/line`)).body), { key: KEY, topics: 1 });
  assert.equal((await app.inject("/api/trends/2011-W19")).statusCode, 404);
  assert.equal((await app.inject("/api/trends/2011-W19/line")).statusCode, 404);
  assert.equal((await app.inject("/api/trends/x")).statusCode, 404);
});

test("a week with too few reports keeps an empty row, asks nothing and shows nothing", async () => {
  const before = asked.length;
  assert.deepEqual(await composeWeek("2011-W30", "2011-07-25", "2011-07-31"), { topics: 0, dropped: 0, pool: 0 });
  assert.equal(asked.length, before);
  assert.equal((await app.inject("/api/trends/2011-W30/line")).statusCode, 404);
  await sql`DELETE FROM trends_issues WHERE key = '2011-W30'`;
});

test("only the newest weekly is composed, once", async () => {
  await sql`INSERT INTO reports (kind, key, window_start, window_end, content, generated_at, origin)
            VALUES ('weekly', '9999-W52', now(), now(), ${sql.json({ periodStart: "9999-12-20", periodEnd: "9999-12-26" })}, now(), 'manual')`;
  assert.deepEqual(await weekToCompose(), { key: "9999-W52", start: "9999-12-20", end: "9999-12-26" });
  await sql`INSERT INTO trends_issues (key, period_start, period_end, topics) VALUES ('9999-W52', '9999-12-20', '9999-12-26', '[]')`;
  assert.equal(await weekToCompose(), null, "a week done is not done again, and earlier weeks are never filled in");
});
