// 十一说 (myfnb/HANDOFF.md §9.0; Kay 10-19): one issue a day at the top of the 08:00 daily. The aim is that a reader who
// hears today's 十一说 knows what the last 24 hours brought: 十一 reads everything listed in the daily's window and tells
// it the way a morning news show does (声动早咖啡, which Kay showed us): 4 to 6 news items, each with who reported it,
// then one told in depth (the order of 得到头条), then a line on what the day's items add up to. Stories are the
// originals' own; a made-up example only to work a sum. Until the evening of 10-19 十一 fused the whole day into one
// story with made-up shops; the trial's errors sat where items were fused or invented, and what did not fit the story
// was left out (10-06: McDonald's on AI pricing, six items). The fixed parts, the greeting with the date and weekday,
// the turn to the deep item and the goodbye, are the program's, so they read the same every day and are never wrong.
// There are three rules and nothing else (prompts/issue-write.md), and one check reads for exactly those
// (prompts/issue-check.md) with the cited originals in full:
//   1. what is said to come from an original is in it (and a sentence is quoted only from QUOTABLE_SOURCES);
//   2. made-up examples read as 十一's examples, never as things that happened;
//   3. one shop's case is not told as what every shop should do.
// Two drafts are written; the livelier of those that pass goes up. When neither passes, the livelier goes to an editor
// that mends only the sentences the check named, with their originals in hand, the way a desk mends a reporter's copy
// (Kay 10-19: 核查员直接编辑); the mended draft is checked again, and mended once more if it must. Sent back to be
// rewritten whole (10-19 afternoon), a draft lost old problems and made new ones. Still failing, the daily leads as it
// always did.
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
const EDIT = prompt("issue-edit");
export const ISSUE_VERSION = `reference-issue@${createHash("sha256").update(WRITE).update(CHECK).update(EDIT)
  .update(readFileSync(new URL(import.meta.url), "utf8")).digest("hex").slice(0, 10)}`;

/**
 * Sources whose original sentences an issue may quote, one or two at most, with where they come from. Read source by
 * source on 10-18 (Core System Studio handbook, 业务线/myfnbguide/记录/2026-10-18/信源转载条款-2026-10-18.md): Petpooja
 * and the owners' own blogs have no terms against it; 红餐网's notice reserves everything and carries other media's
 * pieces, note's terms forbid copying without the writer's consent, so neither is quoted. No source's pictures are used.
 */
export const QUOTABLE_SOURCES: ReadonlySet<string> = new Set(["rss-petpooja", "rss-zieigyou", "rss-ryourigaka", "rss-kojinkuroji", "rss-yoshitencho"]);
/**
 * What the writer and the check read of each item: all of it. At 20,000 (the first trial day, 10-19) the check called two
 * true sentences unsupported because they sat 25,000 and 35,000 characters into podcast transcripts, and the rewrite then
 * dropped them for a made-up example; the writer, reading 3,000, never saw such stories at all. The bound only guards
 * against a runaway page.
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
  /** In the day's 精选: the site's own pick of what matters. */
  selected: boolean;
  /** The story it was grouped into, if any: items sharing one are the same event told by several sources. */
  storyId: string | null;
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
  /** The deep item's question. */
  title: z.string().trim().min(1),
  /** Three sentences for the daily's lead. */
  brief: z.array(z.string().trim().min(1)).min(1),
  preview: z.string().trim().min(1),
  news: z.array(z.object({ head: z.string().trim().min(1), text: z.string().trim().min(1) })).min(1),
  deep: z.string().trim().min(1),
  close: z.string().trim().default(""),
});
export type IssueText = z.infer<typeof IssueAnswer>;
const CheckAnswer = z.object({
  lively: z.coerce.number().default(0),
  problems: z.array(z.object({ rule: z.coerce.number().int(), quote: z.string().default(""), why: z.string().default("") })).default([]),
});
export type Problem = z.infer<typeof CheckAnswer>["problems"][number];

const WEEKDAYS = "日一二三四五六";
/** 2026-10-11 → 2026年10月11日，星期日: from the calendar, as the model once guessed it wrong (10-11 told as a Saturday). */
export function dayName(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return `${y}年${m}月${d}日，星期${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}`;
}

/** The program's own lines, the same every day. */
export const fixedLines = (date: string) => ({
  open: `早上好，今天是${dayName(date)}。我是十一。`,
  turn: "以上是今天的几条快讯。下面，细说一件。",
  end: "这就是今天的十一说。我们明天早上见。",
});

/** Everything 十一 wrote, for finding its citations. */
const written = (issue: IssueText) => [issue.title, ...issue.brief, issue.preview, ...issue.news.flatMap((x) => [x.head, x.text]), issue.deep, issue.close].join("\n");

/** The items an issue cites, as 〔n〕 or 〔n、m〕, in order of first citing; numbers no item has are listed apart. */
export function citedItems(issue: IssueText, items: DayItem[]): { cited: DayItem[]; unknown: number[] } {
  const ns = [...written(issue).matchAll(/〔([\d、,，\s]+)〕/gu)]
    .flatMap((m) => m[1]!.split(/[、,，\s]+/u).filter(Boolean).map(Number));
  const byN = new Map(items.map((i) => [i.n, i]));
  const order = [...new Set(ns)];
  return { cited: order.flatMap((n) => byN.get(n) ?? []), unknown: order.filter((n) => !byN.has(n)) };
}

/** Characters as a reader counts them in what 十一 wrote (the brief aside): no spaces, no citation marks. */
export const issueChars = (issue: IssueText) => written({ ...issue, brief: [] }).replace(/〔[^〕]*〕/gu, "").replace(/\s/g, "").length;

const itemList = (items: DayItem[]) => items.map((i) =>
  `〔${i.n}〕${i.sourceName}《${i.title}》${i.selected ? "（精选）" : ""}${QUOTABLE_SOURCES.has(i.sourceId) ? "（可以引原句）" : ""}\n摘要：${i.summary}\n原文：${i.text.slice(0, FULL_CHARS)}`).join("\n\n");

/**
 * The day's events several sources told, as the site grouped them. On 10-06 six items were about McDonald's denying AI
 * pricing, none of them 精选, and no draft told it: marked, it is plain that the day's sources were talking about it.
 */
export function sameEvents(items: DayItem[]): number[][] {
  const byStory = new Map<string, number[]>();
  for (const i of items) if (i.storyId) byStory.set(i.storyId, [...byStory.get(i.storyId) ?? [], i.n]);
  return [...byStory.values()].filter((ns) => ns.length > 1).sort((a, b) => b.length - a.length);
}

async function write(items: DayItem[], date: string, ask: Ask, attempt: string): Promise<IssueText> {
  const events = sameEvents(items);
  const user = [
    `日期：${dayName(date)}（这是这一天日报收录的全部 ${items.length} 条，其中 ${items.filter((i) => i.selected).length} 条是精选）`, itemList(items),
    ...(events.length ? [`好几家都在讲的事：\n${events.map((ns) => `- ${ns.map((n) => `〔${n}〕`).join("")}讲的是同一件事`).join("\n")}`] : []),
  ].join("\n\n");
  return ask("reference_issue_write", WRITE, user, IssueAnswer, attempt);
}

/** A draft as the check and the editor read it, part by part. */
const issueText = (issue: IssueText) => [
  `标题：${issue.title}`, `三句话：\n${issue.brief.map((b) => `- ${b}`).join("\n")}`, `预告：${issue.preview}`,
  `快讯：\n${issue.news.map((x, i) => `${i + 1}. ${x.head}\n${x.text}`).join("\n\n")}`, `细说：\n${issue.deep}`, `合起来：${issue.close}`,
].join("\n\n");
const citedText = (cited: DayItem[]) => cited.map((i) =>
  `〔${i.n}〕${i.sourceName}《${i.title}》${QUOTABLE_SOURCES.has(i.sourceId) ? "（可以引原句）" : "（不可以引原句）"}\n${i.text.slice(0, FULL_CHARS)}`).join("\n\n") || "（没有点名任何收录）";

/** Mends only the sentences the check named, against the originals the draft cites. */
async function edit(draft: Draft, items: DayItem[], ask: Ask, attempt: string): Promise<IssueText> {
  const user = [
    `十一的稿子：\n${issueText(draft.issue)}`,
    `核对员挑出的问题：\n${draft.problems.map((p) => `- 第 ${p.rule} 条：「${p.quote}」${p.why}`).join("\n")}`,
    `稿子点名的收录（全文）：\n\n${citedText(citedItems(draft.issue, items).cited)}`,
  ].join("\n\n");
  return ask("reference_issue_edit", EDIT, user, IssueAnswer, attempt);
}

/** Reads one draft for the three rules against the full text of what it cites; problems the program finds come first. */
export async function checkIssue(issue: IssueText, items: DayItem[], ask: Ask): Promise<{ lively: number; problems: Problem[] }> {
  const { cited, unknown } = citedItems(issue, items);
  const own: Problem[] = unknown.map((n) => ({ rule: 1, quote: `〔${n}〕`, why: "没有这一条收录" }));
  const user = [`这一期：\n${issueText(issue)}`, `这一期点名的收录（全文）：\n\n${citedText(cited)}`].join("\n\n");
  const answer = await ask("reference_issue_check", CHECK, user, CheckAnswer);
  return { lively: answer.lively, problems: [...own, ...answer.problems] };
}

export interface Draft { issue: IssueText; lively: number; problems: Problem[]; edited: boolean }
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

/** Writes the day's issue: two drafts, each checked; the livelier that passes, else the livelier mended up to twice. */
export async function composeIssue(items: DayItem[], date: string, ask: Ask): Promise<ComposedIssue> {
  if (items.length < MIN_ITEMS) return { date, status: "thin", chosen: null, drafts: [], items };
  const drafts: Draft[] = [];
  for (const attempt of ["a", "b"]) {
    const issue = await write(items, date, ask, attempt);
    drafts.push({ issue, ...await checkIssue(issue, items, ask), edited: false });
  }
  const passing = drafts.filter((d) => !d.problems.length).sort((x, y) => y.lively - x.lively);
  if (passing.length) return { date, status: "issue", chosen: passing[0]!, drafts, items };
  let last = [...drafts].sort((x, y) => y.lively - x.lively || x.problems.length - y.problems.length)[0]!;
  for (const attempt of ["c", "d"]) {
    const issue = await edit(last, items, ask, attempt);
    last = { issue, ...await checkIssue(issue, items, ask), edited: true };
    drafts.push(last);
    if (!last.problems.length) break;
  }
  return { date, status: last.problems.length ? "held" : "issue", chosen: last, drafts, items };
}

// ---------------------------------------------------------------- the daily's top, and a page to read

/** What the daily's lead carries for an issue (the original ReportPaper lead: a title and a paragraph). */
export function dailyLead(c: ComposedIssue, no: number): { kicker: string; title: string; leadParagraph: string } | null {
  if (c.status !== "issue" || !c.chosen) return null;
  return { kicker: `十一说 · 第 ${no} 期`, title: c.chosen.issue.title, leadParagraph: c.chosen.issue.brief.join("") };
}

const RULES: Record<number, string> = { 1: "说是原文讲的，原文里没有／引了不能引的原句", 2: "假设的例子读起来像真事", 3: "把一家店的情况说成通用" };

/** One draft as the reader hears it, top to bottom with the program's own lines, then what the check said. */
function draftMarkdown(d: Draft, items: DayItem[], date: string): string[] {
  const { cited } = citedItems(d.issue, items);
  const f = fixedLines(date);
  return [
    `**${d.issue.title}**`, "", "### 三句话（日报头条用）", ...d.issue.brief.map((b) => `- ${b}`), "", "### 念出来的样子", "",
    f.open, "", d.issue.preview, "", ...d.issue.news.flatMap((x) => [`**${x.head}**`, "", x.text, ""]),
    f.turn, "", `**${d.issue.title}**`, "", d.issue.deep, "", ...(d.issue.close ? [d.issue.close, ""] : []), f.end, "",
    "### 原文出处", ...(cited.length ? cited.map((i) => `- 〔${i.n}〕${i.sourceName}：《${i.title}》 ${i.url}`) : ["- （没有点名）"]), "",
    `> 关于十一：十一是 AI。它读完这一天收录的全部资料，挑要紧的讲给你听；讲到的事以点名的原文为准，算账时举的例子会说明是假设。`, "",
    `核对：${d.problems.length ? "没过" : "过了"}　精彩 ${d.lively}/10　字数 ${issueChars(d.issue)}${d.edited ? "　（编辑按问题改过）" : ""}`,
    ...d.problems.map((p) => `- 第 ${p.rule} 条（${RULES[p.rule] ?? "其他"}）：「${p.quote}」${p.why}`), "",
  ];
}

/** An issue as the trial reads it: the one that goes up first, then every draft with its check. */
export function issueMarkdown(c: ComposedIssue, no: number): string {
  const head = { issue: "出刊", held: "没过核对，当天不出", thin: "收录太少，不写" }[c.status];
  const out = [`# 十一说 · 第 ${no} 期（${c.date}，${head}）`, "", `这一天收录 ${c.items.length} 条。`, ""];
  if (c.chosen) out.push(`## ${c.status === "issue" ? "上线的这一篇" : "最接近的一篇"}`, "", ...draftMarkdown(c.chosen, c.items, c.date));
  c.drafts.forEach((d, i) => { if (d !== c.chosen) out.push(`## 第 ${i + 1} 稿（没选）`, "", ...draftMarkdown(d, c.items, c.date)); });
  return out.join("\n");
}
