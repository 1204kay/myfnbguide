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
import { z } from "zod";
import { AGENT_ABILITIES } from "../backend/agent.ts";
import { BATCH_TIMES, batchLane, claudeJson } from "../backend/claude.ts";

const T = tag();
const DAY = "2020-03-10";
const SRC = `issue-${T}`;
const answer = (out: unknown) => ({ id: "stub", model: "stub", choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } });
const users: string[] = [];
/** Makes the 导读 80–160 characters, the length asked, so it is not written again (fitLead). */
const PAD = "，老板说先把房租、人工和食材的账都算清楚再定";
const model = await stub((_hit, req) => {
  const body = JSON.parse(req.body) as { messages: Array<{ role: string; content: string }> };
  const user = body.messages.at(-1)!.content;
  users.push(user);
  if (user.startsWith("这一期：")) return answer({ lively: 7, problems: [] });
  return answer({
    title: "店里该不该涨价？", brief: [`甲店涨了价${PAD}〔1〕。`, `乙店没涨${PAD}〔2〕。`, `丙店在等${PAD}〔3〕。`], preview: "今天说三件事。",
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

  assert.deepEqual(await issueLead(DAY), { kicker: "十一说 · 第 1 期", title: "店里该不该涨价？", leadParagraph: `甲店涨了价${PAD}。乙店没涨${PAD}。丙店在等${PAD}。`, href: "/reference/issues/1" });
  assert.equal(JSON.parse((await app.inject("/api/reference/issues/1")).body).daily, false, "up before its daily: the page does not lead to a daily not there yet");
  await composeDaily(DAY);
  const daily = await loadReport("daily", DAY);
  assert.deepEqual(daily?.lead, { kicker: "十一说 · 第 1 期", title: "店里该不该涨价？", leadParagraph: `甲店涨了价${PAD}。乙店没涨${PAD}。丙店在等${PAD}。`, href: "/reference/issues/1" });
  assert.equal(daily?.leadItemId, null, "the issue leads, not an item");
  assert.equal(daily?.cover, null);
  assert.equal(daily?.highlights[0]?.itemId, ids[0], "the item the rule would have led with stays, first of the highlights");
  assert.ok(daily?.sections.some((s) => s.items.some((i) => i.itemId === ids[0])), "and in its section");

  const page = JSON.parse((await app.inject("/api/reference/issues/1")).body);
  assert.equal(page.issue.title, "店里该不该涨价？");
  assert.equal(page.date, DAY);
  assert.equal(page.count, 5);
  assert.equal(page.daily, true);
  assert.match(page.lines.open, /2020年3月10日，星期二/);
  assert.deepEqual(page.sources.map((s: { n: number; title: string }) => [s.n, s.title]), [[1, "标题 1"], [2, "标题 2"], [3, "标题 3"]], "only the originals it names");
  assert.equal((await app.inject("/api/reference/issues/2")).statusCode, 404);
  assert.equal((await app.inject("/api/reference/issues/x")).statusCode, 404);
  assert.deepEqual(JSON.parse((await app.inject("/api/reference/issues")).body), { issues: [{ no: 1, date: DAY, title: "店里该不该涨价？" }] }, "the list of all issues");

  // Agents read it too (backend/agent.ts): the latest in full with the originals it names, named in the guide and llms.txt.
  const agent = await app.inject("/api/v1/agent/shiyi");
  assert.equal(agent.headers["content-type"], "text/markdown; charset=utf-8");
  assert.match(agent.body, /^# 十一说 · 第 1 期：店里该不该涨价？/);
  assert.ok(agent.body.includes("甲店的老板说，涨价前先算了账〔1〕。") && agent.body.includes(`1. 餐饮报：《标题 1》 https://example.com/issue-${T}-1`), "the issue's words and its originals");
  assert.ok(!agent.body.includes("标题 4"), "only the originals it names");
  assert.ok((await app.inject("/api/v1/agent")).body.includes("/api/v1/agent/shiyi"), "the guide names it");
  assert.ok((await app.inject("/llms.txt")).body.includes("/reference/issues/1"), "llms.txt leads to the latest");
  const shiyi = AGENT_ABILITIES.find((a) => a.path === "/shiyi")!;
  assert.match((await shiyi.mcp.run({ no: 1 })).text, /^# 十一说 · 第 1 期/);
  assert.match((await shiyi.mcp.run({ no: 2 })).text, /没有第 2 期十一说/, "a missing issue is said, not another put in its place");
});

test("an issue has 听 only once its audio is in place, its 文字稿 once its listen script is, its times when they count its lines, and the audio is served in byte ranges", async () => {
  const dir = path.join(config.dataDir, "reference", "audio");
  assert.equal(JSON.parse((await app.inject("/api/reference/issues/1")).body).audio, null, "no audio, no 听 button");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "1.mp3"), Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256)));
  assert.equal(JSON.parse((await app.inject("/api/reference/issues/1")).body).audio, null, "an mp3 without its seconds is not shown yet");
  await writeFile(path.join(dir, "1.json"), JSON.stringify({ seconds: 687.4 }));
  assert.deepEqual(JSON.parse((await app.inject("/api/reference/issues/1")).body).audio, { url: "/api/reference/issues/1/audio.mp3", seconds: 687, transcript: null });
  await writeFile(path.join(dir, "1.txt"), "大家早上好！我是十一。\n\n第一条，牛肉。\n");
  assert.deepEqual(JSON.parse((await app.inject("/api/reference/issues/1")).body).audio.transcript, ["大家早上好！我是十一。", "第一条，牛肉。"], "the listen script, a line a sentence, for 文字稿");
  assert.equal(JSON.parse((await app.inject("/api/reference/issues/1")).body).audio.starts, undefined, "no times: the 文字稿 is shown whole");
  await writeFile(path.join(dir, "1.json"), JSON.stringify({ seconds: 687.4, starts: [0, 3.6] }));
  assert.deepEqual(JSON.parse((await app.inject("/api/reference/issues/1")).body).audio.starts, [0, 3.6], "a time a line: the 文字稿 follows the voice");
  await writeFile(path.join(dir, "1.json"), JSON.stringify({ seconds: 687.4, starts: [0] }));
  assert.equal(JSON.parse((await app.inject("/api/reference/issues/1")).body).audio.starts, undefined, "times that do not count the lines are left out");

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

test("a Claude call goes as a batch; one not back in time is canceled, and that call and the rest of the run go straight", async () => {
  const times = { ...BATCH_TIMES };
  Object.assign(BATCH_TIMES, { wait: 300, poll: 20, cancel: 300 });
  const message = (ok: boolean) => ({ id: "msg_1", content: [{ type: "text", text: JSON.stringify({ ok }) }], stop_reason: "end_turn", usage: { input_tokens: 10, output_tokens: 5 } });
  let ends = true, canceled = false;
  const seen: string[] = [];
  const claude = await stub((_hit, req) => {
    const at = req.url.replace("/v1/messages", "") || "/";
    seen.push(at);
    const batch = { id: "b1", processing_status: (ends || canceled) && at !== "/batches" ? "ended" : "in_progress", results_url: `${claude.url}/v1/messages/batches/b1/results` };
    if (at === "/batches/b1/cancel") canceled = true;
    if (at === "/batches/b1/results") return { custom_id: "r", result: canceled ? { type: "canceled" } : { type: "succeeded", message: message(true) } };
    return at === "/" ? message(false) : batch;
  });
  pointModels(claude.url, ["claude-opus-5-5"]);
  try {
    const lane = batchLane();
    const ask = (n: number) => claudeJson({ model: "claude-opus-5-5", purpose: "reference_issue_check", subject: `batch-${T}`, promptVersion: "t", system: "核对员", user: `稿子 ${n}`, schema: z.object({ ok: z.boolean() }), maxTokens: 8000, timeoutMs: 5000, batch: lane });
    const usage = async (id: number) => (await sql<{ usage: Record<string, unknown> }[]>`SELECT usage FROM receipts WHERE id = ${id}`)[0]!.usage;

    const first = await ask(1);
    assert.equal(first.data.ok, true, "the batch's answer");
    assert.equal((await usage(first.receiptId)).batch, true, "its receipt says so, for the half price");
    assert.ok(!seen.includes("/"), "nothing was sent straight");

    ends = false;
    const second = await ask(2);
    assert.ok(seen.includes("/batches/b1/cancel"), "a batch not back in time is canceled, so it is not answered and billed later");
    assert.equal(second.data.ok, false, "and the call is sent straight");
    assert.equal((await usage(second.receiptId)).batch, undefined);
    assert.equal(lane.off, true);

    const batches = seen.filter((x) => x === "/batches").length;
    assert.equal((await ask(3)).data.ok, false);
    assert.equal(seen.filter((x) => x === "/batches").length, batches, "the rest of the run does not wait on another batch");
  } finally {
    Object.assign(BATCH_TIMES, times);
    await claude.close();
  }
});
