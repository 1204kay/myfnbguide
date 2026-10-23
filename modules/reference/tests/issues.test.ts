// 十一说 on the site (backend/issues.ts): failure cases are a day written twice (paying twice), an issue that misses the
// items listed just before it is written, a daily that does not lead with the day's issue or then drops the item it
// would have led with, a lead that points nowhere, and an issue page that lists originals the issue never names.
import { editionAt, pointModels, stub, tag } from "../../../tests/setup.ts";
import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { after, before, test } from "node:test";
import { config } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { publishArticle } from "@aihot/backend/publication/publish";
import { loadReport } from "@aihot/backend/publication/reports";
import { composeDaily } from "@aihot/backend/reports/compose";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { buildApp } from "../../../apps/api/src/app.ts";
import reference from "../server.ts";
import { issueLead, writeIssue } from "../backend/issues.ts";

const T = tag();
const DAY = "2020-03-10";
const SRC = `issue-${T}`;
const answer = (out: unknown) => ({ id: "stub", model: "stub", choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } });
const users: string[] = [];
const model = await stub((_hit, req) => {
  const body = JSON.parse(req.body) as { messages: Array<{ role: string; content: string }> };
  const user = body.messages.at(-1)!.content;
  users.push(user);
  if (user.startsWith("这一期：")) return answer({ lively: 7, problems: [] });
  return answer({
    title: "店里该不该涨价？", brief: ["甲店涨了价〔1〕。", "乙店没涨〔2〕。", "丙店在等〔3〕。"], preview: "今天说三件事。",
    news: [1, 2, 3].map((n) => ({ head: `第 ${n} 条`, text: `报道${n}说了这件事〔${n}〕。` })),
    deep: "甲店的老板说，涨价前先算了账〔1〕。", close: "几家店都在算同一笔账。",
  });
});
pointModels(model.url, ["deepseek-flash"]);
process.env.REFERENCE_ISSUE_MODEL = "deepseek-flash";
process.env.REFERENCE_ISSUE_CHECK_MODEL = "deepseek-flash";
installModules([reference]);
const app = await buildApp();
const ids: string[] = [];

/** A selected item of the test source, taken in `minutes` before the daily's edition time on DAY. */
async function item(n: number, minutes: number): Promise<string> {
  const at = editionAt("daily", DAY, -minutes * 60);
  const { articleId } = await upsertMaterial({ sourceId: SRC, url: `https://example.com/issue-${T}-${n}`, title: `Item ${n} ${T}`, bodyText: `原文 ${n}`, bodyStatus: "ok", via: "fetch", publishedAt: at, discoveredAt: at });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected)
            VALUES (${articleId}, 1, 'rule', 'pass', 'tip', ${`标题 ${n}`}, ${`摘要 ${n}`}, ${90 - n}, true)`;
  await publishArticle(articleId, { now: at, releasedAt: at });
  return articleId;
}

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, next_fetch_at) VALUES (${SRC}, '餐饮报', 'rss', 'T1', 'editorial', '2100-01-01')`;
  // Five listed before the issue is written at 07:00; the sixth after, so tomorrow's issue has it.
  for (const [n, minutes] of [[1, 120], [2, 150], [3, 180], [4, 200], [5, 240], [6, 30]] as const) ids.push(await item(n, minutes));
});
after(async () => { installModules([]); await app.close(); await model.close(); await stopBoss(); await closeDb(); });

test("the day's issue is written once, from what was listed before it, and the daily leads with it", async () => {
  const written = await writeIssue(DAY, editionAt("daily", DAY, -3600));
  assert.deepEqual(written, { date: DAY, status: "issue", no: 1 });
  const calls = users.length;
  assert.equal(calls, 8, "two drafts, each read for the ear, a check, the listener and the read for omissions: the stub writes the same draft twice, and its second check is the receipt already paid");
  assert.ok(users[0]!.includes("全部 5 条") && !users[0]!.includes("标题 6"), "what was listed after it was written waits for tomorrow's");
  assert.deepEqual(await writeIssue(DAY, editionAt("daily", DAY, -1800)), { date: DAY, status: "issue", no: 1 });
  assert.equal(users.length, calls, "a day written is not written again");

  assert.deepEqual(await issueLead(DAY), { kicker: "十一说 · 第 1 期", title: "店里该不该涨价？", leadParagraph: "甲店涨了价〔1〕。乙店没涨〔2〕。丙店在等〔3〕。", href: "/reference/issues/1" });
  await composeDaily(DAY);
  const daily = await loadReport("daily", DAY);
  assert.deepEqual(daily?.lead, { kicker: "十一说 · 第 1 期", title: "店里该不该涨价？", leadParagraph: "甲店涨了价〔1〕。乙店没涨〔2〕。丙店在等〔3〕。", href: "/reference/issues/1" });
  assert.equal(daily?.leadItemId, null, "the issue leads, not an item");
  assert.equal(daily?.cover, null);
  assert.equal(daily?.highlights[0]?.itemId, ids[0], "the item the rule would have led with stays, first of the highlights");
  assert.ok(daily?.sections.some((s) => s.items.some((i) => i.itemId === ids[0])), "and in its section");

  const page = JSON.parse((await app.inject("/api/reference/issues/1")).body);
  assert.equal(page.issue.title, "店里该不该涨价？");
  assert.equal(page.date, DAY);
  assert.equal(page.count, 5);
  assert.match(page.lines.open, /2020年3月10日，星期二/);
  assert.deepEqual(page.sources.map((s: { n: number; title: string }) => [s.n, s.title]), [[1, "标题 1"], [2, "标题 2"], [3, "标题 3"]], "only the originals it names");
  assert.equal((await app.inject("/api/reference/issues/2")).statusCode, 404);
  assert.equal((await app.inject("/api/reference/issues/x")).statusCode, 404);
});

test("an issue has 听 only once its audio is in place, and the audio is served in byte ranges", async () => {
  const dir = path.join(config.dataDir, "reference", "audio");
  assert.equal(JSON.parse((await app.inject("/api/reference/issues/1")).body).audio, null, "no audio, no 听 button");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "1.mp3"), Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256)));
  assert.equal(JSON.parse((await app.inject("/api/reference/issues/1")).body).audio, null, "an mp3 without its seconds is not shown yet");
  await writeFile(path.join(dir, "1.json"), JSON.stringify({ seconds: 687.4 }));
  assert.deepEqual(JSON.parse((await app.inject("/api/reference/issues/1")).body).audio, { url: "/api/reference/issues/1/audio.mp3", seconds: 687 });

  const whole = await app.inject("/api/reference/issues/1/audio.mp3");
  assert.equal(whole.statusCode, 200);
  assert.equal(whole.headers["accept-ranges"], "bytes");
  assert.equal(whole.rawPayload.length, 1000);
  const part = await app.inject({ url: "/api/reference/issues/1/audio.mp3", headers: { range: "bytes=100-199" } });
  assert.equal(part.statusCode, 206, "Safari plays only what is served in ranges");
  assert.equal(part.headers["content-range"], "bytes 100-199/1000");
  assert.deepEqual([...part.rawPayload.subarray(0, 3)], [100, 101, 102]);
  const tail = await app.inject({ url: "/api/reference/issues/1/audio.mp3", headers: { range: "bytes=-10" } });
  assert.equal(tail.headers["content-range"], "bytes 990-999/1000");
  assert.equal((await app.inject({ url: "/api/reference/issues/1/audio.mp3", headers: { range: "bytes=1000-" } })).statusCode, 416);
  assert.equal((await app.inject("/api/reference/issues/2/audio.mp3")).statusCode, 404);
  await rm(dir, { recursive: true });
});

test("a day without an issue leads by rule", async () => {
  assert.equal(await issueLead("2020-03-11"), null);
});
