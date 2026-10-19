// 十一说 (myfnb/HANDOFF.md §9.0; Kay 10-19): one issue a day at the top of the 08:00 daily. The aim is that a reader who
// hears today's 十一说 knows what the last 24 hours brought: 十一 reads everything listed in the daily's window and tells
// it in its own words, the way 樊登 talks through a book, with its own stories, analogies and made-up numbers. The
// originals are its reading, not the issue's skeleton: they are named now and then, and only then must they say it.
// So there are three rules and nothing else (prompts/issue-write.md), and one check reads for exactly those
// (prompts/issue-check.md) with the cited originals in full:
//   1. what is said to come from an original is in it (and a sentence is quoted only from QUOTABLE_SOURCES);
//   2. made-up stories and numbers read as 十一's examples, never as things that happened;
//   3. one shop's case is not told as what every shop should do.
// Two drafts are written; the livelier of those that pass goes up. When neither passes, the one with fewer problems
// goes back once with them named and is checked again; if it still fails, the daily leads as it always did.
// Rounds one and two (10-18/19) took facts apart and wrote from them sentence by sentence; both failed (serious errors
// in the sentences that joined originals), and Kay turned the column into this on 10-19.
// Stores nothing: myfnb/trial-issues.ts tries it and writes files.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { chatJson, ModelOutputError } from "@aihot/backend/providers/llm";

export const ISSUE_STEP = "referenceIssue";
const prompt = (name: string) =>
  promptFromText(`reference/${name}`, readFileSync(new URL(`../prompts/${name}.md`, import.meta.url), "utf8"), {});
const WRITE = prompt("issue-write");
const CHECK = prompt("issue-check");
export const ISSUE_VERSION = `reference-issue@${createHash("sha256").update(WRITE).update(CHECK)
  .update(readFileSync(new URL(import.meta.url), "utf8")).digest("hex").slice(0, 10)}`;

/**
 * Sources whose original sentences an issue may quote, one or two at most, with where they come from. Read source by
 * source on 10-18 (Core System Studio handbook, 业务线/myfnbguide/记录/2026-10-18/信源转载条款-2026-10-18.md): Petpooja
 * and the owners' own blogs have no terms against it; 红餐网's notice reserves everything and carries other media's
 * pieces, note's terms forbid copying without the writer's consent, so neither is quoted. No source's pictures are used.
 */
export const QUOTABLE_SOURCES: ReadonlySet<string> = new Set(["rss-petpooja", "rss-zieigyou", "rss-ryourigaka", "rss-kojinkuroji", "rss-yoshitencho"]);
/** What the writer reads of each item: its summary and the start of its text (the day's 30–40 items in one call). */
export const ITEM_CHARS = 3000;
/**
 * What the check reads of each cited item: all of it. At 20,000 (the first trial day, 10-19) the check called two true
 * sentences unsupported because they sat 25,000 and 35,000 characters into podcast transcripts, and the rewrite then
 * dropped them for a made-up example. The bound only guards against a runaway page.
 */
export const FULL_CHARS = 200_000;

export interface DayItem {
  /** 1, 2, 3…: how the issue cites it, as 〔3〕. */
  n: number;
  id: string;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  summary: string;
  text: string;
}

export interface Usage { input: number; output: number }
export type Ask = <S extends z.ZodType>(purpose: string, system: string, user: string, schema: S, attempt?: string) => Promise<z.infer<S>>;

/** Asks the named model through the engine's receipts and budget; receipts go to `receiptIds`, paid tokens to `onUsage`. */
export function modelAsk(model: string, subject: string, receiptIds: number[], onUsage: (u: Usage) => void = () => {}): Ask {
  return async (purpose, system, user, schema, attempt) => {
    const once = (tag?: string) => chatJson({ model, purpose, subject, promptVersion: ISSUE_VERSION, system, user, schema, temperature: 0, maxTokens: 8000, timeoutMs: 600_000, attemptTag: tag });
    // Unusable output once is asked again once (first trial: 2 of 20 of Claude's issues, broken JSON); a second is the answer.
    const res = await once(attempt).catch((error: unknown) => {
      if (error instanceof ModelOutputError) return once(`${attempt ?? ""}retry`);
      throw error;
    });
    receiptIds.push(res.receiptId);
    if (!res.reused) onUsage({ input: Number(res.usage?.prompt_tokens ?? 0), output: Number(res.usage?.completion_tokens ?? 0) });
    return res.data;
  };
}

const IssueAnswer = z.object({
  title: z.string().trim().min(1),
  brief: z.array(z.string().trim().min(1)).min(1),
  body: z.string().trim().min(1),
});
export type IssueText = z.infer<typeof IssueAnswer>;
const CheckAnswer = z.object({
  lively: z.coerce.number().default(0),
  problems: z.array(z.object({ rule: z.coerce.number().int(), quote: z.string().default(""), why: z.string().default("") })).default([]),
});
export type Problem = z.infer<typeof CheckAnswer>["problems"][number];

/** The items an issue cites, as 〔n〕 or 〔n、m〕, in order of first citing; numbers no item has are listed apart. */
export function citedItems(issue: IssueText, items: DayItem[]): { cited: DayItem[]; unknown: number[] } {
  const ns = [...`${issue.title}\n${issue.brief.join("\n")}\n${issue.body}`.matchAll(/〔([\d、,，\s]+)〕/gu)]
    .flatMap((m) => m[1]!.split(/[、,，\s]+/u).filter(Boolean).map(Number));
  const byN = new Map(items.map((i) => [i.n, i]));
  const order = [...new Set(ns)];
  return { cited: order.flatMap((n) => byN.get(n) ?? []), unknown: order.filter((n) => !byN.has(n)) };
}

/** Characters as a reader counts them: no spaces, no citation marks. */
export const issueChars = (issue: IssueText) => `${issue.brief.join("")}${issue.body}`.replace(/〔[^〕]*〕/gu, "").replace(/\s/g, "").length;

const itemList = (items: DayItem[]) => items.map((i) =>
  `〔${i.n}〕${i.sourceName}《${i.title}》${QUOTABLE_SOURCES.has(i.sourceId) ? "（可以引原句）" : ""}\n摘要：${i.summary}\n原文开头：${i.text.slice(0, ITEM_CHARS)}`).join("\n\n");

async function write(items: DayItem[], date: string, ask: Ask, attempt: string, back?: { issue: IssueText; problems: Problem[] }): Promise<IssueText> {
  const user = [
    `日期：${date}（这是这一天日报收录的全部 ${items.length} 条）`, itemList(items),
    ...(back ? [`你上一稿：\n${JSON.stringify(back.issue)}`, `核对员指出的问题（改掉这些，其余照旧）：\n${back.problems.map((p) => `- 第 ${p.rule} 条：「${p.quote}」${p.why}`).join("\n")}`] : []),
  ].join("\n\n");
  return ask(back ? "reference_issue_rewrite" : "reference_issue_write", WRITE, user, IssueAnswer, attempt);
}

/** Reads one draft for the three rules against the full text of what it cites; problems the program finds come first. */
export async function checkIssue(issue: IssueText, items: DayItem[], ask: Ask): Promise<{ lively: number; problems: Problem[] }> {
  const { cited, unknown } = citedItems(issue, items);
  const own: Problem[] = unknown.map((n) => ({ rule: 1, quote: `〔${n}〕`, why: "没有这一条收录" }));
  const user = [
    `这一期：\n标题：${issue.title}\n三分钟版：\n${issue.brief.map((b) => `- ${b}`).join("\n")}\n正文：\n${issue.body}`,
    `这一期点名的收录（全文）：\n\n${cited.map((i) => `〔${i.n}〕${i.sourceName}《${i.title}》${QUOTABLE_SOURCES.has(i.sourceId) ? "（可以引原句）" : "（不可以引原句）"}\n${i.text.slice(0, FULL_CHARS)}`).join("\n\n") || "（没有点名任何收录）"}`,
  ].join("\n\n");
  const answer = await ask("reference_issue_check", CHECK, user, CheckAnswer);
  return { lively: answer.lively, problems: [...own, ...answer.problems] };
}

export interface Draft { issue: IssueText; lively: number; problems: Problem[]; rewritten: boolean }
export interface ComposedIssue {
  date: string;
  status: "issue" | "held" | "thin";
  /** The one that goes up (or, when held, the one that came closest). */
  chosen: Draft | null;
  drafts: Draft[];
  items: DayItem[];
}

/** Fewer than this many items is no issue: there is no day to tell. */
export const MIN_ITEMS = 3;

/** Writes the day's issue: two drafts, each checked; the livelier that passes, else one rewrite of the closer one. */
export async function composeIssue(items: DayItem[], date: string, ask: Ask): Promise<ComposedIssue> {
  if (items.length < MIN_ITEMS) return { date, status: "thin", chosen: null, drafts: [], items };
  const drafts: Draft[] = [];
  for (const attempt of ["a", "b"]) {
    const issue = await write(items, date, ask, attempt);
    drafts.push({ issue, ...await checkIssue(issue, items, ask), rewritten: false });
  }
  const passing = drafts.filter((d) => !d.problems.length).sort((x, y) => y.lively - x.lively);
  if (passing.length) return { date, status: "issue", chosen: passing[0]!, drafts, items };
  const closer = [...drafts].sort((x, y) => x.problems.length - y.problems.length || y.lively - x.lively)[0]!;
  const issue = await write(items, date, ask, "c", closer);
  const again: Draft = { issue, ...await checkIssue(issue, items, ask), rewritten: true };
  drafts.push(again);
  return { date, status: again.problems.length ? "held" : "issue", chosen: again, drafts, items };
}

// ---------------------------------------------------------------- the daily's top, and a page to read

/** What the daily's lead carries for an issue (the original ReportPaper lead: a title and a paragraph). */
export function dailyLead(c: ComposedIssue, no: number): { kicker: string; title: string; leadParagraph: string } | null {
  if (c.status !== "issue" || !c.chosen) return null;
  return { kicker: `十一说 · 第 ${no} 期`, title: c.chosen.issue.title, leadParagraph: c.chosen.issue.brief.join("") };
}

const RULES: Record<number, string> = { 1: "说是原文讲的，原文里没有／引了不能引的原句", 2: "编的故事或数字读起来像真事", 3: "把一家店的情况说成通用" };

/** One draft as the reader sees it, then what the check said. */
function draftMarkdown(d: Draft, items: DayItem[]): string[] {
  const { cited } = citedItems(d.issue, items);
  return [
    `**${d.issue.title}**`, "", "### 三分钟版", ...d.issue.brief.map((b) => `- ${b}`), "", "### 正文", "", d.issue.body, "",
    "### 原文出处", ...(cited.length ? cited.map((i) => `- 〔${i.n}〕${i.sourceName}：《${i.title}》 ${i.url}`) : ["- （没有点名）"]), "",
    `> 关于十一：十一是 AI。它读完这一天收录的全部资料，用自己的话讲给你听；故事和数字是十一举的例子，点名的原文以原文为准。`, "",
    `核对：${d.problems.length ? "没过" : "过了"}　精彩 ${d.lively}/10　字数 ${issueChars(d.issue)}${d.rewritten ? "　（按问题改过一次）" : ""}`,
    ...d.problems.map((p) => `- 第 ${p.rule} 条（${RULES[p.rule] ?? "其他"}）：「${p.quote}」${p.why}`), "",
  ];
}

/** An issue as the trial reads it: the one that goes up first, then every draft with its check. */
export function issueMarkdown(c: ComposedIssue, no: number): string {
  const head = { issue: "出刊", held: "没过核对，当天不出", thin: "收录太少，不写" }[c.status];
  const out = [`# 十一说 · 第 ${no} 期（${c.date}，${head}）`, "", `这一天收录 ${c.items.length} 条。`, ""];
  if (c.chosen) out.push(`## ${c.status === "issue" ? "上线的这一篇" : "最接近的一篇"}`, "", ...draftMarkdown(c.chosen, c.items));
  c.drafts.forEach((d, i) => { if (d !== c.chosen) out.push(`## 第 ${i + 1} 稿（没选）`, "", ...draftMarkdown(d, c.items)); });
  return out.join("\n");
}
