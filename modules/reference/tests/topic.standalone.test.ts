// A situation's 综合整理 (backend/topic.ts) on made-up items and a scripted model: what the check finds 严重 is cut and
// checked again; an article still wrong after that is held, not shown; a citation of no item given is 严重 though the
// checker misses it; a heading the writer wrote as 「第 1 组」 still finds its cause. No database, no model.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Ask } from "../backend/issue.ts";
import { affordable, composeTopic, groupNo, topicMarkdown, type TopicItem, type TopicProblem, type TopicText } from "../backend/topic.ts";

const GROUPS = [{ no: "1", title: "开店前先想清楚" }, { no: "2", title: "装修和设备" }];
const item = (n: number, group: string): TopicItem => ({ n, id: `art-${n}`, title: `第 ${n} 条`, src: "日本", summary: `导读 ${n}`, points: `要点 ${n}`, group });
const ITEMS = [item(1, "1"), item(2, "1"), item(3, "2")];
const ARTICLE: TopicText = {
  title: "开店要准备什么：先想清楚做什么店",
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
  assert.ok(!topicMarkdown(fixed.article, GROUPS).includes("饺子店"));
  assert.deepEqual(fixed.draft, ARTICLE, "the draft is kept as written, to see what was cut");

  const held = await composeTopic("开店前的准备和开销", GROUPS, ITEMS, scripted([[serious(wrong)], [serious("设备能用二手〔3〕。")]]));
  assert.equal(held.status, "held");
});

test("a citation of no item given is 严重 though the checker finds nothing", async () => {
  const ask = scripted([[], []]);
  const c = await composeTopic("开店前的准备和开销", GROUPS, ITEMS.filter((i) => i.n !== 3), ask);
  assert.ok(c.found.some((p) => p.severity === "严重" && p.quote.includes("〔3〕")));
  assert.ok(!topicMarkdown(c.article, GROUPS).includes("〔3〕"), "its sentences are cut");
  assert.equal(ask.checked.length, 2);
});

test("a heading written as 「第 1 组」 is its cause's title", () => {
  assert.equal(groupNo("第 1 组"), "1");
  assert.equal(groupNo("2"), "2");
  assert.ok(topicMarkdown(ARTICLE, GROUPS).includes("## 开店前先想清楚"));
});

test("a run is not started when a write and two checks at their worst would pass the day's US$0.3", () => {
  const [w, c] = ["deepseek-flash-think-llm", "deepseek-flash-llm"];
  assert.equal(affordable(66_000, w, c, 0), true, "opening-cost's 66k characters fit a fresh day");
  assert.equal(affordable(66_000, w, c, 0.2), false, "not what is left after US$0.2");
  assert.equal(affordable(300_000, w, c, 0), false, "a situation too long for the cap");
  assert.equal(affordable(1_000, "claude-opus-5-5", c, 0), false, "a model without a price");
});
