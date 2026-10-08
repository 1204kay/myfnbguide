// A case as the pages draw it: what the writer produced, with the example figures computed by the program
// (backend/examples.ts). Shared by the backend that stores it and the web that renders it.
import type { HotParticipant } from "@aihot/contracts/site";
import type { ShopKind } from "./situations.ts";

/** Who tells the story: the owner, their staff, an adviser or vendor, or a publication about the shop. */
export type Speaker = "owner" | "staff" | "adviser" | "vendor" | "media";

export interface Shop {
  /** As the original writes it; null when it names no shop (a vendor's advice, an unnamed restaurant). */
  name: string | null;
  /**
   * Who it is in Chinese, without the country: "京都一家意大利小酒馆", "一位餐厅顾问". The shop page's title and a
   * practice's line, the newest story's for a named shop (backend/read.ts shopName); stories written before it was
   * asked have none until they are written again.
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

/** The original's key figures, each as it writes it with what it counts, drawn big (数字卡). */
export interface NumbersBlock {
  type: "numbers";
  items: Array<{ value: string; label: string }>;
  caption: string | null;
}

/** How something was done before and how now, side by side (前后对比). */
export interface ChangeBlock {
  type: "change";
  before: { label: string; text: string };
  after: { label: string; text: string };
  caption: string | null;
}

export type Block =
  | { type: "text"; text: string }
  | { type: "list"; items: Array<{ lead: string | null; text: string }> }
  | { type: "flow"; steps: string[] }
  | { type: "quote"; text: string; who: string }
  | CompareBlock
  | PartsBlock
  | ExampleBlock
  | NumbersBlock
  | ChangeBlock;

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
  /** Whether the stories are grouped by practice yet; until then a list counts 条原文, not shops (layout J3-5). */
  grouped: boolean;
  shops: number;
  insiders: number;
  cases: number;
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
  /** Who the shop is (backend/read.ts shopName). */
  name: string;
  line: string;
  /** Its stories in the practice ("· 共 2 篇" from two). */
  cases: number;
}

/**
 * A practice two shops or more tell (insiders counted with them), on a situation page (backend/methods.ts): what
 * to do, how they did it, and a line a shop (layout J4-2).
 */
export interface PracticeCard {
  /** Its anchor on the situation page. */
  key: string;
  title: string;
  summary: string;
  count: Count;
  lines: PracticeLine[];
}

/**
 * The practices one shop tells alone in a list, as rows under who it is, written once (layout J4-3, J4-4): each
 * practice's title, and the shop's line where it says more than the title; a row leads to the story.
 */
export interface ShopPractices {
  country: string;
  /** Who the shop is (backend/read.ts shopName). */
  name: string;
  practices: Array<{
    /** Its anchor on the situation page. */
    key: string;
    title: string;
    /** The shop's newest story in it, which the row opens. */
    caseId: string;
    /** The shop's line; null where it mostly says what the title says (backend/read.ts repeats). */
    line: string | null;
    /** Its stories in the practice ("共 2 篇" from two), as a practice card's line counts them. */
    cases: number;
  }>;
}

/** A list of a situation page: practices first, most shops first, then what one shop alone tells, then loose stories. */
export interface PracticeList {
  practices: PracticeCard[];
  shops: ShopPractices[];
  /** Stories in no practice: written since the grouping, or every story while there is none; a shop's newest alone. */
  cases: CaseCard[];
}

/** A situation in a list (the home page, a search): a row with its title, a practice and how many shops tell it. */
export interface SituationRow {
  slug: string;
  /** Its category's title. */
  category: string;
  title: string;
  dek: string;
  /** 先了解这种情况, once the stories are grouped. */
  overview: string | null;
  count: Count;
  /** 代表做法 (layout J3-3): the title of the practice the most shops tell, the page's first; null before the stories are grouped. */
  practice: string | null;
  /** Who tells it, as the hot list shows who talks about a story (features/hot/Faces): its sources, most stories first, the first few with their icons. */
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
  /** 店家谈得最多的事: the ten situations the most shops shared a practice in (backend/read.ts rankSituations). */
  ranking: SituationRow[];
  /** 最近收进 on the first of the ranking (layout J3-3): its story the library took in last, and who tells it. */
  recent: { id: string; at: string; who: string } | null;
  totals: { situations: number; cases: number };
  updatedAt: string | null;
}

export interface SituationGroupPart extends PracticeList {
  key: string;
  title: string;
  line: string;
}

export interface SituationPage {
  slug: string;
  category: { key: string; title: string };
  title: string;
  dek: string;
  /** 先了解这种情况: a few sentences on the usual causes and practices; null until the stories are grouped. */
  overview: string | null;
  count: Count;
  /** The causes that have practices or stories, numbered under the picture. */
  causes: Array<{ key: string; title: string; line: string }>;
  /**
   * The page by cause, a section each, where two causes have two practices or more each (layout J4-5); else none,
   * and the page is one list (`rest`).
   */
  groups: SituationGroupPart[];
  /** With `groups`, what is placed in no cause (其他做法); without, every practice and story of the page. */
  rest: PracticeList;
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
  /** Its situation, its practice there (the page opens at it) and what the situation counts. */
  situation: { slug: string; title: string; practice: string | null; count: Count } | null;
  /** The shop's page, when the shop has other stories than this one. */
  shop: { key: string; others: number } | null;
  /** How many situations the library shows, for the card at the end. */
  situations: number;
}

export interface ShopPage {
  key: string;
  shop: Shop;
  cases: CaseCard[];
  updatedAt: string | null;
}

/** An item's 正文 · AI 整理自原文 when it is no story of the library (backend/body.ts). */
export interface ItemBody {
  /** What the original is: who said or did what, where. */
  lead: string;
  parts: Array<{ heading: string; blocks: Block[] }>;
  /** What the original leaves open that readers will ask, one sentence. */
  open: string | null;
}

/** What the item page shows under its summary (web/item-part.tsx): the item's story in the library, or its write-up. */
export type ItemText =
  | { kind: "case"; id: string; story: CaseStory; situation: { slug: string; title: string; count: Count } | null }
  | { kind: "body"; body: ItemBody };
