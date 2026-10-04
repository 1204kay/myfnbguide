// Taking a source's archive in as history: the whole feed, read by the engine's own RSS reader so each entry
// gets the identity the collection gives it, stored as history (backfill: not today, not in the daily) and
// analysed like any other material. The audio of each podcast episode is kept beside it for transcription.
import { XMLParser } from "fast-xml-parser";
import { sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { queueProcessing } from "@aihot/backend/jobs/content";
import { guardedFetch } from "@aihot/backend/lib/http-fetch";
import { admitListing } from "@aihot/backend/sources/filters";
import { fetchRss } from "@aihot/backend/sources/rss";
import type { Candidate, SourceRow } from "@aihot/backend/sources/types";
import type { ArchivePlan } from "../plan.ts";

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
  pages: number;
  found: number;
  created: number;
  withAudio: number;
  finished: boolean;
  error?: string;
}

/** One listing of the source: its entries, through the source's own URL and noise filters as the collection applies them. */
async function readListing(source: SourceRow, feedUrl: string): Promise<{ listed: number; candidates: Candidate[]; audio: Map<string, { url: string; type: string }> }> {
  const page = { ...source, config: { ...source.config, feedUrl } };
  const read = await fetchRss(page, { force: true });
  const feed = await guardedFetch(feedUrl, { timeoutMs: 60_000, maxBytes: 20 * 1024 * 1024, maxRedirects: 5 });
  return {
    listed: read.candidates.length,
    candidates: admitListing(read.candidates, source),
    audio: feed.status === 200 ? audioByTitle(feed.text()) : new Map(),
  };
}

/**
 * Takes in every entry of the source's feed (and of its older pages) that the site does not have yet; entries it
 * has are recorded too. The source is finished once its last page, or an empty one, was read; an error stops the
 * run at that page and is kept, and the next run reads from the first page again (what it has costs nothing).
 */
export async function importSource(plan: ArchivePlan): Promise<ImportResult> {
  const sourceId = plan.id;
  const [source] = await sql<SourceRow[]>`SELECT * FROM sources WHERE id = ${sourceId}`;
  if (!source || source.kind !== "rss") throw new Error(`archive: ${sourceId} is not an RSS source`);
  const urls = plan.pages ? Array.from({ length: plan.pages.to }, (_, i) => plan.pages!.url.replace("{n}", String(i + 1))) : [source.config.feedUrl as string];
  const result: ImportResult = { sourceId, pages: 0, found: 0, created: 0, withAudio: 0, finished: false };
  try {
    for (const url of urls) {
      const { listed, candidates, audio } = await readListing(source, url);
      // The end of the archive is an empty page; a page whose entries the filters all drop is not.
      if (!listed) break;
      result.pages += 1;
      result.found += candidates.length;
      for (const c of candidates) {
        const res = await upsertMaterial({ ...c, sourceId, via: "archive", backfill: "archive" });
        if (res.created || res.revised || res.processingNeeded) await queueProcessing(res.articleId);
        if (res.created) result.created += 1;
        const file = audio.get(key(c.title));
        if (file) result.withAudio += 1;
        await sql`INSERT INTO archive_episodes (article_id, source_id, audio_url, status)
          VALUES (${res.articleId}, ${sourceId}, ${file?.url ?? null}, 'imported') ON CONFLICT (article_id) DO NOTHING`;
      }
    }
    result.finished = true;
  } catch (error) {
    result.error = String((error as Error).message ?? error).slice(0, 500);
  }
  await sql`INSERT INTO archive_sources (source_id, pages, found, finished_at, error, updated_at)
    VALUES (${sourceId}, ${result.pages}, ${result.found}, ${result.finished ? new Date() : null}, ${result.error ?? null}, now())
    ON CONFLICT (source_id) DO UPDATE SET pages = EXCLUDED.pages, found = EXCLUDED.found, finished_at = EXCLUDED.finished_at,
      error = EXCLUDED.error, updated_at = now()`;
  return result;
}
