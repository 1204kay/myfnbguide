// What the reference pages read: cases that may be shown, of items that are selected and public now
// (publication/scope.ts), so a withdrawn or corrected item leaves the pages with the rest of the site. A
// situation's stories are shown by practice where a grouping of this prompt is stored (backend/methods.ts),
// one card a story where none is; who stands behind a practice or situation the program counts (tellerOf).
// The country is the shop's, from the case; the source's own country is its first source tag.
import { sql } from "@aihot/backend/db";
import type { SitemapEntry } from "@aihot/backend/modules";
import { publicSourceName } from "@aihot/backend/publication/rules";
import { selectedCondition } from "@aihot/backend/publication/scope";
import { month } from "../format.ts";
import { CATEGORIES, categoryTitle, findShopKind, findSituation, SHOP_KINDS, SITUATIONS, type Situation } from "../situations.ts";
import type {
  CaseCard, CasePage, CaseStory, CategoryRows, Count, ItemStory, KindPage, PracticeCard, ReferenceHome, ReferenceSearch, ShopPage,
  SituationPage, SituationRow, SourceFace, StarItem,
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
    SELECT c.article_id AS id, c.story, c.situations, c.shop_key, c.updated_at, p.url, p.published_at, p.timeline_at, p.title, p.summary, p.reason,
           p.score, s.id AS source_id, s.name AS source_name, s.tags AS source_tags, s.icon_url AS source_icon
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

/** How many stories each shop has, for the line on a card that leads to its page. */
async function shopSizes(now: Date): Promise<Map<string, number>> {
  const rows = await sql<{ shop_key: string; n: number }[]>`
    SELECT c.shop_key, count(*)::int AS n FROM reference_cases c JOIN publications p ON p.article_id = c.article_id
    WHERE c.status = 'story' AND c.shop_key IS NOT NULL AND ${selectedCondition(now)} GROUP BY c.shop_key`;
  return new Map(rows.map((r) => [r.shop_key, r.n]));
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

function countOf(rows: Row[], practices: number | null): Count {
  const shops = new Set<string>();
  const insiders = new Set<string>();
  for (const r of rows) {
    const t = tellerOf(r);
    (t.insider ? insiders : shops).add(t.key);
  }
  return { practices, shops: shops.size, insiders: insiders.size, cases: rows.length, countries: [...new Set(rows.map((r) => r.story.shop.country))] };
}

/** The sources behind some stories, in their order, each once. */
const faces = (rows: Row[]): SourceFace[] => [...new Map(rows.map((r) => [r.source_name, { name: publicSourceName(r.source_name), icon: r.source_icon }])).values()];

/** A shop as a practice card's line names it. Stories written before `label` was asked name it by its original name. */
const shopName = (r: Row) => r.story.shop.label || r.story.shop.name || publicSourceName(r.source_name);

/** The item behind a story, as 收藏 keeps it. */
const starItem = (r: Row): StarItem => ({
  id: r.id, title: r.title, summary: r.summary, source: { name: publicSourceName(r.source_name) }, publishedAt: r.published_at?.toISOString() ?? null,
  score: r.score === null ? null : Number(r.score), selected: true,
});

function card(r: Row, shops: Map<string, number>): CaseCard {
  const total = r.shop_key ? (shops.get(r.shop_key) ?? 1) : 0;
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
 * A situation's practices from the stored grouping over the stories shown now (newest first), most shops first and
 * then the newest. A story withdrawn since leaves its line, a story written since (or moved to another group) is
 * loose: it shows as a story until the next grouping takes it in.
 */
function practices(rows: Row[], methods: Method[], situation: Situation): { built: Built[]; loose: Row[] } {
  const used = new Set<string>();
  const built = methods.flatMap((m): Built[] => {
    const lines = m.shops.flatMap((s) => {
      const members = rows.filter((r) => s.caseIds.includes(r.id) && !used.has(r.id) && groupOf(r, situation) === m.group);
      for (const r of members) used.add(r.id);
      const first = members[0];
      return first ? [{ members, line: { caseId: first.id, country: first.story.shop.country, name: shopName(first), line: s.line, cases: members.length } }] : [];
    });
    const members = lines.flatMap((l) => l.members);
    if (!members.length) return [];
    return [{ group: m.group, members, card: { key: m.key, title: m.title, summary: m.summary, count: countOf(members, null), sources: faces(members), lines: lines.map((l) => l.line) } }];
  });
  const newest = (b: Built) => Math.max(...b.members.map((r) => r.timeline_at.getTime()));
  built.sort((a, b) => b.card.count.shops + b.card.count.insiders - (a.card.count.shops + a.card.count.insiders) || newest(b) - newest(a));
  return { built, loose: rows.filter((r) => !used.has(r.id)) };
}

/**
 * A situation in a list, counted for one shop kind when given: a practice counts when a shop of that kind tells it
 * (layout B4), and only that kind's stories count.
 */
function situationRow(situation: Situation, rows: Row[], stored: Stored | undefined, kind: string | null = null): SituationRow {
  const ofKind = (r: Row) => !kind || r.story.shop.kind === kind;
  const counted = stored ? practices(rows, stored.methods, situation).built.filter((b) => b.members.some(ofKind)).length : null;
  const own = rows.filter(ofKind);
  return {
    slug: situation.slug, category: categoryTitle(situation.category)!, title: situation.title, dek: situation.dek,
    overview: stored?.overview ?? null, count: countOf(own, counted), sources: faces(own),
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

export async function readHome(now = new Date()): Promise<ReferenceHome> {
  const rows = await shownCases(sql`true`, now);
  const stored = await groupings();
  const placed = bySituation(rows);
  const shown = SITUATIONS.filter((s) => (placed.get(s.slug)?.length ?? 0) >= SHOWN_FROM);
  return {
    categories: CATEGORIES.map((c) => ({
      key: c.key, title: c.title,
      situations: shown.filter((s) => s.category === c.key).map((s) => situationRow(s, placed.get(s.slug)!, stored.get(s.slug))),
    })).filter((c) => c.situations.length),
    // A kind shows from two stories, like a situation.
    kinds: SHOP_KINDS.map((k) => ({ slug: k.slug, title: k.title, cases: rows.filter((r) => r.story.shop.kind === k.slug).length })).filter((k) => k.cases >= SHOWN_FROM),
    totals: { situations: shown.length, cases: rows.length, countries: new Set(rows.map((r) => r.story.shop.country)).size },
    updatedAt: latest([...rows.map((r) => r.updated_at), ...[...stored.values()].map((g) => g.updated_at)]),
  };
}

/** One situation's page; with a known shop kind, narrowed to the practices and stories of that kind's shops (layout B2). */
export async function readSituation(slug: string, kindSlug: string | null = null, now = new Date()): Promise<SituationPage | null> {
  const situation = findSituation(slug);
  if (!situation) return null;
  const kind = kindSlug ? findShopKind(kindSlug) : undefined;
  const ofKind = (r: Row) => !kind || r.story.shop.kind === kind.slug;
  const [rows, stored, shops, situations] = await Promise.all([shownCases(sql`${slug} = ANY (c.situations)`, now), groupings(slug), shopSizes(now), situationsShown(now)]);
  const grouping = stored.get(slug);
  const { built, loose } = grouping ? practices(rows, grouping.methods, situation) : { built: [], loose: rows };
  const kept = built.filter((b) => b.members.some(ofKind));
  const part = (group: string | null) => ({
    practices: kept.filter((b) => b.group === group).map((b) => b.card),
    cases: oneAShop(loose.filter((r) => groupOf(r, situation) === group && ofKind(r))).map((r) => card(r, shops)),
  });
  return {
    slug, category: { key: situation.category, title: categoryTitle(situation.category)! }, title: situation.title, dek: situation.dek,
    overview: grouping?.overview ?? null, overviewCount: countOf(rows, null), grouped: !!grouping,
    kind: kind ? { slug: kind.slug, title: kind.title } : null, count: countOf(rows.filter(ofKind), grouping ? kept.length : null),
    groups: situation.groups.map((g) => ({ ...g, ...part(g.key) })), others: part(null), situations,
    updatedAt: latest([...rows.map((r) => r.updated_at), grouping?.updated_at]),
  };
}

/** The story's situation as its page and the item page name it: the practice it is in there, and what the page counts. */
async function placeOf(r: Row, now: Date): Promise<{ slug: string; title: string; practice: string | null; count: Count } | null> {
  const situation = r.story.placements[0] ? findSituation(r.story.placements[0].situation) : undefined;
  if (!situation) return null;
  const [rows, stored] = await Promise.all([shownCases(sql`${situation.slug} = ANY (c.situations)`, now), groupings(situation.slug)]);
  const grouping = stored.get(situation.slug);
  const built = grouping ? practices(rows, grouping.methods, situation).built : null;
  return {
    slug: situation.slug, title: situation.title, practice: built?.find((b) => b.members.some((m) => m.id === r.id))?.card.key ?? null,
    count: countOf(rows, built ? built.length : null),
  };
}

export async function readCase(id: string, now = new Date()): Promise<CasePage | null> {
  const [r] = await shownCases(sql`c.article_id = ${id}`, now);
  if (!r) return null;
  const country = sourceCountry(r);
  const [situation, shops, situations] = await Promise.all([placeOf(r, now), shopSizes(now), situationsShown(now)]);
  // A shop's page lists its stories; with this one alone it would only repeat it.
  const total = r.shop_key ? (shops.get(r.shop_key) ?? 1) : 0;
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

/** The story an item is written as, for the item page (its itemPart); null when it is none. */
export async function readItemStory(id: string, now = new Date()): Promise<ItemStory | null> {
  const [r] = await shownCases(sql`c.article_id = ${id}`, now);
  if (!r) return null;
  const place = await placeOf(r, now);
  return { id: r.id, title: r.story.title, situation: place && { slug: place.slug, title: place.title, count: place.count } };
}

/**
 * One shop kind (layout B4): the situations its stories are in, by category and counted for this kind alone, and
 * its stories in no situation the lists show. None is no page.
 */
export async function readKind(slug: string, now = new Date()): Promise<KindPage | null> {
  const kind = findShopKind(slug);
  if (!kind) return null;
  const [rows, stored, shops] = await Promise.all([shownCases(sql`true`, now), groupings(), shopSizes(now)]);
  const own = rows.filter((r) => r.story.shop.kind === slug);
  if (!own.length) return null;
  const placed = bySituation(rows);
  const shown = SITUATIONS.filter((s) => (placed.get(s.slug)?.length ?? 0) >= SHOWN_FROM && placed.get(s.slug)!.some((r) => r.story.shop.kind === slug));
  const categories: CategoryRows[] = CATEGORIES.map((c) => ({
    key: c.key, title: c.title,
    situations: shown.filter((s) => s.category === c.key).map((s) => situationRow(s, placed.get(s.slug)!, stored.get(s.slug), slug)),
  })).filter((c) => c.situations.length);
  const inShown = new Set(shown.map((s) => s.slug));
  return {
    slug, title: kind.title, dek: kind.dek, categories,
    others: oneAShop(own.filter((r) => !r.situations.some((s) => inShown.has(s)))).map((r) => card(r, shops)),
    metrics: { cases: own.length, countries: [...new Set(own.map((r) => r.story.shop.country))] },
    updatedAt: latest(own.map((r) => r.updated_at)),
  };
}

/** One shop's stories, newest first, each its own card (layout B5). */
export async function readShop(key: string, now = new Date()): Promise<ShopPage | null> {
  const rows = await shownCases(sql`c.shop_key = ${key}`, now);
  if (!rows.length) return null;
  const shop = rows[0]!.story.shop;
  return {
    key, shop: { ...shop, label: rows.find((r) => r.story.shop.label)?.story.shop.label ?? "" },
    cases: rows.map((r) => card(r, new Map())), updatedAt: latest(rows.map((r) => r.updated_at)),
  };
}

/** At most this many of each in a search's answer; the page shows five and opens the rest in place. */
const SEARCH_LIMIT = 50;

/**
 * The library's part of a search (layout A4, B8): situations whose title, line, groups or practices hold every
 * word searched, in the library's order; stories whose title, opening or shop does, newest first and a shop once.
 * Plain text matching, no model.
 */
export async function searchLibrary(q: string, now = new Date()): Promise<ReferenceSearch> {
  const words = q.normalize("NFKC").toLowerCase().split(/\s+/).filter(Boolean).slice(0, 8);
  if (!words.length) return { situations: [], cases: [] };
  const holds = (texts: Array<string | null | undefined>) => {
    const text = texts.filter(Boolean).join("\n").normalize("NFKC").toLowerCase();
    return words.every((w) => text.includes(w));
  };
  const [rows, stored, shops] = await Promise.all([shownCases(sql`true`, now), groupings(), shopSizes(now)]);
  const placed = bySituation(rows);
  const situations = SITUATIONS.filter((s) => (placed.get(s.slug)?.length ?? 0) >= SHOWN_FROM)
    .filter((s) => holds([s.title, s.dek, ...s.groups.flatMap((g) => [g.title, g.line]), ...(stored.get(s.slug)?.methods.map((m) => m.title) ?? [])]))
    .slice(0, SEARCH_LIMIT).map((s) => situationRow(s, placed.get(s.slug)!, stored.get(s.slug)));
  const cases = oneAShop(rows.filter((r) => holds([r.story.title, r.story.lead, r.story.shop.name, r.story.shop.label])))
    .slice(0, SEARCH_LIMIT).map((r) => card(r, shops));
  return { situations, cases };
}

/** The library's pages for the sitemap: situations and shop kinds the lists show, every story, shops with a page of several. */
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
    ...SHOP_KINDS.flatMap((k) => {
      const list = rows.filter((r) => r.story.shop.kind === k.slug);
      return list.length >= SHOWN_FROM ? [{ loc: `/reference/kinds/${k.slug}`, lastmod: newest(list), changefreq: "daily", priority: 0.6 }] : [];
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
