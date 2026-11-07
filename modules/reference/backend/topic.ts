// A situation's 综合整理 (决定记录 L2575, Kay 11-06 07:11「你们讨论决定吧」): all of a situation's items (title, 导读,
// 原文要点, by cause) go to one model, which writes one article that cites them by number (prompts/topic-write.md); a
// checker reads it against those items sentence by sentence (prompts/topic-check.md). It is three points for the card
// at the top and three or four for each cause, each a conclusion and at most one reason, no amounts (Kay 11-06 22:30
// 「你们讨论决定了就可以直接上线了」「全部情况 一起优化」, after the ninth sample of 开店前的准备和开销). Sentences it finds 严重 wrong are
// cut and what is left is checked again: an article that still has one is held, not shown, and the page keeps the
// last one shown. Written only when the situation has NEW_ITEMS items the last article did not read, at most DAY_CAP_USD a day.
// A rewrite is given the article shown as its template (asTemplate, prompts/topic-update.md): it keeps to it and changes
// what the new items change, as the 41 first articles were written by hand and checked (Kay 11-07 08:20).
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
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { beijingAt, beijingDate } from "@aihot/contracts/time";
import type { SituationPage, TopicView } from "../types.ts";
import { joined } from "./claude.ts";
import type { Ask, Usage } from "./issue.ts";

export const TOPIC_STEP = "referenceTopic";
export const TOPIC_CHECK_STEP = "referenceTopicCheck";

const prompt = (name: string, values: Record<string, string> = {}) =>
  promptFromText(`reference/${name}`, readFileSync(new URL(`../prompts/${name}.md`, import.meta.url), "utf8"), values);
/**
 * The prompts' version: an article written with other prompts is written again (topicStale), as a change of how it is
 * written is meant for the articles already up (Kay 11-06 10:34: 只有日本). Only the prompts: a change of this file's
 * code alone does not rewrite every situation's article.
 */
export const TOPIC_VERSION = `reference-topic@${createHash("sha256")
  .update(readFileSync(new URL("../prompts/topic-write.md", import.meta.url)))
  .update(readFileSync(new URL("../prompts/topic-check.md", import.meta.url))).digest("hex").slice(0, 10)}`;
/**
 * How a rewrite keeps to the article it replaces (prompts/topic-update.md), added to topic-write.md when there is one.
 * Not in TOPIC_VERSION: it says how to change an article only when one is written again for its new items, so a change
 * of it writes no article again (the 41 first articles, 11-07, are the pages' templates; Kay 11-07 08:20「要做好样式
 * 不然我不放心deepseek写的」).
 */
const UPDATE = "topic-update";
/**
 * How a rewrite's check reads 「不能把几条合成一句它们各自没说过的话」 (prompts/topic-check-update.md), added to topic-check.md
 * when there is a template. In the 11-07 trial flash took it for 「each item must say the whole sentence」 and cut 19 of a
 * page's 30 sentences, every one of which the review thread then found in the items it cites. Not in TOPIC_VERSION for
 * UPDATE's reason: a change of it writes no article again.
 */
const CHECK_UPDATE = "topic-check-update";

/**
 * At most this much a day (Beijing date) on all situations' articles: Kay's cap in 决定记录 L2575, US$0.3 (about 2–4
 * rewrites a day fit). It was US$3 for a day while every situation was to be written the new way (十一 11-06 22:35);
 * the 41 first articles were written by hand on 11-07 instead, so it is back to 0.3.
 */
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
export const WRITE_ROOM = 28_000;
export const CHECK_ROOM = 8_000;

export interface TopicItem { n: number; id: string; title: string; src: string; summary: string; points: string; group: string }
export const TopicArticle = z.object({
  lead: z.array(z.string().trim().min(1)).min(1),
  sections: z.array(z.object({ group: z.string().trim().min(1), paragraphs: z.array(z.string().trim().min(1)).min(1) })).min(1),
});
export type TopicText = z.infer<typeof TopicArticle>;
const Problems = z.object({ problems: z.array(z.object({ quote: z.string(), why: z.string(), severity: z.string() })) });
export type TopicProblem = z.infer<typeof Problems>["problems"][number];

/** A cause as the article was written under it; `key` places its points in the page's section (none before 11-07). */
interface Group { no: string; key?: string; title: string }

/** A situation's groups as the writer is given them: 第 1 组…, and 其他 for what is in no cause. */
export function topicGroups(page: SituationPage): Group[] {
  return [...page.groups.map((g, i) => ({ no: String(i + 1), key: g.key, title: g.title })), ...(page.rest.length ? [{ no: "其他", key: "rest", title: "其他做法" }] : [])];
}

/** The listing the writer and the checker read: each item numbered, with its 导读 and 原文要点. */
export const topicListing = (groups: Group[], items: TopicItem[], fresh = new Set<number>()) => groups.map((g) => [`## 第 ${g.no} 组：${g.title}`, ...items.filter((i) => i.group === g.no).map((i) =>
  `〔${i.n}〕${fresh.has(i.n) ? "（新）" : ""}${i.src}\n标题：${i.title}\n导读：${i.summary}\n原文要点：${i.points.replace(/\n/g, "；")}`)].join("\n\n")).join("\n\n");

/** The numbers a text cites. */
export const citedNumbers = (text: string) => new Set([...text.matchAll(/〔([^〕]+)〕/gu)].flatMap((m) => m[1]!.split(/[,，、\s]+/).map(Number).filter(Number.isInteger)));

/** A section's heading: the writer wrote 「第 1 组」 for 1 in the trial's first run (11-06 08:57). */
export const groupNo = (g: string) => g.replace(/^第\s*|\s*组$/gu, "").trim();

/** The whole article as one text, as the checker reads it. */
export const topicMarkdown = (title: string, a: TopicText, groups: Group[]) => [`# ${title}`, "", ...a.lead, "",
  ...a.sections.flatMap((s) => [`## ${groups.find((g) => g.no === groupNo(s.group))?.title ?? s.group}`, "", ...s.paragraphs.flatMap((p) => [p, ""])])].join("\n");

const isSerious = (p: TopicProblem) => p.severity.includes("严重");

/**
 * The punctuation a cut leaves (the first article on the site, 11-06 10:27: 「〔99〕；。」 five times): a clause quoted
 * without its 「；」 leaves that before the full stop, a whole sentence leaves two stops, a paragraph's first leaves a
 * stop or a 「；」 at its start; a paragraph left with only these is gone.
 */
export const tidy = (s: string) => s
  .replace(/[；，、：\s]+(?=[。！？])/gu, "")
  .replace(/([。！？])[。；，、\s]+/gu, "$1")
  .replace(/^[。！？；，、：\s]+/u, "")
  .replace(/[；，、：]+$/u, "。")
  .replace(/\s{2,}/g, " ").trim();

/**
 * The article without the sentences quoted; an emptied point or section goes with them. A point whose first sentence,
 * its conclusion, is cut goes whole: what is left is the reason for a conclusion no longer there (11-07 03:50, the
 * card's first point read 「因为方向定了，看报价和店面才有判断标准……」 and nothing before it).
 */
export function cutSentences(a: TopicText, quotes: string[]): TopicText {
  const cut = (s: string) => tidy(quotes.reduce((t, q) => (q && t.includes(q) ? t.replace(q, "") : t), s));
  const first = (s: string) => s.split(/(?<=[。！？])/u)[0]!.trim();
  const point = (s: string) => { const c = cut(s); return c.startsWith(tidy(first(s))) ? [c] : []; };
  return {
    lead: a.lead.flatMap(point),
    sections: a.sections.map((s) => ({ ...s, paragraphs: s.paragraphs.flatMap(point) })).filter((s) => s.paragraphs.length),
  };
}

/**
 * Citations of no item given, and sentences citing none: 严重, found by the program, as 十一说's (issue.ts citedItems).
 * Every sentence cites (prompts/topic-write.md 第 11 条); one that does not has nothing the check can hold it to, as a
 * template's sentence left without numbers when the items it cited are gone (review of #237).
 */
function unknownCitations(a: TopicText, items: TopicItem[]): TopicProblem[] {
  const known = new Set(items.map((i) => i.n));
  return [...a.lead, ...a.sections.flatMap((s) => s.paragraphs)].flatMap((p) => p.split(/(?<=[。！？])/u)).map((s) => s.trim()).filter(Boolean)
    .flatMap((quote) => {
      const cited = [...citedNumbers(quote)];
      if (!cited.length) return [{ quote, why: "这一句没有标原文编号", severity: "严重" }];
      return cited.some((n) => !known.has(n)) ? [{ quote, why: "标的编号不在给的原文里", severity: "严重" }] : [];
    });
}

/** The article a situation shows, as stored: its groups and which item each of its numbers was. */
export interface Shown { article: TopicText; groups: Group[]; sources: Array<{ n: number; id: string }>; itemIds: string[] }

/**
 * The shown article in this write's numbers and groups, to write from: the items a situation lists are numbered in
 * page order, so a new item moves the numbers after it. A citation of an item gone is dropped, a section of a cause gone
 * with it; `fresh` are the numbers of the items it did not read.
 */
export function asTemplate(shown: Shown, groups: Group[], items: TopicItem[]): { article: TopicText; fresh: Set<number> } {
  const now = new Map(items.map((i) => [i.id, i.n]));
  const was = new Map(shown.sources.map((s) => [s.n, s.id]));
  const cite = (p: string) => p.replace(/〔([^〕]+)〕/gu, (_, list: string) => {
    const ns = [...new Set(list.split(/[,，、\s]+/).map((n) => now.get(was.get(Number(n)) ?? "")).filter((n): n is number => n !== undefined))];
    return ns.length ? `〔${ns.sort((a, b) => a - b).join(",")}〕` : "";
  });
  const noNow = (g: string) => {
    const key = shown.groups.find((x) => x.no === groupNo(g))?.key;
    return key ? groups.find((x) => x.key === key)?.no : undefined;
  };
  const read = new Set(shown.itemIds);
  return {
    article: {
      lead: shown.article.lead.map(cite),
      sections: shown.article.sections.flatMap((s) => { const no = noNow(s.group); return no ? [{ group: no, paragraphs: s.paragraphs.map(cite) }] : []; }),
    },
    fresh: new Set(items.filter((i) => !read.has(i.id)).map((i) => i.n)),
  };
}

/** The template as the writer reads it: the card's points, then each group's under its number, as the JSON wants them. */
export const templateMarkdown = (a: TopicText, groups: Group[]) => ["## 开头三条", "", ...a.lead, "",
  ...a.sections.flatMap((s) => [`## 第 ${s.group} 组：${groups.find((g) => g.no === s.group)?.title ?? ""}`, "", ...s.paragraphs.flatMap((p) => [p, ""])])].join("\n");

const sentences = (p: string) => p.split(/(?<=[。！？])/u).map((s) => s.trim()).filter(Boolean);
const allSentences = (a: TopicText) => [...a.lead, ...a.sections.flatMap((s) => s.paragraphs)].flatMap(sentences);
/** A sentence's words without its numbers or spaces: the same sentence however it is cited. */
const bare = (s: string) => s.replace(/〔[^〕]*〕/gu, "").replace(/\s+/gu, "");
const cites = (ns: Iterable<number>) => `〔${[...new Set(ns)].sort((a, b) => a - b).join(",")}〕`;

/**
 * The written article held to its template by the program, not by the prompt: in the 11-07 trial (five pages, no new
 * item) the writer kept the words but added numbers of items the template had read to a third of its sentences, and
 * wrote seven sentences no new item asked for. So:
 * - a sentence in the template's words keeps the template's numbers; only a new item's number can be added to it
 *   (topic-update 第 3 条), and a number goes only when its item is gone (asTemplate). One whose numbers all went takes
 *   the writer's (第 6 条);
 * - the card, or a cause, where the writer cites no new item is the template's as it was: nothing new asked for a change.
 * `kept` are the template's sentences as they were: checked already, the check's 严重 on them is listed, not cut.
 */
export function keepTemplate(written: TopicText, template: { article: TopicText; fresh: Set<number> }): { article: TopicText; kept: Set<string> } {
  const { article: t, fresh } = template;
  const was = new Map(allSentences(t).map((s) => [bare(s), s]));
  const kept = new Set<string>();
  const one = (s: string) => {
    const old = was.get(bare(s));
    const before = old ? citedNumbers(old) : new Set<number>();
    if (!old || !before.size) return s;
    const added = [...citedNumbers(s)].filter((n) => fresh.has(n) && !before.has(n));
    if (!added.length) { kept.add(old); return old; }
    const last = old.lastIndexOf("〔");
    return `${old.slice(0, last)}${cites([...citedNumbers(old.slice(last)), ...added])}${old.slice(old.indexOf("〕", last) + 1)}`;
  };
  const held = (ps: string[]) => ps.map((p) => sentences(p).map(one).join(""));
  // The template's own: a sentence whose numbers all went takes the writer's numbers for the same words, if any.
  const writer = new Map(allSentences(written).map((s) => [bare(s), s]));
  const asWas = (ps: string[]) => ps.map((p) => sentences(p).map((s) => (citedNumbers(s).size ? one(s) : (writer.get(bare(s)) ?? s))).join(""));
  const touched = (ps: string[]) => ps.some((p) => [...citedNumbers(p)].some((n) => fresh.has(n)));
  const theirs = (no: string) => written.sections.find((s) => groupNo(s.group) === no);
  const nos = [...new Set([...t.sections.map((s) => s.group), ...written.sections.map((s) => groupNo(s.group))])];
  return {
    article: {
      lead: touched(written.lead) ? held(written.lead) : asWas(t.lead),
      sections: nos.flatMap((no) => {
        const w = theirs(no), o = t.sections.find((s) => s.group === no);
        const paragraphs = w && (touched(w.paragraphs) || !o) ? held(w.paragraphs) : asWas(o!.paragraphs);
        return paragraphs.length ? [{ group: no, paragraphs }] : [];
      }).sort((a, b) => nos.indexOf(a.group) - nos.indexOf(b.group)),
    },
    kept,
  };
}

export interface ComposedTopic { status: "shown" | "held"; article: TopicText; draft: TopicText; found: TopicProblem[]; again: TopicProblem[] }

/**
 * Writes, checks, cuts what is 严重 and checks again; held when the second check still finds one. With a template (the
 * article shown, asTemplate) the writer keeps to it and changes what its new items, marked 新, change, and the program
 * holds it to that (keepTemplate). The check reads the whole article as before; its 严重 on a sentence kept as the
 * template had it stays in `found` for us to read and is not cut: those were checked when written, and in the 11-07
 * trial the check found 16 of 30 such sentences 严重 on one page and cut it to 11, its card to none. An article the
 * same as its template is not checked again.
 */
export async function composeTopic(title: string, groups: Group[], items: TopicItem[], ask: { write: Ask; check: Ask },
  template?: { article: TopicText; fresh: Set<number> }): Promise<ComposedTopic> {
  const listing = topicListing(groups, items);
  const written = template
    ? await ask.write("reference_topic_write", `${prompt("topic-write", { 题目: title })}\n\n${prompt(UPDATE)}`,
      `# ${title}\n\n# 样板\n\n${templateMarkdown(template.article, groups)}\n\n# 原文\n\n${topicListing(groups, items, template.fresh)}`, TopicArticle)
    : await ask.write("reference_topic_write", prompt("topic-write", { 题目: title }), `# ${title}\n\n${listing}`, TopicArticle);
  const { article: draft, kept } = template ? keepTemplate(written, template) : { article: written, kept: new Set<string>() };
  if (template && allSentences(draft).every((s) => kept.has(s))) return { status: "shown", article: draft, draft, found: [], again: [] };
  const cuts = (p: TopicProblem) => isSerious(p) && !kept.has(p.quote.trim());
  const checkOf = async (a: TopicText, attempt?: string) => [...unknownCitations(a, items),
    ...(await ask.check("reference_topic_check", template ? `${prompt("topic-check")}\n\n${prompt(CHECK_UPDATE)}` : prompt("topic-check"), `# 综合整理\n\n${topicMarkdown(title, a, groups)}\n\n# 原文\n\n${listing}`, Problems, attempt)).problems];
  const found = await checkOf(draft);
  const serious = found.filter(cuts);
  if (!serious.length) return { status: "shown", article: draft, draft, found, again: [] };
  const article = cutSentences(draft, serious.map((p) => p.quote));
  const again = article.lead.length && article.sections.length ? await checkOf(article, "recheck") : [{ quote: "", why: "删完没有剩下开头或小节", severity: "严重" }];
  return { status: again.some(cuts) ? "held" : "shown", article, draft, found, again };
}

/** The items of a situation as its page lists them, numbered in that order, with the 导读 and 要点 the writer reads. */
export async function itemsOf(page: SituationPage, groups: Group[]): Promise<TopicItem[]> {
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

/** The article a situation shows now, if any (readTopic reads the same row for the page). */
export async function shownTopic(slug: string): Promise<Shown | undefined> {
  const [row] = await sql<{ content: Omit<Shown, "itemIds">; item_ids: string[] }[]>`
    SELECT content, item_ids FROM reference_topics WHERE slug = ${slug} AND status = 'shown' ORDER BY id DESC LIMIT 1`;
  return row && { article: row.content.article, groups: row.content.groups, sources: row.content.sources, itemIds: row.item_ids };
}

/** The situations whose articles are written (settings `reference.topics`); none without the row. */
export async function topicSlugs(): Promise<string[]> {
  const [row] = await sql<{ value: { slugs?: unknown } }[]>`SELECT value FROM settings WHERE key = 'reference.topics'`;
  return Array.isArray(row?.value.slugs) ? row.value.slugs.filter((s): s is string => typeof s === "string") : [];
}

/** Whether a situation needs writing again: an item its last article (shown or held) did not read, or prompts changed since. */
export async function topicStale(page: SituationPage): Promise<boolean> {
  const ids = [...page.groups.flatMap((g) => g.cases), ...page.rest].map((c) => c.id);
  const [last] = await sql<{ item_ids: string[]; version: string }[]>`SELECT item_ids, version FROM reference_topics WHERE slug = ${page.slug} ORDER BY id DESC LIMIT 1`;
  return needsRewrite(last, ids);
}

/**
 * New items a situation waits for before it is written again. Every write reads all the situation's items (120 for
 * 开店前的准备和开销), so one new item rewrote the whole page (Kay 11-07 06:17「那是不是很浪费？」「10条吧」); the items still
 * show on the page under their causes while the points wait. No time limit lets fewer do: with 50 situations a week's
 * would rewrite most of them every week (Kay 06:19「满七天需要么？50种情况哦」).
 */
export const NEW_ITEMS = 10;

/** Written again when there is none, the prompts changed since, or the situation has NEW_ITEMS items the last did not read. */
export function needsRewrite(last: { item_ids: string[]; version: string } | undefined, ids: string[], version = TOPIC_VERSION): boolean {
  if (!last) return ids.length > 0;
  const read = new Set(last.item_ids);
  return last.version !== version || ids.filter((id) => !read.has(id)).length >= NEW_ITEMS;
}

/** What the articles cost so far on the Beijing date of `now`. */
async function spentToday(now: Date): Promise<number> {
  const start = beijingAt(beijingDate(now), "00:00");
  const [row] = await sql<{ usd: number | null }[]>`SELECT sum(usd)::float AS usd FROM reference_topics WHERE created_at >= ${start}`;
  return row?.usd ?? 0;
}

export const priceOf = (m: string) => PRICES[m];

/**
 * Whether a write and two checks fit what is left of the day's cap at their worst: every character an input token
 * (more than any text here takes) and every call writing all its room. A model without a price never fits.
 */
export function affordable(chars: number, writer: string, checker: string, spent: number): boolean {
  const worst = (m: string, room: number) => {
    const p = priceOf(m);
    return p ? (chars * 1.5 * p[0] + (room + (MODELS[m]?.reasoningTokens ?? 0)) * p[1]) / 1e6 : Infinity;
  };
  return worst(writer, WRITE_ROOM) + 2 * worst(checker, CHECK_ROOM) <= DAY_CAP_USD - spent;
}

/**
 * One model call with `room` past the preset's thinking. Unlike issue.ts modelAsk it is not asked again on unusable
 * output, nor is the job retried: a retry would double the worst case past the day's cap (review of #223), and a
 * situation not written today is still stale tomorrow.
 */
export function topicAsk(model: string, subject: string, room: number, receipts: number[], onUsage: (u: Usage) => void): Ask {
  return async (purpose, system, user, schema, attempt) => {
    const res = await chatJson({ model, purpose, subject, promptVersion: TOPIC_VERSION, system, user: joined(user), schema, temperature: 0, maxTokens: room, timeoutMs: 900_000, attemptTag: attempt });
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
  const shown = await shownTopic(page.slug);
  const template = shown && asTemplate(shown, groups, items);
  // The template is read too: counted as the listing is, every character a token.
  const chars = topicListing(groups, items).length + (template ? templateMarkdown(template.article, groups).length : 0);
  if (!affordable(chars, writer, checker, await spentToday(now))) return { slug: page.slug, status: "over the day's cap" };

  const receipts: number[] = [];
  let usd = 0;
  const priced = (p: [number, number]) => (u: Usage) => { usd += (u.input * p[0] + u.output * p[1]) / 1e6; };
  const subject = `reference-topic:${page.slug}`;
  const c = await composeTopic(page.title, groups, items, {
    write: topicAsk(writer, subject, WRITE_ROOM, receipts, priced(wp)),
    check: topicAsk(checker, subject, CHECK_ROOM, receipts, priced(cp)),
  }, template);
  const cited = citedNumbers(topicMarkdown(page.title, c.article, groups));
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

/**
 * A situation's last shown article as its page reads it: the card's points, each cause's points under its key,
 * citations to items. An article written before causes had keys (11-07) gives its card only: its paragraphs were
 * written as one article, not as points for the sections, and the prompts' change writes it again.
 */
export async function readTopic(slug: string): Promise<TopicView | null> {
  const [row] = await sql<{ content: { article: TopicText; groups: Group[]; sources: Array<{ n: number; id: string }> }; created_at: Date; items: number }[]>`
    SELECT content, created_at, cardinality(item_ids) AS items FROM reference_topics WHERE slug = ${slug} AND status = 'shown' ORDER BY id DESC LIMIT 1`;
  if (!row) return null;
  const { article, groups, sources } = row.content;
  return {
    // Tidied as read too: the first article was cut before tidy was there, and stays as stored.
    lead: article.lead.map(tidy).filter(Boolean),
    sections: article.sections.flatMap((s) => {
      const key = groups.find((g) => g.no === groupNo(s.group))?.key;
      return key ? [{ key, points: s.paragraphs.map(tidy).filter(Boolean) }] : [];
    }),
    sources: Object.fromEntries(sources.map((s) => [s.n, s.id])),
    items: row.items, updatedAt: row.created_at.toISOString(),
  };
}
