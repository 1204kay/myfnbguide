// The sources whose archives are opened (HANDOFF §9.2): their old episodes and articles come in as history
// (not today, not in the daily), and podcast episodes whose notes score at least the understand floor are
// transcribed for the writers. An empty list switches the archive off.
import { readFileSync } from "node:fs";

export interface ArchivePlan {
  id: string;
  /** Older listing pages, `{n}` the page number (WordPress feeds take ?paged=n), read from 1 up to `to` or the first empty one. */
  pages?: { url: string; to: number };
  /** Only these entries, by URL: the episodes picked from their titles and notes before any model is paid (picks.json). */
  only?: string[];
}

/** The old episodes picked one by one, by source (from myfnb/archive-episodes.ts), each with why. */
const PICKS = JSON.parse(readFileSync(new URL("./picks.json", import.meta.url), "utf8")) as Record<string, Array<{ url: string }>>;

/**
 * Where picks sit beyond a feed's first page: vendors' blogs (10/11), whose older articles were picked one by one
 * from titles and summaries (46 of 1,997: methods with steps or numbers, not product news or generic tips).
 */
const PAGES: Record<string, ArchivePlan["pages"]> = {
  "rss-sischef": { url: "https://sischef.com/feed/?paged={n}", to: 5 },
  "rss-gopos": { url: "https://gopos.pl/blog/feed/?paged={n}", to: 18 },
  "rss-koust": { url: "https://koust.net/feed/?paged={n}", to: 28 },
};

export const ARCHIVE: ArchivePlan[] = [
  // Practice blogs whose old articles are whole text already: stories without transcription.
  { id: "rss-petpooja", pages: { url: "https://blog.petpooja.com/feed/?paged={n}", to: 30 } },
  { id: "rss-tenpo-biz-column", pages: { url: "https://www.tenpo.biz/solution/feed/?paged={n}", to: 20 } },
  // Owners' own blogs (10/5): most stopped or write rarely, so their value is the archive. Bluebird Bread's feed
  // (Wix) lists only its latest 20 and does not page. 未来食堂日記 (はてな) answered the server 403: not read (rule 6).
  { id: "rss-caroline-bower" },
  { id: "rss-kojinkuroji", pages: { url: "https://kojinkuroji.com/feed/?paged={n}", to: 10 } },
  { id: "rss-ryourigaka", pages: { url: "https://ryourigaka.jp/feed/?paged={n}", to: 21 } },
  { id: "rss-yoshitencho", pages: { url: "https://yoshitencho.com/category/restaurant/feed?paged={n}", to: 14 } },
  // 10/11: a couple running a 20-seat Chinese restaurant in a Japanese town; writes rarely now, 78 old articles.
  { id: "rss-zieigyou", pages: { url: "https://zieigyou.com/feed/?paged={n}", to: 8 } },
  // Owners' podcasts: old episodes picked one by one from titles and notes before any model was paid (owners' own
  // stories and methods; not news, vendors, chains' growth, chat or the craft of coffee and bread): 278 of 1,223 on
  // 10/5, 220 of 1,014 of fourteen more shows and 365 of 1,393 of thirty-two from the whole index on 10/10.
  // Your Life and Restaurant, the 10/4 trial, came in whole; its notes are a title, so on 10/11 its 38 business
  // episodes were picked by title (not the ones on sleep, books, holidays or the host's own life).
  ...Object.entries(PICKS).map(([id, picks]) => ({ id, ...(PAGES[id] ? { pages: PAGES[id] } : {}), only: picks.map((p) => p.url) })),
];
