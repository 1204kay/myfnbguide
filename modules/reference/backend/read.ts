// What the reference pages read: cases that may be shown, of items that are selected and public now
// (publication/scope.ts), so a withdrawn or corrected item leaves the pages with the rest of the site. A
// situation's stories are shown by practice where a grouping of this prompt is stored (backend/methods.ts),
// one card a story where none is; who stands behind a practice or situation the program counts (tellerOf).
// The country is the shop's, from the case; the source's own country is its first source tag. Neither the country
// nor the shop's kind groups or counts anything here (layout J0): the library is too thin in both for now.
import { HOT_FACE_LIMIT, type HotParticipant } from "@aihot/contracts/site";
import { sql } from "@aihot/backend/db";
import { proxiedImage, proxiedImageSet } from "@aihot/backend/media/imgproxy";
import type { SitemapEntry } from "@aihot/backend/modules";
import { publicSourceName } from "@aihot/backend/publication/rules";
import { selectedCondition } from "@aihot/backend/publication/scope";
import { month, spaced } from "../format.ts";
import { CATEGORIES, categoryTitle, findSituation, SITUATIONS, type Situation } from "../situations.ts";
import type {
  CaseCard, CasePage, CaseStory, Count, PracticeCard, PracticeList, ReferenceHome, ShopPage, ShopPractices,
  SituationPage, SituationRow, StarItem,
} from "../types.ts";
import { problemKind } from "./checks.ts";
import { PROMPT_VERSION, type Member, type Method } from "./methods.ts";

/** Source tags that say what a source is, not where it is. */
const KINDS = new Set(["媒体", "协会", "平台", "播客", "服务商", "博客"]);
/** The language of an original, by its source's country. */
const LANGUAGE: Record<string, string> = {
  中国: "中文", 中国台湾: "中文", 中国香港: "中文", 日本: "日文", 韩国: "韩文", 巴西: "葡萄牙文", 葡萄牙: "葡萄牙文",
  意大利: "意大利文", 西班牙: "西班牙文", 阿根廷: "西班牙文", 墨西哥: "西班牙文", 法国: "法文", 德国: "德文", 奥地利: "德文",
  美国: "英文", 英国: "英文", 加拿大: "英文", 澳大利亚: "英文", 新西兰: "英文", 爱尔兰: "英文", 印度: "英文",
};

interface Row {
  id: string;
  story: CaseStory;
  situations: string[];
  shop_key: string | null;
  /** When the library took the story in: its case's first writing. */
  created_at: Date;
  updated_at: Date;
  url: string;
  published_at: Date | null;
  timeline_at: Date;
  source_id: string;
  source_name: string;
  source_tags: string[];
  source_icon: string | null;
  title: string;
  summary: string | null;
  reason: string | null;
  score: string | null;
}

/** The stories shown now, newest first. */
async function shownCases(where: ReturnType<typeof sql>, now: Date): Promise<Row[]> {
  return sql<Row[]>`
    SELECT c.article_id AS id, c.story, c.situations, c.shop_key, c.created_at, c.updated_at, p.url, p.published_at, p.timeline_at, p.title,
           p.summary, p.reason, p.score, s.id AS source_id, s.name AS source_name, s.tags AS source_tags, s.icon_url AS source_icon
    FROM reference_cases c
    JOIN publications p ON p.article_id = c.article_id
    JOIN sources s ON s.id = p.source_id
    WHERE c.status = 'story' AND ${selectedCondition(now)} AND ${where}
    ORDER BY p.timeline_at DESC, c.article_id`;
}

interface Stored {
  overview: string;
  methods: Method[];
  updated_at: Date;
}

/** The groupings made under this prompt, by situation: one made under another has another shape and is made again. */
async function groupings(slug?: string): Promise<Map<string, Stored>> {
  const rows = await sql<Array<Stored & { slug: string }>>`
    SELECT slug, overview, methods, updated_at FROM reference_situations
    WHERE prompt_version = ${PROMPT_VERSION} AND methods IS NOT NULL ${slug ? sql`AND slug = ${slug}` : sql``}`;
  return new Map(rows.map((r) => [r.slug, r]));
}

interface ShopSeen {
  /** Its stories shown, for the line on a card that leads to its page. */
  stories: number;
  /** Its newest story's label, of those that have one (shopName). */
  label: string | null;
}

/** The named shops shown, by key. */
async function shopsShown(now: Date): Promise<Map<string, ShopSeen>> {
  const rows = await sql<{ shop_key: string; stories: number; label: string | null }[]>`
    SELECT c.shop_key, count(*)::int AS stories,
           (array_agg(c.story #>> '{shop,label}' ORDER BY p.timeline_at DESC, c.article_id) FILTER (WHERE c.story #>> '{shop,label}' <> ''))[1] AS label
    FROM reference_cases c JOIN publications p ON p.article_id = c.article_id
    WHERE c.status = 'story' AND c.shop_key IS NOT NULL AND ${selectedCondition(now)} GROUP BY c.shop_key`;
  return new Map(rows.map((r) => [r.shop_key, { stories: r.stories, label: r.label }]));
}

/** A situation shows once two stories are in it (HANDOFF §9.2): one alone is not a page in the lists yet. */
const SHOWN_FROM = 2;

/** How many situations the lists show. */
async function situationsShown(now: Date): Promise<number> {
  const [row] = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM (
      SELECT u.slug FROM reference_cases c
      JOIN publications p ON p.article_id = c.article_id
      CROSS JOIN LATERAL unnest(c.situations) AS u(slug)
      WHERE c.status = 'story' AND ${selectedCondition(now)} GROUP BY u.slug HAVING count(*) >= ${SHOWN_FROM}) shown`;
  return row!.n;
}

const sourceCountry = (r: Row) => r.source_tags.find((t) => !KINDS.has(t)) ?? null;

/** "意大利酒馆店主" of "料理画家クチーナカメヤマ（日本 · 意大利酒馆店主）": what the source is, after its country. */
export function sourceKind(name: string): string | null {
  const inner = /（([^（）]*)）\s*$/.exec(name)?.[1];
  return inner?.includes("·") ? inner.split("·").at(-1)!.trim() || null : null;
}

/**
 * Who a story counts as (layout A7-3): a named shop by its key; else, by who tells it, an adviser or vendor once a
 * source (an insider, not a shop), an owner or staff member once a source, a publication's unnamed shop once a story.
 */
export function tellerOf(r: { id: string; shop_key: string | null; source_id: string; story: CaseStory }): { key: string; insider: boolean } {
  if (r.shop_key) return { key: `shop:${r.shop_key}`, insider: false };
  const speaker = r.story.shop.speaker;
  if (speaker === "adviser" || speaker === "vendor") return { key: `insider:${r.source_id}`, insider: true };
  if (speaker === "media") return { key: `case:${r.id}`, insider: false };
  return { key: `source:${r.source_id}`, insider: false };
}

function countOf(rows: Row[], grouped: boolean): Count {
  const shops = new Set<string>();
  const insiders = new Set<string>();
  for (const r of rows) {
    const t = tellerOf(r);
    (t.insider ? insiders : shops).add(t.key);
  }
  return { grouped, shops: shops.size, insiders: insiders.size, cases: rows.length };
}

/**
 * A shop's label without the country it opens with, where the line names the country before it (layout J12):
 * 「日本 · 日本一家泰式餐馆」 reads 「日本 · 一家泰式餐馆」. Only where the rest opens with 的, or with how many
 * shops or people after a place at most ("一家", "京都一家", "两位", "3 家"): "意大利面馆", "日本料理店" and
 * "韩国烤肉店的一位店主" say what kind of shop, "日本第一家" and "日本最大的一家" what it is in its country.
 */
export function withoutCountry(label: string, country: string): string {
  if (!country || !label.startsWith(country)) return label;
  const after = label.slice(country.length);
  if (/^[人料菜面式风味餐产籍裔语]/u.test(after) || !/^\s*(?:的|[^\s的第最店馆厅铺餐]{0,6}的?\s*[一二两三四五六七八九十几某\d]\s*[家位间名对个])/u.test(after)) return label;
  return after.replace(/^[\s·・、，,的]+/u, "") || label;
}

/**
 * Who a shop is on every page (layout J12): a named shop by the label of its newest story that has one, so it has
 * one name across the site; else the story's own label, or its original name in stories written before labels
 * were asked. Never repeating the country the line writes before it.
 */
function shopName(r: Row, shops: Map<string, ShopSeen>): string {
  const label = (r.shop_key && shops.get(r.shop_key)?.label) || r.story.shop.label || r.story.shop.name || publicSourceName(r.source_name);
  return withoutCountry(label, r.story.shop.country);
}

/** The pairs of adjacent characters in a text, within its words (spaces and punctuation part them). */
const pairs = (text: string) => new Set(text.normalize("NFKC").toLowerCase().split(/[^\p{L}\p{N}]+/u).flatMap((word) => {
  const chars = [...word];
  return chars.slice(1).map((c, i) => chars[i]! + c);
}));

/**
 * Whether a shop's line mostly says what its practice's title says (layout J4-3): half its pairs of adjacent
 * characters or more are in the title, and a row of a practice one shop tells leaves it out.
 */
export function repeats(line: string, title: string): boolean {
  const own = pairs(line);
  const theirs = pairs(title);
  return [...own].filter((p) => theirs.has(p)).length * 2 >= own.size;
}

/** The item behind a story, as 收藏 keeps it. */
const starItem = (r: Row): StarItem => ({
  id: r.id, title: r.title, summary: r.summary, source: { name: publicSourceName(r.source_name) }, publishedAt: r.published_at?.toISOString() ?? null,
  score: r.score === null ? null : Number(r.score), selected: true,
});

function card(r: Row, shops: Map<string, ShopSeen>): CaseCard {
  const total = r.shop_key ? (shops.get(r.shop_key)?.stories ?? 1) : 0;
  return {
    id: r.id, title: r.story.title, item: starItem(r), reason: r.reason, shop: total > 1 ? { key: r.shop_key!, others: total - 1 } : null,
    src: [r.story.shop.country, sourceKind(r.source_name) ?? publicSourceName(r.source_name), month(r.published_at ?? r.timeline_at)].join(" · "),
  };
}

/** A list's stories with a shop's newest alone (layout A7-2): its others are a line on that card. */
const oneAShop = (rows: Row[]) => rows.filter((r, i) => !r.shop_key || rows.findIndex((o) => o.shop_key === r.shop_key) === i);

/** The group a story sits in on this situation's page; null for none of its groups ("其他做法"). */
function groupOf(r: Row, situation: Situation): string | null {
  const group = r.story.placements.find((p) => p.situation === situation.slug)?.group ?? null;
  return situation.groups.some((g) => g.key === group) ? group : null;
}

interface Built {
  group: string | null;
  card: PracticeCard;
  members: Row[];
}

/**
 * A situation's practices from the stored grouping over the stories shown now (newest first): the most shops first
 * (layout J3-3, J4-5), then the most insiders, then the newest. A story withdrawn since leaves its line, a story
 * written since (or moved to another group) is loose: it shows as a story until the next grouping takes it in. The
 * lines name their shops by `shops` (shopName); a caller that keeps only the practices' titles or keys passes none.
 */
function practices(rows: Row[], methods: Method[], situation: Situation, shops: Map<string, ShopSeen>): { built: Built[]; loose: Row[] } {
  const used = new Set<string>();
  const built = methods.flatMap((m): Built[] => {
    const lines = m.shops.flatMap((s) => {
      const members = rows.filter((r) => s.caseIds.includes(r.id) && !used.has(r.id) && groupOf(r, situation) === m.group);
      for (const r of members) used.add(r.id);
      const first = members[0];
      return first ? [{ members, line: { caseId: first.id, country: first.story.shop.country, name: shopName(first, shops), line: s.line, cases: members.length } }] : [];
    });
    const members = lines.flatMap((l) => l.members);
    if (!members.length) return [];
    return [{ group: m.group, members, card: { key: m.key, title: m.title, summary: m.summary, count: countOf(members, true), lines: lines.map((l) => l.line) } }];
  });
  const newest = (b: Built) => Math.max(...b.members.map((r) => r.timeline_at.getTime()));
  built.sort((a, b) => b.card.count.shops - a.card.count.shops || b.card.count.insiders - a.card.count.insiders || newest(b) - newest(a));
  return { built, loose: rows.filter((r) => !used.has(r.id)) };
}

/**
 * One list of a situation page (layout J4-2–4): a card for each practice two shops or more tell; a row for each
 * one shop tells alone, a shop's rows under who it is, once; then the stories in no practice, a shop's newest alone.
 * A row is the line of the shop's newest story in the practice and counts all its stories there: a grouping made
 * before the stories were written again (one shop's now) may hold two lines of that shop, which it would have made one.
 */
function listOf(built: Built[], loose: Row[], shops: Map<string, ShopSeen>): PracticeList {
  const told = (b: Built) => b.card.count.shops + b.card.count.insiders;
  const alone = new Map<string, ShopPractices>();
  for (const b of built.filter((b) => told(b) < 2)) {
    const newest = b.members.reduce((a, r) => (r.timeline_at > a.timeline_at ? r : a));
    const l = b.card.lines.find((x) => x.caseId === newest.id)!;
    const teller = tellerOf(newest).key;
    const shop = alone.get(teller) ?? { country: l.country, name: l.name, practices: [] };
    shop.practices.push({ key: b.card.key, title: b.card.title, caseId: l.caseId, line: repeats(l.line, b.card.title) ? null : l.line, cases: b.members.length });
    alone.set(teller, shop);
  }
  return { practices: built.filter((b) => told(b) >= 2).map((b) => b.card), shops: [...alone.values()], cases: oneAShop(loose).map((r) => card(r, shops)) };
}

/**
 * Who tells a situation, as the hot list's faces (publication/hot.ts): its sources by how many of its stories each
 * tells, the first few with their icons through the image proxy (an initial stands in where a source has none).
 */
function facesOf(rows: Row[]): HotParticipant[] {
  const bySource = new Map<string, { name: string; icon: string | null; n: number }>();
  for (const r of rows) {
    const seen = bySource.get(r.source_id) ?? { name: publicSourceName(r.source_name), icon: r.source_icon, n: 0 };
    seen.n += 1;
    bySource.set(r.source_id, seen);
  }
  return [...bySource.values()].sort((a, b) => b.n - a.n || Number(!!b.icon) - Number(!!a.icon)).map((s, i) => {
    const face: HotParticipant = { name: s.name, kind: "editorial" };
    if (i < HOT_FACE_LIMIT) {
      face.iconUrl = proxiedImage(s.icon, "avatar");
      const srcSet = proxiedImageSet(s.icon, "avatar");
      if (srcSet) face.iconSrcSet = srcSet;
    }
    return face;
  });
}

/** A situation in a list: its count, 代表做法 (the practice its page lists first) and who tells it. */
function situationRow(situation: Situation, rows: Row[], stored: Stored | undefined): SituationRow {
  const faces = facesOf(rows);
  return {
    slug: situation.slug, category: categoryTitle(situation.category)!, title: situation.title, dek: situation.dek,
    overview: stored?.overview ?? null, count: countOf(rows, !!stored),
    practice: stored ? (practices(rows, stored.methods, situation, new Map()).built[0]?.card.title ?? null) : null,
    faces, sources: faces.length,
  };
}

/** Stories by the situation they are placed in (a story has one). */
function bySituation(rows: Row[]): Map<string, Row[]> {
  const out = new Map<string, Row[]>();
  for (const r of rows) for (const slug of r.situations) out.set(slug, [...(out.get(slug) ?? []), r]);
  return out;
}

const latest = (dates: Array<Date | undefined>) => dates.reduce<Date | null>((at, d) => (d && (!at || d > at) ? d : at), null)?.toISOString() ?? null;

/** Each situation's stories as the grouping reads them (backend/methods.ts), from the cases shown now. */
export async function membersBySituation(now = new Date()): Promise<Map<string, Member[]>> {
  const out = new Map<string, Member[]>();
  for (const r of await shownCases(sql`true`, now)) {
    const p = r.story.placements[0];
    if (p) out.set(p.situation, [...(out.get(p.situation) ?? []), { id: r.id, group: p.group, teller: tellerOf(r).key, story: r.story }]);
  }
  return out;
}

/** How many situations 店家谈得最多的事 lists on the home page (layout J3-3, after AIHOT's 热点榜). */
const RANKED = 10;

/**
 * The most shops first (counted as every count is, tellerOf), then the most stories, then the library's order: how
 * many shops told it, not how many owners meet it (HANDOFF §3 rule 1).
 */
const byShops = (a: SituationRow, b: SituationRow) => b.count.shops - a.count.shops || b.count.cases - a.count.cases;

/** 店家谈得最多的事: the situations the most shops shared a practice in. */
export const rankSituations = (rows: SituationRow[]): SituationRow[] => [...rows].sort(byShops).slice(0, RANKED);

export async function readHome(now = new Date()): Promise<ReferenceHome> {
  const [rows, stored, shops] = await Promise.all([shownCases(sql`true`, now), groupings(), shopsShown(now)]);
  const placed = bySituation(rows);
  const shown = SITUATIONS.filter((s) => (placed.get(s.slug)?.length ?? 0) >= SHOWN_FROM);
  const listed = new Map(shown.map((s) => [s.slug, situationRow(s, placed.get(s.slug)!, stored.get(s.slug))]));
  const ranking = rankSituations([...listed.values()]);
  // The story the library took in last, of the first: a returning reader sees the library grow (layout J14). Its
  // shop's name may keep the country it opens with (withoutCountry), which is then not written twice.
  const recent = ranking[0] && placed.get(ranking[0].slug)!.reduce((a, r) => (r.created_at > a.created_at ? r : a));
  const who = (r: Row) => {
    const name = shopName(r, shops);
    return spaced(name.startsWith(r.story.shop.country) ? name : `${r.story.shop.country}${name}`);
  };
  return {
    categories: CATEGORIES.map((c) => ({
      key: c.key, title: c.title, situations: shown.filter((s) => s.category === c.key).map((s) => listed.get(s.slug)!).sort(byShops),
    })).filter((c) => c.situations.length),
    ranking,
    recent: recent ? { id: recent.id, at: recent.created_at.toISOString(), who: who(recent) } : null,
    totals: { situations: shown.length, cases: rows.length },
    updatedAt: latest([...rows.map((r) => r.updated_at), ...[...stored.values()].map((g) => g.updated_at)]),
  };
}

/**
 * One situation's page (layout J4): split by cause only where two causes have two practices or more each; else one
 * list, most shops first, the causes numbered under the picture only to explain it.
 */
export async function readSituation(slug: string, now = new Date()): Promise<SituationPage | null> {
  const situation = findSituation(slug);
  if (!situation) return null;
  const [rows, stored, shops, situations] = await Promise.all([shownCases(sql`${slug} = ANY (c.situations)`, now), groupings(slug), shopsShown(now), situationsShown(now)]);
  const grouping = stored.get(slug);
  const { built, loose } = grouping ? practices(rows, grouping.methods, situation, shops) : { built: [], loose: rows };
  const inCause = (key: string | null) => ({ built: built.filter((b) => b.group === key), loose: loose.filter((r) => groupOf(r, situation) === key) });
  const causes = situation.groups.filter((g) => {
    const part = inCause(g.key);
    return part.built.length || part.loose.length;
  });
  const split = causes.filter((g) => inCause(g.key).built.length >= 2).length >= 2;
  const list = (part: { built: Built[]; loose: Row[] }) => listOf(part.built, part.loose, shops);
  return {
    slug, category: { key: situation.category, title: categoryTitle(situation.category)! }, title: situation.title, dek: situation.dek,
    overview: grouping?.overview ?? null, count: countOf(rows, !!grouping),
    causes: causes.map((g) => ({ key: g.key, title: g.title, line: g.line })),
    groups: split ? causes.map((g) => ({ key: g.key, title: g.title, line: g.line, ...list(inCause(g.key)) })) : [],
    rest: list(split ? inCause(null) : { built, loose }),
    situations, updatedAt: latest([...rows.map((r) => r.updated_at), grouping?.updated_at]),
  };
}

/** The story's situation as its page and the item page name it: the practice it is in there, and what the page counts. */
async function placeOf(r: Row, now: Date): Promise<{ slug: string; title: string; practice: string | null; count: Count } | null> {
  const situation = r.story.placements[0] ? findSituation(r.story.placements[0].situation) : undefined;
  if (!situation) return null;
  const [rows, stored] = await Promise.all([shownCases(sql`${situation.slug} = ANY (c.situations)`, now), groupings(situation.slug)]);
  const grouping = stored.get(situation.slug);
  const built = grouping ? practices(rows, grouping.methods, situation, new Map()).built : null;
  return {
    slug: situation.slug, title: situation.title, practice: built?.find((b) => b.members.some((m) => m.id === r.id))?.card.key ?? null,
    count: countOf(rows, !!grouping),
  };
}

export async function readCase(id: string, now = new Date()): Promise<CasePage | null> {
  const [r] = await shownCases(sql`c.article_id = ${id}`, now);
  if (!r) return null;
  const country = sourceCountry(r);
  const [situation, shops, situations] = await Promise.all([placeOf(r, now), shopsShown(now), situationsShown(now)]);
  // A shop's page lists its stories; with this one alone it would only repeat it.
  const total = r.shop_key ? (shops.get(r.shop_key)?.stories ?? 1) : 0;
  return {
    id: r.id, story: r.story,
    item: { ...starItem(r), reason: r.reason },
    source: {
      name: publicSourceName(r.source_name), kind: sourceKind(r.source_name), url: r.url, language: (country && LANGUAGE[country]) ?? null,
      month: month(r.published_at ?? r.timeline_at), audioOnly: r.source_tags.includes("播客"),
    },
    situation, shop: total > 1 ? { key: r.shop_key!, others: total - 1 } : null, situations,
  };
}

/** One shop's stories, newest first, each its own card (layout B5); named as every page names it (shopName). */
export async function readShop(key: string, now = new Date()): Promise<ShopPage | null> {
  const rows = await shownCases(sql`c.shop_key = ${key}`, now);
  if (!rows.length) return null;
  const shop = rows[0]!.story.shop;
  const label = rows.find((r) => r.story.shop.label)?.story.shop.label;
  return {
    key, shop: { ...shop, label: label ? withoutCountry(label, shop.country) : "" },
    cases: rows.map((r) => card(r, new Map())), updatedAt: latest(rows.map((r) => r.updated_at)),
  };
}

/** The library's pages for the sitemap: situations the lists show, every story, shops with a page of several. */
export async function sitemapEntries(now = new Date()): Promise<SitemapEntry[]> {
  const rows = await shownCases(sql`true`, now);
  const placed = bySituation(rows);
  const newest = (list: Row[]) => list.reduce((at, r) => (r.updated_at > at ? r.updated_at : at), list[0]!.updated_at);
  const shops = new Map<string, Row[]>();
  for (const r of rows) if (r.shop_key) shops.set(r.shop_key, [...(shops.get(r.shop_key) ?? []), r]);
  return [
    ...SITUATIONS.flatMap((s) => {
      const list = placed.get(s.slug) ?? [];
      return list.length >= SHOWN_FROM ? [{ loc: `/reference/${s.slug}`, lastmod: newest(list), changefreq: "daily", priority: 0.8 }] : [];
    }),
    ...[...shops].flatMap(([key, list]) => (list.length > 1 ? [{ loc: `/reference/shops/${key}`, lastmod: newest(list), changefreq: "weekly", priority: 0.5 }] : [])),
    ...rows.map((r) => ({ loc: `/reference/cases/${r.id}`, lastmod: r.updated_at, changefreq: "monthly", priority: 0.6 })),
  ];
}

/**
 * How far the writing is, in numbers only (like /api/site/stats): the selected items' cases by status, and
 * how many held cases each kind of problem stopped (a case counts once for each kind it has).
 */
export async function readStatus(now = new Date()): Promise<{ counts: Record<string, number>; held: Record<string, number>; grouped: Record<string, number> }> {
  const rows = await sql<{ status: string; problems: string[] }[]>`
    SELECT c.status, c.problems FROM reference_cases c
    JOIN publications p ON p.article_id = c.article_id
    WHERE ${selectedCondition(now)}`;
  const counts: Record<string, number> = {};
  const held: Record<string, number> = {};
  for (const r of rows) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
    if (r.status === "held") for (const kind of new Set(r.problems.map(problemKind))) held[kind] = (held[kind] ?? 0) + 1;
  }
  // Situations grouped by practice under this prompt, those whose last try failed (by the kind of problem), and
  // those grouped under an earlier prompt, which the pages show one card a story until they are grouped again.
  const grouped: Record<string, number> = {};
  for (const g of await sql<{ methods: unknown; problems: string[]; prompt_version: string }[]>`SELECT methods, problems, prompt_version FROM reference_situations`) {
    const kind = g.problems.length ? `未通过：${problemKind(g.problems[0]!)}` : g.methods && g.prompt_version === PROMPT_VERSION ? "已归并" : "待重新归并";
    grouped[kind] = (grouped[kind] ?? 0) + 1;
  }
  return { counts, held, grouped };
}
