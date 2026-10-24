// What the pages read (server.ts): one issue with its reports as the reports cite theirs (title, source, original,
// withdrawn ones marked), and whether a week has one, for the line under its weekly.
import { sql } from "@aihot/backend/db";
import { citationsOf } from "@aihot/backend/publication/reports";
import type { TrendsIssue } from "../types.ts";
import type { Topic } from "./compose.ts";

export async function readIssue(key: string): Promise<TrendsIssue | null> {
  const [row] = await sql<{ key: string; start: string; end: string; topics: Topic[] }[]>`
    SELECT key, period_start::text AS start, period_end::text AS end, topics FROM trends_issues WHERE key = ${key}`;
  if (!row || !row.topics.length) return null;
  const cited = await citationsOf(row.topics.flatMap((t) => t.lines.map((l) => l.id)));
  const byId = new Map(cited.map((c) => [c.itemId, c]));
  return {
    key: row.key, periodStart: row.start, periodEnd: row.end,
    topics: row.topics.map((t) => ({
      heading: t.heading,
      // Our sentence in the place of the report's summary; a withdrawn report stays, marked, as in the reports.
      items: t.lines.flatMap((l) => { const c = byId.get(l.id); return c ? [{ ...c, summary: c.available ? l.text : null }] : []; }),
    })),
  };
}

/** The line under a weekly: how many topics its week has, or null for none. */
export async function readWeekLine(key: string): Promise<{ key: string; topics: number } | null> {
  const [row] = await sql<{ n: number }[]>`SELECT jsonb_array_length(topics) AS n FROM trends_issues WHERE key = ${key}`;
  return row && row.n > 0 ? { key, topics: row.n } : null;
}
