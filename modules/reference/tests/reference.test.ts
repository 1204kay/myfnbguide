// Failure cases: an example shows arithmetic the program did not do; a number the original never wrote, a
// spoken word, a label heading, a note to itself or a title that opens with its source reaches a reader; a story
// with problems is shown without a second try, or shown after failing it; thin material becomes a story; text is
// stored without the space between Chinese and digits; one shop's stories miss each other's page for a bracket in
// its name; a withdrawn item stays in the reference pages; a situation with one case is listed; a story points to
// its shop's page when that page would only repeat it; a grouping of practices fails on a story left out, placed
// twice or across groups, or a shop on two lines, instead of mending it; a grouping stores one line of two shops or
// a number no story has, or sends a text back as too long without naming where, how long and what to cut; a
// practice counts articles, not shops, or counts an adviser as a shop; a list counts practices or countries, or
// shops before the stories are grouped; a list shows one shop's stories as several cards; the ranking of
// situations counts stories, not shops, or lists more than ten; a category does not list the situation most shops
// tell first; 代表做法 is not the practice the most shops tell, an insider counted as one; 最近收进 is not the story
// taken in last; a practice one shop tells is a card, or its row repeats the title in the shop's line, or drops a
// story the grouping gave another shop before the stories were written again; one shop's practices in a list each
// name it again; a page is split by cause without two causes of two practices each; a shop is named two ways, or
// with its country twice; the shop kinds' page still answers; the search or the item page's block misses a story.
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
import { groupSituation, PROMPT_VERSION, readGrouping, situationsToGroup, textOnly, type Member } from "../backend/methods.ts";
import { membersBySituation, rankSituations, repeats, sourceKind, tellerOf, withoutCountry } from "../backend/read.ts";
import { day, fullCountText, listCountText, restCountText, spaced, tellersText } from "../format.ts";
import type { CaseStory, Count, Shop, SituationRow } from "../types.ts";

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

const count = (over: Partial<Count>): Count => ({ grouped: false, shops: 0, insiders: 0, cases: 0, ...over });

test("a list's big number is its shops, or 条原文 where no shop tells it, with the rest of its count beside; a practice names its insiders; nothing counts countries or practices", () => {
  assert.equal(listCountText(count({ grouped: true, shops: 16, insiders: 1, cases: 40 })), "16 家店");
  assert.equal(listCountText(count({ shops: 9, cases: 13 })), "9 家店", "grouped or not, the shops rank it");
  assert.equal(listCountText(count({ grouped: true, insiders: 2, cases: 2 })), "2 条原文", "no shop tells it");
  assert.equal(listCountText(count({ grouped: true, shops: 1200, cases: 1500 })), "1,200 家店");
  assert.equal(restCountText(count({ shops: 16, insiders: 1, cases: 26 })), "1 位业内人士 · 26 条原文");
  assert.equal(restCountText(count({ shops: 8, cases: 9 })), "9 条原文");
  assert.equal(restCountText(count({ insiders: 2, cases: 2 })), "2 位业内人士", "its 条原文 is the big number");
  assert.equal(fullCountText(count({ shops: 16, insiders: 1, cases: 26 })), "16 家店 · 1 位业内人士 · 26 条原文");
  assert.equal(tellersText(count({ grouped: true, shops: 2, insiders: 1, cases: 4 })), "2 家店 · 1 位业内人士");
  assert.equal(tellersText(count({ grouped: true, shops: 3, cases: 3 })), "3 家店");
});

test("店家谈得最多的事 ranks situations by shops, then stories, then the library's order, ten at most", () => {
  const row = (slug: string, shops: number, cases: number, insiders = 0): SituationRow =>
    ({ slug, category: "成本与利润", title: slug, dek: "", overview: null, count: count({ grouped: true, shops, cases, insiders }), practice: null, faces: [], sources: 0 });
  const rows = [row("a", 3, 10), row("b", 5, 5), row("c", 5, 6), row("d", 1, 20, 9), row("e", 2, 2), row("f", 2, 2), row("g", 4, 4),
    row("h", 1, 3), row("i", 1, 2), row("j", 0, 2), row("k", 0, 4), row("l", 2, 1)];
  assert.deepEqual(rankSituations(rows).map((r) => r.slug), ["c", "b", "g", "a", "e", "f", "l", "d", "h", "i"],
    "stories break a tie of shops, the library's order a tie of both; insiders and stories alone do not lift one");
  assert.deepEqual(rows.map((r) => r.slug), ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"], "the lists keep their order");
});

test("a shop's label drops the country its line writes before it, only where the country says where the shop is", () => {
  assert.equal(withoutCountry("日本一家泰式餐馆", "日本"), "一家泰式餐馆");
  assert.equal(withoutCountry("日本京都一家意大利小酒馆", "日本"), "京都一家意大利小酒馆");
  assert.equal(withoutCountry("美国的两位餐厅顾问", "美国"), "两位餐厅顾问");
  assert.equal(withoutCountry("日本东京的一家拉面店", "日本"), "东京的一家拉面店");
  assert.equal(withoutCountry("美国 3 家店的店主", "美国"), "3 家店的店主");
  assert.equal(withoutCountry("加州一家小酒馆", "美国"), "加州一家小酒馆");
  assert.equal(withoutCountry("美国一家小酒馆", "日本"), "美国一家小酒馆", "another country is the label's own");
  for (const [label, country] of [["意大利面馆", "意大利"], ["日本料理店", "日本"], ["日本人开的一家拉面店", "日本"], ["韩国烤肉店的一位店主", "韩国"], ["美国家庭面包房", "美国"],
    ["日本第一家胶囊餐厅", "日本"], ["日本最大的一家连锁拉面店", "日本"], ["日本", "日本"]]) {
    assert.equal(withoutCountry(label!, country!), label, `${label}: a kind of shop, a people or a place in the country, not where it is`);
  }
});

test("a practice one shop tells shows the shop's line only where half its pairs of characters or more are not in the title", () => {
  assert.equal(repeats("把账单逐行对比", "逐行对比账单"), true);
  assert.equal(repeats("在附近大学招兼职", "在附近大学招兼职"), true);
  assert.equal(repeats("请老员工介绍朋友来面试", "请老员工介绍朋友"), true);
  assert.equal(repeats("布草账单四年涨了 74%", "把第一张和最新一张账单逐行对比"), false);
  assert.equal(repeats("介绍的朋友留得更久", "请老员工介绍朋友"), false);
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
      shops: [{ caseIds: ["a", "x"], line: "布草账单四年涨了 74%" }, { caseIds: ["c"], line: "逐行对比找出多付的钱" }, { caseIds: ["b", "a"], line: "另一张账单也对比" }] },
    { group: "fixed-costs-creep", title: "合同留底", summary: "合同要留底。", shops: [{ caseIds: ["a"], line: "合同留底" }] },
  ] }, members);
  assert.deepEqual(read.problems, []);
  const methods = read.grouping!.methods;
  assert.deepEqual(methods.map((m) => [m.group, m.title, m.shops.map((s) => [s.caseIds, s.line])]), [
    ["fixed-costs-creep", "把账单逐行对比", [[["a", "b"], "布草账单四年涨了 74%"], [["c"], "逐行对比找出多付的钱"]]],
    ["food-over-recipe", "配方和盘点", [[["d"], "账单从每周 865 美元涨到 1,503 美元"]]],
    [null, "一张没人看的账单", [[["e"], "账单从每周 865 美元涨到 1,503 美元"]]],
  ], "one shop's lines merged under its first; a practice emptied dropped; a story left out stands alone in its group");
  assert.equal(methods[1]!.summary, "把盘点出来的食材钱和配方算的放在一起比。", "alone: what the shop did, as its card says");
  assert.equal(new Set(methods.map((m) => m.key)).size, 3);
  for (const expected of [/x 不是这种情况的故事，已删去/, /同一家店（s1）写了两行，已把第 3 家的那一行合进第 1 家的那一行/,
    /故事 a 放进了不止一处，只留在第一处，已从第 2 个做法删去/, /故事 d（配方和盘点）没有放进任何做法，已单独列为一个做法/, /故事 e（一张没人看的账单）没有放进任何做法，已单独列为一个做法/]) {
    assert.ok(read.repairs.some((p) => expected.test(p)), `${expected} in ${read.repairs.join(" | ")}`);
  }
});

test("a practice that lost a story keeps no words about it, and one written in a wrong group is moved, not broken up", () => {
  const members: Member[] = [
    { id: "a", group: "fixed-costs-creep", teller: "shop:x", story: story() },
    { id: "c", group: "fixed-costs-creep", teller: "source:y", story: story({ title: "另一家店的账单" }) },
    { id: "d", group: "food-over-recipe", teller: "source:z", story: story({ title: "配方和盘点", placements: [{ situation: "busy-no-profit", group: "food-over-recipe", card: "把盘点出来的食材钱和配方算的放在一起比。" }] }) },
  ];
  // Its summary names the shop of d, which the program takes out: with others left it goes back to the model.
  const kept = readGrouping({ overview: "各家逐项对比账单和配方。", methods: [{ group: "fixed-costs-creep", title: "逐项对比", summary: "加州一家小酒馆对比账单，日本一家咖啡店对比配方。",
    shops: [{ caseIds: ["a"], line: "对比账单" }, { caseIds: ["c"], line: "对比账单" }, { caseIds: ["d"], line: "对比配方" }] }] }, members);
  assert.equal(kept.grouping, null);
  assert.ok(kept.problems.some((p) => /^第 1 个做法移出了故事 d（不属于这个原因组，或已放在别处）：标题、归纳和各行只写留下的店家/.test(p)) && !kept.problems.some(textOnly),
    "sent back with the stories, not as an edit of the words");
  // With one story left it stands alone in that story's own words.
  const one = readGrouping({ overview: "各家逐项对比账单和配方。", methods: [{ group: "fixed-costs-creep", title: "逐项对比", summary: "一家对比账单，一家对比配方。",
    shops: [{ caseIds: ["a"], line: "对比账单" }, { caseIds: ["d"], line: "对比配方" }] }] }, members);
  assert.deepEqual(one.problems, []);
  assert.deepEqual(one.grouping!.methods.map((m) => [m.title, m.summary, m.shops.map((s) => s.caseIds)]),
    [[story().title, story().placements[0]!.card, [["a"]]], ["另一家店的账单", story().placements[0]!.card, [["c"]]], ["配方和盘点", "把盘点出来的食材钱和配方算的放在一起比。", [["d"]]]]);
  assert.ok(one.repairs.some((p) => /第 1 个做法移出故事以后只剩一篇，改用这篇故事自己的标题和说明/.test(p)));
  // "null" written as a word: the practice moves to its stories' group and keeps both shops.
  const none: Member[] = [
    { id: "n1", group: null, teller: "shop:p", story: story({ title: "午市改成两班倒" }) },
    { id: "n2", group: null, teller: "shop:q", story: story({ title: "晚市少排一人" }) },
  ];
  const moved = readGrouping({ overview: "各家按客流重新排班。", methods: [{ group: "null", title: "按客流重新排班", summary: "两家店都按客流改了排班。", shops: [{ caseIds: ["n1"], line: "午市两班倒" }, { caseIds: ["n2"], line: "晚市少排一人" }] }] }, none);
  assert.deepEqual(moved.grouping!.methods.map((m) => [m.group, m.title, m.shops.length]), [[null, "按客流重新排班", 2]]);
  assert.ok(moved.repairs.some((p) => /第 1 个做法写的原因组 null 和它的故事不符，已改为没有原因组/.test(p)));
  // A line quoted in a problem may say 太长 itself: the problem is still about a number, sent back with the stories.
  assert.equal(textOnly("第 1 个做法第 1 家的那一行「等位时间太长，改成线上取号后等 15 分钟」的数字 15 在这家店的故事里找不到：删掉，或改成故事写的数字"), false);
  assert.equal(textOnly("第 1 个做法的归纳太长：最多 150 字，现在 172 字；删去次要的条件和数字"), true);
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
      shops: [{ caseIds: ["a"], line: "布草账单从每周 865 美元涨到 77,777 美元，此后每周都在上涨，合同和账单一直没人细看" }, { caseIds: ["c"], line: "顾问讲要对比" }] },
    { group: "fixed-costs-creep", title: "合同留底", summary: "合同要留底。", shops: [{ caseIds: ["f", "g"], line: "留底" }] },
  ] }, members);
  assert.equal(bad.grouping, null);
  for (const expected of [
    /^综述太长：最多 120 字，现在 1\d\d 字；删去次要的原因和做法/, /^第 1 个做法的标题太长：最多 20 字，现在 2\d 字；只写怎么做/,
    /^第 1 个做法的归纳太长：最多 150 字，现在 \d+ 字；删去次要的条件和数字，只留共同的做法和最关键的差别$/,
    /^第 1 个做法第 1 家的那一行太长：最多 24 字，现在 4\d 字；删去次要的条件和数字，只留这家店怎么做和一个关键数字或结果$/,
    /^第 1 个做法的归纳用了“个人饮食店”/, /^第 1 个做法第 2 家的那一行用了“讲”/, /^综述里写了数字 3：/, /归纳里的数字 99,999 在这个做法的故事里找不到/,
    /^第 1 个做法第 1 家的那一行「.+」的数字 77,777 在这家店的故事里找不到/, /^第 2 个做法第 1 家的那一行放了不同店家（s3、s4）的故事/,
  ]) {
    assert.ok(bad.problems.some((p) => expected.test(p)), `${expected} in ${bad.problems.join(" | ")}`);
  }
  assert.ok(!bad.problems.some((p) => /Too big|expected/.test(p)), "no schema message in English");
  assert.deepEqual(readGrouping({ overview: "各家逐项对比账单和合同。".repeat(11).slice(0, 125), methods: [{ group: "fixed-costs-creep", title: "逐行对比账单", summary: "逐行对比。", shops: [{ caseIds: ["a"], line: "对比" }] }] }, members).problems,
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
  // Its label repeats its country, which the pages write before it once.
  COFFEE: [{ material: "story", ...story({ title: "电费账单每周从865美元涨到1,503美元", shop: { name: null, label: "日本一家社区咖啡店", country: "日本", city: null, kind: "coffee", size: null, speaker: "owner" } }), parts: story().parts.map((p) => ({ heading: p.heading, blocks: [{ type: "text", text: "店里没有人批准过一次大涨价。" }] })) }],
  // Only a spoken word: sent back as an edit of the story, without the material (its title carries the marker);
  // in no situation, so the pages below count as before.
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
    const out = grouped === 1
      // A story of another group taken out of a practice that keeps two: sent back with the stories.
      ? { overview: "各家逐项对比账单。", methods: [{ group: "fixed-costs-creep", title: "逐项对比", summary: "对比账单和配方。", shops: [{ caseIds: [ids.FIRST, ids.SECOND], line: "对比" }, { caseIds: [ids.COFFEE], line: "对比" }] }] }
      : grouped === 2
      // Only a summary too long: an edit of the answer, without the stories.
      ? { overview: "各家逐项对比账单。", methods: [{ group: "fixed-costs-creep", title: "逐项对比", summary: "对比账单和配方。".repeat(25), shops: [{ caseIds: [ids.FIRST], line: "对比" }, { caseIds: [ids.COFFEE], line: "对比" }] }] }
      : { overview: "固定费用和食材钱都在没人核对时上涨，各家逐项对比账单和配方。", methods: [
        { group: "fixed-costs-creep", title: "把第一张和最新一张账单逐行对比", summary: "加州一家小酒馆的布草账单从每周 865 美元涨到 1,503 美元，逐行对比以后找出了多付的部分。",
          shops: [{ caseIds: [ids.FIRST], line: "布草账单四年涨了 74%" }, { caseIds: [ids.COFFEE], line: "电费账单每周涨到 1,503 美元" }] },
      ] };
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

/** A selected item of the test source, public a minute ago; its id. */
async function selectedItem(marker: string): Promise<string> {
  const { articleId } = await upsertMaterial({ sourceId: SRC, url: `https://example.com/${marker}-${T}`, title: `${marker}-${T}`, bodyText: `${marker}-${T} ${SOURCE}`, bodyStatus: "ok", via: "fetch", publishedAt: new Date() });
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, category, title_zh, summary_zh, score, selected) VALUES (${articleId}, 1, 'rule', 'pass', 'tip', ${marker}, '摘要', 60, true)`;
  await publishArticle(articleId, { releasedAt: new Date(Date.now() - 60_000) });
  return articleId;
}

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, tags) VALUES (${SRC}, 'Total Food Service（美国 · 餐饮媒体）', 'rss', 'T2', 'editorial', ${["美国", "媒体"]})`;
  for (const marker of Object.keys(answers)) ids[marker] = await selectedItem(marker);
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
  const cost = home.categories.find((c: { key: string }) => c.key === "cost");
  assert.deepEqual(cost.situations.map((s: { slug: string; count: Count; practice: string | null }) => [s.slug, s.count, s.practice]),
    [["busy-no-profit", { grouped: false, shops: 2, insiders: 0, cases: 3 }, null]], "not grouped yet: 条原文 on the page; the bistro's two stories one shop");
  assert.deepEqual(home.totals, { situations: 1, cases: 4 }, "no countries");
  for (const gone of ["/api/reference/kinds/dining", "/api/reference/kinds/coffee"]) assert.equal((await app.inject(gone)).statusCode, 404, `${gone}: no shop kinds' pages`);

  const before = await get("/api/reference/situations/busy-no-profit");
  assert.deepEqual([before.count, before.overview, before.groups], [{ grouped: false, shops: 2, insiders: 0, cases: 3 }, null, []]);
  assert.deepEqual(before.causes.map((g: { key: string }) => g.key), ["food-over-recipe", "fixed-costs-creep"], "the causes with stories, in the situation's order");
  const cards = before.rest.cases;
  assert.equal(cards.length, 2, "one list, a card a story before the grouping, a shop's newest alone");
  const bistro = cards.find((c: { id: string }) => c.id !== ids.COFFEE);
  assert.match(bistro.src, /^美国 · 餐饮媒体 · \d{4} 年 \d{1,2} 月$/, "country, the source's kind, the month");
  assert.deepEqual([[ids.FIRST, ids.SECOND].includes(bistro.id), bistro.reason, bistro.shop.others], [true, null, 1], "its shop's other story");

  const members = (await membersBySituation()).get("busy-no-profit")!;
  assert.equal(new Set(members.map((m) => m.teller)).size, 2);
  assert.deepEqual((await situationsToGroup(new Map([["busy-no-profit", members]]), 10)).map(([slug]) => slug), ["busy-no-profit"]);
  assert.deepEqual(await groupSituation("busy-no-profit", members), { stored: true, problems: [] });
  assert.equal(grouped, 3, "three answers: the practice that lost a story, the summary too long, then right");
  assert.ok(groupUsers[1]!.includes("店家：s1") && groupUsers[1]!.includes("程序已经按规则调整了上一次的输出") && /第 1 个做法移出了故事/.test(groupUsers[1]!),
    "a practice that lost a story goes back with the stories and the mends named");
  assert.ok(groupUsers[2]!.startsWith("下面是你按系统规则写好的归并") && /归纳太长：最多 150 字，现在 200 字/.test(groupUsers[2]!) && !groupUsers[2]!.includes("店家：s1"),
    "a text problem goes back as an edit of the answer, without the stories");
  assert.deepEqual(await situationsToGroup(new Map([["busy-no-profit", members]]), 10), [], "grouped again only when its stories change");

  // A practice in each of two causes: one list, not split by cause.
  const page = await get("/api/reference/situations/busy-no-profit");
  assert.deepEqual([page.count, page.groups, page.rest.cases], [{ grouped: true, shops: 2, insiders: 0, cases: 3 }, [], []]);
  const [practice] = page.rest.practices;
  assert.deepEqual([practice.title, practice.count, practice.sources], ["把第一张和最新一张账单逐行对比", { grouped: true, shops: 2, insiders: 0, cases: 2 }, undefined]);
  assert.deepEqual(practice.lines.map((l: { name: string; country: string; cases: number }) => [l.country, l.name, l.cases]), [["美国", "加州一家小酒馆", 1], ["日本", "一家社区咖啡店", 1]],
    "the coffee shop's country once");
  assert.deepEqual(page.rest.shops.map((s: { country: string; name: string; practices: Array<{ title: string; caseId: string; line: string | null }> }) =>
    [s.country, s.name, s.practices.map((p) => [p.title, p.caseId, typeof p.line])]), [["美国", "加州一家小酒馆", [["同一家店的另一笔账", ids.SECOND, "string"]]]],
    "the story the grouping left alone: a row, not a card");

  const listing = await get("/api/reference");
  const listed = listing.categories.find((c: { key: string }) => c.key === "cost").situations[0];
  assert.deepEqual([listed.count, listed.overview, listed.practice], [page.count, page.overview, practice.title], "the bistro's two practices: one shop; 代表做法");
  assert.deepEqual(listing.ranking, [listed], "店家谈得最多的事: the same row, its shops counted once");
  assert.deepEqual([listing.recent.id, listing.recent.who], [ids.COFFEE, "日本一家社区咖啡店"], "最近收进: the story taken in last, its country written once");

  const one = await get(`/api/reference/cases/${ids.FIRST}`);
  assert.deepEqual([one.source.name, one.source.kind, one.source.language, one.situation.title], ["Total Food Service", "餐饮媒体", "英文", "生意很忙，钱却留不下来"]);
  assert.equal(one.situation.practice, practice.key, "the story leads to its practice on the page");
  assert.deepEqual([one.item.summary, one.item.reason, one.item.title, one.item.selected], ["摘要", null, "FIRST", true], "the item's AI 导读 and 收录理由 come with the story");
  assert.deepEqual([one.shop.others, one.situations], [1, 1]);
  assert.equal((await get(`/api/reference/cases/${ids.SECOND}`)).situation.practice, page.rest.shops[0].practices[0].key, "a row's story leads to the row");

  const found = await get(`/api/reference/search?q=${encodeURIComponent("固定费用")}`);
  assert.deepEqual(found.situations.map((s: { slug: string; count: Count }) => [s.slug, s.count]), [["busy-no-profit", page.count]], "a cause's title finds its situation");
  const shop = await get(`/api/reference/search?q=${encodeURIComponent("corner bistro")}`);
  assert.deepEqual(shop.cases.map((c: { id: string; shop: { others: number } }) => [c.id, c.shop.others]), [[shop.cases[0].id, 1]], "a shop's stories: one card");
  assert.deepEqual(await get(`/api/reference/search?q=${encodeURIComponent("没有这个词")}`), { situations: [], cases: [] });
  assert.deepEqual(await get(`/api/reference/by-item/${ids.COFFEE}`), { id: ids.COFFEE, title: "电费账单每周从 865 美元涨到 1,503 美元", situation: { slug: "busy-no-profit", title: "生意很忙，钱却留不下来", count: page.count } });
  for (const none of [ids.THIN, "no-such-item"]) assert.equal((await app.inject(`/api/reference/by-item/${none}`)).statusCode, 404);

  const sitemap = (await reference.sitemap!.entries!()).map((e) => e.loc);
  for (const loc of ["/reference/busy-no-profit", `/reference/cases/${ids.FIRST}`, `/reference/shops/${one.shop.key}`]) assert.ok(sitemap.includes(loc), loc);
  assert.ok(!sitemap.includes("/") && !sitemap.some((loc) => loc.startsWith("/reference/kinds/")), "the site lists /; no shop kinds' pages");

  for (const hidden of [ids.THIN, ids.NEWS, ids.WRONG]) assert.equal((await app.inject(`/api/reference/cases/${hidden}`)).statusCode, 404);
  assert.equal((await app.inject("/api/reference/situations/no-such-situation")).statusCode, 404);
  await sql`UPDATE publications SET visibility = 'withdrawn' WHERE article_id = ${ids.SECOND!}`;
  assert.equal((await app.inject(`/api/reference/cases/${ids.SECOND}`)).statusCode, 404);
  const left = await get("/api/reference/situations/busy-no-profit");
  assert.deepEqual([left.rest.practices.length, left.rest.shops.length], [1, 0], "a withdrawn story's practice leaves with it");
  assert.equal((await get(`/api/reference/cases/${ids.FIRST}`)).shop, null, "a shop with one case left has no page to point to");
  await sql`UPDATE publications SET visibility = 'withdrawn' WHERE article_id = ${ids.COFFEE!}`;
  const after = await get("/api/reference");
  assert.deepEqual([after.categories, after.ranking, after.recent], [[], [], null], "one case left is not a page");
});

test("a page splits by cause only where two causes have two practices each; one shop's practices are rows under one line; a shop has one name", async () => {
  // 招不到人, written and grouped by hand: Sun Diner in Japan (three stories, its newest label naming its city),
  // Moon Cafe and Star Bar in the United States, and a noodle shop a publication names no further.
  const at = (minute: number) => new Date(Date.UTC(2026, 9, 1, 0, minute));
  const shop = (name: string | null, label: string, country: string, speaker: Shop["speaker"] = "owner"): Shop => ({ name, label, country, city: null, kind: null, size: null, speaker });
  const sun = (label: string) => shop("Sun Diner", label, "日本");
  const moon = shop("Moon Cafe", "一家咖啡店", "美国");
  const stories: Array<[marker: string, shopKey: string | null, minute: number, group: string, owner: Shop]> = [
    ["H1", "sun-diner", 1, "where-to-find", sun("日本一家家庭食堂")], ["H7", "sun-diner", 2, "where-to-find", sun("一家食堂")],
    ["H3", "moon-cafe", 3, "where-to-find", moon], ["H4", "star-bar", 4, "interview", shop("Star Bar", "美国一家酒吧", "美国")],
    ["H5", "moon-cafe", 5, "interview", moon], ["H2", "sun-diner", 6, "where-to-find", sun("日本大阪一家家庭食堂")],
    ["H6", null, 7, "interview", shop(null, "一家面馆", "中国", "media")],
  ];
  const id: Record<string, string> = {};
  for (const [marker, key, minute, group, owner] of stories) {
    id[marker] = await selectedItem(marker);
    const told = story({ title: `${marker} 的故事`, shop: owner, placements: [{ situation: "hiring", group, card: "店主说明了怎么招人。" }] });
    await sql`UPDATE publications SET timeline_at = ${at(minute)} WHERE article_id = ${id[marker]!}`;
    await sql`INSERT INTO reference_cases (article_id, revision, status, story, situations, shop_key, prompt_version, created_at)
      VALUES (${id[marker]!}, 1, 'story', ${sql.json(told as never)}, ${["hiring"]}, ${key}, 'test', ${at(minute)})`;
  }
  const method = (key: string, group: string, title: string, shops: Array<[string, string]>) =>
    ({ key, group, title, summary: "各家的做法。", shops: shops.map(([marker, line]) => ({ caseIds: [id[marker]!], line })) });
  const store = (methods: unknown[]) => sql`
    INSERT INTO reference_situations (slug, members, tried, overview, methods, prompt_version) VALUES ('hiring', 'test', 'test', '各家从门口、熟人和学校找人。', ${sql.json(methods as never)}, ${PROMPT_VERSION})
    ON CONFLICT (slug) DO UPDATE SET methods = EXCLUDED.methods`;
  const door = method("p1", "where-to-find", "在店门口贴招聘启事", [["H3", "门口贴启事，一周来了三个人"], ["H1", "启事上写明时薪"]]);
  const sunAlone = [method("p2", "where-to-find", "请老员工介绍朋友", [["H2", "介绍的朋友留得更久"]]), method("p3", "where-to-find", "在附近大学招兼职", [["H7", "在附近大学招兼职"]])];
  await store([door, ...sunAlone, method("p4", "interview", "面试时请应聘者试做一天", [["H4", "试做一天再决定录用"]]),
    method("p5", "interview", "面试只问三个问题", [["H5", "问以前为什么离职"]]), method("p6", "interview", "把招聘启事写成一段故事", [["H6", "启事里写店的来历"]])]);

  const page = await get("/api/reference/situations/hiring");
  assert.deepEqual(page.count, { grouped: true, shops: 4, insiders: 0, cases: 7 });
  assert.deepEqual(page.groups.map((g: { key: string }) => g.key), ["where-to-find", "interview"], "two causes of three practices each: by cause");
  const [find, interview] = page.groups;
  assert.deepEqual(find.practices.map((p: { key: string; lines: Array<{ country: string; name: string }> }) => [p.key, p.lines.map((l) => `${l.country} · ${l.name}`)]),
    [["p1", ["美国 · 一家咖啡店", "日本 · 大阪一家家庭食堂"]]], "two shops: a card; Sun Diner by its newest label, its country once");
  assert.deepEqual(find.shops, [{ country: "日本", name: "大阪一家家庭食堂", practices: [
    { key: "p2", title: "请老员工介绍朋友", caseId: id.H2, line: "介绍的朋友留得更久", cases: 1 },
    { key: "p3", title: "在附近大学招兼职", caseId: id.H7, line: null, cases: 1 },
  ] }], "one shop's two practices under one line, newest first; a line that repeats its title left out");
  assert.deepEqual(interview.shops.map((s: { country: string; name: string; practices: Array<{ key: string }> }) => [s.country, s.name, s.practices.map((p) => p.key)]),
    [["中国", "一家面馆", ["p6"]], ["美国", "一家咖啡店", ["p5"]], ["美国", "一家酒吧", ["p4"]]], "a row each, newest first");
  assert.deepEqual([interview.practices, page.rest], [[], { practices: [], shops: [], cases: [] }]);
  assert.equal((await get("/api/reference/shops/sun-diner")).shop.label, "大阪一家家庭食堂", "the shop page names it as the lists do");

  // The interview's three shops in one practice: one cause of two practices or more is not enough to split.
  await store([door, ...sunAlone, method("p456", "interview", "面试时请应聘者试做一天", [["H4", "试做一天再决定录用"], ["H5", "问以前为什么离职"], ["H6", "启事里写店的来历"]])]);
  const flat = await get("/api/reference/situations/hiring");
  assert.deepEqual(flat.groups, [], "one list");
  assert.deepEqual(flat.causes.map((g: { key: string }) => g.key), ["where-to-find", "interview"], "the causes still numbered under the picture");
  assert.deepEqual([flat.rest.practices.map((p: { key: string }) => p.key), flat.rest.shops.map((s: { name: string }) => s.name)], [["p456", "p1"], ["大阪一家家庭食堂"]],
    "the most shops first");

  const home = await get("/api/reference");
  assert.deepEqual(home.ranking.map((s: { slug: string; practice: string; count: Count }) => [s.slug, s.practice, s.count.shops]), [["hiring", "面试时请应聘者试做一天", 4]],
    "代表做法: the practice the most shops tell");
  assert.deepEqual([home.recent.id, home.recent.who], [id.H6, "中国一家面馆"], "the story taken in last");
  assert.deepEqual(home.categories.map((c: { key: string }) => c.key), ["people"]);

  // A practice two shops told when it was grouped, one shop's since its stories were written again: a row that
  // opens the newer story and counts both, not a story lost.
  await sql`UPDATE reference_cases SET shop_key = 'moon-cafe' WHERE article_id = ${id.H4!}`;
  await store([door, ...sunAlone, method("p45", "interview", "面试时请应聘者试做一天", [["H4", "试做一天再决定录用"], ["H5", "问以前为什么离职"]]),
    method("p6", "interview", "把招聘启事写成一段故事", [["H6", "启事里写店的来历"]])]);
  const [, rewritten] = (await get("/api/reference/situations/hiring")).groups;
  assert.deepEqual(rewritten.shops.map((s: { country: string; name: string; practices: Array<{ key: string; caseId: string; line: string | null; cases: number }> }) =>
    [s.country, s.name, s.practices.map((p) => [p.key, p.caseId, p.line, p.cases])]),
  [["中国", "一家面馆", [["p6", id.H6, "启事里写店的来历", 1]]], ["美国", "一家咖啡店", [["p45", id.H5, "问以前为什么离职", 2]]]]);

  // 代表做法 is the practice the most shops tell: two shops before one shop and an insider, though theirs is newer.
  // 最近收进 is the story the library took in last, not the newest original; a name that keeps its country has it once.
  await sql`UPDATE reference_cases SET story = jsonb_set(story, '{shop,speaker}', '"adviser"') WHERE article_id = ${id.H6!}`;
  await store([door, ...sunAlone, method("p56", "interview", "面试只问三个问题", [["H6", "启事里写店的来历"], ["H5", "问以前为什么离职"]])]);
  await sql`UPDATE reference_cases SET created_at = ${at(10)} WHERE article_id = ${id.H3!}`;
  await sql`UPDATE reference_cases SET story = jsonb_set(story, '{shop,label}', '"美国家庭咖啡店"') WHERE article_id = ${id.H5!}`;
  const later = await get("/api/reference");
  assert.deepEqual([later.ranking[0].practice, later.recent.id, later.recent.who], ["在店门口贴招聘启事", id.H3, "美国家庭咖啡店"]);

  // A situation the library lists later comes first in its category when more shops tell it.
  for (const [marker, minute] of [["R1", 11], ["R2", 12], ["R3", 13]] as const) {
    id[marker] = await selectedItem(marker);
    const told = story({ title: `${marker} 的故事`, shop: shop(null, "一家面馆", "中国", "media"), placements: [{ situation: "retention", group: null, card: "店主说明了怎么留人。" }] });
    await sql`INSERT INTO reference_cases (article_id, revision, status, story, situations, shop_key, prompt_version, created_at)
      VALUES (${id[marker]!}, 1, 'story', ${sql.json(told as never)}, ${["retention"]}, ${null}, 'test', ${at(minute)})`;
  }
  assert.deepEqual((await get("/api/reference")).categories[0].situations.map((s: { slug: string; count: Count }) => [s.slug, s.count.shops]), [["retention", 3], ["hiring", 2]]);
});

test("the sample pages are served at their unlisted address, kept from search engines", async () => {
  const res = await app.inject(SAMPLE_PATH);
  assert.equal(res.statusCode, 200);
  assert.match(String(res.headers["content-type"]), /text\/html/);
  assert.equal(res.headers["x-robots-tag"], "noindex");
  assert.ok(res.body.startsWith("<!doctype html>") && res.body.includes("生意很忙，钱却留不下来"));
});
