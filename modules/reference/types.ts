// A case as the pages draw it: what the writer produced, with the example figures computed by the program
// (backend/examples.ts). Shared by the backend that stores it and the web that renders it.
import type { ShopKind } from "./situations.ts";

/** Who tells the story: the owner, their staff, an adviser or vendor, or a publication about the shop. */
export type Speaker = "owner" | "staff" | "adviser" | "vendor" | "media";

export interface Shop {
  /** As the original writes it; null when it names no shop (a vendor's advice, an unnamed restaurant). */
  name: string | null;
  /**
   * Who it is in Chinese, without the country: "京都一家意大利小酒馆", "一位餐厅顾问". The shop page's title and a
   * practice card's line; stories written before it was asked have none until they are written again.
   */
  label: string;
  country: string;
  city: string | null;
  /** Its 店型 (situations.ts SHOP_KINDS); null when the original does not say or none fits. */
  kind: ShopKind | null;
  /** 一家店、8 家店…; null when the original does not say. */
  size: string | null;
  speaker: Speaker;
}

export interface Placement {
  situation: string;
  group: string | null;
  /** What this shop did, in a sentence: read by the grouping of practices, and the sum-up of a story it left alone (backend/methods.ts). */
  card: string;
}

/** Numbers from the original, drawn as bars; the program adds the change between the first and last. */
export interface CompareBlock {
  type: "compare";
  unit: string;
  items: Array<{ label: string; value: number }>;
  /** "周" or "月": each value is per that period, and the change is also shown for a year. */
  per: "周" | "月" | null;
  caption: string;
  /** Computed: last minus first, and the same over a year when `per` is set. */
  change: { amount: number; percent: number; yearly: number | null } | null;
}

/** Numbers from the original that make up a whole; `against` is what they are set against (revenue). */
export interface PartsBlock {
  type: "parts";
  unit: string;
  items: Array<{ label: string; value: number }>;
  against: { label: string; value: number } | null;
  caption: string;
  /** Computed: the sum of the items, and `against` minus it. */
  total: number;
  gap: number | null;
}

export type ExampleKind = "margin" | "breakeven" | "remainder" | "multiply" | "list-total" | "percent-over";

/** A worked example with made-up numbers ("假设你的餐饮店"): inputs from the writer, every result from the program. */
export interface ExampleBlock {
  type: "example";
  kind: ExampleKind;
  caption: string;
  /** Rows to draw, in order: a label, a value with its unit, and its share of the bar (0–1) where it has one. */
  rows: Array<{ label: string; value: number; unit: string; share: number | null; flag?: boolean }>;
  /** The worked line ("18,000 元 ÷ 每份 18 元 = 1,000 份"), already formatted. */
  equation: string | null;
  /** The result in a sentence, already formatted. */
  result: string;
}

export type Block =
  | { type: "text"; text: string }
  | { type: "list"; items: Array<{ lead: string | null; text: string }> }
  | { type: "flow"; steps: string[] }
  | { type: "quote"; text: string; who: string }
  | CompareBlock
  | PartsBlock
  | ExampleBlock;

export interface CaseStory {
  title: string;
  /** The scene a reader may be in, one sentence. */
  lead: string;
  /** Who this is, and the context the rest needs. */
  who: string;
  parts: Array<{ heading: string; blocks: Block[] }>;
  /** What the original leaves open that readers will ask (did the money come back?), one sentence. */
  open: string | null;
  shop: Shop;
  placements: Placement[];
}

/**
 * Who stands behind a practice or a situation, as the program counts them (layout A7-3): shops, and advisers
 * or vendors (业内人士). A named shop counts once however many stories tell it; an owner or staff member who
 * names no shop counts once a source; a shop a publication writes about without its name counts once a story.
 */
export interface Count {
  /** Practices; null where the stories are not grouped yet (the line then counts 条原文). */
  practices: number | null;
  shops: number;
  insiders: number;
  cases: number;
  countries: string[];
}

/** A source behind a practice or situation, drawn as a small round avatar. */
export interface SourceFace {
  name: string;
  icon: string | null;
}

/** The item a story is written from (the same id), as 收藏 keeps it: starring a story stars its item. */
export interface StarItem {
  id: string;
  title: string;
  summary: string | null;
  source: { name: string };
  publishedAt: string | null;
  score: number | null;
  selected: boolean;
}

/** A story's card (layout A7-2): where it comes from, its title and the item's 收录理由. */
export interface CaseCard {
  id: string;
  title: string;
  item: StarItem;
  /** "日本 · 意大利酒馆店主 · 2025 年 7 月": the shop's country, the source's kind, the month. */
  src: string;
  /** The item's 收录理由. */
  reason: string | null;
  /** The shop's page, when the shop has other stories than this one ("这家店另有 N 条原文"). */
  shop: { key: string; others: number } | null;
}

/** One shop's line on a practice card: "日本 · 京都一家意大利小酒馆 · 招牌菜不动，先调配菜和酒水 ›". */
export interface PracticeLine {
  /** Its newest story in the practice, which the line opens. */
  caseId: string;
  country: string;
  name: string;
  line: string;
  /** Its stories in the practice ("· 共 2 篇" from two). */
  cases: number;
}

/** A practice on a situation page (backend/methods.ts): the stories that tell the same way of doing it, a line a shop. */
export interface PracticeCard {
  /** Its anchor on the situation page. */
  key: string;
  title: string;
  summary: string;
  count: Count;
  /** In the order of its lines, each source once. */
  sources: SourceFace[];
  lines: PracticeLine[];
}

/** A situation in a list (the home page, a shop kind's page, a search): its first card or a compact row. */
export interface SituationRow {
  slug: string;
  /** Its category's title. */
  category: string;
  title: string;
  dek: string;
  /** 先了解这种情况, once the stories are grouped. */
  overview: string | null;
  count: Count;
  sources: SourceFace[];
}

export interface CategoryRows {
  key: string;
  title: string;
  situations: SituationRow[];
}

export interface ReferenceHome {
  categories: CategoryRows[];
  /** 店家谈得最多的事: the situations the most shops shared a practice in, at most five (backend/read.ts rankSituations). */
  ranking: SituationRow[];
  /** The shop kinds with two stories or more. */
  kinds: Array<{ slug: string; title: string; cases: number }>;
  totals: { situations: number; cases: number; countries: number };
  updatedAt: string | null;
}

export interface SituationGroupPart {
  key: string;
  title: string;
  line: string;
  practices: PracticeCard[];
  /** Stories in no practice: written since the grouping, or every story while there is none. */
  cases: CaseCard[];
}

export interface SituationPage {
  slug: string;
  category: { key: string; title: string };
  title: string;
  dek: string;
  /** 先了解这种情况: a few sentences on the usual causes and practices; null until the stories are grouped. */
  overview: string | null;
  /** Who the overview is written from: everyone in the situation, whatever the kind. */
  overviewCount: Count;
  /** Whether the stories are grouped by practice; without, each group lists its stories. */
  grouped: boolean;
  /** The shop kind the page is narrowed to (?kind=): the counts are its alone. */
  kind: { slug: string; title: string } | null;
  count: Count;
  groups: SituationGroupPart[];
  /** Placed in the situation without a group. */
  others: { practices: PracticeCard[]; cases: CaseCard[] };
  /** How many situations the library shows, for the line that leads to them all. */
  situations: number;
  updatedAt: string | null;
}

export interface CasePage {
  id: string;
  story: CaseStory;
  /** The item the story is written from, with its AI 导读 (summary) and 收录理由. */
  item: StarItem & { reason: string | null };
  source: { name: string; kind: string | null; url: string; language: string | null; month: string; audioOnly: boolean };
  /** Its situation, its practice there (the page opens at it) and how many practices or stories the page has. */
  situation: { slug: string; title: string; practice: string | null; count: Count } | null;
  /** The shop's page, when the shop has other stories than this one. */
  shop: { key: string; others: number } | null;
  /** How many situations the library shows, for the card at the end. */
  situations: number;
}

export interface KindPage {
  slug: string;
  title: string;
  dek: string;
  metrics: { cases: number; countries: string[] };
  /** The situations its stories are in, each counted for this kind alone. */
  categories: CategoryRows[];
  /** Its stories in no situation the library shows. */
  others: CaseCard[];
  updatedAt: string | null;
}

export interface ShopPage {
  key: string;
  shop: Shop;
  cases: CaseCard[];
  updatedAt: string | null;
}

/** /api/reference/search: what the library has for the words searched, best first. */
export interface ReferenceSearch {
  situations: SituationRow[];
  cases: CaseCard[];
}

/** /api/reference/by-item/:id: the story an item is written as, for the item page. */
export interface ItemStory {
  id: string;
  title: string;
  situation: { slug: string; title: string; count: Count } | null;
}
