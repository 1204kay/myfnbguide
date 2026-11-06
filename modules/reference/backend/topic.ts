// A situation's 综合整理 (决定记录 L2575, Kay 11-06 07:11「你们讨论决定吧」): all of a situation's items (title, 导读,
// 原文要点, by cause) go to one model, which writes one article that cites them by number (prompts/topic-write.md); a
// checker reads it against those items sentence by sentence (prompts/topic-check.md). Sentences it finds 严重 wrong are
// cut and what is left is checked again: an article that still has one is held, not shown, and the page keeps the
// last one shown. Written only when the situation has items the last article did not read, at most US$0.3 a day.
// Which situations are written is the settings row `reference.topics` ({"slugs": ["opening-cost"]}), so Kay's
// starting and stopping waits for no deploy (as 十一说); with no row none is. Stop:
// DELETE FROM settings WHERE key = 'reference.topics'.
// The trial before it (11-06, four runs on the server, myfnb/参考页改版-2026-11-06 in the handbook's project files)
// found by hand one 严重 error in 42 citations, a sentence citing one shop for another's words: the checker's job.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { sql } from "@aihot/backend/db";
import { modelFor } from "@aihot/backend/editorial/models";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { chatJson, MODELS } from "@aihot/backend/providers/llm";
import { completeReceipt, ModelOutputError } from "@aihot/backend/providers/receipts";
import { beijingAt, beijingDate } from "@aihot/contracts/time";
import type { SituationPage, TopicView } from "../types.ts";
import { joined } from "./claude.ts";
import type { Ask, Usage } from "./issue.ts";

export const TOPIC_STEP = "referenceTopic";
export const TOPIC_CHECK_STEP = "referenceTopicCheck";

const prompt = (name: string, values: Record<string, string> = {}) =>
  promptFromText(`reference/${name}`, readFileSync(new URL(`../prompts/${name}.md`, import.meta.url), "utf8"), values);
export const TOPIC_VERSION = `reference-topic@${createHash("sha256")
  .update(readFileSync(new URL("../prompts/topic-write.md", import.meta.url)))
  .update(readFileSync(new URL("../prompts/topic-check.md", import.meta.url)))
  .update(readFileSync(new URL(import.meta.url), "utf8")).digest("hex").slice(0, 10)}`;

/** At most this much a day (Beijing date) on all situations' articles: Kay's cap in 决定记录 L2575. */
export const DAY_CAP_USD = 0.3;
/** US$ per million input / output tokens: DeepSeek's price list (11-06, peak hours, uncached input); a model not here is not written with. */
const PRICES: Record<string, [number, number]> = {
  "deepseek-flash": [0.3, 1.2], "deepseek-flash-think": [0.3, 1.2], "deepseek-flash-llm": [0.3, 1.2], "deepseek-flash-think-llm": [0.3, 1.2],
};
/**
 * Room to write past the preset's thinking: the trial's first run (66k characters in) spent 8,000 plus 12,000 thinking
 * before any JSON; 28,000 more held the article. The check writes a short list, and runs without thinking: with it,
 * the trial's third run thought past 20,000 twice and wrote nothing.
 */
const WRITE_ROOM = 28_000;
const CHECK_ROOM = 8_000;

export interface TopicItem { n: number; id: string; title: string; src: string; summary: string; points: string; group: string }
export const TopicArticle = z.object({
  title: z.string().trim().min(1),
  lead: z.array(z.string().trim().min(1)).min(1),
  sections: z.array(z.object({ group: z.string().trim().min(1), paragraphs: z.array(z.string().trim().min(1)).min(1) })).min(1),
});
export type TopicText = z.infer<typeof TopicArticle>;
const Problems = z.object({ problems: z.array(z.object({ quote: z.string(), why: z.string(), severity: z.string() })) });
export type TopicProblem = z.infer<typeof Problems>["problems"][number];

interface Group { no: string; title: string }

/** A situation's groups as the writer is given them: 第 1 组…, and 其他 for what is in no cause. */
export function topicGroups(page: SituationPage): Group[] {
  return [...page.groups.map((g, i) => ({ no: String(i + 1), title: g.title })), ...(page.rest.length ? [{ no: "其他", title: "其他做法" }] : [])];
}

/** The listing the writer and the checker read: each item numbered, with its 导读 and 原文要点. */
export const topicListing = (groups: Group[], items: TopicItem[]) => groups.map((g) => [`## 第 ${g.no} 组：${g.title}`, ...items.filter((i) => i.group === g.no).map((i) =>
  `〔${i.n}〕${i.src}\n标题：${i.title}\n导读：${i.summary}\n原文要点：${i.points.replace(/\n/g, "；")}`)].join("\n\n")).join("\n\n");

/** The numbers a text cites. */
export const citedNumbers = (text: string) => new Set([...text.matchAll(/〔([^〕]+)〕/gu)].flatMap((m) => m[1]!.split(/[,，、\s]+/).map(Number).filter(Number.isInteger)));

/** A section's heading: the writer wrote 「第 1 组」 for 1 in the trial's first run (11-06 08:57). */
export const groupNo = (g: string) => g.replace(/^第\s*|\s*组$/gu, "").trim();

/** The whole article as one text, as the checker reads it. */
export const topicMarkdown = (a: TopicText, groups: Group[]) => [`# ${a.title}`, "", ...a.lead, "",
  ...a.sections.flatMap((s) => [`## ${groups.find((g) => g.no === groupNo(s.group))?.title ?? s.group}`, "", ...s.paragraphs.flatMap((p) => [p, ""])])].join("\n");

const isSerious = (p: TopicProblem) => p.severity.includes("严重");

/** The article without the sentences quoted; an emptied paragraph or section goes with them. */
export function cutSentences(a: TopicText, quotes: string[]): TopicText {
  const cut = (s: string) => quotes.reduce((t, q) => (q && t.includes(q) ? t.replace(q, "") : t), s).replace(/\s{2,}/g, " ").trim();
  return {
    title: a.title, lead: a.lead.map(cut).filter(Boolean),
    sections: a.sections.map((s) => ({ ...s, paragraphs: s.paragraphs.map(cut).filter(Boolean) })).filter((s) => s.paragraphs.length),
  };
}

/** Citations of no item given: 严重, found by the program, as 十一说's (issue.ts citedItems). */
function unknownCitations(a: TopicText, items: TopicItem[]): TopicProblem[] {
  const known = new Set(items.map((i) => i.n));
  return [a.title, ...a.lead, ...a.sections.flatMap((s) => s.paragraphs)].flatMap((p) => p.split(/(?<=[。！？])/u))
    .filter((s) => [...citedNumbers(s)].some((n) => !known.has(n)))
    .map((quote) => ({ quote: quote.trim(), why: "标的编号不在给的原文里", severity: "严重" }));
}

export interface ComposedTopic { status: "shown" | "held"; article: TopicText; draft: TopicText; found: TopicProblem[]; again: TopicProblem[] }

/** Writes, checks, cuts what is 严重 and checks again; held when the second check still finds one. */
export async function composeTopic(title: string, groups: Group[], items: TopicItem[], ask: { write: Ask; check: Ask }): Promise<ComposedTopic> {
  const listing = topicListing(groups, items);
  const draft = await ask.write("reference_topic_write", prompt("topic-write", { 题目: title }), `# ${title}\n\n${listing}`, TopicArticle);
  const checkOf = async (a: TopicText, attempt?: string) => [...unknownCitations(a, items),
    ...(await ask.check("reference_topic_check", prompt("topic-check"), `# 综合整理\n\n${topicMarkdown(a, groups)}\n\n# 原文\n\n${listing}`, Problems, attempt)).problems];
  const found = await checkOf(draft);
  const serious = found.filter(isSerious);
  if (!serious.length) return { status: "shown", article: draft, draft, found, again: [] };
  const article = cutSentences(draft, serious.map((p) => p.quote));
  const again = article.lead.length && article.sections.length ? await checkOf(article, "recheck") : [{ quote: "", why: "删完没有剩下开头或小节", severity: "严重" }];
  return { status: again.some(isSerious) ? "held" : "shown", article, draft, found, again };
}

/** The items of a situation as its page lists them, numbered in that order, with the 导读 and 要点 the writer reads. */
async function itemsOf(page: SituationPage, groups: Group[]): Promise<TopicItem[]> {
  const parts = [...page.groups.map((g, i) => ({ no: groups[i]!.no, cases: g.cases })), ...(page.rest.length ? [{ no: "其他", cases: page.rest }] : [])];
  const ids = parts.flatMap((p) => p.cases.map((c) => c.id));
  const rows = await sql<{ article_id: string; summary: string | null; reason: string | null }[]>`
    SELECT article_id, summary, reason FROM publications WHERE article_id = ANY(${ids})`;
  const byId = new Map(rows.map((r) => [r.article_id, r]));
  let n = 0;
  return parts.flatMap((p) => p.cases.map((c) => ({
    n: ++n, id: c.id, title: c.title, src: c.src, group: p.no,
    summary: byId.get(c.id)?.summary ?? "", points: byId.get(c.id)?.reason ?? c.reason ?? "",
  })));
}

/** The situations whose articles are written (settings `reference.topics`); none without the row. */
export async function topicSlugs(): Promise<string[]> {
  const [row] = await sql<{ value: { slugs?: unknown } }[]>`SELECT value FROM settings WHERE key = 'reference.topics'`;
  return Array.isArray(row?.value.slugs) ? row.value.slugs.filter((s): s is string => typeof s === "string") : [];
}

/** Whether a situation has items its last article (shown or held) did not read: only then is it written again. */
export async function topicStale(page: SituationPage): Promise<boolean> {
  const ids = [...page.groups.flatMap((g) => g.cases), ...page.rest].map((c) => c.id);
  const [last] = await sql<{ item_ids: string[] }[]>`SELECT item_ids FROM reference_topics WHERE slug = ${page.slug} ORDER BY id DESC LIMIT 1`;
  if (!last) return ids.length > 0;
  const read = new Set(last.item_ids);
  return ids.some((id) => !read.has(id));
}

/** What the articles cost so far on the Beijing date of `now`. */
async function spentToday(now: Date): Promise<number> {
  const start = beijingAt(beijingDate(now), "00:00");
  const [row] = await sql<{ usd: number | null }[]>`SELECT sum(usd)::float AS usd FROM reference_topics WHERE created_at >= ${start}`;
  return row?.usd ?? 0;
}

const priceOf = (m: string) => PRICES[m];

/** One model call as issue.ts modelAsk, with `room` past the preset's thinking; unusable output once is asked again once. */
function topicAsk(model: string, subject: string, room: number, receipts: number[], onUsage: (u: Usage) => void): Ask {
  return async (purpose, system, user, schema, attempt) => {
    const once = (tag?: string) => chatJson({ model, purpose, subject, promptVersion: TOPIC_VERSION, system, user: joined(user), schema, temperature: 0, maxTokens: room, timeoutMs: 900_000, attemptTag: tag });
    const res = await once(attempt).catch((error: unknown) => {
      if (error instanceof ModelOutputError) return once(`${attempt ?? ""}retry`);
      throw error;
    });
    receipts.push(res.receiptId);
    if (!res.reused) onUsage({ input: Number(res.usage?.prompt_tokens ?? 0), output: Number(res.usage?.completion_tokens ?? 0) });
    return res.data;
  };
}

/**
 * Writes and keeps a situation's article when it has new items and the day's cap holds the call's worst case (every
 * character an input token, every call writing all its room: a write and two checks); otherwise nothing.
 */
export async function writeTopic(page: SituationPage, now = new Date()): Promise<{ slug: string; status: string; usd?: number }> {
  if (!(await topicStale(page))) return { slug: page.slug, status: "no new items" };
  const [writer, checker] = await Promise.all([modelFor(TOPIC_STEP), modelFor(TOPIC_CHECK_STEP)]);
  const [wp, cp] = [priceOf(writer), priceOf(checker)];
  if (!wp || !cp) return { slug: page.slug, status: `no price for ${!wp ? writer : checker}` };
  const groups = topicGroups(page);
  const items = await itemsOf(page, groups);
  const chars = topicListing(groups, items).length;
  const worst = (p: [number, number], m: string, room: number) => (chars * 1.5 * p[0] + (room + (MODELS[m]?.reasoningTokens ?? 0)) * p[1]) / 1e6;
  const need = worst(wp, writer, WRITE_ROOM) + 2 * worst(cp, checker, CHECK_ROOM);
  if (need > DAY_CAP_USD - (await spentToday(now))) return { slug: page.slug, status: "over the day's cap" };

  const receipts: number[] = [];
  let usd = 0;
  const priced = (p: [number, number]) => (u: Usage) => { usd += (u.input * p[0] + u.output * p[1]) / 1e6; };
  const subject = `reference-topic:${page.slug}`;
  const c = await composeTopic(page.title, groups, items, {
    write: topicAsk(writer, subject, WRITE_ROOM, receipts, priced(wp)),
    check: topicAsk(checker, subject, CHECK_ROOM, receipts, priced(cp)),
  });
  const cited = citedNumbers(topicMarkdown(c.article, groups));
  const content = {
    article: c.article, groups, found: c.found, again: c.again, draft: c.draft,
    sources: items.filter((i) => cited.has(i.n)).map(({ n, id }) => ({ n, id })),
  };
  await sql.begin(async (tx) => {
    await tx`INSERT INTO reference_topics (slug, status, content, item_ids, version, models, usd)
      VALUES (${page.slug}, ${c.status}, ${tx.json(content as never)}, ${items.map((i) => i.id)}, ${TOPIC_VERSION}, ${tx.json({ writer, checker })}, ${usd})`;
    for (const id of receipts) await completeReceipt(tx, id);
  });
  return { slug: page.slug, status: c.status, usd };
}

/** A situation's last shown article as its page reads it: sections under their causes' titles, citations to items. */
export async function readTopic(slug: string): Promise<TopicView | null> {
  const [row] = await sql<{ content: { article: TopicText; groups: Group[]; sources: Array<{ n: number; id: string }> }; created_at: Date; items: number }[]>`
    SELECT content, created_at, cardinality(item_ids) AS items FROM reference_topics WHERE slug = ${slug} AND status = 'shown' ORDER BY id DESC LIMIT 1`;
  if (!row) return null;
  const { article, groups, sources } = row.content;
  return {
    title: article.title, lead: article.lead,
    sections: article.sections.map((s) => ({ title: groups.find((g) => g.no === groupNo(s.group))?.title ?? s.group, paragraphs: s.paragraphs })),
    sources: Object.fromEntries(sources.map((s) => [s.n, s.id])),
    items: row.items, updatedAt: row.created_at.toISOString(),
  };
}
