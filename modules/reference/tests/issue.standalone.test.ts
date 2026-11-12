// 十一说 (backend/issue.ts) on made-up items and a scripted model: two drafts, the livelier passing one goes up, a
// citation of no item is a problem the program finds, and what is still wrong after the editor's mends is cut, not held.
// No database, no model.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ModelOutputError } from "@aihot/backend/providers/receipts";
import { creditFinding, creditPeriod, monthSpend } from "../backend/credit.ts";
import { MODELS } from "@aihot/backend/providers/llm";
import { answerText, CACHE_TTL, joined, messagesBody, type Parts, usageOf } from "../backend/claude.ts";
import { amendIssue, type Ask, fitLead, THIN_DAY, WRITE_FLOOR, checkIssue, citedItems, composeIssue, edit, LEFT_ENOUGH, reviewIssue, cutProblems, EDIT_ROUNDS, dailyLead, type DayItem, dayName, issueChars, issueMarkdown, type IssueText, MIN_ITEMS } from "../backend/issue.ts";

const item = (n: number, sourceId = "rss-petpooja"): DayItem => ({
  n, id: `art-${n}`, sourceId, sourceName: `来源 ${n}`, title: `第 ${n} 条`, url: `https://example.com/${n}`,
  summary: `摘要 ${n}`, text: `原文 ${n} 的全文。`.repeat(50), selected: false, storyId: null,
});
const ITEMS = [item(1), item(2, "rss-hongcan"), item(3), item(4)];
/** A draft whose first news item says `news`, then two more, each citing item 4. */
const issue = (title: string, news: string): IssueText => ({
  title, brief: ["一", "二", `三${"字".repeat(80)}`], preview: "预告", deep: "细说〔4〕", close: "合起来",
  news: [{ head: "快讯", text: news }, ...[1, 2].map(() => ({ head: "另一条", text: "也说了〔4〕。" }))],
});

/** A model that answers each purpose from a script and records what it was asked. */
function scripted(answers: Partial<Record<string, (user: string, attempt?: string) => unknown>>) {
  const calls: Array<{ purpose: string; user: string; attempt?: string }> = [];
  const ask: Ask = async (purpose, _system, parts, schema, attempt) => {
    const user = joined(parts);
    calls.push({ purpose, user, attempt });
    // The read for the ear leaves a draft as written, the listener scores none, and the last read for omissions finds nothing, unless a test scripts them.
    const answer = answers[purpose] ?? (purpose === "reference_issue_review" ? () => ({ problems: [] }) : purpose === "reference_issue_listen" ? () => ({ scores: [] })
      : purpose === "reference_issue_speak" ? (u: string) => JSON.parse(u.slice(u.indexOf("\n") + 1)) : undefined);
    if (!answer) throw new Error(`no scripted answer for ${purpose}`);
    return schema.parse(answer(user, attempt));
  };
  return { ask, calls };
}

test("citations are read in order of first citing, and numbers no item has are listed apart", () => {
  const { cited, unknown } = citedItems(issue("标题〔2〕", "先说〔3、1〕，再说〔2，9〕。"), ITEMS);
  assert.deepEqual(cited.map((i) => i.n), [2, 3, 1, 4]);
  assert.deepEqual(unknown, [9]);
  assert.equal(issueChars({ title: "t", brief: ["不算"], preview: "预告", news: [{ head: "头", text: "一二〔3〕 三" }], deep: "细说", close: "合" }), 10, "title, preview, news, deep and close, without the brief");
  assert.deepEqual(citedItems({ ...issue("t", "无"), deep: "细说〔4〕", close: "合起来〔1〕" }, ITEMS).cited.map((i) => i.n), [4, 1]);
});

test("of two passing drafts the livelier goes up, and the check reads what each cites in full", async () => {
  const { ask, calls } = scripted({
    reference_issue_write: (_u, attempt) => (attempt === "a" ? issue("平淡的一稿", "说了〔1〕。") : issue("好听的一稿", "说了〔3〕。")),
    reference_issue_check: (user) => ({ lively: user.includes("好听") ? 8 : 5, problems: [] }),
  });
  const c = await composeIssue(ITEMS, "2026-10-16", ask);
  assert.equal(c.status, "issue");
  assert.equal(c.chosen?.issue.title, "好听的一稿");
  assert.deepEqual(calls.map((x) => x.purpose), ["reference_issue_write", "reference_issue_speak", "reference_issue_write", "reference_issue_speak", "reference_issue_listen", "reference_issue_check", "reference_issue_check", "reference_issue_review"], "the listener scored neither, so both are checked to pick");
  assert.ok(!calls[0]!.user.includes("另一稿细说"));
  assert.ok(calls[2]!.user.includes("另一稿细说的是「平淡的一稿」"), "the second draft is told the first one's subject, to tell another");
  assert.ok(calls[1]!.user.includes("平淡的一稿"), "each draft is gone over for the ear before its check");
  const check = calls[6]!.user;
  assert.ok(check.includes("〔3〕来源 3《第 3 条》（可以引原句）") && check.includes(ITEMS[2]!.text));
  assert.ok(!check.includes(ITEMS[0]!.text), "an item the draft does not cite is not sent to the check");
  assert.deepEqual(dailyLead(c, 7), { kicker: "十一说 · 第 7 期", title: "好听的一稿", leadParagraph: `一二三${"字".repeat(80)}` });
});

test("when the listener ranks the drafts, only the pick is checked; the other is checked only if the pick cannot go up whole", async () => {
  const { ask, calls } = scripted({
    reference_issue_write: (_u, attempt) => (attempt === "a" ? issue("平淡的一稿", "说了〔1〕。") : issue("好听的一稿", "说了〔3〕。")),
    reference_issue_listen: () => ({ scores: [{ draft: 1, score: 6, why: "" }, { draft: 2, score: 8, why: "" }] }),
    reference_issue_check: () => ({ lively: 7, problems: [] }),
  });
  const c = await composeIssue(ITEMS, "2026-10-16", ask);
  const checks = calls.filter((x) => x.purpose === "reference_issue_check");
  assert.equal(checks.length, 1);
  assert.ok(checks[0]!.user.includes("好听的一稿"));
  assert.equal(c.chosen?.issue.title, "好听的一稿");
  assert.equal(c.drafts[0]!.unchecked, true);
  assert.ok(issueMarkdown(c, 9).includes("没核（听众选了另一稿）"));

  const tied = scripted({
    reference_issue_write: (_u, attempt) => (attempt === "a" ? issue("平淡的一稿", "说了〔1〕。") : issue("好听的一稿", "说了〔3〕。")),
    reference_issue_listen: () => ({ scores: [{ draft: 1, score: 7, why: "" }, { draft: 2, score: 7, why: "" }] }),
    reference_issue_check: (user) => ({ lively: user.includes("好听") ? 8 : 5, problems: [] }),
  });
  const t = await composeIssue(ITEMS, "2026-10-16", tied.ask);
  assert.equal(tied.calls.filter((x) => x.purpose === "reference_issue_check").length, 2, "a tie is broken by the check's score, so both are checked");
  assert.equal(t.chosen?.issue.title, "好听的一稿");

  const wrong = scripted({
    reference_issue_write: (_u, attempt) => (attempt === "a" ? issue("稿 a", "说了〔1〕。") : { ...issue("稿 b", "说了〔3〕。"), brief: ["开头一句原文没有的话〔3〕", "二", "三"] }),
    reference_issue_listen: () => ({ scores: [{ draft: 1, score: 6, why: "" }, { draft: 2, score: 8, why: "" }] }),
    // A lead sentence is wrong and its fix changes nothing: it is cut, and a pick cut in its lead leaves the other mended.
    reference_issue_check: (user) => ({ lively: 7, problems: user.includes("没有的话") ? [{ rule: 1, quote: "开头一句原文没有的话〔3〕", why: "", fix: "开头一句原文没有的话〔3〕" }] : [] }),
  });
  const w = await composeIssue(ITEMS, "2026-10-16", wrong.ask);
  assert.ok(wrong.calls.filter((x) => x.purpose === "reference_issue_check").some((x) => x.user.includes("稿 a")), "the pick's lead could not be mended, so the other is checked and mended");
  assert.equal(w.chosen?.issue.title, "稿 a");

  const many = scripted({
    reference_issue_write: (_u, attempt) => (attempt === "a" ? issue("稿 a", "说了〔1〕。") : issue("稿 b", "第一句原文没有的话〔3〕。第二句原文没有的话〔3〕。第三句原文没有的话〔3〕。")),
    reference_issue_listen: () => ({ scores: [{ draft: 1, score: 6, why: "" }, { draft: 2, score: 8, why: "" }] }),
    reference_issue_check: (user) => ({ lively: 7, problems: ["第一句原文没有的话", "第二句原文没有的话", "第三句原文没有的话"].filter((x) => user.includes(x)).map((x) => ({ rule: 1, quote: `${x}〔3〕。`, why: "", fix: `${x}〔3〕。` })) }),
  });
  const m = await composeIssue(ITEMS, "2026-10-16", many.ask);
  assert.equal(m.chosen?.issue.title, "稿 a", `cut more than ${LEFT_ENOUGH} sentence, the pick leaves the other mended, which goes up whole`);
});

test("when neither passes, the check's own fixes go into the pick and a fresh check reads it; what is still wrong after the last round is cut, and a pick cut a sentence goes up without the other mended", async () => {
  let checks = 0;
  const { ask, calls } = scripted({
    reference_issue_write: (_u, attempt) => issue(`稿 ${attempt}`, attempt === "a" ? "说了一句原文没有的话〔3〕。另一句对得上〔3〕。" : "说了一句原文没有的话〔2〕。另一句对得上〔2〕。"),
    reference_issue_check: (user) => {
      checks++;
      // The first two checks, one per draft, find the sentence; each later check finds what the last fix left in its draft.
      return { lively: user.includes("稿 b") ? 7 : 6, problems: [
        user.includes("说了一句原文没有的话") ? { rule: 2, quote: "说了一句原文没有的话〔2〕。", why: "像真事", fix: `改过的第 ${checks} 句〔2〕。` }
          : { rule: 1, quote: `${user.match(/改过的第 \d+ 句/u)![0]}〔2〕。`, why: "还是不对", fix: `改过的第 ${checks} 句〔2〕。` },
      ] };
    },
  });
  const c = await composeIssue(ITEMS, "2026-10-16", ask);
  assert.ok(!calls.some((x) => x.purpose === "reference_issue_edit"), "the check's fixes need no editor");
  assert.equal(calls.filter((x) => x.purpose === "reference_issue_check").length, 2 + EDIT_ROUNDS, "the pick goes up with one sentence cut, so the other is not mended");
  assert.ok(calls[7]!.user.includes("改过的第 2 句") && !calls[7]!.user.includes("像真事"), "the fresh check reads the fixed draft, not the last verdict");
  assert.equal(c.status, "issue");
  assert.equal(c.drafts.length, 2 + EDIT_ROUNDS);
  assert.equal(c.chosen?.issue.news[0]?.text, "另一句对得上〔2〕。");
  assert.deepEqual(c.chosen?.cut, [`改过的第 ${2 + EDIT_ROUNDS - 1} 句〔2〕。`]);
  assert.equal(dailyLead(c, 1)?.title, "稿 b");
  assert.ok(issueMarkdown(c, 1).includes("删掉 1 句后出刊"));
});

test("a fix that puts the draft right ends the rounds", async () => {
  const { ask, calls } = scripted({
    reference_issue_write: () => issue("稿", "说了一句原文没有的话〔2〕。"),
    reference_issue_check: (user) => ({ lively: 7, problems: user.includes("没有的话") ? [{ rule: 1, quote: "说了一句原文没有的话〔2〕。", why: "", fix: "原文这样说〔2〕。" }] : [] }),
  });
  const c = await composeIssue(ITEMS, "2026-10-16", ask);
  assert.equal(calls.filter((x) => x.purpose === "reference_issue_check").length, 3, "one fix for the pick; the other is not mended");
  assert.equal(c.chosen?.issue.news[0]?.text, "原文这样说〔2〕。");
  assert.equal(c.chosen?.cut, undefined);
});

test("十一 saying it could not check what it tells is found by the program, and cut if never mended", async () => {
  const { ask } = scripted({
    reference_issue_write: () => issue("稿", "这篇不在今天点名的收录里，我没能核对。另一句对得上〔1〕。"),
    reference_issue_edit: () => issue("稿", "这篇不在今天点名的收录里，我没能核对。另一句对得上〔1〕。"),
    reference_issue_check: () => ({ lively: 7, problems: [] }),
  });
  const c = await composeIssue(ITEMS, "2026-10-14", ask);
  assert.equal(c.drafts[0]!.problems[0]?.quote, "这篇不在今天点名的收录里，我没能核对。");
  assert.equal(c.chosen?.issue.news[0]?.text, "另一句对得上〔1〕。");
});

test("mending a sentence keeps the deep story's paragraphs", () => {
  const draft = { ...issue("问题", "说了〔1〕。"), deep: "第一段说过头了〔1〕。还有一句。\n\n第二段。\n\n第三段。" };
  const { issue: out } = cutProblems(draft, [{ rule: 1, quote: "第一段说过头了〔1〕。", why: "" }]);
  assert.equal(out.deep, "还有一句。\n\n第二段。\n\n第三段。");
  assert.equal(cutProblems(draft, [{ rule: 1, quote: "第二段。还有", why: "" }]).issue.deep, draft.deep, "nothing found, nothing moved");
  const twice = cutProblems({ ...draft, deep: "一段说过头了〔1〕。\n\n第二段。" }, [{ rule: 1, quote: "第二段。", why: "" }]);
  assert.equal(twice.issue.deep, "一段说过头了〔1〕。");
  assert.equal(cutProblems(draft, [{ rule: 1, quote: "第二段说过头了。", why: "" }]).issue.deep, draft.deep);
  const middle = cutProblems({ ...draft, deep: "第一段。\n\n中间一段说过头了〔1〕。\n\n第三段。" }, [{ rule: 1, quote: "中间一段说过头了〔1〕。", why: "" }]);
  assert.equal(middle.issue.deep, "第一段。\n\n第三段。", "a paragraph taken out leaves one break");
});

test("Japanese left untranslated is a problem the program finds", async () => {
  const { ask } = scripted({
    reference_issue_write: () => issue("稿", "老板在博客《蕎麦屋の経営ノート》里说〔1〕。"),
    reference_issue_check: () => ({ lively: 7, problems: [] }),
    reference_issue_edit: () => issue("改过", "老板在博客《荞麦面店的经营笔记》里说〔1〕。"),
  });
  const c = await composeIssue(ITEMS, "2026-10-14", ask);
  assert.deepEqual(c.drafts[0]!.problems.map((p) => p.why), ["日文没翻成中文，听的人听不懂"]);
  assert.equal(c.chosen?.issue.title, "改过");
});

test("「十一觉得」 is the writer's to say as often as it likes, and the close never carries the label it is shown under", async () => {
  const { ask, calls } = scripted({
    reference_issue_write: () => ({ ...issue("稿", "说了〔1〕。"), deep: "十一觉得这事要紧〔1〕。后面还有。", close: "合起来：十一觉得都在算账。" }),
    reference_issue_check: () => ({ lively: 7, problems: [] }),
  });
  const c = await composeIssue(ITEMS, "2026-10-21", ask);
  assert.deepEqual(c.drafts[0]!.problems, []);
  assert.ok(!calls.some((x) => x.purpose === "reference_issue_edit"));
  assert.equal(c.chosen?.issue.close, "十一觉得都在算账。");
});

test("the 导读 tells what the title tells: a sentence cut is not refilled with other stories, and a 导读 follows its title", () => {
  const { issue: out } = cutProblems(issue("问题", "说了〔1〕。"), [{ rule: 1, quote: "二", why: "" }]);
  assert.deepEqual(out.brief, ["一", "二", `三${"字".repeat(80)}`], "a quote too short to place moves nothing");
  // 11-08 (issues 12, 14, 15): sentences on other stories sat under the deep piece's title on the daily.
  const day: IssueText = {
    title: "没开过餐饮店的人，凭什么开出三家门店？", preview: "预告", close: "合起来",
    brief: ["美国一位店主从帮母亲改品牌做起，五年开出三家门店〔4〕。", "她说第三家店面在春田，是最大的一家〔4〕。"],
    news: [
      { head: "活动出摊邀约先别答应", text: "日本一位店主说接到活动出摊邀约先别当场回复〔1〕。他说先算清回店后的准备〔1〕。还有一句〔1〕。" },
      { head: "调背景音乐前先坐到客人位子上听", text: "他说先坐到客人的位子上听〔2〕。" },
    ],
    deep: "她从帮母亲改品牌开始〔4〕。后来在春田拿下第三家店面〔4〕。\n\n第二段说的是开店的钱〔4〕。",
  };
  assert.deepEqual(cutProblems(day, [{ rule: 1, quote: day.brief[1]!, why: "" }]).issue.brief, [day.brief[0]], "one sentence left, no news head put in");
  assert.deepEqual(cutProblems(day, day.brief.map((b) => ({ rule: 1, quote: b, why: "" }))).issue.brief,
    ["她从帮母亲改品牌开始〔4〕。", "后来在春田拿下第三家店面〔4〕。"], "all cut: the deep piece's opening");
  const noDeep = cutProblems(day, [{ rule: 1, quote: "后来在春田拿下第三家店面", why: "" }, { rule: 1, quote: "她从帮母亲改品牌开始", why: "" }, { rule: 1, quote: "第二段说的是开店的钱", why: "" }]).issue;
  assert.equal(noDeep.title, "活动出摊邀约先别答应", "without a deep piece, the first head is the title");
  assert.deepEqual(noDeep.brief, ["日本一位店主说接到活动出摊邀约先别当场回复〔1〕。", "他说先算清回店后的准备〔1〕。"], "and the 导读 is that item's opening");
});

test("quotation marks a sentence after a citation of a source that may not be quoted are found by the program; a string of figures is the writer's", async () => {
  const { ask } = scripted({
    reference_issue_write: () => ({
      ...issue("稿", "2026 年前九个月开了 319 家，共 1634 家、87 座城市，三季度 84 家、12 座新城市，会员 4520 万〔4〕。"),
      deep: "文章说县城火锅人均 50 到 70 元〔2〕。他们更在意“值不值”。\n\n十一说这是“土”。",
    }),
    reference_issue_check: () => ({ lively: 7, problems: [] }),
    reference_issue_edit: () => issue("改过", "前九个月开了 319 家〔4〕。"),
  });
  const c = await composeIssue(ITEMS, "2026-10-15", ask);
  assert.deepEqual(c.drafts[0]!.problems.map((p) => p.quote), ["他们更在意“值不值”。"]);
});

test("a draft that cites nothing loses to one that does, however clean its check", async () => {
  const { ask, calls } = scripted({
    reference_issue_write: (_u, attempt) => (attempt === "a"
      ? { ...issue("有出处的一稿", "说了一句原文没有的话〔3〕。"), deep: "细说〔3〕" }
      : { ...issue("没出处的一稿", "说了。"), news: [1, 2, 3].map(() => ({ head: "没出处", text: "说了。" })), deep: "细说" }),
    reference_issue_check: (user) => ({ lively: 7, problems: user.includes("有出处") ? [1, 2, 3, 4, 5, 6].map((n) => ({ rule: 1, quote: `第 ${n} 处〔3〕`, why: "", fix: "" })) : [] }),
    reference_issue_edit: () => issue("改过", "说了〔3〕。"),
  });
  const c = await composeIssue(ITEMS, "2026-10-21", ask);
  assert.ok(c.drafts[1]!.problems.some((p) => p.why === "细说没标出处"));
  assert.notEqual(c.chosen?.issue.title, "没出处的一稿", "a clean check of a draft that cites nothing never takes it up as written");
  const edits = calls.filter((x) => x.purpose === "reference_issue_edit");
  assert.ok(edits.some((x) => x.user.includes("这一天的全部收录")), "the draft that cites nothing is mended with the day's list");
  assert.ok(!edits.some((x) => x.user.includes("有出处的一稿") && x.user.includes("这一天的全部收录")), "a draft that cites is not handed the day's list");
});

test("an editor asked to add a source is given the day's numbers to add", async () => {
  const { ask, calls } = scripted({
    reference_issue_write: () => ({ ...issue("稿", "说了。"), deep: "细说" }),
    reference_issue_check: () => ({ lively: 7, problems: [] }),
    reference_issue_edit: () => issue("改过", "说了〔2〕。"),
  });
  await composeIssue(ITEMS, "2026-10-21", ask);
  const edit = calls.find((x) => x.purpose === "reference_issue_edit")!.user;
  assert.ok(edit.includes("这一天的全部收录") && edit.includes("〔2〕来源 2《第 2 条》"));
});

test("a flagged news head takes its item, a flagged question gives way to the first head with its 导读, and what cannot be found stays listed", () => {
  const draft = issue("一个说过头的问题", "说了〔1〕。");
  draft.news[1]!.head = "这条快讯的标题说过头了";
  const { issue: out, cut, kept } = cutProblems(draft, [
    { rule: 1, quote: "一个说过头的问题", why: "" },
    { rule: 3, quote: "这条快讯的标题说过头了", why: "" },
    { rule: 1, quote: "稿子里没有这句话", why: "" },
    { rule: 4, quote: "快讯 3 条", why: "" },
  ]);
  assert.equal(out.news.length, 2);
  assert.equal(out.title, "快讯");
  assert.ok(cut.includes("一个说过头的问题") && cut.includes("这条快讯的标题说过头了"));
  assert.deepEqual(out.brief, ["说了〔1〕。"], "the title gone to the first head, the 导读 goes with it");
  assert.deepEqual(kept.map((p) => p.quote), ["稿子里没有这句话", "快讯 3 条"]);
});

test("a draft the model cannot write in usable form leaves the other; with neither, the day goes out as its items stand", async () => {
  const { ask } = scripted({
    reference_issue_write: (_u, attempt) => { if (attempt === "a") throw new ModelOutputError("broken JSON"); return issue("稿 b", "说了〔1〕。"); },
    reference_issue_check: () => ({ lively: 7, problems: [] }),
  });
  const c = await composeIssue(ITEMS, "2026-10-13", ask);
  assert.equal(c.status, "issue");
  assert.equal(c.chosen?.issue.title, "稿 b");
  const { ask: broken } = scripted({ reference_issue_write: () => { throw new ModelOutputError("broken JSON"); } });
  const plain = await composeIssue(ITEMS, "2026-10-13", broken);
  assert.equal(plain.status, "issue");
  assert.equal(plain.chosen?.issue.news[0]?.text, `来源 1报道：${ITEMS[0]!.summary}〔1〕`);
  assert.ok(issueMarkdown(plain, 8).includes("出简版") && !issueMarkdown(plain, 8).includes("下面，细说一件"));
});

test("a citation of no item is a problem even when the check finds none", async () => {
  const { ask } = scripted({
    reference_issue_write: () => issue("稿", "说了〔9〕。"),
    reference_issue_edit: () => issue("改过", "说了〔1〕。"),
    reference_issue_check: () => ({ lively: 7, problems: [] }),
  });
  const c = await composeIssue(ITEMS, "2026-10-16", ask);
  assert.equal(c.drafts[0]!.problems[0]?.quote, "〔9〕");
  assert.equal(c.status, "issue");
  assert.equal(c.chosen?.issue.title, "改过");
});

test("the date and weekday come from the calendar, and the program's own lines frame what 十一 wrote", async () => {
  assert.equal(dayName("2026-10-11"), "2026年10月11日，星期日");
  assert.equal(dayName("2026-10-06"), "2026年10月6日，星期二");
  const { ask, calls } = scripted({
    reference_issue_write: () => issue("为什么？", "说了〔1〕。"),
    reference_issue_check: () => ({ lively: 7, problems: [] }),
  });
  const c = await composeIssue(ITEMS, "2026-10-11", ask);
  assert.ok(calls[0]!.user.startsWith("日期：2026年10月11日，星期日"));
  const md = issueMarkdown(c, 1);
  assert.ok(md.includes("早上好，今天是2026年10月11日，星期日。我是十一。") && md.includes("下面，细说一件。") && md.includes("我们明天早上见。"));
});

test("the program finds what the check model is not asked to count: an item with no source, a big event left out; how many news items is the writer's", async () => {
  const told = (n: number, storyId: string, sourceId = `rss-${n}`) => ({ ...item(n, sourceId), storyId });
  // Twelve award lists from one source (10-13) are one source talking, not an event the day's sources were telling.
  const items = [told(1, "mcd"), told(2, "mcd"), told(3, "mcd"), item(4), item(5), told(6, "awards", "web-canyin88"), told(7, "awards", "web-canyin88"), told(8, "awards", "web-canyin88")];
  const { ask, calls } = scripted({
    reference_issue_write: () => ({ ...issue("稿", "没有出处。"), news: issue("稿", "没有出处。").news.slice(0, 2) }),
    reference_issue_edit: () => issue("改过", "麦当劳〔2〕。"),
    reference_issue_check: () => ({ lively: 7, problems: [] }),
  });
  const c = await composeIssue(items, "2026-10-06", ask);
  assert.deepEqual(c.drafts[0]!.problems.map((p) => p.why), ["这条快讯没标出处", "3 家都在讲这件事，这一期没讲"]);
  assert.ok(calls.find((x) => x.purpose === "reference_issue_edit")!.user.includes(items[0]!.text), "the editor has the left-out event's originals");
  const write = calls.find((x) => x.purpose === "reference_issue_write")!.user;
  assert.ok(write.includes("〔1〕〔2〕〔3〕讲的是同一件事") && !write.includes("〔6〕〔7〕〔8〕"), "one source's several items are not told the writer as an event");
  assert.ok(!/\n\d+\. 快讯|合起来：/u.test(calls.find((x) => x.purpose === "reference_issue_edit")!.user), "the editor sees the draft in the shape it answers in");
  assert.equal(c.status, "issue");
  assert.equal(c.chosen?.issue.title, "改过");
});

test("a quotation in a sentence citing only sources that may not be quoted is a problem; from a quotable source it is not", async () => {
  // Item 2 is 红餐网 (not quotable); item 1 is Petpooja (quotable).
  const { ask } = scripted({
    reference_issue_write: () => issue("稿", "他们说「进入70元时代」〔2〕。又说「先算账」〔1〕。"),
    reference_issue_check: () => ({ lively: 7, problems: [] }),
    reference_issue_edit: () => issue("改过", "他们说已经进入 70 元时代〔2〕。"),
  });
  const c = await composeIssue(ITEMS, "2026-10-11", ask);
  assert.deepEqual(c.drafts[0]!.problems.map((p) => p.quote), ["他们说「进入70元时代」〔2〕。"]);
  assert.equal(c.chosen?.issue.title, "改过");
});

test("a day with too few items is not written", async () => {
  const { ask, calls } = scripted({});
  const c = await composeIssue(ITEMS.slice(0, MIN_ITEMS - 1), "2026-10-16", ask);
  assert.equal(c.status, "thin");
  assert.equal(calls.length, 0);
});

test("the issue that goes up is read once more for what it left out; a fix goes in, an empty one takes nothing out", async () => {
  const { ask, calls } = scripted({
    reference_issue_write: () => issue("稿", "店里卖完了〔1〕。"),
    reference_issue_check: () => ({ lively: 7, problems: [] }),
    reference_issue_review: () => ({ problems: [
      { rule: 1, quote: "店里卖完了〔1〕。", why: "原文还说是天气热", fix: "店里卖完了，原文说那天特别热〔1〕。" },
      { rule: 1, quote: "也说了〔4〕。", why: "", fix: "" },
    ] }),
  });
  const c = await composeIssue(ITEMS, "2026-10-18", ask);
  assert.equal(c.chosen?.issue.news[0]?.text, "店里卖完了，原文说那天特别热〔1〕。");
  assert.equal(c.chosen?.issue.news.length, 3, "an empty fix cuts nothing");
  assert.equal(c.chosen?.reviewed?.length, 1);
  assert.equal(calls.filter((x) => x.purpose === "reference_issue_review").length, 1, "only the issue that goes up");
});

test("a mended sentence keeps one citation, whether or not its fix repeats it", () => {
  const draft = { ...issue("稿", "景气指数跌到99.4。〔8〕赛道越挤越难赚钱。〔8〕"), deep: "细说〔4〕\n\n第二段。" };
  const { issue: out } = amendIssue(draft, [
    { rule: 1, quote: "景气指数跌到99.4。", why: "", fix: "景气指数跌到99.4，是季节性回摆。〔8〕" },
    { rule: 1, quote: "赛道越挤越难赚钱。", why: "", fix: "红餐网认为赛道越挤越难赚钱。" },
  ], (p) => p.fix);
  assert.equal(out.news[0]!.text, "景气指数跌到99.4，是季节性回摆。〔8〕红餐网认为赛道越挤越难赚钱。〔8〕");
  assert.equal(out.deep, "细说〔4〕\n\n第二段。");
});

test("each draft is checked as it reads aloud, the writer's own kept beside it; a read for the ear that gives nothing usable leaves it as written", async () => {
  const { ask, calls } = scripted({
    reference_issue_write: (_u, attempt) => issue(`稿 ${attempt}`, "一串数字〔1〕。"),
    reference_issue_speak: (u) => { if (u.includes("稿 a")) return issue("稿 a", "念顺了〔1〕。"); throw new ModelOutputError("broken JSON"); },
    reference_issue_check: () => ({ lively: 7, problems: [] }),
  });
  const c = await composeIssue(ITEMS, "2026-10-22", ask);
  assert.equal(c.drafts[0]!.issue.news[0]!.text, "念顺了〔1〕。");
  assert.equal(c.drafts[0]!.written?.news[0]!.text, "一串数字〔1〕。");
  assert.ok(calls.find((x) => x.purpose === "reference_issue_check")!.user.includes("念顺了"), "the check reads what will be said");
  assert.equal(c.drafts[1]!.issue.news[0]!.text, "一串数字〔1〕。");
});

test("the listener's pick is the one mended and goes up, whatever the check thought livelier", async () => {
  const { ask, calls } = scripted({
    reference_issue_write: (_u, attempt) => (attempt === "a" ? issue("一条条念的一稿", "说了〔1〕。") : issue("像故事的一稿", "说了〔3〕。")),
    reference_issue_check: (user) => ({ lively: user.includes("一条条") ? 8 : 5, problems: [] }),
    reference_issue_listen: () => ({ scores: [{ draft: 1, score: 5, why: "像念提纲" }, { draft: 2, score: 8, why: "像讲故事" }] }),
  });
  const c = await composeIssue(ITEMS, "2026-10-22", ask);
  assert.equal(c.chosen?.issue.title, "像故事的一稿");
  assert.equal(c.chosen?.heard, 8);
  const listen = calls.find((x) => x.purpose === "reference_issue_listen")!.user;
  assert.ok(listen.includes("第 1 稿") && listen.includes("第 2 稿") && !listen.includes(ITEMS[0]!.text), "the listener reads the drafts, not the originals");
  assert.ok(issueMarkdown(c, 1).includes("听众 8/10（像讲故事）"));
});

test("a fix that carries the label of its part goes in without it", () => {
  const { issue: out } = amendIssue(issue("说重了的标题", "说了〔1〕。"), [{ rule: 1, quote: "说重了的标题", why: "", fix: "标题：改准的标题" }], (p) => p.fix);
  assert.equal(out.title, "改准的标题");
});

test("a fix to the preview stays in the preview, though the preview repeats a news head", () => {
  const draft = { ...issue("标题", "说了〔1〕。"), preview: "今天先说几条快讯：快乐蜂在本土圈出1500个潜在商圈；喜茶重新开放加盟。" };
  draft.news[0]!.head = "快乐蜂在本土圈出1500个潜在商圈";
  const { issue: out } = amendIssue(draft, [{ rule: 1, quote: draft.preview, why: "", fix: "今天先说几条快讯：快乐蜂在菲律宾圈出1500个潜在商圈；喜茶重新开放加盟。" }], (p) => p.fix);
  assert.equal(out.news[0]!.head, "快乐蜂在本土圈出1500个潜在商圈");
  assert.equal(out.preview, "今天先说几条快讯：快乐蜂在菲律宾圈出1500个潜在商圈；喜茶重新开放加盟。");
});

test("the Claude credit warns at 80% spent, or once the period's pace would go over it, and not before", () => {
  // US$100 a month as the standard (Kay 11-02 19:31), renewing on the 1st as the Console's limit (Kay's screenshot 11-03).
  const nov = (d: number) => new Date(Date.UTC(2026, 10, d, 2));
  assert.equal(creditPeriod(nov(3)).start, Date.UTC(2026, 10, 1));
  assert.equal(creditPeriod(nov(3)).end, Date.UTC(2026, 11, 1));
  assert.equal(creditPeriod(nov(2), 4).start, Date.UTC(2026, 9, 4), "a setting's renewal day");
  assert.equal(monthSpend([{ model: "claude-opus-5-5", input: 1_000_000, output: 100_000 }]), 6);
  // Of a million read in: 100k written for an hour (2 × $4), 800k read from the cache ($0.20), 100k plain.
  assert.equal(monthSpend([{ model: "claude-opus-5-5", input: 1_000_000, output: 100_000, cacheRead: 800_000, write1h: 100_000 }]).toFixed(2), "3.36", "0.4 plain + 0.16 read + 0.8 written + 2 output");
  assert.equal(creditFinding(20, nov(3)), null, "two days say too little about the period");
  assert.equal(creditFinding(20, nov(10)), null, "US$20 nine days in is about US$66 for the period");
  const pace = creditFinding(40, nov(10));
  assert.equal(pace?.level, "today");
  assert.ok(pace?.impact?.includes("整月约 US$132"), String(pace?.impact));
  assert.ok(pace?.title.includes("按目前的用量推算"), "a pace alone is a forecast, not a credit nearly gone");
  assert.ok(creditFinding(81, nov(2))?.title.includes("八成"));
  assert.equal(creditFinding(81, nov(2))?.level, "today", "80% spent, however early");
  assert.equal(creditFinding(96, nov(2))?.level, "now");
  assert.equal(creditFinding(161, nov(2), { monthly: 200, renewsOn: 4 })?.level, "today", "the setting's credit");
});

test("the check sends the originals first, in number order, as the part Claude caches; the draft comes after", async () => {
  const sent: Array<string | Parts> = [];
  const ask: Ask = async (_purpose, _system, user, schema) => { sent.push(user); return schema.parse({ lively: 7, problems: [] }); };
  await checkIssue({ ...issue("t", "先说〔3〕，再说〔1〕。"), deep: "细说〔4〕" }, ITEMS, ask);
  await checkIssue({ ...issue("t", "改过了，先说〔1〕，再说〔3〕。"), deep: "细说〔4〕" }, ITEMS, ask);
  const [first, second] = sent as Parts[];
  assert.equal(typeof first, "object");
  assert.ok(first!.cached.indexOf("〔1〕") < first!.cached.indexOf("〔3〕") && first!.cached.indexOf("〔3〕") < first!.cached.indexOf("〔4〕"), "in number order, not the order the draft cites them");
  assert.equal(second!.cached, first!.cached, "a mended draft citing the same originals sends them byte for byte the same, so the second check reads the cache");
  assert.ok(first!.rest.startsWith("这一期：") && !first!.cached.includes("先说"), "the draft, which changes every round, is not in the cached part");
});

test("the Messages request marks only the cached part, for an hour, and leaves thinking and sampling to the model's defaults", () => {
  const opus = MODELS["claude-opus-5-5"]!;
  const body = messagesBody(opus, "核对员", { cached: "原文", rest: "稿子" }, 8000) as { max_tokens: number; system: string; messages: Array<{ content: Array<Record<string, unknown>> }> } & Record<string, unknown>;
  assert.deepEqual(body.messages[0]!.content, [
    { type: "text", text: "原文", cache_control: { type: "ephemeral", ttl: CACHE_TTL } },
    { type: "text", text: "稿子" },
  ]);
  assert.equal(body.max_tokens, 8000 + (opus.reasoningTokens ?? 0), "room for the answer and, on top, the preset's thinking");
  assert.equal(body.system, "核对员");
  assert.ok(!("thinking" in body) && !("temperature" in body), "Opus 5.5 thinks adaptively at its default effort, as it did through the compatible endpoint");
  assert.deepEqual((messagesBody(opus, "s", "一段", 8000) as { messages: Array<{ content: unknown }> }).messages[0]!.content, [{ type: "text", text: "一段" }], "a plain string is not cached");
  assert.deepEqual((messagesBody(MODELS["claude-haiku-5-5"]!, "s", "一段", 8000) as { thinking?: unknown }).thinking, { type: "disabled" }, "a preset's own thinking goes through");
  assert.deepEqual(usageOf({ input_tokens: 100, cache_creation_input_tokens: 30_000, cache_read_input_tokens: 0, output_tokens: 9000 }),
    { input_tokens: 100, cache_creation_input_tokens: 30_000, cache_read_input_tokens: 0, output_tokens: 9000, prompt_tokens: 30_100, completion_tokens: 9000 });
  assert.equal(answerText({ content: [{ type: "thinking", text: "" }, { type: "text", text: "{\"a\":" }, { type: "text", text: "1}" }] }), "{\"a\":1}");
});

test("a draft too short for twelve minutes is written once more, told so, unless the day had little to tell", async () => {
  const long = (title: string) => ({ ...issue(title, "说了〔1〕。"), deep: `细说〔4〕${"讲得很深。".repeat(WRITE_FLOOR / 5)}` });
  const rich = ITEMS.map((i) => ({ ...i, text: "原文".repeat(THIN_DAY / 2) }));
  const { ask, calls } = scripted({
    reference_issue_write: (u, attempt) => (attempt === "a" ? issue("短稿", "说了〔1〕。") : attempt === "a2" && u.includes("太短了") ? long("长稿") : long("另一稿")),
    reference_issue_check: () => ({ lively: 5, problems: [] }),
  });
  const out = await composeIssue(rich, "2026-11-03", ask);
  assert.deepEqual(calls.filter((c) => c.purpose === "reference_issue_write").map((c) => c.attempt), ["a", "a2", "b"]);
  assert.ok(out.drafts.some((d) => d.written?.title === "长稿"), "the longer rewrite replaces the short draft");
  const thin = scripted({ reference_issue_write: () => issue("短稿", "说了〔1〕。"), reference_issue_check: () => ({ lively: 5, problems: [] }) });
  await composeIssue(ITEMS, "2026-11-03", thin.ask);
  assert.deepEqual(thin.calls.filter((c) => c.purpose === "reference_issue_write").map((c) => c.attempt), ["a", "b"], "a thin day is left short");
});

test("a title or 导读 not the length asked is written again from the deep piece, and a part still not the length keeps what it had", async () => {
  const deep = "洛杉矶一家人做赛百味加盟近40年〔1〕。";
  // Issue 19 (11-12): the check cut the 导读 to its first sentence, 35 characters.
  const short = { ...issue("16家关到10家，净利率从4%到15%", "说了〔1〕。"), brief: ["美国洛杉矶的Abtin Hishimian一家，做赛百味加盟近40年。"], deep };
  const good = ["美国洛杉矶一家人做赛百味加盟近40年，五年里在租约到期时一家一家不续，把门店从16家关到10家〔1〕。", "营业额在缩，净利率却从2024年的4%升到2025年的15%，今年预计略高于20%〔1〕。"];
  const { ask, calls } = scripted({ reference_issue_lead: () => ({ title: "这个标题太长了，写到了二十三个字还没有停下", brief: good }) });
  const out = await fitLead(short, ask);
  assert.deepEqual(out.brief, good);
  assert.equal(out.title, short.title, "the title was the length, so it stays");
  assert.ok(calls[0]!.user.includes(deep), "written from the deep piece");

  const fits = { ...short, brief: good };
  const none = scripted({});
  assert.equal(await fitLead(fits, none.ask), fits, "a title and 导读 the length asked are not sent");

  const long = { ...fits, title: "一箱鳕鱼贵五十英镑，他们把涨价摊到了整张菜单上面" };
  const tooShort = scripted({ reference_issue_lead: () => ({ title: "一箱鳕鱼贵50英镑，涨价摊到整张菜单", brief: ["太短。"] }) });
  const fixed = await fitLead(long, tooShort.ask);
  assert.equal(fixed.title, "一箱鳕鱼贵50英镑，涨价摊到整张菜单");
  assert.deepEqual(fixed.brief, good, "a 导读 that fitted is not swapped for one that does not");
});
