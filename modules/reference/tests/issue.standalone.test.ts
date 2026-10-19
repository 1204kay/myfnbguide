// 十一说 (backend/issue.ts) on made-up items and a scripted model: two drafts, the livelier passing one goes up, a
// citation of no item is a problem the program finds, and a day where nothing passes after one rewrite is held.
// No database, no model.
import assert from "node:assert/strict";
import { test } from "node:test";
import { type Ask, citedItems, composeIssue, dailyLead, type DayItem, issueChars, issueMarkdown, type IssueText, MIN_ITEMS } from "../backend/issue.ts";

const item = (n: number, sourceId = "rss-petpooja"): DayItem => ({
  n, id: `art-${n}`, sourceId, sourceName: `来源 ${n}`, title: `第 ${n} 条`, url: `https://example.com/${n}`,
  summary: `摘要 ${n}`, text: `原文 ${n} 的全文。`.repeat(50),
});
const ITEMS = [item(1), item(2, "rss-hongcan"), item(3), item(4)];
const issue = (title: string, body: string): IssueText => ({ title, brief: ["一", "二", "三"], body });

/** A model that answers each purpose from a script and records what it was asked. */
function scripted(answers: Partial<Record<string, (user: string, attempt?: string) => unknown>>) {
  const calls: Array<{ purpose: string; user: string; attempt?: string }> = [];
  const ask: Ask = async (purpose, _system, user, schema, attempt) => {
    calls.push({ purpose, user, attempt });
    const answer = answers[purpose];
    if (!answer) throw new Error(`no scripted answer for ${purpose}`);
    return schema.parse(answer(user, attempt));
  };
  return { ask, calls };
}

test("citations are read in order of first citing, and numbers no item has are listed apart", () => {
  const { cited, unknown } = citedItems(issue("标题〔2〕", "先说〔3、1〕，再说〔2，9〕。"), ITEMS);
  assert.deepEqual(cited.map((i) => i.n), [2, 3, 1]);
  assert.deepEqual(unknown, [9]);
  assert.equal(issueChars(issue("t", "一二〔3〕 三")), 6);
});

test("of two passing drafts the livelier goes up, and the check reads what each cites in full", async () => {
  const { ask, calls } = scripted({
    reference_issue_write: (_u, attempt) => (attempt === "a" ? issue("平淡的一稿", "说了〔1〕。") : issue("好听的一稿", "说了〔3〕。")),
    reference_issue_check: (user) => ({ lively: user.includes("好听") ? 8 : 5, problems: [] }),
  });
  const c = await composeIssue(ITEMS, "2026-10-16", ask);
  assert.equal(c.status, "issue");
  assert.equal(c.chosen?.issue.title, "好听的一稿");
  assert.deepEqual(calls.map((x) => x.purpose), ["reference_issue_write", "reference_issue_check", "reference_issue_write", "reference_issue_check"]);
  const check = calls[3]!.user;
  assert.ok(check.includes("〔3〕来源 3《第 3 条》（可以引原句）") && check.includes(ITEMS[2]!.text));
  assert.ok(!check.includes(ITEMS[0]!.text), "an item the draft does not cite is not sent to the check");
  assert.deepEqual(dailyLead(c, 7), { kicker: "十一说 · 第 7 期", title: "好听的一稿", leadParagraph: "一二三" });
});

test("when neither passes, the closer draft goes back with its problems, then the rewrite once more; still failing, the day is held", async () => {
  const { ask, calls } = scripted({
    reference_issue_write: (_u, attempt) => issue(`稿 ${attempt}`, attempt === "a" ? "说了〔9〕。" : "说了〔2〕。"),
    reference_issue_rewrite: (_u, attempt) => issue(`稿 ${attempt}`, "说了〔2〕。"),
    reference_issue_check: () => ({ lively: 6, problems: [{ rule: 2, quote: "说了", why: "像真事" }] }),
  });
  const c = await composeIssue(ITEMS, "2026-10-16", ask);
  // Draft a also cites an item that does not exist, so it has two problems to b's one: b goes back.
  const [first, second] = calls.filter((x) => x.purpose === "reference_issue_rewrite");
  assert.ok(first!.user.includes("稿 b") && first!.user.includes("第 2 条：「说了」像真事"));
  assert.ok(second!.user.includes("稿 c"));
  assert.equal(c.status, "held");
  assert.equal(c.drafts.length, 4);
  assert.equal(c.chosen?.rewritten, true);
  assert.equal(dailyLead(c, 1), null);
  assert.ok(issueMarkdown(c, 1).includes("没过核对，当天不出"));
});

test("a citation of no item is a problem even when the check finds none", async () => {
  const { ask } = scripted({
    reference_issue_write: () => issue("稿", "说了〔9〕。"),
    reference_issue_rewrite: () => issue("改过", "说了〔1〕。"),
    reference_issue_check: () => ({ lively: 7, problems: [] }),
  });
  const c = await composeIssue(ITEMS, "2026-10-16", ask);
  assert.equal(c.drafts[0]!.problems[0]?.quote, "〔9〕");
  assert.equal(c.status, "issue");
  assert.equal(c.chosen?.issue.title, "改过");
});

test("a day with too few items is not written", async () => {
  const { ask, calls } = scripted({});
  const c = await composeIssue(ITEMS.slice(0, MIN_ITEMS - 1), "2026-10-16", ask);
  assert.equal(c.status, "thin");
  assert.equal(calls.length, 0);
});
