// 十一说 in three steps (backend/issue.ts) on made-up originals and a scripted model: what reaches the issue is only
// what survived the facts check, the program sends a draft back for numbers, length, wording and quotes, and one
// failing sentence in the last check holds the whole issue. No database, no model.
import assert from "node:assert/strict";
import { test } from "node:test";
import { type Ask, BODY_CHARS, composeIssue, dailyLead, type Fact, issueArticle, issueMarkdown, issueProblems, type IssueText, pickMaterial } from "../backend/issue.ts";

const ORIGINAL = [
  "A kiosk takes about 90 seconds per order, while a counter takes 2.5 to 3 minutes.",
  "Kiosk orders are 15% to 35% higher than counter orders, according to Future Ordering.",
  "Cashier turnover in Indian QSRs runs 10% to 40% a month, NRAI says.",
  "Fine dining sells an experience, not speed, so a counter fits better.",
  "An outlet doing 50 to 80 orders a day is served well by one cashier.",
  "Most of our clients run two kiosks at the entrance and keep one counter.",
  "Kiosk wins if your QSR pushes 150-plus orders a day on a fixed menu.",
  "Most single-outlet QSRs recover the cost in 4 to 6 months.",
].join(" ").repeat(2);
const article = (letter: string, sourceId: string) => issueArticle(letter, {
  id: `art-${letter}`, sourceId, title: "Kiosk vs counter", url: `https://example.com/${letter}`, author: "Avani Joshi",
  bodyText: ORIGINAL, excerpt: null, source: { name: "Petpooja 博客（印度 · 收银系统公司的博客）" },
});

const FACTS = [
  { text: "点餐机完成一单约需 90 秒，收银台需 2.5 至 3 分钟", short: "点餐机约 90 秒一单", who: "Petpooja", type: "fact", src: [2] },
  { text: "点餐机订单比柜台订单高出 15% 至 35%", short: "客单价高 15% 至 35%", who: "Future Ordering", type: "fact", src: [3] },
  { text: "印度快餐店收银员每月流失 10% 至 40%", short: "收银员月流失 10% 至 40%", who: "NRAI", type: "fact", src: [4] },
  { text: "日均 50 至 80 单的门店，一名收银员足以应付", short: "日均 50 至 80 单用人工", who: "Petpooja", type: "advice", src: [6] },
  { text: "日均 150 单以上、菜单固定的快餐店适合点餐机", short: "150 单以上适合点餐机", who: "Petpooja", type: "advice", src: [8] },
];
const filler = (n: number) => "文章认为，菜单固定的快餐店更适合使用点餐机，人工收银则适合熟客较多的门店。".repeat(n);
const WRITTEN: IssueText = {
  hook: "点餐机并非人人划算",
  brief: [
    { text: "Petpooja 认为日均 150 单以上、菜单固定的快餐店适合点餐机。", facts: ["A5"] },
    { text: "点餐机完成一单约需 90 秒。", facts: ["A1"] },
    { text: "日均 50 至 80 单的门店，一名收银员足以应付。", facts: ["A4"] },
  ],
  questions: ["点餐机快在哪里？", "哪些门店不宜安装？", "多数门店怎么做？"],
  body: [
    { heading: null, text: `点餐机完成一单约需 90 秒。${filler(6)}`, bold: "点餐机完成一单约需 90 秒。", facts: ["A1"] },
    { heading: "客单价", text: `Future Ordering 的研究称，点餐机订单高出 15% 至 35%。${filler(6)}`, bold: null, facts: ["A2"] },
    { heading: null, text: `NRAI 的数据称，收银员每月流失 10% 至 40%。${filler(6)}`, bold: null, facts: ["A3"] },
    { heading: null, text: `Petpooja 建议，日均 50 至 80 单的门店用一名收银员即可。${filler(5)}`, bold: null, facts: ["A4"] },
    { heading: null, text: "一台机器替代不了熟客与店员之间的熟悉。", bold: null, facts: [] },
  ],
  map: [{ heading: "点餐机的优势", facts: ["A1", "A2"] }, { heading: "不宜安装的门店", facts: ["A4"] }],
  view: "点餐机如同一名不会离职的收银员，但它替代不了熟悉。",
  quote: { article: "A", from: 8, to: 8 },
};

/** A model that answers each purpose from a script and counts its calls. */
function scripted(answers: Partial<Record<string, (user: string) => unknown>>) {
  const calls: string[] = [];
  const ask: Ask = async (purpose, _system, user, schema) => {
    calls.push(purpose);
    const answer = answers[purpose];
    if (!answer) throw new Error(`no scripted answer for ${purpose}`);
    return schema.parse(answer(user));
  };
  return { ask, calls };
}
const allOk = (user: string) => ({ items: [...user.matchAll(/^(\d+)\. /gm)].map((m) => ({ i: Number(m[1]), ok: true })) });
const facts = (list = FACTS) => () => ({ material: "body", own_shop: { is: false, shop: null, src: [] }, facts: list });

test("an issue is written from checked facts only, and reads as the page and the daily's lead", async () => {
  const { ask, calls } = scripted({ reference_issue_facts: facts(), reference_issue_facts_check: allOk, reference_issue_write: () => WRITTEN, reference_issue_check: allOk });
  const c = await composeIssue([article("A", "rss-petpooja")], { topic: "小店要不要装点餐机", shelf: "" }, ask);
  assert.equal(c.status, "issue", c.problems.join(" / "));
  assert.deepEqual(c.facts.map((f) => f.id), ["A1", "A2", "A3", "A4", "A5"]);
  assert.deepEqual(calls, ["reference_issue_facts", "reference_issue_facts_check", "reference_issue_write", "reference_issue_check"]);
  const lead = dailyLead(c, 1)!;
  assert.equal(lead.title, "点餐机并非人人划算");
  assert.match(lead.kicker, /^十一说 · 第 1 期｜原文：Petpooja 博客《Kiosk vs counter》$/);
  const page = issueMarkdown(c, 1);
  for (const heading of ["## 三分钟版", "## 这期说什么", "## 正文", "## 要点图", "## 原文出处", "## 原文摘句", "## 十一的看法"]) assert.ok(page.includes(heading), heading);
  assert.ok(page.includes("Kiosk wins if your QSR pushes 150-plus orders a day on a fixed menu."), "the quote is the original sentence");
});

test("a fact whose number is not in its sentences is dropped before it is checked; the facts check drops more", async () => {
  const wrong = { text: "点餐机订单高出 50%", short: "高出 50%", who: "Petpooja", type: "fact", src: [3] };
  const { ask } = scripted({
    reference_issue_facts: facts([...FACTS, wrong]),
    // The check fails the third fact it is shown.
    reference_issue_facts_check: (user) => ({ items: allOk(user).items.map((x) => ({ ...x, ok: x.i !== 3, why: x.i === 3 ? "谁说的不对" : "" })) }),
    reference_issue_write: () => ({ ...WRITTEN, body: WRITTEN.body.filter((p) => !p.facts.includes("A3")) }),
    reference_issue_check: allOk,
  });
  const c = await composeIssue([article("A", "rss-petpooja")], { topic: "点餐机", shelf: "" }, ask);
  assert.deepEqual(c.dropped.map((d) => d.why), ["数 50 不在依据的句子里", "谁说的不对"]);
  assert.equal(c.facts.length, 4);
  assert.ok(!c.facts.some((f) => f.text.includes("流失")), "the failed fact is gone, and the ids are given after the check");
});

test("fewer than four checked facts is no issue, and nothing is written", async () => {
  const { ask, calls } = scripted({ reference_issue_facts: facts(FACTS.slice(0, 3)), reference_issue_facts_check: allOk });
  const c = await composeIssue([article("A", "rss-petpooja")], { topic: "点餐机", shelf: "" }, ask);
  assert.equal(c.status, "thin");
  assert.ok(!calls.includes("reference_issue_write"));
});

const checked: Fact[] = FACTS.map((f, i) => ({ ...f, type: f.type as Fact["type"], id: `A${i + 1}`, article: "A" }));
const problemsOf = (over: Partial<IssueText>, sourceId = "rss-petpooja") => issueProblems({ ...WRITTEN, ...over }, checked, [article("A", sourceId)]);

test("the program sends a draft back for numbers its facts do not hold, a number in the view, length and wording", () => {
  assert.deepEqual(problemsOf({}), []);
  const body = [...WRITTEN.body];
  body[0] = { ...body[0]!, text: body[0]!.text.replace("90 秒", "95 秒"), bold: null };
  assert.deepEqual(problemsOf({ body }), ["body 1：数 95 不在它用到的事实里"]);
  // 90 is a fact, but not one this sentence names.
  assert.deepEqual(problemsOf({ brief: [WRITTEN.brief[0]!, { text: "点餐机完成一单约需 90 秒。", facts: ["A2"] }, WRITTEN.brief[2]!] }), ["brief 2：数 90 不在它用到的事实里"]);
  assert.deepEqual(problemsOf({ view: "点餐机如同一名收银员，能省下 30% 的人手。" }), ["十一的看法不能带数字（30）"]);
  assert.match(problemsOf({ body: WRITTEN.body.slice(0, 2) })[0]!, new RegExp(`正文要 ${BODY_CHARS.min} 到 ${BODY_CHARS.max} 字`));
  assert.deepEqual(problemsOf({ hook: "大家好，点餐机并非人人划算" }), ["用词：不写口语的称呼，用书面语"]);
  assert.deepEqual(problemsOf({ brief: [{ text: "Petpooja 认为点餐机适合快餐店。", facts: ["A9"] }, ...WRITTEN.brief.slice(1)] }), ["事实编号 A9 不在清单里"]);
});

test("a quote comes only from a source whose terms allow it, and only one or two sentences of the body", () => {
  assert.deepEqual(problemsOf({}, "web-canyin88-zhuanlan"), ["Petpooja 博客 的条款不许摘句，quote 填 null"]);
  assert.deepEqual(problemsOf({ quote: null }, "note-nteam"), [], "no quote is always fine");
  assert.deepEqual(problemsOf({ quote: { article: "A", from: 8, to: 10 } }), ["摘句只能是原文正文里相连的一两句"]);
  assert.deepEqual(problemsOf({ quote: { article: "A", from: 0, to: 0 } }), ["摘句只能是原文正文里相连的一两句"], "the title is not a quote");
});

test("a draft is sent back once with its problems; one failing sentence in the last check holds the whole issue", async () => {
  const drafts: string[] = [];
  const { ask } = scripted({
    reference_issue_facts: facts(), reference_issue_facts_check: allOk,
    reference_issue_write: (user) => { drafts.push(user); return drafts.length === 1 ? { ...WRITTEN, hook: "咱们的点餐机" } : WRITTEN; },
    reference_issue_check: (user) => ({ items: allOk(user).items.map((x) => ({ ...x, ok: x.i !== 2, why: x.i === 2 ? "把建议写成了已经做的事" : "" })) }),
  });
  const c = await composeIssue([article("A", "rss-petpooja")], { topic: "点餐机", shelf: "" }, ask);
  assert.equal(drafts.length, 2);
  assert.match(drafts[1]!, /上一稿有这些问题[\s\S]*不写口语的称呼/);
  assert.equal(c.status, "held");
  assert.deepEqual(c.problems, ["成文核对没过：1 句"]);
  assert.equal(dailyLead(c, 1), null, "a held issue leaves the daily's lead to the daily");
});

test("the pick keeps only listed originals and a known shelf", async () => {
  const candidates = ["a", "b", "c"].map((id) => ({ id, title: id, summary: "", sourceName: "x" }));
  const { ask } = scripted({ reference_issue_pick: () => ({ pick: { topic: "火锅店的钱该花在哪", ids: [2, 0, 9, 2], shelf: "no-such-shelf", why: "" } }) });
  const { pick } = await pickMaterial(candidates, ask);
  assert.deepEqual(pick, { topic: "火锅店的钱该花在哪", ids: ["c", "a"], shelf: "", why: "" });
});
