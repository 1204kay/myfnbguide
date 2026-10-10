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
import { FetchError, type Candidate, type SourceRow } from "@aihot/backend/sources/types";
import type { ArchivePlan } from "../plan.ts";

/** The pause between two pages of one archive: a blog answered 429 to pages read back to back (Petpooja, 10/4). Tests set 0. */
export const PACE = { pageMs: 10_000 };

// Entities decoded as the engine's reader does (sources/rss.ts): a title with It&#39;s must match the one it stored.
const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", htmlEntities: true });
const key = (title: unknown) => String(title ?? "").replace(/\s+/g, " ").trim();
const list = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** A transcript's forms as a feed lists them (podcast:transcript), the plainest to read first. */
const TRANSCRIPT_TYPES = ["text/vtt", "application/x-subrip", "application/srt", "text/plain", "application/json", "text/html"];

/**
 * Each episode's audio file, by its title (the engine keeps no enclosure for an episode that has a page), and the
 * transcript its host already made where the feed names one: a third of the episodes had one (10/10, 732 of 2,162).
 */
export function audioByTitle(feed: string): Map<string, { url: string; type: string; transcript: string | null }> {
  const doc = xml.parse(feed) as { rss?: { channel?: { item?: unknown } } };
  const out = new Map<string, { url: string; type: string; transcript: string | null }>();
  for (const item of list(doc.rss?.channel?.item as Array<Record<string, any>> | undefined)) {
    const audio = list(item.enclosure as Array<Record<string, string>> | undefined).find((e) => /^audio\//.test(e?.["@type"] ?? ""));
    const scripts = list(item["podcast:transcript"] as Array<Record<string, string>> | undefined).filter((t) => t?.["@url"]);
    const transcript = TRANSCRIPT_TYPES.flatMap((type) => scripts.filter((t) => t["@type"] === type))[0]?.["@url"] ?? null;
    if (audio?.["@url"]) out.set(key(item.title), { url: audio["@url"], type: audio["@type"]!, transcript });
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

/**
 * One listing of the source: its entries, through the source's own URL and noise filters as the collection applies
 * them, and for a podcast the audio of each episode (the feed read once more: the engine's reader keeps no enclosures).
 */
async function readListing(source: SourceRow, feedUrl: string, podcast: boolean): Promise<{ listed: number; candidates: Candidate[]; audio: ReturnType<typeof audioByTitle> }> {
  const page = { ...source, config: { ...source.config, feedUrl } };
  const read = await fetchRss(page, { force: true });
  const feed = podcast ? await guardedFetch(feedUrl, { timeoutMs: 60_000, maxBytes: 20 * 1024 * 1024, maxRedirects: 5 }) : null;
  return {
    listed: read.candidates.length,
    candidates: admitListing(read.candidates, source),
    audio: feed?.status === 200 ? audioByTitle(feed.text()) : new Map(),
  };
}

/**
 * Takes in every entry of the source's feed (and of its older pages) that the site does not have yet, or only the
 * ones the plan picked; entries it has are recorded too. The source is finished once its last page, an empty one,
 * or a 404 past the first (WordPress past its last page) was read; an error stops the run at that page and is kept, and the next run reads from the
 * first page again (what it has costs nothing).
 */
export async function importSource(plan: ArchivePlan): Promise<ImportResult> {
  const sourceId = plan.id;
  const [source] = await sql<Array<SourceRow & { tags: string[] }>>`SELECT * FROM sources WHERE id = ${sourceId}`;
  if (!source || source.kind !== "rss") throw new Error(`archive: ${sourceId} is not an RSS source`);
  const urls = plan.pages ? Array.from({ length: plan.pages.to }, (_, i) => plan.pages!.url.replace("{n}", String(i + 1))) : [source.config.feedUrl as string];
  const only = plan.only ? new Set(plan.only) : null;
  const result: ImportResult = { sourceId, pages: 0, found: 0, created: 0, withAudio: 0, finished: false };
  try {
    for (const [i, url] of urls.entries()) {
      if (i > 0 && PACE.pageMs) await new Promise((resolve) => setTimeout(resolve, PACE.pageMs));
      let listing;
      try {
        listing = await readListing(source, url, source.tags.includes("播客"));
      } catch (error) {
        if (i > 0 && error instanceof FetchError && error.status === 404) break;
        throw error;
      }
      const { listed, audio } = listing;
      // The end of the archive is an empty page; a page whose entries the filters all drop is not.
      if (!listed) break;
      const candidates = only ? listing.candidates.filter((c) => only.has(c.url)) : listing.candidates;
      result.pages += 1;
      result.found += candidates.length;
      for (const c of candidates) {
        const res = await upsertMaterial({ ...c, sourceId, via: "archive", backfill: "archive" });
        if (res.created || res.revised || res.processingNeeded) await queueProcessing(res.articleId);
        if (res.created) result.created += 1;
        const file = audio.get(key(c.title));
        if (file) result.withAudio += 1;
        await sql`INSERT INTO archive_episodes (article_id, source_id, audio_url, transcript_url, status)
          VALUES (${res.articleId}, ${sourceId}, ${file?.url ?? null}, ${file?.transcript ?? null}, 'imported') ON CONFLICT (article_id) DO NOTHING`;
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

/**
 * New episodes of every podcast the site collects, kept for transcription like the archive's: each recent episode
 * the collection took in without an entry here gets its audio file from the feed (the engine's reader keeps no
 * enclosures). Without a transcript an episode is only its notes, too thin to say what it says (用户 10/9: 每一篇都要
 * 有实际表达的内容).
 */
export async function noteNewEpisodes(): Promise<{ sources: number; added: number; errors: number }> {
  const sources = await sql<SourceRow[]>`SELECT * FROM sources WHERE kind = 'rss' AND enabled AND '播客' = ANY (tags)`;
  let added = 0, errors = 0;
  for (const source of sources) {
    const waiting = await sql<{ id: string; title: string }[]>`
      SELECT a.id, a.title FROM articles a LEFT JOIN archive_episodes e ON e.article_id = a.id
      WHERE a.source_id = ${source.id} AND e.article_id IS NULL AND NOT a.backfill AND a.discovered_at > now() - interval '30 days'`;
    if (!waiting.length) continue;
    try {
      const feed = await guardedFetch(source.config.feedUrl as string, { timeoutMs: 60_000, maxBytes: 20 * 1024 * 1024, maxRedirects: 5 });
      if (feed.status !== 200) { errors += 1; continue; }
      const audio = audioByTitle(feed.text());
      for (const a of waiting) {
        const file = audio.get(key(a.title));
        if (!file) continue;
        await sql`INSERT INTO archive_episodes (article_id, source_id, audio_url, transcript_url, status)
          VALUES (${a.id}, ${source.id}, ${file.url}, ${file.transcript}, 'imported') ON CONFLICT (article_id) DO NOTHING`;
        added += 1;
      }
    } catch {
      // A feed that cannot be read now is read again at the next run.
      errors += 1;
    }
  }
  return { sources: sources.length, added, errors };
}
