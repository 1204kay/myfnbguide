// What the reference pages read, shared by the backend that answers them and the web that renders them.
import type { HotParticipant } from "@aihot/contracts/site";

/** Who tells an item: the owner, their staff, an adviser or vendor, or a publication about the shop. */
export type Speaker = "owner" | "staff" | "adviser" | "vendor" | "media";

/**
 * What the pages read of a story written before 10-18 (reference_cases.story), or of an item placed without one
 * (backend/place.ts): who tells it, and where it is placed. The stored stories hold more (their text, the shop's name),
 * which no page shows since 10-24 (backend/read.ts).
 */
export interface CaseStory {
  shop: { country: string; speaker: Speaker };
  placements: Array<{ situation: string; group: string | null }>;
}

/**
 * Who stands behind a situation, as the program counts them (layout A7-3): shops, and advisers or vendors (业内人士).
 * A named shop counts once however many items tell it; an owner or staff member who names no shop counts once a
 * source; a shop a publication writes about without its name counts once an item.
 */
export interface Count {
  shops: number;
  insiders: number;
  cases: number;
}

/** An item as 收藏 keeps it. */
export interface StarItem {
  id: string;
  title: string;
  summary: string | null;
  source: { name: string };
  publishedAt: string | null;
  score: number | null;
  selected: boolean;
}

/** An item's card on a situation page (layout A7-2): where it comes from, its title and its 收录理由; it leads to the item's page. */
export interface CaseCard {
  id: string;
  title: string;
  item: StarItem;
  /** "日本 · 意大利酒馆店主 · 2025 年 7 月": the source's country and kind, the month. */
  src: string;
  /** The item's 收录理由. */
  reason: string | null;
}

/** A situation in a list (the home page): a row with its title and how many shops tell it. */
export interface SituationRow {
  slug: string;
  /** Its category's title. */
  category: string;
  title: string;
  dek: string;
  count: Count;
  /** Who tells it, as the hot list shows who talks about a story (features/hot/Faces): its sources, most items first, the first few with their icons. */
  faces: HotParticipant[];
  /** How many sources tell it. */
  sources: number;
}

export interface CategoryRows {
  key: string;
  title: string;
  situations: SituationRow[];
}

export interface ReferenceHome {
  /** Each category's situations, most shops first. */
  categories: CategoryRows[];
  /** 店家谈得最多的事: the ten situations the most shops told (backend/read.ts rankSituations). */
  ranking: SituationRow[];
  totals: { situations: number; cases: number };
  updatedAt: string | null;
}

export interface SituationGroupPart {
  key: string;
  title: string;
  line: string;
  cases: CaseCard[];
}

export interface SituationPage {
  slug: string;
  category: { key: string; title: string };
  title: string;
  dek: string;
  count: Count;
  /** The causes that have items, numbered under the picture. */
  causes: Array<{ key: string; title: string; line: string }>;
  /** The page by cause, a section each, newest first. */
  groups: SituationGroupPart[];
  /** What is placed in no cause (其他做法). */
  rest: CaseCard[];
  updatedAt: string | null;
  /** Its 综合整理 (backend/topic.ts), or null: none written, or none that passed its check. */
  topic: TopicView | null;
}

/** A situation's 综合整理 as its page reads it: citations are marked 〔n〕, n an item's id in `sources`. */
export interface TopicView {
  title: string;
  /** The three sentences that tell its conclusion. */
  lead: string[];
  /** By cause, each under its cause's title. */
  sections: Array<{ title: string; paragraphs: string[] }>;
  sources: Record<number, string>;
  /** How many items it was written from. */
  items: number;
  updatedAt: string;
}

/** What the item page shows under its three parts (web/item-part.tsx): the way to the situation the item is placed in. */
export interface ItemText { id: string; situation: { slug: string; title: string; count: Count } }

/** One 十一说 as its page reads it (backend/issues.ts readIssue, web/issue.tsx). */
/** All issues, newest first: what the list of them (web/issues.tsx) reads. */
export interface IssueIndex {
  issues: Array<{ no: number; date: string; title: string }>;
}

export interface IssuePage {
  no: number;
  /** The daily it leads, a Beijing date. */
  date: string;
  /** What 十一 wrote; citations are marked 〔n〕, n being a source below. */
  issue: { title: string; brief: string[]; preview: string; news: Array<{ head: string; text: string }>; deep: string; close: string };
  /** The program's own lines, the same every day: the greeting, the turn to the deep item, the goodbye. */
  lines: { open: string; turn: string; end: string };
  /** The originals it names, in order of first naming. */
  sources: Array<{ n: number; sourceName: string; title: string; url: string }>;
  /** How many items the day listed, all of which 十一 read. */
  count: number;
  prev: number | null;
  next: number | null;
  /** Whether the daily it leads is out yet; the issue goes up a few hours before it. */
  daily: boolean;
  /** The issue read aloud (backend/audio.ts), or null: then the page has no 听 button. `transcript` is what the voice
   *  reads, a line a sentence, or null for audio put up without it: then the player has no 文字稿 button. `starts`,
   *  when there, is when each of those lines begins in seconds, and the 文字稿 follows the voice. */
  audio: { url: string; seconds: number; transcript: string[] | null; starts?: number[]; pauses?: Array<[number, number]> } | null;
}
