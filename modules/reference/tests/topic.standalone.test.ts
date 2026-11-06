// A situation's 综合整理 (backend/topic.ts) on made-up items and a scripted model: what the check finds 严重 is cut and
// checked again; an article still wrong after that is held, not shown; a citation of no item given is 严重 though the
// checker misses it; a heading the writer wrote as 「第 1 组」 still finds its cause. No database, no model.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Ask } from "../backend/issue.ts";
import { affordable, composeTopic, DAY_CAP_USD, needsRewrite, tidy, groupNo, topicMarkdown, type TopicItem, type TopicProblem, type TopicText } from "../backend/topic.ts";

const GROUPS = [{ no: "1", key: "before-opening", title: "是否该开这家店？" }, { no: "2", key: "build-out", title: "资金用在哪里、何处能省？" }];
const item = (n: number, group: string): TopicItem => ({ n, id: `art-${n}`, title: `第 ${n} 条`, src: "日本", summary: `导读 ${n}`, points: `要点 ${n}`, group });
const ITEMS = [item(1, "1"), item(2, "1"), item(3, "2")];
const ARTICLE: TopicText = {
  lead: ["几家店主都先定方向〔1,2〕。", "设备能用二手〔3〕。", "周转金要另算〔2〕。"],
  sections: [
    { group: "第 1 组", paragraphs: ["几家店主都先定方向〔1,2〕。饺子店店主说先决定不做什么〔1〕。"] },
    { group: "2", paragraphs: ["设备能用二手〔3〕。"] },
  ],
};

/** A writer that writes ARTICLE, and a checker that answers each check in turn with the problems given. */
function scripted(checks: TopicProblem[][]): { write: Ask; check: Ask; checked: string[] } {
  const checked: string[] = [];
  const write = (async () => ARTICLE) as Ask;
  const check = (async (_p: string, _s: string, user: unknown) => {
    checked.push(String(user));
    return { problems: checks[checked.length - 1] ?? [] };
  }) as Ask;
  return { write, check, checked };
}
const serious = (quote: string): TopicProblem => ({ quote, why: "〔1〕是面包店店长，不是饺子店店主", severity: "严重" });

test("an article the check finds nothing in is shown as written, checked once", async () => {
  const ask = scripted([[{ quote: "设备能用二手〔3〕。", why: "说重了一点", severity: "轻" }]]);
  const c = await composeTopic("开店前的准备和开销", GROUPS, ITEMS, ask);
  assert.equal(c.status, "shown");
  assert.deepEqual(c.article, ARTICLE, "a 轻 problem is listed, not cut");
  assert.equal(ask.checked.length, 1);
});

test("a 严重 sentence is cut and the rest checked again: shown when that finds none, held when it still finds one", async () => {
  const wrong = "饺子店店主说先决定不做什么〔1〕。";
  const fixed = await composeTopic("开店前的准备和开销", GROUPS, ITEMS, scripted([[serious(wrong)], []]));
  assert.equal(fixed.status, "shown");
  assert.deepEqual(fixed.article.sections[0]!.paragraphs, ["几家店主都先定方向〔1,2〕。"]);
  assert.ok(!topicMarkdown("开店前的准备和开销", fixed.article, GROUPS).includes("饺子店"));
  assert.deepEqual(fixed.draft, ARTICLE, "the draft is kept as written, to see what was cut");

  const held = await composeTopic("开店前的准备和开销", GROUPS, ITEMS, scripted([[serious(wrong)], [serious("设备能用二手〔3〕。")]]));
  assert.equal(held.status, "held");
});

test("a citation of no item given is 严重 though the checker finds nothing", async () => {
  const ask = scripted([[], []]);
  const c = await composeTopic("开店前的准备和开销", GROUPS, ITEMS.filter((i) => i.n !== 3), ask);
  assert.ok(c.found.some((p) => p.severity === "严重" && p.quote.includes("〔3〕")));
  assert.ok(!topicMarkdown("开店前的准备和开销", c.article, GROUPS).includes("〔3〕"), "its sentences are cut");
  assert.equal(ask.checked.length, 2);
});

test("a heading written as 「第 1 组」 is its cause's title", () => {
  assert.equal(groupNo("第 1 组"), "1");
  assert.equal(groupNo("2"), "2");
  assert.ok(topicMarkdown("开店前的准备和开销", ARTICLE, GROUPS).includes("## 是否该开这家店？"));
});

test("a run is not started when a write and two checks at their worst would pass the day's cap", () => {
  const [w, c] = ["deepseek-flash-think-llm", "deepseek-flash-llm"];
  assert.equal(affordable(66_000, w, c, 0), true, "opening-cost's 66k characters fit a fresh day");
  assert.equal(affordable(66_000, w, c, DAY_CAP_USD - 0.1), false, "not what is left of the day's cap after all but US$0.1");
  assert.equal(affordable(10_000_000, w, c, 0), false, "a situation too long for the cap");
  assert.equal(affordable(1_000, "claude-opus-5-5", c, 0), false, "a model without a price");
});

test("a cut leaves no 「；。」, no 「。。」 and no paragraph opening with a stop", () => {
  assert.equal(tidy("四成以上不到500万日元〔99〕；。"), "四成以上不到500万日元〔99〕。", "the first article on the site, 11-06");
  assert.equal(tidy("算进总价〔72〕。。"), "算进总价〔72〕。");
  assert.equal(tidy("。澳大利亚咖啡店净利率约10%至15%〔114〕"), "澳大利亚咖啡店净利率约10%至15%〔114〕");
  assert.equal(tidy("周转金常见按每月经费3到6个月准备；"), "周转金常见按每月经费3到6个月准备。");
  assert.equal(tidy("；。"), "");
  assert.equal(tidy("先定方向〔1〕；再定菜单〔2〕。"), "先定方向〔1〕；再定菜单〔2〕。", "a 「；」 between clauses stays");
});

test("an article is written again for an item it did not read or for prompts changed since, not otherwise", () => {
  const last = { item_ids: ["a", "b"], version: "v1" };
  assert.equal(needsRewrite(undefined, ["a"], "v1"), true, "none yet");
  assert.equal(needsRewrite(undefined, [], "v1"), false, "nothing to write from");
  assert.equal(needsRewrite(last, ["a", "b"], "v1"), false);
  assert.equal(needsRewrite(last, ["b"], "v1"), false, "an item gone is no reason");
  assert.equal(needsRewrite(last, ["a", "b", "c"], "v1"), true, "a new item");
  assert.equal(needsRewrite(last, ["a", "b"], "v2"), true, "other prompts (Kay 11-06: 只有日本)");
});
