// One week's trends (Kay 10-24, 手册 决定记录「MYFNB 做每周趋势页」): the same specific thing told by 3 or more
// sources in a week, each source's report in one sentence of its own, no conclusion of ours. The grouping step
// cannot catch these (10-24 replay: recall 0/7), so they are looked for here, once a week, over the whole pool:
//   1. find: the week's listed reports (title and summary) are read and the things 2+ sources told are named. A big
//      week is read in three overlapping parts, each two thirds of it, so any two reports sit in one call together
//      (W44: 434 reports, about 98,000 characters in one call; three reports on waste far apart in it were never put
//      together); the same topic named in two parts is merged after gathering (findParts, mergeTopics);
//      gather: a second call reads them all again for every topic found and lists each report that tells it. One call
//      names the topics but lists only the plainest few of their reports (10-24 trial: ten topics, each one report
//      short of three publishers, the third in the sample's hand count every time);
//   2. the publishers are counted here, not by the model (MIN_PUBLISHERS);
//   3. write: one call a topic, one sentence a report, from that report's title and summary;
//   4. each sentence must name only what its report names (grounded, the weekly overview's check), then goes to the
//      site's copy check against its original (the copyCheck socket; this site's checker module) with the report's
//      title, which the page shows: a wrong title, or a sentence still wrong, drops the line, a sentence mended is
//      kept mended. Unselected reports' titles and summaries were never checked, so this step is not optional.
//      A line dropped here is written once more from its report alone and checked again (W44: a roundup's sentence
//      mixed two brands, was dropped, and the topic fell to two publishers);
//   5. a topic left with fewer than 3 publishers is not sent. A week with none keeps an empty row and shows nothing.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { sql } from "@aihot/backend/db";
import { loadAnalyzeInput } from "@aihot/backend/editorial/analyze";
import { modelFor } from "@aihot/backend/editorial/models";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { moduleCopyCheck } from "@aihot/backend/modules";
import { chatJson } from "@aihot/backend/providers/llm";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { grounded } from "@aihot/backend/reports/compose";
import { listedCondition } from "@aihot/backend/publication/scope";
import { addDays, beijingAt } from "@aihot/contracts/time";
import { EDITION_TIMES } from "@aihot/site";
import { publisherOf } from "./publishers.ts";

export const TRENDS_STEP = "trends";
export const MIN_PUBLISHERS = 3;
/** Above this many reports a week is found in three overlapping parts (findParts); below it one call reads them all. */
export const FIND_PART_ABOVE = 150;
/** A sentence over this is cut by the writer's own rule (90 characters) with some room. */
const MAX_LINE = 120;

const prompt = (name: string) => promptFromText(`trends/${name}`, readFileSync(new URL(`../prompts/${name}.md`, import.meta.url), "utf8"));
const FIND = prompt("find");
const GATHER = prompt("gather");
const WRITE = prompt("write");
export const TRENDS_VERSION = `trends@${createHash("sha256").update(FIND).update(GATHER).update(WRITE).digest("hex").slice(0, 10)}`;

export interface PoolItem { id: string; title: string; summary: string | null; sourceId: string; sourceName: string; publisher: string }
export interface Topic { heading: string; lines: Array<{ id: string; text: string }> }
export interface Dropped { name: string; ids: string[]; why: string }

/**
 * The week's listed reports, as the weekly's window reads the dailies (reports/compose.ts composePeriod): from the
 * daily's edition time the day before the first day to that time on the last. One report an event, the first
 * listed, so an event many sources reported counts once: that is news the daily already carries, not a trend.
 */
export async function weekPool(startDate: string, endDate: string): Promise<PoolItem[]> {
  const start = beijingAt(addDays(startDate, -1), EDITION_TIMES.daily);
  const end = beijingAt(endDate, EDITION_TIMES.daily);
  const rows = await sql<{ id: string; title: string; summary: string | null; source_id: string; source_name: string }[]>`
    SELECT DISTINCT ON (coalesce(f.story_id::text, p.article_id)) p.article_id AS id, p.title, p.summary, p.source_id, s.name AS source_name
    FROM publications p JOIN sources s ON s.id = p.source_id
    LEFT JOIN fact_articles fa ON fa.article_id = p.article_id AND fa.role IN ('primary', 'report')
    LEFT JOIN facts f ON f.id = fa.fact_id
    WHERE ${listedCondition(new Date())} AND p.timeline_at >= ${start} AND p.timeline_at < ${end}
    ORDER BY coalesce(f.story_id::text, p.article_id), p.timeline_at, p.article_id`;
  return rows.map((r) => ({ id: r.id, title: r.title, summary: r.summary, sourceId: r.source_id, sourceName: r.source_name, publisher: publisherOf(r.source_id, r.source_name) }));
}

const publishers = (ids: string[], byId: Map<string, PoolItem>) => new Set(ids.map((id) => byId.get(id)?.publisher).filter(Boolean)).size;

/** The topics the model named, each with its reports; one with fewer than MIN_PUBLISHERS publishers is dropped here. */
export function countTopics(found: Array<{ name: string; items: number[] }>, pool: PoolItem[]): { kept: Array<{ name: string; ids: string[] }>; dropped: Dropped[] } {
  const byId = new Map(pool.map((p) => [p.id, p]));
  const kept: Array<{ name: string; ids: string[] }> = [];
  const dropped: Dropped[] = [];
  for (const t of mergeTopics(found)) {
    const ids = [...new Set(t.items.map((n) => pool[n - 1]?.id).filter((id): id is string => !!id))];
    const n = publishers(ids, byId);
    if (n >= MIN_PUBLISHERS) kept.push({ name: t.name, ids });
    else dropped.push({ name: t.name, ids, why: `只有 ${n} 家来源` });
  }
  return { kept, dropped };
}

/**
 * The parts a week is found in, as pool positions (0-based): one part for a small week; otherwise the pool cut in
 * thirds and each pair of thirds read together, so any two reports share at least one part, and each part is two
 * thirds as long as the whole week.
 */
export function findParts(size: number): number[][] {
  const all = [...Array(size).keys()];
  if (size <= FIND_PART_ABOVE) return [all];
  const third = Math.ceil(size / 3);
  const [a, b, c] = [all.slice(0, third), all.slice(third, 2 * third), all.slice(2 * third)];
  return [[...a, ...b], [...a, ...c], [...b, ...c]];
}

/**
 * One topic for each thing: the same name, or two reports in common (the same topic found in two parts, or listed
 * twice by one answer, as W44's find did), is one topic with all their reports.
 */
export function mergeTopics<T extends { name: string; items: number[] }>(found: T[]): T[] {
  const out: T[] = [];
  for (const t of found) {
    const items = [...new Set(t.items)];
    const same = out.find((o) => o.name === t.name || items.filter((n) => o.items.includes(n)).length >= 2);
    if (same) same.items = [...new Set([...same.items, ...items])];
    else out.push({ ...t, items });
  }
  return out;
}

/** The lines kept after the checks, and whether their publishers still make a topic. */
export function finishTopic(heading: string, lines: Array<{ id: string; text: string }>, pool: PoolItem[]): { topic: Topic | null; why: string } {
  const byId = new Map(pool.map((p) => [p.id, p]));
  const n = publishers(lines.map((l) => l.id), byId);
  if (n < MIN_PUBLISHERS) return { topic: null, why: `核对后只剩 ${n} 家来源` };
  return { topic: { heading, lines }, why: "" };
}

/** A sentence names only what its report names (the weekly overview's rule) and keeps to its length. */
export function lineGrounded(text: string, item: PoolItem): boolean {
  return [...text].length <= MAX_LINE && grounded(text, `${item.title}\n${item.summary ?? ""}`);
}

const FindSchema = z.object({ topics: z.array(z.object({ name: z.string(), items: z.array(z.coerce.number().int()), why: z.string().catch("") })) });
const GatherSchema = z.object({ topics: z.array(z.object({ n: z.coerce.number().int(), items: z.array(z.coerce.number().int()) })) });
const WriteSchema = z.object({ heading: z.string(), lines: z.array(z.object({ n: z.coerce.number().int(), text: z.string() })) });

const itemLine = (p: PoolItem, n: number) => `[${n}] ${p.sourceName} | ${p.title} | ${(p.summary ?? "").replace(/\s+/g, " ")}`;

/**
 * The site's copy check on one line: the report's title (shown on the page as it is), its summary (what the sentence
 * was written from) and the sentence as the one point. The sentence as mended, or null when anything is still wrong,
 * the title would have to change, or the site has no check (no line goes out unchecked).
 */
async function checkLine(item: PoolItem, text: string, subject: string, receipts: number[]): Promise<string | null> {
  const check = moduleCopyCheck();
  const a = await loadAnalyzeInput(item.id);
  if (!check || !a) return null;
  const c = await check.run({ article: a, copy: { titleZh: item.title, summaryZh: item.summary ?? "", reasonZh: text }, subject, attemptTag: "trends" });
  receipts.push(...c.receiptIds);
  for (const id of c.receiptIds) await completeReceipt(sql, id);
  const lines = (c.reasonZh ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  return c.held || c.titleZh !== item.title || lines.length !== 1 ? null : lines[0]!;
}

/** Each topic with every report the gather call lists for it, its own reports kept (a topic it skips keeps those). */
export function withGathered<T extends { items: number[] }>(found: T[], answer: Array<{ n: number; items: number[] }>): T[] {
  return found.map((t, i) => ({ ...t, items: [...new Set([...t.items, ...answer.filter((a) => a.n === i + 1).flatMap((a) => a.items)])] }));
}

async function gather(found: Array<{ name: string; items: number[]; why: string }>, pool: PoolItem[], model: string, subject: string, receipts: number[]) {
  if (!found.length) return found;
  const topics = found.map((t, i) => `(${i + 1}) ${t.name}：${t.why}`).join("\n");
  const res = await chatJson({
    model, purpose: "trends_gather", subject, promptVersion: TRENDS_VERSION, system: GATHER,
    user: `话题：\n${topics}\n\n条目：\n${pool.map((p, i) => itemLine(p, i + 1)).join("\n")}`, schema: GatherSchema, temperature: 0, maxTokens: 4000, timeoutMs: 300_000,
  });
  receipts.push(res.receiptId);
  await completeReceipt(sql, res.receiptId);
  return withGathered(found, res.data.topics);
}

/** One report's sentence written again from that report alone, after its first one was dropped (empty if none). */
async function writeAlone(item: PoolItem, model: string, subject: string, receipts: number[]): Promise<string> {
  const res = await chatJson({
    model, purpose: "trends_write", subject, promptVersion: TRENDS_VERSION, system: WRITE,
    user: itemLine(item, 1), schema: WriteSchema, temperature: 0.2, maxTokens: 1000, timeoutMs: 300_000,
  });
  receipts.push(res.receiptId);
  await completeReceipt(sql, res.receiptId);
  return res.data.lines.find((l) => l.n === 1)?.text.trim() ?? "";
}

/** Find, write and check one week's topics (paid calls, nothing kept: myfnb/trends-trial.ts reads it as it is). */
export async function writeWeek(key: string, startDate: string, endDate: string): Promise<{ topics: Topic[]; dropped: Dropped[]; receipts: number[]; pool: PoolItem[]; found: Array<{ name: string; found: number; gathered: number }> }> {
  const pool = await weekPool(startDate, endDate);
  const receipts: number[] = [];
  const model = await modelFor(TRENDS_STEP);
  const subject = `trends:${key}`;
  const found: { topics: Array<{ name: string; items: number[]; why: string }> } = { topics: [] };
  // Each part numbers its reports from 1; the numbers are turned back into the week's (1-based) before gathering.
  for (const part of pool.length < MIN_PUBLISHERS ? [] : findParts(pool.length)) {
    const res = await chatJson({
      model, purpose: "trends_find", subject, promptVersion: TRENDS_VERSION, system: FIND,
      user: part.map((at, i) => itemLine(pool[at]!, i + 1)).join("\n"), schema: FindSchema, temperature: 0, maxTokens: 4000, timeoutMs: 300_000,
    });
    receipts.push(res.receiptId);
    await completeReceipt(sql, res.receiptId);
    for (const t of res.data.topics) found.topics.push({ ...t, items: t.items.filter((n) => part[n - 1] !== undefined).map((n) => part[n - 1]! + 1) });
  }
  found.topics = mergeTopics(found.topics);
  const gathered = await gather(found.topics, pool, model, subject, receipts);
  const { kept, dropped } = countTopics(gathered, pool);
  const byId = new Map(pool.map((p) => [p.id, p]));
  const topics: Topic[] = [];
  for (const t of kept) {
    const items = t.ids.map((id) => byId.get(id)!);
    const res = await chatJson({
      model, purpose: "trends_write", subject, promptVersion: TRENDS_VERSION, system: WRITE,
      user: items.map((p, i) => itemLine(p, i + 1)).join("\n"), schema: WriteSchema, temperature: 0.2, maxTokens: 3000, timeoutMs: 300_000,
    });
    receipts.push(res.receiptId);
    await completeReceipt(sql, res.receiptId);
    const lines: Array<{ id: string; text: string }> = [];
    const kept = async (item: PoolItem, text: string) => {
      if (!lineGrounded(text, item)) return null;
      const checked = await checkLine(item, text, `${subject}:${item.id}`, receipts);
      return checked && lineGrounded(checked, item) ? checked : null;
    };
    for (const l of res.data.lines) {
      const item = items[l.n - 1];
      if (!item || lines.some((x) => x.id === item.id)) continue;
      const text = await kept(item, l.text.trim()) ?? await kept(item, await writeAlone(item, model, subject, receipts));
      if (text) lines.push({ id: item.id, text });
    }
    const { topic, why } = finishTopic(res.data.heading.trim() || t.name, lines, pool);
    if (topic) topics.push(topic); else dropped.push({ name: t.name, ids: t.ids, why });
  }
  // What each call listed, for the trial (myfnb/trends-trial.ts): reports the find call named, and after gathering.
  const listed = found.topics.map((t, i) => ({ name: t.name, found: new Set(t.items).size, gathered: new Set(gathered[i]!.items).size }));
  return { topics, dropped, receipts, pool, found: listed };
}

/** One week's topics, kept (an empty week too). */
export async function composeWeek(key: string, startDate: string, endDate: string): Promise<{ topics: number; dropped: number; pool: number }> {
  const { topics, dropped, receipts, pool } = await writeWeek(key, startDate, endDate);
  await sql`
    INSERT INTO trends_issues (key, period_start, period_end, topics, dropped, receipt_ids)
    VALUES (${key}, ${startDate}, ${endDate}, ${sql.json(topics as never)}, ${sql.json(dropped as never)}, ${receipts})
    ON CONFLICT (key) DO UPDATE SET topics = EXCLUDED.topics, dropped = EXCLUDED.dropped, receipt_ids = EXCLUDED.receipt_ids, created_at = now()`;
  return { topics: topics.length, dropped: dropped.length, pool: pool.length };
}

/**
 * The newest weekly report, if it has no trends row yet. Only the newest: earlier weeks are never filled in
 * (工作约定 §15, new work goes forward), so the module's first issue is the first weekly after it went live.
 */
export async function weekToCompose(): Promise<{ key: string; start: string; end: string } | null> {
  const [r] = await sql<{ key: string; start: string | null; end: string | null; done: boolean }[]>`
    SELECT r.key, r.content->>'periodStart' AS start, r.content->>'periodEnd' AS end,
      EXISTS (SELECT 1 FROM trends_issues t WHERE t.key = r.key) AS done
    FROM reports r WHERE r.kind = 'weekly' ORDER BY r.key DESC LIMIT 1`;
  return r?.start && r.end && !r.done ? { key: r.key, start: r.start, end: r.end } : null;
}
