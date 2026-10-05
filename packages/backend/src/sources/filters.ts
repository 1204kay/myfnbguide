// Source-list admission rules shared by collection and the administrator's preview.
import { FUTURE_TOLERANCE_MS } from "../content/materials.ts";
import type { Candidate, SourceRow } from "./types.ts";
import { allowed } from "./web-list.ts";

/**
 * What a source keeps from its listing: links inside its URL prefix rules (matched as listed), then
 * moved by its URL rewrite, inside its categories and keywords, without noise, inside its publication window.
 * Collection and the preview both read listings through it, so a preview shows what a run would store.
 */
export function admitListing<C extends Candidate>(candidates: C[], source: SourceRow, now = Date.now()): C[] {
  const kept = candidates.filter((c) => allowed(c.url, source)).map((c) => rewriteUrl(c, source)).filter((c) => !noiseFiltered(c, source));
  return filterPublicationWindow(kept, source.config.publishedAfter, now);
}

export function noiseFiltered(c: Candidate, source: SourceRow): boolean {
  const f = source.config.ingestNoiseFilter;
  const cats: string[] = c.categories ?? [];
  if (source.config.denyCategories?.some((d: string) => cats.includes(d))) return true;
  if (source.config.allowCategories?.length && !source.config.allowCategories.some((a: string) => cats.includes(a))) return true;
  const title = c.title.toLowerCase();
  const hay = `${title}\n${(c.excerpt ?? "").toLowerCase()}`;
  // A general outlet's whole feed, kept to the site's trade: only entries that name one of its words.
  if (source.config.allowKeywords?.length && !source.config.allowKeywords.some((k: string) => hasKeyword(hay, k))) return true;
  if (!f) return false;
  // Case-insensitive: the exemption "agent" keeps "Agent" (words in the lists are lower case).
  const has = (text: string, words: string[] | undefined) => (words ?? []).some((k) => text.includes(k.toLowerCase()));
  if (has(hay, f.keepIfMatches)) return false;
  return has(title, f.dropMarkersTitleOnly) || has(hay, f.dropMarkers);
}

// Letters and digits of the Latin script, whose words are spaced (English, Malay, Vietnamese …).
const LATIN = /[\p{Script=Latin}\p{Nd}]/u;

/**
 * Whether lower-case text names the keyword, whatever its case. An end of the keyword that is a Latin
 * letter or digit must fall on a word boundary ("tea" is not in "team", "f&b" is in "F&B:"); words of
 * other scripts match inside words ("餐饮" is in "餐饮业").
 */
function hasKeyword(text: string, keyword: string): boolean {
  const k = keyword.trim().toLowerCase();
  // A blank word names nothing; a config written straight into the database is not checked by every reader.
  if (!k) return false;
  const first = LATIN.test(k[0]), last = LATIN.test(k[k.length - 1]);
  for (let i = text.indexOf(k); i >= 0; i = text.indexOf(k, i + 1)) {
    if (first && LATIN.test(text[i - 1] ?? "")) continue;
    if (last && LATIN.test(text[i + k.length] ?? "")) continue;
    return true;
  }
  return false;
}

function rewriteUrl<C extends Candidate>(c: C, source: SourceRow): C {
  const rw = source.config.itemUrlPrefixRewrite;
  if (rw?.from && rw?.to && c.url.startsWith(rw.from)) return { ...c, url: rw.to + c.url.slice(rw.from.length) };
  return c;
}

/** A fixed publication boundary excludes history and dates that cannot prove an item is in range. */
function filterPublicationWindow<C extends Candidate>(candidates: C[], publishedAfter: string | undefined, now: number): C[] {
  if (!publishedAfter) return candidates;
  const after = Date.parse(publishedAfter);
  const latest = now + FUTURE_TOLERANCE_MS;
  return candidates.filter(c => !!c.publishedAt && c.publishedAt.getTime() > after && c.publishedAt.getTime() <= latest);
}
