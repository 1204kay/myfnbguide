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
];
