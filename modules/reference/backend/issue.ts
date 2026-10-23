// 十一说 (myfnb/HANDOFF.md §9.0; Kay 10-19): one issue a day at the top of the 08:00 daily. The aim is that a reader who
// hears today's 十一说 knows what the last 24 hours brought: 十一 reads everything listed in the daily's window and tells
// it the way a morning news show does (声动早咖啡, which Kay showed us): a few news items, each with who reported it,
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
// (Kay 10-19: 核查员直接编辑); the mended draft is checked again, up to EDIT_ROUNDS times. Sent back to be rewritten
// whole (10-19 afternoon), a draft lost old problems and made new ones. What is still wrong after that is cut and the
// issue goes out every day (Kay 10-19 night: 「应该要十期出十期」); with no usable draft, the day's items go out as they stand.
// Rounds one and two (10-18/19) took facts apart and wrote from them sentence by sentence; both failed (serious errors
// in the sentences that joined originals), and Kay turned the column into this on 10-19.
// Stores nothing itself: backend/issues.ts writes the day's issue and keeps it; myfnb/trial-issues.ts tries it into files.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { chatJson, ModelOutputError } from "@aihot/backend/providers/llm";

export const ISSUE_STEP = "referenceIssue";
/** The check and the editor that mends what it found: another model than the writer's (Kay 10-19: DeepSeek writes, Opus checks). */
export const ISSUE_CHECK_STEP = "referenceIssueCheck";
/** Purposes the check model answers (the writer answers reference_issue_write). */
export const isCheckPurpose = (purpose: string) => purpose === "reference_issue_check" || purpose === "reference_issue_edit" || purpose === "reference_issue_review";
const prompt = (name: string) =>
  promptFromText(`reference/${name}`, readFileSync(new URL(`../prompts/${name}.md`, import.meta.url), "utf8"), {});
const WRITE = prompt("issue-write");
const CHECK = prompt("issue-check");
const EDIT = prompt("issue-edit");
const REVIEW = prompt("issue-review");
const SPEAK = prompt("issue-speak");
export const ISSUE_VERSION = `reference-issue@${createHash("sha256").update(WRITE).update(CHECK).update(EDIT).update(REVIEW).update(SPEAK)
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

/** The label the close is shown under (issueText), which the writer or the editor copied in (10-13, 10-14, 10-21). */
const CLOSE_LABEL = /^合起来[：:]\s*/u;

const IssueAnswer = z.object({
  /** The deep item's question. */
  title: z.string().trim().min(1),
  /** Three sentences for the daily's lead. */
  brief: z.array(z.string().trim().min(1)).min(1),
  preview: z.string().trim().min(1),
  news: z.array(z.object({ head: z.string().trim().min(1), text: z.string().trim().min(1) })).min(1),
  deep: z.string().trim().min(1),
  close: z.string().trim().min(1).transform((s) => s.replace(CLOSE_LABEL, "")),
});
export type IssueText = z.infer<typeof IssueAnswer>;
const CheckAnswer = z.object({
  lively: z.coerce.number().default(0),
  problems: z.array(z.object({
    rule: z.coerce.number().int(), quote: z.string().default(""), why: z.string().default(""),
    /** The quoted sentence as the original bears it out; empty takes it out. Only the check writes one. */
    fix: z.string().optional(),
  })).default([]),
});
export type Problem = z.infer<typeof CheckAnswer>["problems"][number];

const WEEKDAYS = "日一二三四五六";
/** 2026-10-11 → 2026年10月11日，星期日: from the calendar, as the model once guessed it wrong (10-11 told as a Saturday). */
export function dayName(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`日期要写成 2026-10-11：${date}`);
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
 * Sources, not items: on 10-13 one source's twelve award lists, one per province, were grouped as one story, and the
 * program then had a news item spent on them.
 */
export function sameEvents(items: DayItem[]): Array<{ ns: number[]; sources: number }> {
  const byStory = new Map<string, DayItem[]>();
  for (const i of items) if (i.storyId) byStory.set(i.storyId, [...byStory.get(i.storyId) ?? [], i]);
  return [...byStory.values()].map((g) => ({ ns: g.map((i) => i.n), sources: new Set(g.map((i) => i.sourceId)).size }))
    .filter((e) => e.sources > 1).sort((a, b) => b.sources - a.sources);
}

async function write(items: DayItem[], date: string, ask: Ask, attempt: string, other?: IssueText): Promise<IssueText> {
  const events = sameEvents(items);
  const user = [
    `日期：${dayName(date)}（这是这一天日报收录的全部 ${items.length} 条，其中 ${items.filter((i) => i.selected).length} 条是精选）`, itemList(items),
    ...(events.length ? [`好几家都在讲的事：\n${events.map((e) => `- ${e.ns.map((n) => `〔${n}〕`).join("")}讲的是同一件事`).join("\n")}`] : []),
    // The second draft tells another deep piece: two drafts of one subject left nothing to choose (10-22).
    ...(other ? [`另一稿细说的是「${other.title}」。这一稿细说换一件别的。`] : []),
  ].join("\n\n");
  return ask("reference_issue_write", WRITE, user, IssueAnswer, attempt);
}

/**
 * Goes over a draft once for the ear before it is checked, the second step of NotebookLlama (Meta's llama-cookbook):
 * written for what to say, a draft read as a list (10-22, 0da591c: 22 figures in a thousand characters, sentences of 58).
 * The check comes after, so what this changes is read against the originals like the rest; output it cannot give
 * leaves the draft as written.
 */
async function speak(issue: IssueText, ask: Ask, attempt: string): Promise<IssueText> {
  return ask("reference_issue_speak", SPEAK, `十一的稿子：\n${JSON.stringify(issue, null, 1)}`, IssueAnswer, attempt).catch((error: unknown) => {
    if (error instanceof ModelOutputError) return issue;
    throw error;
  });
}

/** A draft as the check and the editor read it, part by part. */
const issueText = (issue: IssueText) => [
  `标题：${issue.title}`, `三句话：\n${issue.brief.map((b) => `- ${b}`).join("\n")}`, `预告：${issue.preview}`,
  `快讯：\n${issue.news.map((x, i) => `${i + 1}. ${x.head}\n${x.text}`).join("\n\n")}`, `细说：\n${issue.deep}`, `合起来：${issue.close}`,
].join("\n\n");
const citedText = (cited: DayItem[]) => cited.map((i) =>
  `〔${i.n}〕${i.sourceName}《${i.title}》${QUOTABLE_SOURCES.has(i.sourceId) ? "（可以引原句）" : "（不可以引原句）"}\n${i.text.slice(0, FULL_CHARS)}`).join("\n\n") || "（没有点名任何收录）";

/** Mends only the sentences the check named, against the originals the draft cites and those of an event it left out. */
async function edit(draft: Draft, items: DayItem[], ask: Ask, attempt: string): Promise<IssueText> {
  const missed = new Set(draft.problems.filter((p) => p.rule === 4).flatMap((p) => [...p.quote.matchAll(/〔(\d+)〕/gu)].map((m) => Number(m[1]))));
  const given = [...citedItems(draft.issue, items).cited, ...items.filter((i) => missed.has(i.n))];
  const user = [
    // As JSON, the shape it answers in: shown as issueText it copied the list numbers into heads and 「合起来：」 into the close (10-13, 10-14).
    `十一的稿子：\n${JSON.stringify(draft.issue, null, 1)}`,
    `核对员挑出的问题：\n${draft.problems.map((p) => `- 第 ${p.rule} 条：「${p.quote}」${p.why}`).join("\n")}`,
    `稿子点名的收录（全文）：\n\n${citedText([...new Set(given)])}`,
    // Without the day's list an editor asked to add a source has no number to add (10-21, ff56959: six rounds, none added).
    ...(uncited(draft) ? [`这一天的全部收录（编号、来源、标题），补出处时照这里的编号标：\n${items.map((i) => `〔${i.n}〕${i.sourceName}《${i.title}》`).join("\n")}`] : []),
  ].join("\n\n");
  return ask("reference_issue_edit", EDIT, user, IssueAnswer, attempt);
}

const CITATION = /〔[\d、,，\s]+〕/u;
const UNCITED = "这条快讯没标出处";
/** A draft with a part that cites nothing: its check had no original to read it against, so its few problems prove nothing. */
const uncited = (d: Draft) => d.problems.some((p) => p.rule === 4 && (p.why === UNCITED || p.why === "细说没标出处"));

/** An event this many sources told must be in the issue (on 10-06 the site grouped McDonald's on AI pricing from two). */
export const BIG_EVENT = 3;

/** What the program finds itself, as rule 4: what the check model is not asked to count. How many news items, how many figures, how often 「十一觉得」 are the writer's
 * (Kay 10-23: 「不要各种限制发挥 重点对就行了」); until then the program counted all three and sent drafts back for them. */
function shapeProblems(issue: IssueText, items: DayItem[], cited: DayItem[]): Problem[] {
  const out: Problem[] = [];
  for (const x of issue.news) if (!CITATION.test(x.text)) out.push({ rule: 4, quote: x.head, why: UNCITED });
  // A deep piece that cites nothing is one the check cannot hold to any original (10-21, ff56959: the second draft cited none and passed for the cleaner).
  if (!CITATION.test(issue.deep)) out.push({ rule: 4, quote: issue.title, why: "细说没标出处" });
  // A quotation in a sentence that cites only sources whose sentences may not be quoted (10-11: 「70元时代」 from a
  // paper not on QUOTABLE_SOURCES; the check let it through). A sentence citing nothing tells the source last cited in
  // its paragraph (10-15: “值不值” the sentence after 〔2〕).
  const byN = new Map(items.map((i) => [i.n, i]));
  let told: number[] = [];
  for (const sentence of written(issue).split(/(?<=[。！？\n])/u)) {
    const ns = [...sentence.matchAll(/〔([\d、,，\s]+)〕/gu)].flatMap((m) => m[1]!.split(/[、,，\s]+/u).filter(Boolean).map(Number));
    if (ns.length) told = ns;
    const quoted = sentence.match(/[「“][^」”]+[」”]/u);
    if (quoted && told.length && !told.some((n) => QUOTABLE_SOURCES.has(byN.get(n)?.sourceId ?? ""))) {
      out.push({ rule: 1, quote: sentence.trim(), why: `${quoted[0]} 加了引号，但这句点名的来源不能引原句，要改成转述` });
    }
    if (sentence.endsWith("\n")) told = [];
  }
  // 十一 telling listeners it could not check its own lead (10-14: 「这篇不在今天点名的收录里，我没能核对」, though it was
  // item 1); no check named it in three rounds.
  for (const sentence of written(issue).split(/(?<=[。！？\n])/u)) {
    if (/没能核对|无法核对|没法核对|无法核实|没能核实|不在[^。！？]{0,8}收录|找不到(原文|出处)/u.test(sentence)) {
      out.push({ rule: 1, quote: sentence.trim(), why: "十一不对听的人说自己没核对过；讲的事都在当天的收录里" });
    }
    // Japanese left as it stood (10-14: a blog's name, 《15年続ける蕎麦屋店主の経営ノート》), which no listener can follow.
    if (/[\u3040-\u30ff]/u.test(sentence)) out.push({ rule: 1, quote: sentence.trim(), why: "日文没翻成中文，听的人听不懂" });
  }
  const citedNs = new Set(cited.map((i) => i.n));
  for (const { ns, sources } of sameEvents(items)) {
    if (sources >= BIG_EVENT && !ns.some((n) => citedNs.has(n))) {
      out.push({ rule: 4, quote: ns.map((n) => `〔${n}〕`).join(""), why: `${sources} 家都在讲这件事，这一期没讲` });
    }
  }
  return out;
}

/** Reads one draft for the three rules against the full text of what it cites; problems the program finds come first. */
export async function checkIssue(issue: IssueText, items: DayItem[], ask: Ask): Promise<{ lively: number; problems: Problem[] }> {
  const { cited, unknown } = citedItems(issue, items);
  const own: Problem[] = [...unknown.map((n) => ({ rule: 1, quote: `〔${n}〕`, why: "没有这一条收录" })), ...shapeProblems(issue, items, cited)];
  const user = [`这一期：\n${issueText(issue)}`, `这一期点名的收录（全文）：\n\n${citedText(cited)}`].join("\n\n");
  const answer = await ask("reference_issue_check", CHECK, user, CheckAnswer);
  return { lively: answer.lively, problems: [...own, ...answer.problems] };
}

/**
 * Reads the draft that goes up once more for what it left out, and nothing else (10-18, 10-19, 8079e78: the check
 * found what a draft said wrong, but a blind check still found the other side, the owner's caveat or 十一's own guess
 * passed off as the report's, 3 and 1 times). Its fixes only add, so they go in without another check.
 */
export async function reviewIssue(issue: IssueText, items: DayItem[], ask: Ask): Promise<Problem[]> {
  const { cited } = citedItems(issue, items);
  const user = [`这一期：\n${issueText(issue)}`, `这一期点名的收录（全文）：\n\n${citedText(cited)}`].join("\n\n");
  const answer = await ask("reference_issue_review", REVIEW, user, CheckAnswer);
  return answer.problems.filter((p) => p.fix);
}

export interface Draft {
  issue: IssueText; lively: number; problems: Problem[]; edited: boolean;
  /** Sentences the program took out because the editor could not mend them. */
  cut?: string[];
  /** What the last read for omissions found, its fixes put in. */
  reviewed?: Problem[];
  /** The draft as the writer gave it, before it was gone over for the ear. */
  written?: IssueText;
}
export interface ComposedIssue {
  date: string;
  status: "issue" | "thin";
  /** The one that goes up. */
  chosen: Draft | null;
  /** Why the issue is not the usual one (no usable draft: the day's items as they stand). */
  note?: string;
  drafts: Draft[];
  items: DayItem[];
}

/** Fewer than this many items is no issue: there is no day to tell. */
export const MIN_ITEMS = 3;

/**
 * Rounds of mending before the program cuts what is still wrong. A round is one check (Kay 10-19: 「为什么不要核对员直接
 * 改」): the check writes each fix as it finds the problem, as one who has the original open knows best how to mend it,
 * and the program puts them in; a fresh check, which never sees the last one's verdict, reads the whole draft again,
 * as a magazine's fact-checkers read what its editors mended. What the program found itself has no fix written (a missing
 * event, the wrong number of news items, a citation of no item), so a round with one of those goes to the editor.
 */
export const EDIT_ROUNDS = 5;

/** Sentences, each with its closing mark, and the line breaks between paragraphs as they stand. */
/** A sentence keeps the citation marks after its full stop: split before them, a mended sentence that cites its source
 * left the old mark standing beside its own (10-22, 0da591c: 〔8〕〔8〕 three times). */
const sentences = (text: string) => text.split(/(?<=[。！？](?:〔[^〕]*〕)*|\n)(?!〔)/u).filter(Boolean);
const CITATIONS = /(?:〔[^〕]*〕)+(?=\s*$)/u;
/** Compared without spaces, citation marks or the quotation marks the check puts around a quote. */
const bare = (text: string) => text.replace(/〔[^〕]*〕|\s|^[「“]|[」”]$/gu, "");

/**
 * Puts each problem's replacement in place of the sentence it quotes; an empty replacement takes the sentence out. A
 * flagged news head or lead sentence, taken out, takes its item with it; the deep story's question, taken out, gives way
 * to the first news head. Problems it cannot place, or with no replacement, stay listed.
 */
export function amendIssue(issue: IssueText, problems: Problem[], replacement: (p: Problem) => string | undefined): { issue: IssueText; changed: string[]; kept: Problem[] } {
  const out: IssueText = { ...issue, brief: [...issue.brief], news: issue.news.map((x) => ({ ...x })) };
  const changed: string[] = [];
  const kept: Problem[] = [];
  // A quote may run over several sentences, so a whole sentence inside it counts; a short one ("一") does not.
  const hits = (text: string, q: string) => { const t = bare(text); return t.includes(q) || (t.length >= 6 && q.includes(t)); };
  for (const p of problems) {
    const q = bare(p.quote);
    const r = replacement(p)?.trim();
    if (p.rule > 3 || q.length < 4 || r === undefined) { kept.push(p); continue; }
    const before = changed.length;
    let placed = false;
    const swap = (text: string) => sentences(text).flatMap((x) => {
      if (!hits(x, q)) return [x];
      changed.push(x.trim());
      if (placed || !r) return [];
      placed = true;
      // A mend that drops the sentence's citation keeps it, so the check can still read it against its original.
      const cites = x.match(CITATIONS)?.[0];
      return [cites && !CITATION.test(r) ? `${r}${cites}${x.endsWith("\n") ? "\n" : ""}` : `${r}${x.endsWith("\n") && !r.endsWith("\n") ? "\n" : ""}`];
    }).join("").replace(/\n{3,}/gu, "\n\n").trim();
    const lead = out.brief.findIndex((x) => hits(x, q));
    if (lead >= 0) { changed.push(out.brief[lead]!); if (r) out.brief[lead] = r; else out.brief.splice(lead, 1); }
    const head = out.news.findIndex((x) => hits(x.head, q));
    if (head >= 0) {
      const x = out.news[head]!;
      changed.push(x.head);
      if (r) x.head = r; else { out.news.splice(head, 1); changed.push(x.text); }
    }
    if (hits(out.title, q)) { changed.push(out.title); out.title = r; }
    out.preview = swap(out.preview);
    for (const x of out.news) x.text = swap(x.text);
    out.news = out.news.filter((x) => x.text);
    out.deep = swap(out.deep);
    out.close = swap(out.close).replace(CLOSE_LABEL, "");
    if (changed.length === before) kept.push(p);
  }
  if (!out.deep || !out.title) out.title = out.news[0]?.head ?? out.title;
  // The daily's lead is three sentences (10-15 went out with two): a lead sentence taken out gives way to a part of the
  // issue no sentence left tells, the deep piece first, as it is the issue's title. Taking the next news head instead
  // (10-18, 8079e78) put back a head the first sentence already told and left the deep piece out of the lead.
  const parts = [...(out.deep ? [{ say: out.title, about: `${out.title}${out.deep}` }] : []), ...out.news.map((x) => ({ say: x.head, about: `${x.head}${x.text}` }))];
  for (const x of parts) {
    if (out.brief.length >= 3) break;
    if (!x.say || out.brief.some((b) => b === x.say || told(b, x.about) || told(x.say, b))) continue;
    out.brief.push(x.say);
  }
  return { issue: out, changed, kept };
}

/**
 * Takes out what the check still found after the last mending (Kay 10-19: 「哪有人每天出的结果审核不过就不出了」): a
 * newspaper cuts the sentence it cannot stand behind and runs the page. Cutting adds no claim, so it is not checked again.
 */
/** Two-character pieces of a sentence, without spaces, punctuation or citation marks. */
const pairs = (s: string) => {
  const c = [...s.replace(/〔[^〕]*〕|[\s\p{P}]/gu, "")];
  return new Set(c.slice(1).map((x, i) => c[i] + x));
};
/** Whether `sentence` tells of what `text` says: most of its two-character pieces are there (Chinese has no spaces to split words on). */
const told = (sentence: string, text: string) => {
  const a = pairs(sentence), b = pairs(text);
  return a.size > 0 && [...a].filter((x) => b.has(x)).length / a.size >= 0.5;
};

export const cutProblems = (issue: IssueText, problems: Problem[]) => {
  const { issue: out, changed, kept } = amendIssue(issue, problems, () => "");
  return { issue: out, cut: changed, kept };
};

/**
 * The day's items as they stand, when the model gave no usable draft (trial 10-13): the best five, each by its own
 * title and summary, which the daily already carries.
 */
function itemsIssue(items: DayItem[]): IssueText {
  const top = [...items.filter((i) => i.selected), ...items.filter((i) => !i.selected)].slice(0, 5);
  return {
    title: top[0]!.title, brief: top.slice(0, 3).map((i) => i.title), preview: `今天先说${top.length}件事。`,
    news: top.map((i) => ({ head: i.title, text: `${i.sourceName}报道：${i.summary}〔${i.n}〕` })), deep: "", close: "",
  };
}

/** Writes the day's issue: two drafts, each checked; the livelier that passes, else the livelier mended, then cut. */
export async function composeIssue(items: DayItem[], date: string, ask: Ask): Promise<ComposedIssue> {
  if (items.length < MIN_ITEMS) return { date, status: "thin", chosen: null, drafts: [], items };
  const drafts: Draft[] = [];
  let unusable: unknown;
  for (const attempt of ["a", "b"]) {
    // A draft the model could not write in usable form, even asked twice, leaves the other (trial 10-13: broken JSON twice).
    const issue = await write(items, date, ask, attempt, drafts[0]?.issue).catch((error: unknown) => {
      if (!(error instanceof ModelOutputError)) throw error;
      unusable = error;
      return null;
    });
    if (issue) {
      const spoken = await speak(issue, ask, attempt);
      drafts.push({ issue: spoken, written: issue, ...await checkIssue(spoken, items, ask), edited: false });
    }
  }
  if (!drafts.length) {
    const why = unusable instanceof Error ? unusable.message : String(unusable);
    return { date, status: "issue", chosen: { issue: itemsIssue(items), lively: 0, problems: [], edited: false }, drafts, items, note: `两稿都没写成（${why.slice(0, 120)}），照当天收录的标题和摘要出简版` };
  }
  const done = async (chosen: Draft): Promise<ComposedIssue> => {
    const reviewed = await reviewIssue(chosen.issue, items, ask);
    if (!reviewed.length) return { date, status: "issue", chosen, drafts, items };
    return { date, status: "issue", chosen: { ...chosen, issue: amendIssue(chosen.issue, reviewed, (p) => p.fix).issue, reviewed }, drafts, items };
  };
  const passing = drafts.filter((d) => !d.problems.length).sort((x, y) => y.lively - x.lively);
  if (passing.length) return done(passing[0]!);
  let last = [...drafts].sort((x, y) => Number(uncited(x)) - Number(uncited(y)) || y.lively - x.lively || x.problems.length - y.problems.length)[0]!;
  for (const attempt of "cdefg".slice(0, EDIT_ROUNDS)) {
    let issue: IssueText;
    if (last.problems.some((p) => p.fix === undefined)) issue = await edit(last, items, ask, attempt);
    else {
      const fixed = amendIssue(last.issue, last.problems, (p) => p.fix);
      if (!fixed.changed.length) break;
      issue = fixed.issue;
    }
    last = { issue, ...await checkIssue(issue, items, ask), edited: true };
    drafts.push(last);
    if (!last.problems.length) break;
  }
  if (!last.problems.length) return done(last);
  const { issue, cut, kept } = cutProblems(last.issue, last.problems);
  return done({ issue, lively: last.lively, problems: kept, edited: true, cut });
}

// ---------------------------------------------------------------- the daily's top, and a page to read

/** What the daily's lead carries for an issue (the original ReportPaper lead: a title and a paragraph). */
export function dailyLead(c: ComposedIssue, no: number): { kicker: string; title: string; leadParagraph: string } | null {
  if (c.status !== "issue" || !c.chosen) return null;
  return { kicker: `十一说 · 第 ${no} 期`, title: c.chosen.issue.title, leadParagraph: c.chosen.issue.brief.join("") };
}

const RULES: Record<number, string> = { 1: "说是原文讲的，原文里没有／引了不能引的原句", 2: "假设的例子读起来像真事", 3: "把一家店的情况说成通用", 4: "漏了大事或快讯不合格式（程序查的）" };

/** One draft as the reader hears it, top to bottom with the program's own lines, then what the check said. */
function draftMarkdown(d: Draft, items: DayItem[], date: string): string[] {
  const { cited } = citedItems(d.issue, items);
  const f = fixedLines(date);
  return [
    `**${d.issue.title}**`, "", "### 三句话（日报头条用）", ...d.issue.brief.map((b) => `- ${b}`), "", "### 念出来的样子", "",
    f.open, "", d.issue.preview, "", ...d.issue.news.flatMap((x) => [`**${x.head}**`, "", x.text, ""]),
    ...(d.issue.deep ? [f.turn, "", `**${d.issue.title}**`, "", d.issue.deep, ""] : []), ...(d.issue.close ? [d.issue.close, ""] : []), f.end, "",
    "### 原文出处", ...(cited.length ? cited.map((i) => `- 〔${i.n}〕${i.sourceName}：《${i.title}》 ${i.url}`) : ["- （没有点名）"]), "",
    `> 关于十一：十一是 AI。它读完这一天收录的全部资料，挑要紧的讲给你听；讲到的事以点名的原文为准，算账时举的例子会说明是假设。`, "",
    `核对：${d.cut ? `删掉 ${d.cut.length} 句后出刊` : d.problems.length ? "没过" : "过了"}　精彩 ${d.lively}/10　字数 ${issueChars(d.issue)}${d.written ? `（为念出来改之前 ${issueChars(d.written)}）` : ""}${d.edited ? "　（编辑按问题改过）" : ""}`,
    ...(d.cut ?? []).map((x) => `- 删掉：${x}`),
    ...d.problems.map((p) => `- ${d.cut ? "没能删掉，" : ""}第 ${p.rule} 条（${RULES[p.rule] ?? "其他"}）：「${p.quote}」${p.why}`), "",
  ];
}

/** An issue as the trial reads it: the one that goes up first, then every draft with its check. */
export function issueMarkdown(c: ComposedIssue, no: number): string {
  const head = { issue: "出刊", thin: "收录太少，不写" }[c.status];
  const out = [`# 十一说 · 第 ${no} 期（${c.date}，${head}）`, "", `这一天收录 ${c.items.length} 条。`, "", ...(c.note ? [`> ${c.note}`, ""] : [])];
  if (c.chosen) out.push("## 上线的这一篇", "", ...draftMarkdown(c.chosen, c.items, c.date));
  c.drafts.forEach((d, i) => { if (d !== c.chosen) out.push(`## 第 ${i + 1} 稿（没选）`, "", ...draftMarkdown(d, c.items, c.date)); });
  return out.join("\n");
}
