// 十一说 on the site (Kay 10-20: 「肯定是直接公开啊」「正常运行」): each morning before the 08:00 daily, the day's issue
// is written from everything the daily lists in its window so far (backend/issue.ts composeIssue: DeepSeek writes, Opus
// checks and mends, what is still wrong is cut) and kept here; the daily then leads with it (server.ts dailyLead), and
// its page reads it in full (web/issue.tsx). One a day: a day already written is never written again, so a retried or
// caught-up run costs nothing. An issue that is not ready by the daily's time leaves the daily to lead by rule.
import { sql } from "@aihot/backend/db";
import type { SitemapEntry } from "@aihot/backend/modules";
import { modelFor } from "@aihot/backend/editorial/models";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { listedCondition, selectedCondition } from "@aihot/backend/publication/scope";
import { beijingAt, beijingDate } from "@aihot/contracts/time";
import { EDITION_TIMES } from "@aihot/site";
import type { IssueIndex, IssuePage } from "../types.ts";
import { issueAudio } from "./audio.ts";
import { citedItems, composeIssue, type ComposedIssue, type DayItem, fixedLines, isCheckPurpose, ISSUE_CHECK_STEP, ISSUE_STEP, leadParagraph, ISSUE_VERSION, modelAsk } from "./issue.ts";

/** Where an issue is read. */
export const issuePath = (no: number) => `/reference/issues/${no}`;

/**
 * Everything listed in the 24 hours up to `end`, or only the 精选, best scored first, numbered as the issue cites them.
 * `end` is the daily's edition time (the trial reads the daily's own window) or the time the issue is written, three
 * hours ahead of it: each day's window then starts where the last one ended, so nothing listed falls between two.
 * An item belongs to the window it arrived in, as the daily attributes it (reports/edition.ts periodReports): by the
 * later of its arrival (timeline_at) and, for a 精选, its release (visible_after), one released more than a day after
 * the window began being old news; a historical import to none. One listed plain and made a 精选 the next day would be
 * in both days' windows, and the daily's own guard (what a daily carried is not given again) is not here, so what the
 * last two days' issues read is left out. One that arrived before 05:00 and was listed after it is in neither, as in
 * the daily. Until 11-13
 * it was over the original's own date: an item listed after 05:00 whose original was dated before it fell in neither
 * day's window (11-04 to 11-12: 240 of 1,645 listed, 11 of them 精选, never reached 十一).
 */
export async function dayItems(end: Date, selectedOnly = false): Promise<DayItem[]> {
  const start = new Date(end.getTime() - 86_400_000);
  const day = beijingDate(end);
  const rows = await sql<Omit<DayItem, "n">[]>`
    SELECT p.article_id AS id, a.source_id AS "sourceId", s.name AS "sourceName", p.title, a.url,
      coalesce(p.summary, '') AS summary, coalesce(nullif(a.body_text, ''), a.excerpt, '') AS text,
      p.selected, p.story_id::text AS "storyId"
    FROM publications p JOIN articles a ON a.id = p.article_id JOIN sources s ON s.id = p.source_id
    WHERE ${selectedOnly ? selectedCondition(new Date()) : listedCondition(new Date())} AND NOT p.backfill
      AND (((p.visible_after IS NULL OR p.visible_after <= p.timeline_at) AND p.timeline_at >= ${start} AND p.timeline_at < ${end})
        OR (p.visible_after > p.timeline_at AND p.visible_after >= ${start} AND p.visible_after < ${end}))
      AND p.timeline_at >= ${start}::timestamptz - interval '24 hours'
      AND NOT EXISTS (SELECT 1 FROM reference_issues i, jsonb_array_elements(i.content->'items') it
        WHERE i.date < ${day}::date AND i.date >= ${day}::date - 2
          AND it->>'id' = p.article_id)
    ORDER BY p.score DESC NULLS LAST, p.article_id`;
  return rows.map((r, i) => ({ n: i + 1, ...r }));
}

/** What is kept of an issue: all of it but the originals' text, which stays with the articles. */
function stored(c: ComposedIssue) {
  return {
    issue: c.chosen?.issue ?? null, lively: c.chosen?.lively ?? 0, edited: c.chosen?.edited ?? false,
    cut: c.chosen?.cut ?? [], problems: c.chosen?.problems ?? [], note: c.note ?? null,
    drafts: c.drafts.map((d) => ({ issue: d.issue, lively: d.lively, problems: d.problems, edited: d.edited, ...(d.unchecked ? { unchecked: true } : {}) })),
    items: c.items.map(({ text: _text, ...item }) => item),
  };
}

/** Writes and keeps the issue for the daily of `date` from what is listed up to `now`; nothing when the day has one. */
export async function writeIssue(date: string, now = new Date()): Promise<{ date: string; status: string; no?: number | null }> {
  const [had] = await sql<{ status: string; no: number | null }[]>`SELECT status, no FROM reference_issues WHERE date = ${date}`;
  if (had) return { date, ...had };
  const edition = beijingAt(date, EDITION_TIMES.daily);
  const items = await dayItems(now < edition ? now : edition);
  const [writer, checker] = await Promise.all([modelFor(ISSUE_STEP), modelFor(ISSUE_CHECK_STEP)]);
  const receiptIds: number[] = [];
  const write = modelAsk(writer, `issue:${date}`, receiptIds);
  const check = modelAsk(checker, `issue:${date}`, receiptIds);
  const c = await composeIssue(items, date, (purpose, system, user, schema, attempt) => (isCheckPurpose(purpose) ? check : write)(purpose, system, user, schema, attempt));
  return sql.begin(async (tx) => {
    // Numbered in the order issues went up; a thin day has none.
    const [{ next }] = await tx<{ next: number }[]>`SELECT coalesce(max(no), 0) + 1 AS next FROM reference_issues`;
    const no = c.status === "issue" ? next : null;
    const [row] = await tx<{ no: number | null }[]>`
      INSERT INTO reference_issues (date, no, status, content, version, models)
      VALUES (${date}, ${no}, ${c.status}, ${tx.json(stored(c) as never)}, ${ISSUE_VERSION}, ${tx.json({ writer, checker })})
      ON CONFLICT (date) DO NOTHING RETURNING no`;
    for (const id of receiptIds) await completeReceipt(tx, id);
    return { date, status: c.status, no: row?.no ?? null };
  });
}

/** The daily's lead for `date`: its issue's title and three sentences, under 十一说 · 第 N 期. */
export async function issueLead(date: string): Promise<{ kicker: string; title: string; leadParagraph: string; href: string } | null> {
  const [row] = await sql<{ no: number; title: string | null; brief: string[] | null }[]>`
    SELECT no, content->'issue'->>'title' AS title, content->'issue'->'brief' AS brief
    FROM reference_issues WHERE date = ${date} AND status = 'issue'`;
  if (!row?.title || !row.brief?.length) return null;
  return { kicker: `十一说 · 第 ${row.no} 期`, title: row.title, leadParagraph: leadParagraph(row.brief), href: issuePath(row.no) };
}

/** One issue as its page reads it: the program's lines around what 十一 wrote, and the originals it names. */
export async function readIssue(no: number): Promise<IssuePage | null> {
  // The issue is up at about 05:20, its daily at 08:00: until then the page does not lead to a daily not there yet.
  const [row] = await sql<{ no: number; date: string; content: ReturnType<typeof stored>; prev: number | null; next: number | null; daily: boolean }[]>`
    SELECT no, to_char(date, 'YYYY-MM-DD') AS date, content,
      (SELECT max(no) FROM reference_issues WHERE no < r.no) AS prev, (SELECT min(no) FROM reference_issues WHERE no > r.no) AS next,
      EXISTS (SELECT 1 FROM reports WHERE kind = 'daily' AND key = to_char(r.date, 'YYYY-MM-DD')) AS daily
    FROM reference_issues r WHERE no = ${no} AND status = 'issue'`;
  const issue = row?.content.issue;
  if (!row || !issue) return null;
  const items = row.content.items.map((i) => ({ ...i, text: "" }));
  return {
    no: row.no, date: row.date, issue, lines: fixedLines(row.date),
    sources: citedItems(issue, items).cited.map(({ n, sourceName, title, url }) => ({ n, sourceName, title, url })),
    count: items.length, prev: row.prev, next: row.next, daily: row.daily, audio: await issueAudio(row.no),
  };
}

/** Every issue, newest first, for the list of all issues (web/issues.tsx). */
export async function listIssues(): Promise<IssueIndex> {
  const issues = await sql<IssueIndex["issues"]>`
    SELECT no, to_char(date, 'YYYY-MM-DD') AS date, content->'issue'->>'title' AS title
    FROM reference_issues WHERE status = 'issue' ORDER BY no DESC`;
  return { issues };
}

/** Issue pages for the sitemap, newest first, and the list of them. */
export async function issueSitemap(): Promise<SitemapEntry[]> {
  const rows = await sql<{ no: number; created_at: Date }[]>`SELECT no, created_at FROM reference_issues WHERE status = 'issue' ORDER BY no DESC`;
  const pages = rows.map((r): SitemapEntry => ({ loc: issuePath(r.no), lastmod: r.created_at, changefreq: "monthly", priority: 0.6 }));
  return rows[0] ? [{ loc: "/reference/issues", lastmod: rows[0].created_at, changefreq: "daily", priority: 0.6 }, ...pages] : pages;
}
