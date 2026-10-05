// Failure cases: an example shows arithmetic the program did not do; a number the original never wrote, a
// spoken word, a label heading, a note to itself or a title that opens with its source reaches a reader; a story
// with problems is shown without a second try, or shown after failing it; thin material becomes a story; text is
// stored without the space between Chinese and digits; one shop's stories miss each other's page for a bracket in
// its name; a withdrawn item stays in the reference pages; a situation with one case is listed; a kind is listed
// with one story or paged without any; a story points to its shop's page when that page would only repeat it; a
// grouping of practices fails on a story left out, placed twice or across groups, or a shop on two lines, instead
// of mending it; a grouping stores one line of two shops or a number no story has, or sends a text back as too
// long without naming where, how long and what to cut; a practice counts articles, not shops, or counts an
// adviser as a shop; one country is written as "1 个国家"; a page narrowed to a kind counts other kinds; a list
// shows one shop's stories as several cards; the ranking of situations counts stories, not shops; the search or
// the item page's block misses a story.
import { pointModels, stub, tag } from "../../../tests/setup.ts";
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { publishArticle } from "@aihot/backend/publication/publish";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { buildApp } from "../../../apps/api/src/app.ts";
import reference, { SAMPLE_PATH } from "../server.ts";
import { computeExample, ExampleInputSchema } from "../backend/examples.ts";
import { checkStory, kanjiNumber, MAX_CHARS, sourceNumbers, unfoundNumbers, untranslated } from "../backend/checks.ts";
import { articlesToWrite, readOutput, shopNameKey, writeCase } from "../backend/write.ts";
import { groupSituation, readGrouping, situationsToGroup, type Member } from "../backend/methods.ts";
import { membersBySituation, rankSituations, sourceKind, tellerOf } from "../backend/read.ts";
import { countText, day, spaced } from "../format.ts";
import type { CaseStory, Count, SituationRow } from "../types.ts";

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
  assert.deepEqual(unfoundNumbers("300 多万人", sourceNumbers("more than 3 million people")), []);
  assert.deepEqual(unfoundNumbers("一年多付 33,159 美元，开了 3 家店", source), ["33,159"], "a derived number is not in the original; small counts are words");
  assert.deepEqual(unfoundNumbers("1503 欧元", source), []);
});

test("what readers read is spaced between Chinese and digits or Latin, and dated with the year only when it is another", () => {
  assert.equal(spaced("店里31席，用AI改菜单，涨了1.1%的2.5万卢比，US$400，第3家"), "店里 31 席，用 AI 改菜单，涨了 1.1% 的 2.5 万卢比，US$400，第 3 家");
  assert.equal(spaced("https://example.com/a1 已经是 10 月"), "https://example.com/a1 已经是 10 月", "nothing between Latin and digits, nothing twice");
  const now = new Date("2026-10-05T02:00:00Z");
  assert.equal(day("2026-10-04T20:00:00Z", now), "10 月 5 日", "Beijing's date");
  assert.equal(day("2019-02-19T04:00:00Z", now), "2019 年 2 月 19 日");
});

const count = (over: Partial<Count>): Count => ({ practices: null, shops: 0, insiders: 0, cases: 0, countries: [], ...over });

test("counts name a lone country, skip what is zero, and count 条原文 before the stories are grouped", () => {
  assert.equal(countText(count({ practices: 3, shops: 8, insiders: 1, cases: 12, countries: ["日本", "美国", "中国", "法国"] })), "3 种做法 · 8 家店 · 1 位业内人士 · 4 个国家");
  assert.equal(countText(count({ practices: 1, shops: 1, cases: 1, countries: ["日本"] })), "1 种做法 · 1 家店 · 日本");
  assert.equal(countText(count({ cases: 13, shops: 9, countries: ["日本", "美国"] })), "13 条原文 · 2 个国家");
  assert.equal(countText(count({ shops: 2, insiders: 1, cases: 4, countries: ["美国"] }), "practice"), "2 家店 · 1 位业内人士 · 美国");
});

test("店家谈得最多的事 ranks situations by shops, then stories, then the library's order, five at most", () => {
  const row = (slug: string, shops: number, cases: number, insiders = 0): SituationRow =>
    ({ slug, category: "成本与利润", title: slug, dek: "", overview: null, count: count({ shops, cases, insiders }), sources: [] });
  const rows = [row("a", 3, 10), row("b", 5, 5), row("c", 5, 6), row("d", 1, 20, 9), row("e", 2, 2), row("f", 2, 2), row("g", 4, 4)];
  assert.deepEqual(rankSituations(rows).map((r) => r.slug), ["c", "b", "g", "a", "e"], "stories break a tie of shops; insiders and stories alone do not lift one");
  assert.deepEqual(rows.map((r) => r.slug), ["a", "b", "c", "d", "e", "f", "g"], "the lists keep their order");
});

test("a story counts as its named shop, the source of an owner who names none, the story of a publication, or an insider", () => {
  const of = (shop_key: string | null, speaker: CaseStory["shop"]["speaker"], id = "a", source_id = "src") => tellerOf({ id, shop_key, source_id, story: story({ shop: { ...story().shop, speaker } }) });
  assert.deepEqual(of("k1", "media"), { key: "shop:k1", insider: false }, "a named shop, whoever tells it");
  assert.equal(of(null, "owner", "a").key, of(null, "staff", "b").key, "an owner and staff who name no shop: once a source");
  assert.notEqual(of(null, "media", "a").key, of(null, "media", "b").key, "a publication's unnamed shops: once a story");
  assert.deepEqual(of(null, "vendor", "a"), of(null, "adviser", "b"), "advisers and vendors of one source: one insider");
  assert.equal(of(null, "adviser").insider, true);
  assert.equal(sourceKind("料理画家クチーナカメヤマ（日本 · 意大利酒馆店主）"), "意大利酒馆店主");
  assert.equal(sourceKind("QSR Media（澳大利亚、英国 · 快餐与连锁媒体）"), "快餐与连锁媒体");
  assert.equal(sourceKind("Some Blog（美国）"), null);
});

test("one shop's name meets itself however it is spaced, cased or glossed in brackets", () => {
  assert.equal(shopNameKey("クチーナカメヤマ（Cucina Kameyama）"), shopNameKey("クチーナカメヤマ"));
  assert.equal(shopNameKey("Corner  Bistro"), shopNameKey("corner bistro."));
  assert.notEqual(shopNameKey("Corner Bistro"), shopNameKey("Harbor Cafe"));
});

function story(over: Partial<CaseStory> = {}): CaseStory {
  return {
    title: "布草租金四年涨了 74%", lead: "每周都有一张布草账单，自动付掉，没有人细看。", who: "美国一家餐馆（文章没有写店名）。",
    parts: [
      { heading: "账单从每周 865 美元涨到 1,503 美元", blocks: [{ type: "text", text: "店里没有人批准过一次大涨价。" }] },
      { heading: "假设你的餐饮店也这样做", blocks: [example({ kind: "margin", price: 30, cost: 12 }, "一份卖 30 元，食材 12 元。")] },
    ],
    open: "原文没有说这笔钱最后有没有追回。",
    shop: { name: null, label: "一家餐馆", country: "美国", city: null, kind: "dining", size: null, speaker: "adviser" },
    placements: [{ situation: "busy-no-profit", group: "fixed-costs-creep", card: "顾问把第一张和最新一张账单逐行对比，查出了多付的钱。" }],
    ...over,
  };
}
const SOURCE = "A restaurant's linen bill grew 74% from $865 to $1,503 per week over about four years.";

test("a story the checks pass; each problem is named for the writer", () => {
  assert.deepEqual(checkStory(story(), SOURCE), []);
  const bad = checkStory(story({
    who: "顾问讲，一年多付 33,159 美元，全国的餐馆都这样。",
    parts: [{ heading: "结果", blocks: [{ type: "text", text: "你应该每月对账。原文未提供更多细节。" }] }, story().parts[1]!],
    placements: [{ situation: "nowhere", group: null, card: "说明" }, { situation: "busy-no-profit", group: "no-such-group", card: "说明" }],
  }), SOURCE);
  for (const expected of [/33,159/, /“讲”/, /“全国”/, /“你应该”/, /分格标签/, /nowhere 不在清单/, /没有 no-such-group/, /“原文未提供”/]) {
    assert.ok(bad.some((p) => expected.test(p)), `${expected}: ${bad.join(" / ")}`);
  }
  for (const title of ["美国播客：布草账单四年涨了 74%", "美国加州一家餐馆的布草账单涨了 74%"]) {
    assert.ok(checkStory(story({ title }), SOURCE).some((p) => /^标题以/.test(p)), title);
  }
  assert.ok(checkStory(story({ title: "京都一家酒馆的布草账单涨了 74%", shop: { ...story().shop, country: "日本", city: "京都市" } }), SOURCE).some((p) => /^标题以“京都一家”/.test(p)), "a city as titles write it");
  assert.deepEqual(checkStory(story({ title: "多开一家店以后，布草账单涨了 74%" }), SOURCE), [], "一家 that is not where the story is from");
  assert.equal(untranslated("店主说：「うちはお酒が出る杯数が多いです」"), "日文");
  assert.equal(untranslated("名物是「馬とろ生つくね」，店名「あんぽんたん」"), null, "a name in brackets stays");
  assert.equal(untranslated("He said the linen bill kept growing every single week"), "外文句子");
  assert.equal(untranslated("Australian Restaurant & Cafe Association 表示"), null);
  const long = checkStory(story({ parts: [{ heading: "很长的一段", blocks: [{ type: "text", text: "店里没有人批准过一次大涨价。".repeat(Math.ceil(MAX_CHARS / 14)) }] }, story().parts[1]!] }), SOURCE);
  assert.ok(long.some((p) => /太长/.test(p)), long.join(" / "));
  const caption = checkStory(story({ parts: [story().parts[0]!, { heading: "假设你的餐饮店", blocks: [example({ kind: "margin", price: 30, cost: 12 }, "毛利是 18 元，占 60%，所以一年 6,570 元。")] }] }), SOURCE);
  assert.ok(caption.some((p) => /6,570/.test(p)) && !caption.some((p) => /“18”|\b18\b.*找不到/.test(p)), caption.join(" / "));
});

test("a kind outside the list is no kind, and the story still stands", () => {
  const { written } = readOutput({ material: "story", ...story({ shop: { ...story().shop, kind: "餐馆" as never } }), parts: [{ heading: "账单", blocks: [{ type: "text", text: "店里没有人批准过一次大涨价。" }] }] });
  assert.equal(written?.status, "story");
  assert.equal(written?.status === "story" && written.story.shop.kind, null);
});

test("a block over its ceiling comes back named, with its length", () => {
  const long = { material: "story", ...story(), parts: [{ heading: "很长的一段", blocks: [{ type: "text", text: "店里没有人批准过一次大涨价。".repeat(25) }] }] };
  const { written, problems } = readOutput(long);
  assert.equal(written, null);
  assert.deepEqual(problems, ["第 1 段第 1 块的文字太长：最多 240 字，现在 350 字；删去次要的内容，不要拆成更多块"]);
});

test("a grouping of practices places every story once, within its group, a line a shop, with the stories' own numbers", () => {
  const members: Member[] = [
    { id: "a", group: "fixed-costs-creep", teller: "shop:x", story: story() },
    { id: "b", group: "fixed-costs-creep", teller: "shop:x", story: story({ title: "同一家店的另一张账单" }) },
    { id: "c", group: "fixed-costs-creep", teller: "source:y", story: story({ title: "另一家店的账单" }) },
    { id: "d", group: "food-over-recipe", teller: "source:y", story: story({ title: "配方和盘点" }) },
  ];
  const good = { overview: "固定费用往往在没人核对时上涨，各家逐项对比账单和合同。", methods: [
    { group: "fixed-costs-creep", title: "把第一张和最新一张账单逐行对比", summary: "美国一家餐馆的布草账单从每周865美元涨到1,503美元，逐行对比以后找出了多付的部分。",
      shops: [{ caseIds: ["a", "b"], line: "布草账单四年涨了74%" }, { caseIds: ["c"], line: "逐行对比找出多付的钱" }] },
    { group: "food-over-recipe", title: "盘点食材钱和配方对照", summary: "把盘点出来的食材钱和配方算的放在一起比。", shops: [{ caseIds: ["d"], line: "盘点和配方放在一起比" }] },
  ] };
  const read = readGrouping(good, members);
  assert.deepEqual(read.problems, []);
  const [first] = read.grouping!.methods;
  assert.equal(first!.summary, "美国一家餐馆的布草账单从每周 865 美元涨到 1,503 美元，逐行对比以后找出了多付的部分。", "stored spaced");
  assert.equal(first!.shops[0]!.line, "布草账单四年涨了 74%");
  assert.match(first!.key, /^[0-9a-f]{8}$/);
  assert.equal(readGrouping(good, members).grouping!.methods[0]!.key, first!.key, "the same stories, the same anchor");
  assert.deepEqual(read.repairs, []);
});

test("where the stories sit the program mends: an id not of the situation, another group, a second place, one shop on two lines, a story left out", () => {
  const members: Member[] = [
    { id: "a", group: "fixed-costs-creep", teller: "shop:x", story: story() },
    { id: "b", group: "fixed-costs-creep", teller: "shop:x", story: story({ title: "同一家店的另一张账单" }) },
    { id: "c", group: "fixed-costs-creep", teller: "source:y", story: story({ title: "另一家店的账单" }) },
    { id: "d", group: "food-over-recipe", teller: "source:y", story: story({ title: "配方和盘点", placements: [{ situation: "busy-no-profit", group: "food-over-recipe", card: "把盘点出来的食材钱和配方算的放在一起比。" }] }) },
    { id: "e", group: null, teller: "case:e", story: story({ title: "一张没人看的账单" }) },
  ];
  const read = readGrouping({ overview: "固定费用往往在没人核对时上涨，各家逐项对比账单和合同。", methods: [
    { group: "fixed-costs-creep", title: "把账单逐行对比", summary: "几家店把第一张和最新一张账单逐行对比。",
      shops: [{ caseIds: ["a", "x"], line: "布草账单四年涨了 74%" }, { caseIds: ["c", "d"], line: "逐行对比找出多付的钱" }, { caseIds: ["b", "a"], line: "另一张账单也对比" }] },
    { group: "fixed-costs-creep", title: "合同留底", summary: "合同要留底。", shops: [{ caseIds: ["a"], line: "合同留底" }] },
  ] }, members);
  assert.deepEqual(read.problems, []);
  const methods = read.grouping!.methods;
  assert.deepEqual(methods.map((m) => [m.group, m.title, m.shops.map((s) => [s.caseIds, s.line])]), [
    ["fixed-costs-creep", "把账单逐行对比", [[["a", "b"], "布草账单四年涨了 74%"], [["c"], "逐行对比找出多付的钱"]]],
    ["food-over-recipe", "配方和盘点", [[["d"], "账单从每周 865 美元涨到 1,503 美元"]]],
    [null, "一张没人看的账单", [[["e"], "账单从每周 865 美元涨到 1,503 美元"]]],
  ], "one shop's lines merged under its first; a practice emptied dropped; a story taken out of another group's practice, or left out, stands alone in its group");
  assert.equal(methods[1]!.summary, "把盘点出来的食材钱和配方算的放在一起比。", "alone: what the shop did, as its card says");
  assert.equal(new Set(methods.map((m) => m.key)).size, 3);
  for (const expected of [/x 不是这种情况的故事，已删去/, /故事 d 属于原因组 food-over-recipe，已从第 1 个做法移出/, /同一家店（s1）写了两行，已把第 3 家的那一行合进第 1 家的那一行/,
    /故事 a 放进了不止一处，只留在第一处，已从第 2 个做法删去/, /故事 e（一张没人看的账单）没有放进任何做法，已单独列为一个做法/]) {
    assert.ok(read.repairs.some((p) => expected.test(p)), `${expected} in ${read.repairs.join(" | ")}`);
  }
});

test("what the model wrote goes back named: lengths against what the prompt asks, words, digits in the overview, numbers no story has, two shops on a line", () => {
  const members: Member[] = [
    { id: "a", group: "fixed-costs-creep", teller: "shop:x", story: story() },
    { id: "c", group: "fixed-costs-creep", teller: "source:y", story: story({ title: "另一家店的账单" }) },
    { id: "f", group: "fixed-costs-creep", teller: "shop:z", story: story({ title: "第三家店的合同" }) },
    { id: "g", group: "fixed-costs-creep", teller: "case:g", story: story({ title: "第四家店的合同" }) },
  ];
  const bad = readGrouping({ overview: `有 3 种做法，${"各家逐项对比账单和合同。".repeat(11)}`, methods: [
    { group: "fixed-costs-creep", title: "把第一张和最新一张账单逐行对比，再把全部合同都找出来", summary: `个人饮食店一年多付 99,999 美元。${"逐行对比以后找出了多付的部分。".repeat(10)}`,
      shops: [{ caseIds: ["a"], line: "布草账单从每周 865 美元涨到 77,777 美元，此后每周都在上涨" }, { caseIds: ["c"], line: "顾问讲要对比" }] },
    { group: "fixed-costs-creep", title: "合同留底", summary: "合同要留底。", shops: [{ caseIds: ["f", "g"], line: "留底" }] },
  ] }, members);
  assert.equal(bad.grouping, null);
  for (const expected of [
    /^综述太长：最多 120 字，现在 1\d\d 字；删去次要的原因和做法/, /^第 1 个做法的标题太长：最多 20 字，现在 2\d 字；只写怎么做/,
    /^第 1 个做法的归纳太长：最多 150 字，现在 \d+ 字；删去次要的条件和数字，只留共同的做法和最关键的差别$/,
    /^第 1 个做法第 1 家的那一行太长：最多 24 字，现在 3\d 字；删去次要的条件，只留这家店的关键数字或结果$/,
    /^第 1 个做法的归纳用了“个人饮食店”/, /^第 1 个做法第 2 家的那一行用了“讲”/, /^综述里写了数字 3：/, /归纳里的数字 99,999 在这个做法的故事里找不到/,
    /^第 1 个做法第 1 家的那一行「.+」的数字 77,777 在这家店的故事里找不到/, /^第 2 个做法第 1 家的那一行放了不同店家（s3、s4）的故事/,
  ]) {
    assert.ok(bad.problems.some((p) => expected.test(p)), `${expected} in ${bad.problems.join(" | ")}`);
  }
  assert.ok(!bad.problems.some((p) => /Too big|expected/.test(p)), "no schema message in English");
  assert.deepEqual(readGrouping({ overview: "各家逐项对比账单和合同。".repeat(10).slice(0, 125), methods: [{ group: "fixed-costs-creep", title: "逐行对比账单", summary: "逐行对比。", shops: [{ caseIds: ["a"], line: "对比" }] }] }, members).problems,
    [], "a little over what the prompt asks is not sent back for that alone");
});

// The model: a story with a stray number and a spoken word first, fixed when told; thin material; and one
// that stays wrong. The first two are about the same shop; COFFEE is an owner in Japan who names no shop.
const T = tag();
const bistro = { ...story().shop, name: "Corner Bistro", label: "加州一家小酒馆" };
const answers: Record<string, unknown[]> = {
  FIRST: [
    { material: "story", ...story({ who: "顾问讲，一年多付 33,159 美元。", shop: bistro }), parts: [{ heading: "账单从每周 865 美元涨到 1,503 美元", blocks: [{ type: "text", text: "店里没有人批准过一次大涨价。" }] }, { heading: "假设你的餐饮店也这样做", blocks: [{ type: "example", example: { kind: "margin", price: 30, cost: 12 }, caption: "一份卖 30 元。" }] }] },
    { material: "story", ...story({ shop: bistro }), parts: [{ heading: "账单从每周 865 美元涨到 1,503 美元", blocks: [{ type: "compare", unit: "美元", per: "周", items: [{ label: "最早", value: 865 }, { label: "约四年后", value: 1503 }], caption: "顾问审过的账单。" }] }, { heading: "他把账单逐行对比", blocks: [{ type: "flow", steps: ["收齐合同和账单", "第一张和最近一张逐行对比"] }] }] },
  ],
  // Placed twice in one situation (two groups): it counts once, under the first. Its shop's name has a gloss.
  SECOND: [{ material: "story", ...story({ title: "同一家店的另一笔账", shop: { ...bistro, name: "Corner Bistro（街角小馆）" }, placements: [{ situation: "busy-no-profit", group: "food-over-recipe", card: "盘点出来的食材钱和配方算的放在一起比。" }, { situation: "busy-no-profit", group: "fixed-costs-creep", card: "另一组的卡片。" }] }), parts: story().parts.map((p) => ({ heading: p.heading, blocks: [{ type: "text", text: "店里没有人批准过一次大涨价。" }] })) }],
  COFFEE: [{ material: "story", ...story({ title: "电费账单每周从865美元涨到1,503美元", shop: { name: null, label: "一家社区咖啡店", country: "日本", city: null, kind: "coffee", size: null, speaker: "owner" } }), parts: story().parts.map((p) => ({ heading: p.heading, blocks: [{ type: "text", text: "店里没有人批准过一次大涨价。" }] })) }],
  // Only a spoken word: sent back as an edit of the story, without the material (its title carries the marker);
  // in no situation and of no kind, so the pages below count as before.
  TEXTONLY: [
    { material: "story", ...story({ title: `TEXTONLY-${T} 账单`, lead: "顾问讲，账单每周都在涨。", shop: { ...story().shop, name: "Harbor Cafe", kind: null }, placements: [] }), parts: story().parts.map((p) => ({ heading: p.heading, blocks: [{ type: "text", text: "店里没有人批准过一次大涨价。" }] })) },
    { material: "story", ...story({ title: `TEXTONLY-${T} 账单`, lead: "账单每周都在涨。", shop: { ...story().shop, name: "Harbor Cafe", kind: null }, placements: [] }), parts: story().parts.map((p) => ({ heading: p.heading, blocks: [{ type: "text", text: "店里没有人批准过一次大涨价。" }] })) },
  ],
  THIN: [{ material: "thin", reason: "只有节目的题目" }],
  NEWS: [{ material: "news", reason: "一个国家的新规" }],
  WRONG: [{ material: "story", ...story({ who: "一年多付 99,999 美元。" }), parts: story().parts.map((p) => ({ heading: p.heading, blocks: [{ type: "text", text: "多了 88,888 美元。" }] })) }],
};
const calls: string[] = [];
const users: Record<string, string[]> = {};
let styled = 0;
let grouped = 0;
const groupUsers: string[] = [];
const model = await stub((_hit, req) => {
  const body = JSON.parse(req.body) as { messages: Array<{ role: string; content: string }> };
  const user = body.messages.at(-1)!.content;
  // The grouping of practices: first two stories of two groups in one practice (mended) with a summary too long
  // (sent back), then the shop in Japan beside the shop in California in one practice and the other story left out
  // (it stands alone in its group).
  if (body.messages.some((m) => m.role === "system" && m.content.includes("店家编号"))) {
    grouped += 1;
    groupUsers.push(user);
    const out = user.includes("有以下问题")
      ? { overview: "固定费用和食材钱都在没人核对时上涨，各家逐项对比账单和配方。", methods: [
        { group: "fixed-costs-creep", title: "把第一张和最新一张账单逐行对比", summary: "加州一家小酒馆的布草账单从每周 865 美元涨到 1,503 美元，逐行对比以后找出了多付的部分。",
          shops: [{ caseIds: [ids.FIRST], line: "布草账单四年涨了 74%" }, { caseIds: [ids.COFFEE], line: "电费账单每周涨到 1,503 美元" }] },
      ] }
      : { overview: "各家逐项对比账单。", methods: [{ group: "fixed-costs-creep", title: "逐项对比", summary: "对比账单和配方。".repeat(25), shops: [{ caseIds: [ids.FIRST, ids.SECOND], line: "对比" }, { caseIds: [ids.COFFEE], line: "对比" }] }] };
    return { id: `stub-group-${grouped}`, model: "stub", choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
  }
  // The last pass over a story that passed: hands it back with one spoken word made written.
  if (body.messages.some((m) => m.role === "system" && m.content.includes("把口语词、方言词"))) {
    styled += 1;
    return { id: `stub-style-${styled}`, model: "stub", choices: [{ message: { content: user.replace("账单每周都在涨", "账单每周都在上涨") } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
  }
  const marker = Object.keys(answers).find((m) => user.includes(`${m}-${T}`))!;
  calls.push(marker);
  (users[marker] ??= []).push(user);
  const list = answers[marker]!;
  const out = user.includes("有以下问题") ? list.at(-1) : list[0];
  return { id: `stub-${calls.length}`, model: "stub", choices: [{ message: { content: JSON.stringify(out) } }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
});
pointModels(model.url, ["deepseek-flash"]);
process.env.REFERENCE_CASE_MODEL = "deepseek-flash";
process.env.REFERENCE_METHODS_MODEL = "deepseek-flash";
installModules([reference]);
const app = await buildApp();
const SRC = `reference-${T}`;
const ids: Record<string, string> = {};
const get = async (path: string) => JSON.parse((await app.inject(path)).body);
/** Stories written in the same moment list their countries in either order. */
const sorted = (c: Count) => ({ ...c, countries: [...c.countries].sort() });

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
  assert.equal((await writeCase(ids.COFFEE!))!.status, "story");
  assert.deepEqual(await writeCase(ids.TEXTONLY!), { status: "story", problems: [] });
  assert.ok(users.TEXTONLY!.length === 2 && !users.TEXTONLY![1]!.includes(SOURCE) && users.TEXTONLY![1]!.includes("用了“讲”"), "a word alone goes back as an edit, without the material");
  assert.ok(users.FIRST![1]!.includes(SOURCE), "a number not in the original goes back with the material");
  assert.equal(styled, 4, "every story that passed got the wording pass, the held and thin ones none");
  assert.equal((await writeCase(ids.THIN!))!.status, "thin");
  assert.equal((await writeCase(ids.NEWS!))!.status, "thin", "news is not a story either");
  const wrong = await writeCase(ids.WRONG!);
  assert.equal(wrong!.status, "held");
  assert.ok(wrong!.problems.some((p) => /99,999|88,888/.test(p)));
  assert.deepEqual(await articlesToWrite(50), [], "every selected item has its case");
  assert.deepEqual(await get("/api/reference/status"),
    { counts: { story: 4, thin: 2, held: 1 }, held: { "数字不在原文：人物": 1, "数字不在原文：正文": 1 }, grouped: {}, waiting: 0 });
  await sql`UPDATE reference_cases SET prompt_version = 'reference-case@older' WHERE article_id = ${ids.THIN!}`;
  assert.deepEqual(await articlesToWrite(50), [ids.THIN], "a changed prompt writes the case again");
  await writeCase(ids.THIN!);
  const [stored] = await sql<{ story: CaseStory; situations: string[]; receipt_ids: string[] }[]>`SELECT story, situations, receipt_ids FROM reference_cases WHERE article_id = ${ids.FIRST!}`;
  assert.deepEqual(stored!.situations, ["busy-no-profit"]);
  assert.equal(stored!.receipt_ids.length, 3, "the answer, the one sent back, and the wording pass");
  const [edited] = await sql<{ story: CaseStory }[]>`SELECT story FROM reference_cases WHERE article_id = ${ids.TEXTONLY!}`;
  assert.equal(edited!.story.lead, "账单每周都在上涨。", "the wording pass is kept when the checks still pass");
  const [coffee] = await sql<{ story: CaseStory }[]>`SELECT story FROM reference_cases WHERE article_id = ${ids.COFFEE!}`;
  assert.equal(coffee!.story.title, "电费账单每周从 865 美元涨到 1,503 美元", "stored spaced");
  const keys = await sql<{ shop_key: string }[]>`SELECT DISTINCT shop_key FROM reference_cases WHERE article_id IN (${ids.FIRST!}, ${ids.SECOND!})`;
  assert.equal(keys.length, 1, "one shop's key with and without the gloss in brackets");
  const compare = stored!.story.parts[0]!.blocks[0]!;
  assert.ok(compare.type === "compare" && compare.change?.amount === 638 && compare.change.yearly === 638 * 52, "the change is computed");
});

test("the pages show public cases only, a situation once two cases are in it, each shop once in a list, and the practices by shop", async () => {
  const home = await get("/api/reference");
  assert.deepEqual(home.kinds, [{ slug: "dining", title: "正餐", cases: 2 }], "coffee has one story: not listed");
  const cost = home.categories.find((c: { key: string }) => c.key === "cost");
  assert.deepEqual(cost.situations.map((s: { slug: string; count: Count }) => [s.slug, sorted(s.count)]),
    [["busy-no-profit", sorted({ practices: null, shops: 2, insiders: 0, cases: 3, countries: ["美国", "日本"] })]], "not grouped yet: 条原文; the bistro's two stories one shop");
  for (const none of ["tea", "no-such-kind"]) assert.equal((await app.inject(`/api/reference/kinds/${none}`)).statusCode, 404, `${none}: no cases, no page`);

  const before = await get("/api/reference/situations/busy-no-profit");
  assert.equal(before.grouped, false);
  assert.equal(before.overview, null);
  const fixed = before.groups.find((g: { key: string }) => g.key === "fixed-costs-creep");
  assert.deepEqual(new Set(fixed.cases.map((c: { id: string }) => c.id)), new Set([ids.FIRST, ids.COFFEE]), "one card a story before the grouping");
  const first = fixed.cases.find((c: { id: string }) => c.id === ids.FIRST);
  assert.match(first.src, /^美国 · 餐饮媒体 · \d{4} 年 \d{1,2} 月$/, "country, the source's kind, the month");
  assert.deepEqual([first.reason, first.shop.others, first.item.title], [null, 1, "FIRST"], "its shop's other story, and the item 收藏 keeps");

  const members = (await membersBySituation()).get("busy-no-profit")!;
  assert.equal(new Set(members.map((m) => m.teller)).size, 2);
  assert.deepEqual((await situationsToGroup(new Map([["busy-no-profit", members]]), 10)).map(([slug]) => slug), ["busy-no-profit"]);
  assert.deepEqual(await groupSituation("busy-no-profit", members), { stored: true, problems: [] });
  assert.equal(grouped, 2, "the long summary was sent back once; the story across groups was mended, not sent back");
  assert.ok(groupUsers[1]!.startsWith("下面是你按系统规则写好的归并") && /归纳太长：最多 150 字，现在 200 字/.test(groupUsers[1]!) && !groupUsers[1]!.includes("店家：s1"),
    "a text problem goes back as an edit of the answer, without the stories");
  assert.deepEqual(await situationsToGroup(new Map([["busy-no-profit", members]]), 10), [], "grouped again only when its stories change");

  const page = await get("/api/reference/situations/busy-no-profit");
  assert.deepEqual([page.grouped, sorted(page.count), page.overviewCount.shops], [true, sorted({ practices: 2, shops: 2, insiders: 0, cases: 3, countries: ["美国", "日本"] }), 2]);
  const practice = page.groups.find((g: { key: string }) => g.key === "fixed-costs-creep").practices[0];
  assert.deepEqual([practice.title, practice.count.shops, practice.count.countries, practice.sources], ["把第一张和最新一张账单逐行对比", 2, ["美国", "日本"], [{ name: "Total Food Service", icon: null }]]);
  assert.deepEqual(practice.lines.map((l: { name: string; country: string; cases: number }) => [l.country, l.name, l.cases]), [["美国", "加州一家小酒馆", 1], ["日本", "一家社区咖啡店", 1]]);
  assert.equal(page.groups.every((g: { cases: unknown[] }) => !g.cases.length), true, "no story left loose");

  const coffee = await get("/api/reference/situations/busy-no-profit?kind=coffee");
  assert.deepEqual([coffee.kind.title, coffee.count], ["咖啡", { practices: 1, shops: 1, insiders: 0, cases: 1, countries: ["日本"] }], "counted for the kind alone");
  assert.deepEqual(coffee.groups.filter((g: { practices: unknown[] }) => g.practices.length).map((g: { key: string; practices: Array<{ lines: unknown[] }> }) => [g.key, g.practices[0]!.lines.length]),
    [["fixed-costs-creep", 2]], "the practice a coffee shop tells, with its other shops' lines; the other cause hidden");

  const dining = await get("/api/reference/kinds/dining");
  assert.deepEqual([dining.metrics, dining.others.length], [{ cases: 2, countries: ["美国"] }, 0]);
  assert.deepEqual(dining.categories[0].situations[0].count, { practices: 2, shops: 1, insiders: 0, cases: 2, countries: ["美国"] }, "a kind's page counts its own shops");
  assert.equal((await get("/api/reference/kinds/coffee")).categories[0].situations[0].count.practices, 1);

  const listing = await get("/api/reference");
  const listed = listing.categories.find((c: { key: string }) => c.key === "cost").situations[0];
  assert.deepEqual([listed.count.practices, listed.count.shops, listed.count.cases, listed.overview], [2, 2, 3, page.overview], "the bistro's two practices: one shop");
  assert.deepEqual(listing.ranking, [listed], "店家谈得最多的事: the same row, its shops counted once");

  const one = await get(`/api/reference/cases/${ids.FIRST}`);
  assert.deepEqual([one.source.name, one.source.kind, one.source.language, one.situation.title], ["Total Food Service", "餐饮媒体", "英文", "生意很忙，钱却留不下来"]);
  assert.equal(one.situation.practice, practice.key, "the story leads to its practice on the page");
  assert.deepEqual([one.item.summary, one.item.reason, one.item.title, one.item.selected], ["摘要", null, "FIRST", true], "the item's AI 导读 and 收录理由 come with the story");
  assert.deepEqual([one.shop.others, one.situations], [1, 1]);

  const found = await get(`/api/reference/search?q=${encodeURIComponent("固定费用")}`);
  assert.deepEqual(found.situations.map((s: { slug: string }) => s.slug), ["busy-no-profit"], "a cause's title finds its situation");
  const shop = await get(`/api/reference/search?q=${encodeURIComponent("corner bistro")}`);
  assert.deepEqual(shop.cases.map((c: { id: string; shop: { others: number } }) => [c.id, c.shop.others]), [[shop.cases[0].id, 1]], "a shop's stories: one card");
  assert.deepEqual(await get(`/api/reference/search?q=${encodeURIComponent("没有这个词")}`), { situations: [], cases: [] });
  assert.deepEqual(await get(`/api/reference/by-item/${ids.COFFEE}`), { id: ids.COFFEE, title: "电费账单每周从 865 美元涨到 1,503 美元", situation: { slug: "busy-no-profit", title: "生意很忙，钱却留不下来", count: page.count } });
  for (const none of [ids.THIN, "no-such-item"]) assert.equal((await app.inject(`/api/reference/by-item/${none}`)).statusCode, 404);

  const sitemap = (await reference.sitemap!.entries!()).map((e) => e.loc);
  for (const loc of ["/reference/busy-no-profit", "/reference/kinds/dining", `/reference/cases/${ids.FIRST}`, `/reference/shops/${one.shop.key}`]) assert.ok(sitemap.includes(loc), loc);
  assert.ok(!sitemap.includes("/") && !sitemap.includes("/reference/kinds/coffee"), "the site lists /; a kind with one story is not listed");

  for (const hidden of [ids.THIN, ids.NEWS, ids.WRONG]) assert.equal((await app.inject(`/api/reference/cases/${hidden}`)).statusCode, 404);
  assert.equal((await app.inject("/api/reference/situations/no-such-situation")).statusCode, 404);
  await sql`UPDATE publications SET visibility = 'withdrawn' WHERE article_id = ${ids.SECOND!}`;
  assert.equal((await app.inject(`/api/reference/cases/${ids.SECOND}`)).statusCode, 404);
  const left = await get("/api/reference/situations/busy-no-profit");
  assert.deepEqual(left.groups.map((g: { practices: unknown[] }) => g.practices.length), [0, 1, 0], "a withdrawn story's practice leaves with it");
  assert.equal((await get(`/api/reference/cases/${ids.FIRST}`)).shop, null, "a shop with one case left has no page to point to");
  await sql`UPDATE publications SET visibility = 'withdrawn' WHERE article_id = ${ids.COFFEE!}`;
  const after = await get("/api/reference");
  assert.equal(after.categories.length, 0, "one case left is not a page");
  assert.deepEqual(after.kinds, [], "nor is a kind with one story");
});

test("the sample pages are served at their unlisted address, kept from search engines", async () => {
  const res = await app.inject(SAMPLE_PATH);
  assert.equal(res.statusCode, 200);
  assert.match(String(res.headers["content-type"]), /text\/html/);
  assert.equal(res.headers["x-robots-tag"], "noindex");
  assert.ok(res.body.startsWith("<!doctype html>") && res.body.includes("生意很忙，钱却留不下来"));
});
