// A situation's 综合整理 (backend/topic.ts) on made-up items and a scripted model: what the check finds 严重 is cut and
// checked again; an article still wrong after that is held, not shown; a citation of no item given is 严重 though the
// checker misses it; a heading the writer wrote as 「第 1 组」 still finds its cause. No database, no model.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { Ask } from "../backend/issue.ts";
import { affordable, asTemplate, composeTopic, cutSentences, keepTemplate, DAY_CAP_USD, needsRewrite, tidy, groupNo, topicMarkdown, type TopicItem, type TopicProblem, type TopicText } from "../backend/topic.ts";

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

test("a point whose conclusion is cut goes whole: its reason alone is not left", async () => {
  const c = await composeTopic("开店前的准备和开销", GROUPS, ITEMS, scripted([[serious("几家店主都先定方向〔1,2〕。")], []]));
  assert.deepEqual(c.article.lead, ["设备能用二手〔3〕。", "周转金要另算〔2〕。"]);
  assert.deepEqual(c.article.sections.map((s) => s.group), ["2"], "the first cause's only point went with its conclusion");
});

test("a point is kept when nothing in it is cut, though its conclusion has a space before the stop", () => {
  const a: TopicText = { lead: ["先定方向〔1〕 。因为后面的判断都靠它〔2〕。"], sections: [{ group: "1", paragraphs: ["设备能用二手〔3〕 。"] }] };
  const c = cutSentences(a, ["别的句子〔9〕。"]);
  assert.deepEqual(c.lead, ["先定方向〔1〕。因为后面的判断都靠它〔2〕。"]);
  assert.deepEqual(c.sections[0]!.paragraphs, ["设备能用二手〔3〕。"]);
});

test("a citation of no item given is 严重 though the checker finds nothing", async () => {
  const ask = scripted([[], []]);
  const c = await composeTopic("开店前的准备和开销", GROUPS, ITEMS.filter((i) => i.n !== 3), ask);
  assert.ok(c.found.some((p) => p.severity === "严重" && p.quote.includes("〔3〕")));
  assert.ok(!topicMarkdown("开店前的准备和开销", c.article, GROUPS).includes("〔3〕"), "its sentences are cut");
  assert.equal(ask.checked.length, 2);
});

test("a rewrite writes from the article shown, in the numbers its items have now, its new items marked", async () => {
  // Shown when the page had items 1–3; since then a new item came first in the first cause, and art-2 is gone.
  const shown = { article: ARTICLE, groups: GROUPS, sources: [1, 2, 3].map((n) => ({ n, id: `art-${n}` })), itemIds: ["art-1", "art-2", "art-3"] };
  const now = [{ ...item(1, "1"), id: "art-new" }, { ...item(2, "1"), id: "art-1" }, { ...item(3, "2"), id: "art-3" }];
  const t = asTemplate(shown, GROUPS, now);
  assert.deepEqual(t.article.lead, ["几家店主都先定方向〔2〕。", "设备能用二手〔3〕。", "周转金要另算。"], "1 is 2 now, 3 is 3, 2 is gone");
  assert.deepEqual(t.article.sections.map((s) => s.group), ["1", "2"], "「第 1 组」 is its cause's number");
  assert.deepEqual([...t.fresh], [1]);

  let given = "";
  const ask = scripted([[]]);
  const write = (async (_p: string, system: string, user: unknown) => { given = `${system}\n${String(user)}`; return ARTICLE; }) as Ask;
  await composeTopic("开店前的准备和开销", GROUPS, now, { ...ask, write }, t);
  assert.ok(given.includes("# 样板") && given.includes("几家店主都先定方向〔2〕。"), "the template is in what the writer reads");
  assert.ok(given.includes("〔1〕（新）") && !given.includes("〔2〕（新）"), "only the new item is marked");
  assert.ok(!ask.checked[0]!.includes("（新）") && !ask.checked[0]!.includes("# 样板"), "the check reads the article and items only");
});

test("a sentence citing no item is 严重 though the checker finds nothing: a template's sentence whose items are gone", async () => {
  const bare: TopicText = { ...ARTICLE, lead: ["几家店主都先定方向〔1,2〕。", "设备能用二手〔3〕。", "周转金要另算。"] };
  const ask = scripted([[], []]);
  const c = await composeTopic("开店前的准备和开销", GROUPS, ITEMS, { ...ask, write: (async () => bare) as Ask });
  assert.ok(c.found.some((p) => p.severity === "严重" && p.quote === "周转金要另算。"));
  assert.deepEqual(c.article.lead, ["几家店主都先定方向〔1,2〕。", "设备能用二手〔3〕。"], "it is cut");
});

// The template as asTemplate gives it: the article shown, in this write's numbers; item 4 (cause 2) is new.
const TEMPLATE: TopicText = {
  lead: ["几家店主都先定方向〔1,2〕。", "设备能用二手〔3〕。", "周转金要另算〔2〕。"],
  sections: [
    { group: "1", paragraphs: ["几家店主都先定方向〔1,2〕。因为后面的判断都靠它〔1〕。"] },
    { group: "2", paragraphs: ["设备能用二手〔3〕。"] },
  ],
};
const WITH_NEW = [...ITEMS, item(4, "2")];
const fresh4 = { article: TEMPLATE, fresh: new Set([4]) };

test("a template's sentence keeps its numbers: a number the writer adds of an item the template read is taken off", () => {
  // 11-07 trial: no new item, and a third of the sentences came back with more numbers of items already read.
  const written: TopicText = { lead: ["几家店主都先定方向〔1,2,3〕。", "设备能用二手〔1,3〕。", "周转金要另算〔2〕。"], sections: TEMPLATE.sections };
  const k = keepTemplate(written, { article: TEMPLATE, fresh: new Set() }, GROUPS);
  assert.deepEqual(k.article, TEMPLATE, "the numbers change only when an item is gone (asTemplate), not here");
  assert.equal(k.kept.size, 4);
  // The same in a card a new item changed: only 4 is added, to the sentence it was added to.
  const touched: TopicText = { lead: ["几家店主都先定方向〔1,2,3〕。", "设备能用二手〔3,4〕。", "周转金要另算〔1,2〕。"], sections: TEMPLATE.sections };
  assert.deepEqual(keepTemplate(touched, fresh4, GROUPS).article.lead, ["几家店主都先定方向〔1,2〕。", "设备能用二手〔3,4〕。", "周转金要另算〔2〕。"]);
});

test("a new item's number is added to the template's sentence it supports, and that sentence is checked", () => {
  const written: TopicText = { lead: TEMPLATE.lead, sections: [TEMPLATE.sections[0]!, { group: "2", paragraphs: ["设备能用二手〔1,3,4〕。"] }] };
  const k = keepTemplate(written, fresh4, GROUPS);
  assert.deepEqual(k.article.sections[1]!.paragraphs, ["设备能用二手〔3,4〕。"], "4 is new, 1 the template read");
  assert.ok(!k.kept.has("设备能用二手〔3,4〕。"));
});

test("a cause or the card citing no new item is the template's as it was: words the writer changed there go back", () => {
  const written: TopicText = {
    lead: ["几家店主都先定好方向〔1,2〕。", "设备能用二手〔3〕。", "周转金要另算〔2〕。"],
    sections: [{ group: "1", paragraphs: ["几家店主都先定方向〔1,2〕。", "另一条没有新原文的结论〔1〕。"] }, { group: "2", paragraphs: ["设备多用二手〔3〕。另找供应商〔4〕。"] }],
  };
  const k = keepTemplate(written, fresh4, GROUPS);
  assert.deepEqual(k.article.lead, TEMPLATE.lead);
  assert.deepEqual(k.article.sections[0], TEMPLATE.sections[0]);
  assert.deepEqual(k.article.sections[1]!.paragraphs, ["设备多用二手〔3〕。另找供应商〔4〕。"], "a cause a new item changed is the writer's, words changed and all");
  assert.ok(!k.kept.has("设备多用二手〔3〕。"), "a sentence in other words than the template's is checked, whatever it cites");
});

test("a template's sentence whose items are all gone takes the numbers the writer gave the same words", () => {
  const bare: TopicText = { ...TEMPLATE, lead: ["几家店主都先定方向〔1,2〕。", "设备能用二手〔3〕。", "周转金要另算。"] };
  const written: TopicText = { ...TEMPLATE, lead: ["几家店主都先定方向〔1,2〕。", "设备能用二手〔3〕。", "周转金要另算〔1〕。"] };
  const k = keepTemplate(written, { article: bare, fresh: new Set() }, GROUPS);
  assert.deepEqual(k.article.lead[2], "周转金要另算〔1〕。");
  assert.ok(!k.kept.has("周转金要另算〔1〕。"));
});

test("the check's 严重 on a template's sentence kept as it was is listed, not cut; on a changed one it is cut", async () => {
  const written: TopicText = { lead: TEMPLATE.lead, sections: [TEMPLATE.sections[0]!, { group: "2", paragraphs: ["设备多用二手〔3,4〕。"] }] };
  const checked: string[] = [];
  const check = (async (_p: string, _s: string, user: unknown) => {
    checked.push(String(user));
    return { problems: checked.length === 1 ? [serious("周转金要另算〔2〕。"), serious("设备多用二手〔3,4〕。")] : [serious("周转金要另算〔2〕。")] };
  }) as Ask;
  const c = await composeTopic("开店前的准备和开销", GROUPS, WITH_NEW, { write: (async () => written) as Ask, check }, fresh4);
  assert.equal(c.status, "shown", "the 严重 left is on a kept sentence");
  assert.deepEqual(c.article.lead, TEMPLATE.lead, "the kept sentence stays");
  assert.deepEqual(c.article.sections.map((s) => s.group), ["1"], "the changed one went, and its cause with it");
  assert.ok(c.found.some((p) => p.quote === "周转金要另算〔2〕。"), "listed for us to read");
});

test("a 严重 on a template's sentence a new number was added to takes the number off, not the sentence", async () => {
  // Second trial 11-07: small-formats' first point came back with only 〔1,3,4〕 added; the check found it 严重 and it was cut.
  const written: TopicText = { lead: TEMPLATE.lead, sections: [TEMPLATE.sections[0]!, { group: "2", paragraphs: ["设备能用二手〔3,4〕。另找供应商〔4〕。"] }] };
  const checks: string[] = [];
  const check = (async (_p: string, _s: string, user: unknown) => {
    checks.push(String(user));
    return { problems: checks.length === 1 ? [serious("设备能用二手")] : [] };
  }) as Ask;
  const c = await composeTopic("开店前的准备和开销", GROUPS, WITH_NEW, { write: (async () => written) as Ask, check }, fresh4);
  assert.equal(c.status, "shown");
  assert.deepEqual(c.article.sections[1]!.paragraphs, ["设备能用二手〔3〕。另找供应商〔4〕。"], "4 taken off; the writer's own sentence stays");
  assert.equal(checks.length, 1, "nothing cut, nothing to check again");
  // The quote also in a sentence the writer wrote: that one is checked, and the quote cuts as before.
  const theirs: TopicText = { lead: TEMPLATE.lead, sections: [TEMPLATE.sections[0]!, { group: "2", paragraphs: ["设备能用二手〔3,4〕。设备能用二手的店更省〔4〕。"] }] };
  const cut = await composeTopic("开店前的准备和开销", GROUPS, WITH_NEW, { write: (async () => theirs) as Ask, check: (async () => ({ problems: [serious("设备能用二手")] })) as Ask }, fresh4);
  assert.deepEqual(cut.article.sections.map((s) => s.group), ["1"]);
});

test("a rewrite's check is told that a sentence may take its parts from different items it cites; a first write's is not", async () => {
  const systems: string[] = [];
  const check = (async (_p: string, system: string) => { systems.push(system); return { problems: [] }; }) as Ask;
  const written: TopicText = { lead: TEMPLATE.lead, sections: [TEMPLATE.sections[0]!, { group: "2", paragraphs: ["设备能用二手〔3,4〕。"] }] };
  await composeTopic("开店前的准备和开销", GROUPS, WITH_NEW, { write: (async () => written) as Ask, check }, fresh4);
  await composeTopic("开店前的准备和开销", GROUPS, ITEMS, { write: (async () => ARTICLE) as Ask, check });
  assert.ok(systems[0]!.includes("不要求每一篇原文都单独说出整句话"));
  assert.ok(!systems[1]!.includes("不要求每一篇原文都单独说出整句话"));
});

test("a 严重 quoting a kept sentence without its numbers, or with other punctuation, does not cut it", async () => {
  const written: TopicText = { lead: TEMPLATE.lead, sections: [TEMPLATE.sections[0]!, { group: "2", paragraphs: ["设备能用二手〔3,4〕。"] }] };
  const halves = [serious("几家店主都先定方向"), serious("因为后面的判断都靠它."), serious("周转金要另算")];
  const c = await composeTopic("开店前的准备和开销", GROUPS, WITH_NEW, { write: (async () => written) as Ask, check: (async () => ({ problems: halves })) as Ask }, fresh4);
  assert.equal(c.status, "shown");
  assert.deepEqual(c.article.sections[0], TEMPLATE.sections[0]);
  assert.deepEqual(c.article.lead, TEMPLATE.lead);
});

test("a cause new since the template goes where the page has it", () => {
  const three = [GROUPS[0]!, { no: "2", key: "new-cause", title: "新的原因？" }, { no: "3", key: "build-out", title: "资金用在哪里、何处能省？" }];
  const template: TopicText = { lead: TEMPLATE.lead, sections: [TEMPLATE.sections[0]!, { group: "3", paragraphs: ["设备能用二手〔3〕。"] }] };
  const written: TopicText = { lead: TEMPLATE.lead, sections: [TEMPLATE.sections[0]!, { group: "3", paragraphs: ["设备能用二手〔3〕。"] }, { group: "2", paragraphs: ["新的结论〔4〕。"] }] };
  assert.deepEqual(keepTemplate(written, { article: template, fresh: new Set([4]) }, three).article.sections.map((s) => s.group), ["1", "2", "3"]);
});

test("an article the same as its template is shown without a check", async () => {
  let checks = 0;
  const c = await composeTopic("开店前的准备和开销", GROUPS, WITH_NEW, { write: (async () => TEMPLATE) as Ask, check: (async () => { checks++; return { problems: [] }; }) as Ask }, fresh4);
  assert.equal(c.status, "shown");
  assert.deepEqual(c.article, TEMPLATE);
  assert.equal(checks, 0);
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

test("an article is written again for ten new items or for prompts changed since, not otherwise", () => {
  const last = { item_ids: ["a", "b"], version: "v1" };
  const fresh = (n: number) => ["a", "b", ...Array.from({ length: n }, (_, i) => `n${i}`)];
  assert.equal(needsRewrite(undefined, ["a"], "v1"), true, "none yet");
  assert.equal(needsRewrite(undefined, [], "v1"), false, "nothing to write from");
  assert.equal(needsRewrite(last, ["a", "b"], "v1"), false);
  assert.equal(needsRewrite(last, ["b"], "v1"), false, "an item gone is no reason");
  assert.equal(needsRewrite(last, fresh(9), "v1"), false, "nine new items wait (Kay 11-07: 10条吧)");
  assert.equal(needsRewrite(last, fresh(10), "v1"), true, "ten do");
  assert.equal(needsRewrite(last, ["a", "b"], "v2"), true, "other prompts (Kay 11-06: 只有日本)");
});
