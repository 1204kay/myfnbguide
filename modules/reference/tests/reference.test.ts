// Failure cases: an example shows arithmetic the program did not do; a number the original never wrote, a
// spoken word or a label heading reaches a reader; a story with problems is shown without a second try, or
// shown after failing it; thin material becomes a story; a withdrawn item stays in the reference pages; a
// situation with one case is listed.
import { pointModels, stub, tag } from "../../../tests/setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { publishArticle } from "@aihot/backend/publication/publish";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { buildApp } from "../../../apps/api/src/app.ts";
import reference from "../server.ts";
import { computeExample, ExampleInputSchema } from "../backend/examples.ts";
import { checkStory, kanjiNumber, sourceNumbers, unfoundNumbers } from "../backend/checks.ts";
import { articlesToWrite, writeCase } from "../backend/write.ts";
import type { CaseStory } from "../types.ts";

const example = (input: unknown, caption = "说明") => computeExample(ExampleInputSchema.parse(input), caption);

test("examples are computed by the program from the writer's inputs", () => {
  const breakeven = example({ kind: "breakeven", price: 30, cost: 12, fixed: 18000 });
  assert.equal(breakeven.equation, "18,000 元 ÷ 每份 18 元 = 1,000 份");
  assert.equal(breakeven.result, "一个月至少要卖 1,000 份，平均每天约 34 份");
  assert.equal(example({ kind: "percent-over", sales: 39000, target: 40, actual: 45 }).result, "一个月营业额 39,000 元，占到 45%，就比 40% 多花 1,950 元");
  assert.equal(example({ kind: "multiply", a: { label: "每份多放的肉", value: 20, unit: "克" }, b: { label: "一个月", value: 1300, unit: "份" }, resultLabel: "一个月多用", resultUnit: "公斤" }).equation,
    "每份多放的肉 20 克 × 1,300 份 = 26 公斤");
  const list = example({ kind: "list-total", per: "月", items: [{ label: "刊登费", value: 800 }, { label: "推广费", value: 600 }, { label: "点餐系统", value: 450 }, { label: "收银月费", value: 300 }, { label: "旧网站", value: 150, flag: true }, { label: "音乐", value: 120 }, { label: "记账软件", value: 90, flag: true }] });
  assert.equal(list.result, "每月 2,510 元，一年 30,120 元；标出的几项一年 2,880 元");
  const left = example({ kind: "remainder", price: 30, deductions: [{ label: "平台抽成", percent: 25 }, { label: "食材", value: 12 }] });
  assert.equal(left.result, "一份卖 30 元，扣掉平台抽成、食材，剩 10.5 元");
  assert.throws(() => example({ kind: "breakeven", price: 10, cost: 12, fixed: 1000 }), /price must be above/);
  assert.throws(() => example({ kind: "remainder", price: 30, deductions: [{ label: "抽成", value: 5, percent: 20 }] }), /value or a percent/);
});

test("numbers are looked up in the original in the forms it may write them", () => {
  assert.equal(kanjiNumber("二十六"), 26);
  assert.equal(kanjiNumber("三千五百"), 3500);
  assert.equal(kanjiNumber("一万二千"), 12000);
  const source = sourceNumbers("The bill grew from $865 to $1,503 a week; twenty-six years; 1.2 million guests; 開業二十六年; 1.503 euro");
  assert.deepEqual(unfoundNumbers("每周从 865 涨到 1,503 美元，开店 26 年，120 万客人", source), []);
  assert.deepEqual(unfoundNumbers("一年多付 33,159 美元，开了 3 家店", source), ["33,159"], "a derived number is not in the original; small counts are words");
  assert.deepEqual(unfoundNumbers("1503 欧元", source), []);
});

const story = (over: Partial<CaseStory> = {}): CaseStory => ({
  title: "布草租金四年涨了 74%", lead: "每周都有一张布草账单，自动付掉，没有人细看。", who: "美国一家餐馆（文章没有写店名）。",
  parts: [
    { heading: "账单从每周 865 美元涨到 1,503 美元", blocks: [{ type: "text", text: "店里没有人批准过一次大涨价。" }] },
    { heading: "假设你的餐饮店也这样做", blocks: [example({ kind: "margin", price: 30, cost: 12 }, "一份卖 30 元，食材 12 元。")] },
  ],
  open: "原文没有说这笔钱最后有没有追回。",
  shop: { name: null, country: "美国", city: null, kind: "餐馆", size: null, speaker: "adviser" },
  placements: [{ situation: "busy-no-profit", group: "fixed-costs-creep", card: "顾问把第一张和最新一张账单逐行对比，查出了多付的钱。" }],
  ...over,
});
const SOURCE = "A restaurant's linen bill grew 74% from $865 to $1,503 per week over about four years.";

test("a story the checks pass; each problem is named for the writer", () => {
  assert.deepEqual(checkStory(story(), SOURCE), []);
  const bad = checkStory(story({
    who: "顾问讲，一年多付 33,159 美元，全国的餐馆都这样。",
    parts: [{ heading: "结果", blocks: [{ type: "text", text: "你应该每月对账。" }] }, story().parts[1]!],
    placements: [{ situation: "nowhere", group: null, card: "说明" }, { situation: "busy-no-profit", group: "no-such-group", card: "说明" }],
  }), SOURCE);
  for (const expected of [/33,159/, /“讲”/, /“全国”/, /“你应该”/, /分格标签/, /nowhere 不在清单/, /没有 no-such-group/]) {
    assert.ok(bad.some((p) => expected.test(p)), `${expected}: ${bad.join(" / ")}`);
  }
  const caption = checkStory(story({ parts: [story().parts[0]!, { heading: "假设你的餐饮店", blocks: [example({ kind: "margin", price: 30, cost: 12 }, "毛利是 18 元，占 60%，所以一年 6,570 元。")] }] }), SOURCE);
  assert.ok(caption.some((p) => /6,570/.test(p)) && !caption.some((p) => /“18”|\b18\b.*找不到/.test(p)), caption.join(" / "));
});

// The model: a story with a stray number and a spoken word first, fixed when told; thin material; and one
// that stays wrong.
const T = tag();
const answers: Record<string, unknown[]> = {
  FIRST: [
    { material: "story", ...story({ who: "顾问讲，一年多付 33,159 美元。" }), parts: [{ heading: "账单从每周 865 美元涨到 1,503 美元", blocks: [{ type: "text", text: "店里没有人批准过一次大涨价。" }] }, { heading: "假设你的餐饮店也这样做", blocks: [{ type: "example", example: { kind: "margin", price: 30, cost: 12 }, caption: "一份卖 30 元。" }] }] },
    { material: "story", ...story(), parts: [{ heading: "账单从每周 865 美元涨到 1,503 美元", blocks: [{ type: "compare", unit: "美元", per: "周", items: [{ label: "最早", value: 865 }, { label: "约四年后", value: 1503 }], caption: "顾问审过的账单。" }] }, { heading: "他把账单逐行对比", blocks: [{ type: "flow", steps: ["收齐合同和账单", "第一张和最近一张逐行对比"] }] }] },
  ],
  SECOND: [{ material: "story", ...story({ title: "另一家店的账", placements: [{ situation: "busy-no-profit", group: "food-over-recipe", card: "盘点出来的食材钱和配方算的放在一起比。" }] }), parts: story().parts.map((p) => ({ heading: p.heading, blocks: [{ type: "text", text: "店里没有人批准过一次大涨价。" }] })) }],
  THIN: [{ material: "thin", reason: "只有节目的题目" }],
  WRONG: [{ material: "story", ...story({ who: "一年多付 99,999 美元。" }), parts: story().parts.map((p) => ({ heading: p.heading, blocks: [{ type: "text", text: "多了 88,888 美元。" }] })) }],
};
const calls: string[] = [];
const model = await stub((_hit, req) => {
  const body = JSON.parse(req.body) as { messages: Array<{ content: string }> };
  const user = body.messages.at(-1)!.content;
  const marker = Object.keys(answers).find((m) => user.includes(`${m}-${T}`))!;
  calls.push(marker);
  const list = answers[marker]!;
  const out = user.includes("上一次的输出有以下问题") ? list.at(-1) : list[0];
  return { id: `stub-${calls.length}`, model: "stub", choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
});
pointModels(model.url, ["deepseek-flash"]);
process.env.REFERENCE_CASE_MODEL = "deepseek-flash";
installModules([reference]);
const app = await buildApp();
const SRC = `reference-${T}`;
const ids: Record<string, string> = {};

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, tags) VALUES (${SRC}, 'Total Food Service（美国 · 餐饮媒体）', 'rss', 'T2', 'editorial', ${["美国", "媒体"]})`;
  for (const marker of Object.keys(answers)) {
    const { articleId } = await upsertMaterial({ sourceId: SRC, url: `https://example.com/${marker}-${T}`, title: `${marker}-${T}`, bodyText: `${marker}-${T} ${SOURCE}`, bodyStatus: "ok", via: "fetch", publishedAt: new Date() });
    await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected) VALUES (${articleId}, 1, 'rule', 'pass', 'tip', ${marker}, '摘要', 60, true)`;
    await publishArticle(articleId, { releasedAt: new Date(Date.now() - 60_000) });
    ids[marker] = articleId;
  }
});
after(async () => { installModules([]); await app.close(); await model.close(); await stopBoss(); await closeDb(); });

test("cases are written for selected items, once more when the checks find problems, and held when they still fail", async () => {
  assert.deepEqual(new Set(await articlesToWrite(50)), new Set(Object.values(ids)));
  assert.deepEqual(await writeCase(ids.FIRST!), { status: "story", problems: [] });
  assert.deepEqual(calls.filter((c) => c === "FIRST").length, 2, "the problems were sent back once");
  assert.equal((await writeCase(ids.SECOND!))!.status, "story");
  assert.equal((await writeCase(ids.THIN!))!.status, "thin");
  const wrong = await writeCase(ids.WRONG!);
  assert.equal(wrong!.status, "held");
  assert.ok(wrong!.problems.some((p) => /99,999|88,888/.test(p)));
  assert.deepEqual(await articlesToWrite(50), [], "every selected item has its case");
  const [stored] = await sql<{ story: CaseStory; situations: string[]; receipt_ids: string[] }[]>`SELECT story, situations, receipt_ids FROM reference_cases WHERE article_id = ${ids.FIRST!}`;
  assert.deepEqual(stored!.situations, ["busy-no-profit"]);
  assert.equal(stored!.receipt_ids.length, 2);
  const compare = stored!.story.parts[0]!.blocks[0]!;
  assert.ok(compare.type === "compare" && compare.change?.amount === 638 && compare.change.yearly === 638 * 52, "the change is computed");
});

test("the pages show public cases only, and a situation once two cases are in it", async () => {
  const home = JSON.parse((await app.inject("/api/reference")).body);
  const cost = home.categories.find((c: { key: string }) => c.key === "cost");
  assert.deepEqual(cost.situations.map((s: { slug: string; cases: number }) => [s.slug, s.cases]), [["busy-no-profit", 2]]);
  const page = JSON.parse((await app.inject("/api/reference/situations/busy-no-profit")).body);
  assert.deepEqual(page.groups.filter((g: { cases: unknown[] }) => g.cases.length).map((g: { key: string; cases: Array<{ src: string }> }) => [g.key, g.cases[0]!.src.split(" · ").slice(0, 2).join(" · ")]),
    [["food-over-recipe", "美国 · Total Food Service"], ["fixed-costs-creep", "美国 · Total Food Service"]]);
  const one = JSON.parse((await app.inject(`/api/reference/cases/${ids.FIRST}`)).body);
  assert.deepEqual([one.source.name, one.source.language, one.situations[0].group], ["Total Food Service", "英文", "固定费用悄悄上涨"]);
  for (const hidden of [ids.THIN, ids.WRONG]) assert.equal((await app.inject(`/api/reference/cases/${hidden}`)).statusCode, 404);
  assert.equal((await app.inject("/api/reference/situations/no-such-situation")).statusCode, 404);
  await sql`UPDATE publications SET visibility = 'withdrawn' WHERE article_id = ${ids.SECOND!}`;
  assert.equal((await app.inject(`/api/reference/cases/${ids.SECOND}`)).statusCode, 404);
  const after = JSON.parse((await app.inject("/api/reference")).body);
  assert.equal(after.categories.find((c: { key: string }) => c.key === "cost").situations.length, 0, "one case left is not a page");
});
