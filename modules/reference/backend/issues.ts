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
import { beijingAt } from "@aihot/contracts/time";
import { EDITION_TIMES } from "@aihot/site";
import type { IssuePage } from "../types.ts";
import { issueAudio } from "./audio.ts";
import { citedItems, composeIssue, type ComposedIssue, type DayItem, fixedLines, isCheckPurpose, ISSUE_CHECK_STEP, ISSUE_STEP, ISSUE_VERSION, modelAsk } from "./issue.ts";

/** Where an issue is read. */
export const issuePath = (no: number) => `/reference/issues/${no}`;

/**
 * Everything listed in the 24 hours up to `end`, or only the 精选, best scored first, numbered as the issue cites them.
 * `end` is the daily's edition time (the trial reads the daily's own window) or the time the issue is written, three
 * hours ahead of it: each day's window then starts where the last one ended, so nothing listed falls between two.
 */
export async function dayItems(end: Date, selectedOnly = false): Promise<DayItem[]> {
  const start = new Date(end.getTime() - 86_400_000);
  const rows = await sql<Omit<DayItem, "n">[]>`
    SELECT p.article_id AS id, a.source_id AS "sourceId", s.name AS "sourceName", p.title, a.url,
      coalesce(p.summary, '') AS summary, coalesce(nullif(a.body_text, ''), a.excerpt, '') AS text,
      p.selected, p.story_id::text AS "storyId"
    FROM publications p JOIN articles a ON a.id = p.article_id JOIN sources s ON s.id = p.source_id
    WHERE ${selectedOnly ? selectedCondition(new Date()) : listedCondition(new Date())} AND coalesce(p.published_at, p.discovered_at) >= ${start} AND coalesce(p.published_at, p.discovered_at) < ${end}
    ORDER BY p.score DESC NULLS LAST, p.article_id`;
  return rows.map((r, i) => ({ n: i + 1, ...r }));
}

/** What is kept of an issue: all of it but the originals' text, which stays with the articles. */
function stored(c: ComposedIssue) {
  return {
    issue: c.chosen?.issue ?? null, lively: c.chosen?.lively ?? 0, edited: c.chosen?.edited ?? false,
    cut: c.chosen?.cut ?? [], problems: c.chosen?.problems ?? [], note: c.note ?? null,
    drafts: c.drafts.map((d) => ({ issue: d.issue, lively: d.lively, problems: d.problems, edited: d.edited })),
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
  return { kicker: `十一说 · 第 ${row.no} 期`, title: row.title, leadParagraph: row.brief.join(""), href: issuePath(row.no) };
}

/** One issue as its page reads it: the program's lines around what 十一 wrote, and the originals it names. */
export async function readIssue(no: number): Promise<IssuePage | null> {
  const [row] = await sql<{ no: number; date: string; content: ReturnType<typeof stored>; prev: number | null; next: number | null }[]>`
    SELECT no, to_char(date, 'YYYY-MM-DD') AS date, content,
      (SELECT max(no) FROM reference_issues WHERE no < r.no) AS prev, (SELECT min(no) FROM reference_issues WHERE no > r.no) AS next
    FROM reference_issues r WHERE no = ${no} AND status = 'issue'`;
  const issue = row?.content.issue;
  if (!row || !issue) return null;
  const items = row.content.items.map((i) => ({ ...i, text: "" }));
  return {
    no: row.no, date: row.date, issue, lines: fixedLines(row.date),
    sources: citedItems(issue, items).cited.map(({ n, sourceName, title, url }) => ({ n, sourceName, title, url })),
    count: items.length, prev: row.prev, next: row.next, audio: await issueAudio(row.no),
  };
}

/** Issue pages for the sitemap, newest first. */
export async function issueSitemap(): Promise<SitemapEntry[]> {
  const rows = await sql<{ no: number; created_at: Date }[]>`SELECT no, created_at FROM reference_issues WHERE status = 'issue' ORDER BY no DESC`;
  return rows.map((r) => ({ loc: issuePath(r.no), lastmod: r.created_at, changefreq: "monthly", priority: 0.6 }));
}
