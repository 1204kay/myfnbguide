// Taking a source's archive in as history: the whole feed, read by the engine's own RSS reader so each entry
// gets the identity the collection gives it, stored as history (backfill: not today, not in the daily) and
// analysed like any other material. The audio of each podcast episode is kept beside it for transcription.
import { XMLParser } from "fast-xml-parser";
import { sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { queueProcessing } from "@aihot/backend/jobs/content";
import { guardedFetch } from "@aihot/backend/lib/http-fetch";
import { fetchRss } from "@aihot/backend/sources/rss";
import type { SourceRow } from "@aihot/backend/sources/types";

const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@" });
const key = (title: unknown) => String(title ?? "").replace(/\s+/g, " ").trim();
const list = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** Each episode's audio file, by its title: the engine keeps no enclosure for an episode that has a page. */
export function audioByTitle(feed: string): Map<string, { url: string; type: string }> {
  const doc = xml.parse(feed) as { rss?: { channel?: { item?: unknown } } };
  const out = new Map<string, { url: string; type: string }>();
  for (const item of list(doc.rss?.channel?.item as Array<Record<string, any>> | undefined)) {
    const audio = list(item.enclosure as Array<Record<string, string>> | undefined).find((e) => /^audio\//.test(e?.["@type"] ?? ""));
    if (audio?.["@url"]) out.set(key(item.title), { url: audio["@url"], type: audio["@type"]! });
  }
  return out;
}

export interface ImportResult {
  sourceId: string;
  found: number;
  created: number;
  withAudio: number;
}

/** Takes in every entry of the source's feed that the site does not have yet. Entries it has are recorded too. */
export async function importSource(sourceId: string): Promise<ImportResult> {
  const [source] = await sql<SourceRow[]>`SELECT * FROM sources WHERE id = ${sourceId}`;
  if (!source || source.kind !== "rss") throw new Error(`archive: ${sourceId} is not an RSS source`);
  const read = await fetchRss(source, { force: true });
  const feed = await guardedFetch(source.config.feedUrl as string, { timeoutMs: 60_000, maxBytes: 20 * 1024 * 1024, maxRedirects: 5 });
  const audio = feed.status === 200 ? audioByTitle(feed.text()) : new Map();
  let created = 0;
  let withAudio = 0;
  for (const c of read.candidates) {
    const res = await upsertMaterial({ ...c, sourceId, via: "archive", backfill: "archive" });
    if (res.created || res.revised || res.processingNeeded) await queueProcessing(res.articleId);
    if (res.created) created += 1;
    const file = audio.get(key(c.title));
    if (file) withAudio += 1;
    await sql`INSERT INTO archive_episodes (article_id, source_id, audio_url, status)
      VALUES (${res.articleId}, ${sourceId}, ${file?.url ?? null}, 'imported') ON CONFLICT (article_id) DO NOTHING`;
  }
  return { sourceId, found: read.candidates.length, created, withAudio };
}
