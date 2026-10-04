// A case as the pages draw it: what the writer produced, with the example figures computed by the program
// (backend/examples.ts). Shared by the backend that stores it and the web that renders it.
import type { ShopKind } from "./situations.ts";

/** Who tells the story: the owner, their staff, an adviser or vendor, or a publication about the shop. */
export type Speaker = "owner" | "staff" | "adviser" | "vendor" | "media";

export interface Shop {
  /** Null when the original names no shop (a vendor's advice, an unnamed restaurant). */
  name: string | null;
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
  /** The card's line on that situation's page: what this shop did. */
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

/** A card on a situation or shop page. */
export interface CaseCard {
  id: string;
  title: string;
  line: string;
  /** "美国 · Total Food Service · 2026 年 10 月". */
  src: string;
}

export interface ReferenceHome {
  categories: Array<{ key: string; title: string; situations: Array<{ slug: string; title: string; dek: string; cases: number; countries: number }> }>;
  /** The shop kinds that have cases. */
  kinds: Array<{ slug: string; title: string; cases: number }>;
  totals: { situations: number; cases: number; countries: number };
}

export interface SituationPage {
  slug: string;
  category: { key: string; title: string };
  title: string;
  dek: string;
  groups: Array<{ key: string; title: string; line: string; cases: CaseCard[] }>;
  /** Placed in the situation without a group. */
  others: CaseCard[];
  metrics: { cases: number; countries: number; updatedAt: string | null };
}

export interface CasePage {
  id: string;
  story: CaseStory;
  source: { name: string; country: string | null; url: string; language: string | null; publishedAt: string | null; audioOnly: boolean };
  /** The situations it is placed in, for the way back. */
  situations: Array<{ slug: string; title: string; group: string | null }>;
  /** The shop's page, when the shop has more cases than this one. */
  shop: { key: string; cases: number } | null;
}

export interface KindPage {
  slug: string;
  title: string;
  dek: string;
  cases: CaseCard[];
  metrics: { cases: number; countries: number; updatedAt: string | null };
}

export interface ShopPage {
  key: string;
  shop: Shop;
  cases: CaseCard[];
}
