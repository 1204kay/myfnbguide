// A parts bar adds its items up, so it is only for items that make up one amount the writer can name; and key figures
// in Chinese numerals are figures. Pure checks, no database.
import assert from "node:assert/strict";
import { test } from "node:test";
import { blocking, checkStory, pictureProblems, problemKind } from "../backend/checks.ts";
import { pickFigure } from "../backend/share.ts";
import { figureSplit, isFigure } from "../format.ts";
import type { Block, CaseStory, PartsBlock } from "../types.ts";

const SOURCE = "The pastry costs 4 yuan, the box 1 yuan and the filling 3 yuan; menu prices are 10, 12 and 4 dollars; fees 2.5% and 3%; revenue 13564, spending 8000.";
const parts = (over: Partial<PartsBlock>): PartsBlock => ({
  type: "parts", whole: "一个蛋挞的出厂成本", unit: "元", items: [{ label: "挞皮", value: 4 }, { label: "包装盒", value: 1 }, { label: "蛋挞液", value: 3 }],
  against: null, caption: "媒体测算的出厂成本", total: 8, gap: null, ...over,
});
const story = (blocks: Block[]): CaseStory => ({
  title: "一根蛋挞的出厂成本约 8 元", lead: "一家蛋挞店把成本拆开算。", who: "一家蛋挞店的店主。",
  parts: [{ heading: "成本拆开算", blocks }], open: null,
  shop: { name: null, label: "一家蛋挞店", country: "中国", city: null, kind: null, size: null, speaker: "owner" },
  placements: [{ situation: "busy-no-profit", group: null, card: "他把一个蛋挞的成本拆开算。" }],
});
const partsProblems = (b: PartsBlock) => checkStory(story([b]), SOURCE).filter((p) => /组成图/.test(p));

test("a parts bar names the one amount its items make up, or goes back and holds the story", () => {
  assert.deepEqual(partsProblems(parts({})), [], "items that make up a named whole pass");
  for (const whole of [undefined, null, "", "  "]) {
    const found = partsProblems(parts({ whole }));
    assert.equal(found.length, 1, `whole ${JSON.stringify(whole)}: ${found.join(" / ")}`);
    assert.match(found[0]!, /没有写 whole.*list 或 numbers/);
    assert.ok(blocking(found[0]!), "a sum of no whole is a misstatement: it blocks, as an unfound number does");
    assert.equal(problemKind(found[0]!), "组成图不是一个整体");
  }
});

test("rates and scores are never parts: they add up to nothing", () => {
  for (const unit of ["%", "％", "百分点", "分", "度"]) {
    const found = partsProblems(parts({ whole: "支付手续费", unit, items: [{ label: "刷卡", value: 2.5 }, { label: "扫码", value: 3 }], total: 5.5 }));
    assert.equal(found.length, 1, unit);
    assert.match(found[0]!, /比率和分数/);
    assert.ok(blocking(found[0]!));
  }
  assert.deepEqual(partsProblems(parts({ unit: "万元" })), [], "a unit that only contains 元 is money");
});

test("with an income set against them the whole still names the parts, not the income", () => {
  const spending = { whole: "每月开支", unit: "美元", items: [{ label: "房租", value: 5000 }, { label: "人工", value: 3000 }], against: { label: "收入", value: 13564 }, total: 8000, gap: 5564 };
  assert.deepEqual(partsProblems(parts(spending)), []);
  const found = partsProblems(parts({ ...spending, whole: "收入" }));
  assert.equal(found.length, 1);
  assert.match(found[0]!, /写成了对照的“收入”/);
});

test("key figures in Chinese numerals are split and drawn on a share card like figures in digits", () => {
  assert.deepEqual(figureSplit("接近一万家"), ["接近", "一万", "家"]);
  assert.deepEqual(figureSplit("1.9 亿元"), ["", "1.9", "亿元"]);
  assert.deepEqual(figureSplit("超过三成"), ["超过", "三成", ""]);
  assert.deepEqual(figureSplit("30 万—40 万元"), ["", "30 万—40", "万元"]);
  assert.deepEqual(figureSplit("很多"), ["", "很多", ""]);
  assert.ok(isFigure("接近一万家") && isFigure("1.9 亿元") && isFigure("近两小时"));
  assert.ok(!isFigure("很多") && !isFigure("贵州豆米火锅"));
  const numbers: Block = { type: "numbers", point: "一场联名活动的规模", items: [{ label: "参与门店", value: "接近一万家" }, { label: "7 个月带动交易额", value: "1.9 亿元" }], caption: null };
  assert.equal(pickFigure(story([numbers]))?.type, "numbers");
  assert.equal(pickFigure(story([{ ...numbers, items: [{ label: "客人", value: "很多" }] } as Block])), null, "a figure with no number is still passed over");
});

test("prices or options to pick from are no whole, however the writer names them", () => {
  for (const whole of ["标准展位与空场地报价", "菜单上的价格", "四种模式的启动资金", "毛坯店面装修的每坪单价"]) {
    const found = partsProblems(parts({ whole }));
    assert.equal(found.length, 1, whole);
    assert.match(found[0]!, /可以另选/);
    assert.ok(blocking(found[0]!));
  }
  for (const whole of ["开店前期花费", "一根超长蛋挞的出厂成本", "一笔订单的平台扣款"]) assert.deepEqual(partsProblems(parts({ whole })), [], whole);
});

test("a numbers card that only repeats the heading's figures goes back", () => {
  const card = (value: string): Block => ({ type: "numbers", point: "会员可享的折扣", items: [{ label: "一杯的折扣", value }], caption: null });
  const repeats = (heading: string, value: string) => checkStory({ ...story([card(value)]), parts: [{ heading, blocks: [card(value)] }] }, "63% 30 8").filter((p) => /小标题.*已经写了/.test(p));
  assert.equal(repeats("会员买一杯享 63% 折扣", "63%").length, 1);
  assert.equal(repeats("会员买一杯能省一大半", "63%").length, 0, "a heading without the figure keeps its card");
});

test("a story with no picture goes back once more for one, and stands as written after the last try", () => {
  const words: Block[] = [{ type: "text", text: "他把成本拆开算。" }, { type: "quote", text: "算清楚才知道。", who: "店主" }, { type: "list", items: [{ lead: null, text: "挞皮" }] }];
  const found = pictureProblems(story(words));
  assert.equal(found.length, 1, "text, a quote and a list are all words: no picture yet");
  assert.match(found[0]!, /没有一张图.*change.*flow/);
  assert.doesNotMatch(found[0]!, /不放/, "the first send-back asks for a picture without offering a way out");
  assert.match(pictureProblems(story(words), true)[0]!, /撑不起.*不放/, "the second may conclude there is no fitting picture: no filler (Kay 10-17)");
  assert.ok(!blocking(found[0]!), "a missing picture never keeps a story from readers");
  assert.equal(problemKind(found[0]!), "没有图");
  for (const b of [parts({}), { type: "flow", steps: ["拆开算", "比价", "换供应商"] }, { type: "change", before: { label: "以前", text: "不算" }, after: { label: "现在", text: "逐项算" }, caption: null }] as Block[]) {
    assert.deepEqual(pictureProblems(story([...words, b])), [], `${b.type} is a picture`);
  }
});
