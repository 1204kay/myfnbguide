// The posts' life (modules/social): a story of the day is drafted for each platform, waits for the owner's word,
// and an approved one is sent through its platform's sender. Every step writes a row to social_log. Nothing is
// sent unless the post was approved by a person (approve) and the story is still on the site (send).
import { config } from "@aihot/backend/config";
import { sql } from "@aihot/backend/db";
import { selectedCondition } from "@aihot/backend/publication/scope";
import { compose, PLATFORMS, storyParts, type Platform, type StoryParts } from "./compose.ts";
import { senderFor } from "./senders.ts";

export type Status = "pending" | "held" | "approved" | "rejected" | "withdrawn" | "sent";

export interface Post {
  id: number;
  article_id: string;
  platform: Platform;
  status: Status;
  title: string;
  body: string;
  image_url: string | null;
  link: string;
  problems: string[];
  delivery: string | null;
  reviewed_by: string | null;
  created_at: Date;
}

const COLUMNS = sql`id::int, article_id, platform, status, title, body, image_url, link, problems, delivery, reviewed_by, created_at`;

/** A line in the log: who or what did it, and what it did. */
export async function note(postId: number, event: string, detail: Record<string, unknown> = {}) {
  await sql`INSERT INTO social_log (post_id, event, detail) VALUES (${postId}, ${event}, ${sql.json(detail as never)})`;
}

/** The newest story the site shows as selected that no post was made from, with the figures it shows. Null when none. */
export async function storyToPost(now = new Date()): Promise<{ id: string; story: StoryParts } | null> {
  const [row] = await sql<{ id: string; story: unknown }[]>`
    SELECT c.article_id AS id, c.story FROM reference_cases c
    JOIN publications p ON p.article_id = c.article_id
    WHERE c.status = 'story' AND ${selectedCondition(now)}
      AND p.sort_at > ${now}::timestamptz - interval '3 days'
      AND NOT EXISTS (SELECT 1 FROM social_posts s WHERE s.article_id = c.article_id)
    ORDER BY p.score DESC NULLS LAST, p.sort_at DESC LIMIT 1`;
  const story = row ? storyParts(row.story) : null;
  return row && story ? { id: row.id, story } : null;
}

/** Drafts the day's posts, one per platform from one story, at most one story a day. Returns the ids made. */
export async function draftToday(now = new Date()): Promise<number[]> {
  // The day is the site's own (Malaysia and Beijing share it).
  const [{ n }] = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM social_posts WHERE created_at >= date_trunc('day', ${now}::timestamptz AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai'`;
  if (n > 0) return [];
  const pick = await storyToPost(now);
  if (!pick) return [];
  const link = `${config.siteUrl}/reference/cases/${pick.id}`;
  const image = `${config.siteUrl}/og/items/${pick.id}.png`;
  const ids: number[] = [];
  for (const platform of PLATFORMS) {
    const d = compose(platform, pick.story, link, image);
    const [row] = await sql<{ id: number }[]>`
      INSERT INTO social_posts (article_id, platform, status, title, body, image_url, link, problems)
      VALUES (${pick.id}, ${platform}, ${d.problems.length ? "held" : "pending"}, ${d.title}, ${d.body}, ${d.imageUrl}, ${d.link}, ${sql.json(d.problems as never)})
      ON CONFLICT (article_id, platform) DO NOTHING RETURNING id::int`;
    if (!row) continue;
    ids.push(row.id);
    await note(row.id, d.problems.length ? "held" : "drafted", { problems: d.problems });
  }
  return ids;
}

export async function listPosts(status?: Status): Promise<Post[]> {
  return sql<Post[]>`SELECT ${COLUMNS} FROM social_posts ${status ? sql`WHERE status = ${status}` : sql``} ORDER BY id DESC`;
}

/** A person's word on a pending post. A held post has failed the checks and cannot be approved. Returns false when it is not pending. */
export async function review(id: number, verdict: "approved" | "rejected", by: string): Promise<boolean> {
  const rows = await sql`
    UPDATE social_posts SET status = ${verdict}, reviewed_by = ${by}, reviewed_at = now()
    WHERE id = ${id} AND status = 'pending' RETURNING id`;
  if (!rows.length) return false;
  await note(id, verdict, { by });
  return true;
}

/**
 * Sends the approved posts through their platform's sender. Only the story still selected on the site goes out;
 * a failed send stays approved to be tried again (and is in the log). Returns how each post ended.
 */
export async function sendApproved(now = new Date()): Promise<Array<{ id: number; result: "sent" | "withdrawn" | "failed" }>> {
  const posts = await sql<Post[]>`SELECT ${COLUMNS} FROM social_posts WHERE status = 'approved' ORDER BY id`;
  const out: Array<{ id: number; result: "sent" | "withdrawn" | "failed" }> = [];
  for (const post of posts) {
    const [shown] = await sql`SELECT 1 FROM publications p WHERE p.article_id = ${post.article_id} AND ${selectedCondition(now)}`;
    if (!shown) {
      await sql`UPDATE social_posts SET status = 'withdrawn' WHERE id = ${post.id} AND status = 'approved'`;
      await note(post.id, "withdrawn", { reason: "the story is no longer selected on the site" });
      out.push({ id: post.id, result: "withdrawn" });
      continue;
    }
    try {
      const sent = await senderFor(post.platform).send(post);
      await sql`UPDATE social_posts SET status = 'sent', delivery = ${sent.delivery}, sent_at = now() WHERE id = ${post.id} AND status = 'approved'`;
      await note(post.id, "sent", { ...sent });
      out.push({ id: post.id, result: "sent" });
    } catch (error) {
      await note(post.id, "failed", { error: String((error as Error).message).slice(0, 300) });
      out.push({ id: post.id, result: "failed" });
    }
  }
  return out;
}

