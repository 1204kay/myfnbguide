// The sources whose archives are opened (HANDOFF §9.2): their old episodes and articles come in as history
// (not today, not in the daily), and podcast episodes whose notes score at least the understand floor are
// transcribed for the writers. An empty list switches the archive off.
export interface ArchivePlan {
  id: string;
  /** Older listing pages, `{n}` the page number (WordPress feeds take ?paged=n), read from 1 up to `to` or the first empty one. */
  pages?: { url: string; to: number };
}

export const ARCHIVE: ArchivePlan[] = [
  // The trial podcast: how many episodes pass, how fast transcription goes, what a story costs.
  { id: "pod-your-life-and-restaurant" },
  // Practice blogs whose old articles are whole text already: stories without transcription.
  { id: "rss-petpooja", pages: { url: "https://blog.petpooja.com/feed/?paged={n}", to: 30 } },
  { id: "rss-tenpo-biz-column", pages: { url: "https://www.tenpo.biz/solution/feed/?paged={n}", to: 20 } },
  // Owners' own blogs (10/5): most stopped or write rarely, so their value is the archive. Bluebird Bread's feed
  // (Wix) lists only its latest 20 and does not page. 未来食堂日記 (はてな) answered the server 403: not read (rule 6).
  { id: "rss-caroline-bower" },
  { id: "rss-kojinkuroji", pages: { url: "https://kojinkuroji.com/feed/?paged={n}", to: 10 } },
  { id: "rss-ryourigaka", pages: { url: "https://ryourigaka.jp/feed/?paged={n}", to: 21 } },
  { id: "rss-yoshitencho", pages: { url: "https://yoshitencho.com/category/restaurant/feed?paged={n}", to: 14 } },
  // The first batch of owners' own podcasts (10/5, the user agreed to the cost; see HANDOFF §9.2 item 4): episodes
  // whose notes score at the floor are transcribed. Consultants' and media podcasts wait until this batch's cost is known.
  { id: "pod-full-comp" },
  { id: "pod-valor-coffee" },
  { id: "pod-tw-kaidian-zhejianshi" },
  { id: "pod-pulling-shots" },
  { id: "pod-jp-inshoku-ai-radio" },
  { id: "pod-panaderia-facil" },
];
