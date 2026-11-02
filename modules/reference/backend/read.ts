// What the reference pages read: the items placed in a situation, of items that are selected and public now
// (publication/scope.ts), so a withdrawn or corrected item leaves the pages with the rest of the site. They are the
// items stories were written from until 10-18 (reference_cases) and the items placed since without one
// (reference_placements, backend/place.ts). A page lists the items by cause under their own titles and leads to the
// items' pages; who stands behind a situation the program counts (tellerOf).
//
// 10-24 (Kay「要改 就现在直接改 直接上线」, 十一) the stories were folded: checked against their originals, 11 of 30 had
// serious errors, and the summaries, practices and shops' lines on the situation pages were drawn from them. 11-03
// (Kay「你和协调者十一决定」, 十一: 不恢复) the code that wrote, grouped and showed them went: a story is read only for
// where it is placed and who tells it, and its old page goes to its item (server.ts).
// The country is the source's. Neither the country nor the shop's kind groups or counts anything here (layout J0).
import { HOT_FACE_LIMIT, type HotParticipant } from "@aihot/contracts/site";
import { sql } from "@aihot/backend/db";
import { proxiedImage, proxiedImageSet } from "@aihot/backend/media/imgproxy";
import type { SitemapEntry } from "@aihot/backend/modules";
import { publicSourceName } from "@aihot/backend/publication/rules";
import { selectedCondition } from "@aihot/backend/publication/scope";
import { month } from "../format.ts";
import { CATEGORIES, categoryTitle, findSituation, OWNERS, SITUATIONS, type Situation } from "../situations.ts";
import type { CaseCard, CaseStory, Count, ItemText, ReferenceHome, SituationPage, SituationRow, Speaker, StarItem } from "../types.ts";
import type { Placed } from "./place.ts";

interface Row {
  id: string;
  story: CaseStory;
  situations: string[];
  shop_key: string | null;
  updated_at: Date;
  published_at: Date | null;
  timeline_at: Date;
  source_id: string;
  source_name: string;
  source_icon: string | null;
  title: string;
  summary: string | null;
  reason: string | null;
  score: string | null;
}

/**
 * The items of a story and the items placed without one, newest first: what the situation pages, the lists and the
 * item pages' "收在 …" read. A placed item is read with no shop key, its source's country and its one placement, as a
 * story is. `where` reads `c.` as a case does: the placements are read under the same alias, with the same
 * `article_id` and `situations`.
 */
async function shownRows(where: ReturnType<typeof sql>, now: Date): Promise<Row[]> {
  const [stories, placed] = await Promise.all([casesShown(where, now), placedShown(where, now)]);
  return [...stories, ...placed].sort((a, b) => b.timeline_at.getTime() - a.timeline_at.getTime() || (a.id < b.id ? -1 : 1));
}

async function placedShown(where: ReturnType<typeof sql>, now: Date): Promise<Row[]> {
  const rows = await sql<Array<Omit<Row, "story" | "shop_key"> & { placements: Placed[]; speaker: Speaker }>>`
    SELECT c.article_id AS id, c.situations, c.placements, c.speaker, c.updated_at, p.published_at, p.timeline_at, p.title,
           p.summary, p.reason, p.score, s.id AS source_id, s.name AS source_name, s.icon_url AS source_icon
    FROM reference_placements c
    JOIN publications p ON p.article_id = c.article_id
    JOIN sources s ON s.id = p.source_id
    WHERE cardinality(c.situations) > 0 AND ${selectedCondition(now)} AND ${where}
      AND NOT EXISTS (SELECT 1 FROM reference_cases k WHERE k.article_id = c.article_id AND k.status = 'story')
    ORDER BY p.timeline_at DESC, c.article_id`;
  return rows.map(({ placements, speaker, ...r }) => ({
    ...r, shop_key: null,
    story: {
      shop: { country: sourceCountry(r.source_name) ?? "", speaker },
      placements: placements.map((pl) => ({ situation: pl.situation, group: pl.group })),
    },
  }));
}

async function casesShown(where: ReturnType<typeof sql>, now: Date): Promise<Row[]> {
  return sql<Row[]>`
    SELECT c.article_id AS id, c.story, c.situations, c.shop_key, c.updated_at, p.published_at, p.timeline_at, p.title,
           p.summary, p.reason, p.score, s.id AS source_id, s.name AS source_name, s.icon_url AS source_icon
    FROM reference_cases c
    JOIN publications p ON p.article_id = c.article_id
    JOIN sources s ON s.id = p.source_id
    WHERE c.status = 'story' AND ${selectedCondition(now)} AND ${where}
    ORDER BY p.timeline_at DESC, c.article_id`;
}

/**
 * A situation is in the lists (home, sitemap, 看全部 N 种情况) once this many shops tell it, counted as every count is
 * (tellerOf; an adviser, a vendor or a publication is no shop): a thinner one reads as a page of one or two shops (HANDOFF §9.2,
 * 只展示够厚的情况). Its page opens before that.
 */
export const LISTED = { fromShops: 5 };

const isListed = (rows: Row[] | undefined) => countOf(rows ?? []).shops >= LISTED.fromShops;

/** "意大利酒馆店主" of "料理画家クチーナカメヤマ（日本 · 意大利酒馆店主）": what the source is, after its country. */
export function sourceKind(name: string): string | null {
  const inner = /（([^（）]*)）\s*$/.exec(name)?.[1];
  return inner?.includes("·") ? inner.split("·").at(-1)!.trim() || null : null;
}

/** "日本" of the same: where the source is, for an item's line. */
export function sourceCountry(name: string): string | null {
  const inner = /（([^（）]*)）\s*$/.exec(name)?.[1];
  return inner?.includes("·") ? inner.split("·")[0]!.trim() || null : null;
}

/** Where an item's line says it comes from: its source's country, else the country its story named. */
const countryOf = (r: Row) => sourceCountry(r.source_name) ?? r.story.shop.country;

/**
 * Who an item counts as (layout A7-3): an owner's own source is that one shop, whatever the story calls it; else a
 * named shop by its key; else, by who tells it, an owner or staff member once a source, and an adviser, a vendor or
 * a publication once a source as an insider, not a shop (a publication's piece without a named shop is its own
 * advice as often as an unnamed shop's story, and one magazine read as twenty shops while each counted as one).
 */
export function tellerOf(r: { shop_key: string | null; source_id: string; story: Pick<CaseStory, "shop"> }): { key: string; insider: boolean } {
  if (OWNERS[r.source_id]) return { key: `source:${r.source_id}`, insider: false };
  if (r.shop_key) return { key: `shop:${r.shop_key}`, insider: false };
  const speaker = r.story.shop.speaker;
  if (speaker === "adviser" || speaker === "vendor" || speaker === "media") return { key: `insider:${r.source_id}`, insider: true };
  return { key: `source:${r.source_id}`, insider: false };
}

function countOf(rows: Row[]): Count {
  const shops = new Set<string>();
  const insiders = new Set<string>();
  for (const r of rows) {
    const t = tellerOf(r);
    (t.insider ? insiders : shops).add(t.key);
  }
  return { shops: shops.size, insiders: insiders.size, cases: rows.length };
}

/** The item, as 收藏 keeps it. */
const starItem = (r: Row): StarItem => ({
  id: r.id, title: r.title, summary: r.summary, source: { name: publicSourceName(r.source_name) }, publishedAt: r.published_at?.toISOString() ?? null,
  score: r.score === null ? null : Number(r.score), selected: true,
});

function card(r: Row): CaseCard {
  return {
    id: r.id, title: r.title, item: starItem(r), reason: r.reason,
    src: [countryOf(r), sourceKind(r.source_name) ?? publicSourceName(r.source_name), month(r.published_at ?? r.timeline_at)].join(" · "),
  };
}

/** The group an item sits in on this situation's page; null for none of its groups ("其他做法"). */
function groupOf(r: Row, situation: Situation): string | null {
  const group = r.story.placements.find((p) => p.situation === situation.slug)?.group ?? null;
  return situation.groups.some((g) => g.key === group) ? group : null;
}

/**
 * Who tells a situation, as the hot list's faces (publication/hot.ts): its sources by how many of its items each
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

/** A situation in a list: its count and who tells it. */
function situationRow(situation: Situation, rows: Row[]): SituationRow {
  const faces = facesOf(rows);
  return {
    slug: situation.slug, category: categoryTitle(situation.category)!, title: situation.title, dek: situation.dek,
    count: countOf(rows), faces, sources: faces.length,
  };
}

/** Items by the situation they are placed in (an item has one). */
function bySituation(rows: Row[]): Map<string, Row[]> {
  const out = new Map<string, Row[]>();
  for (const r of rows) for (const slug of r.situations) out.set(slug, [...(out.get(slug) ?? []), r]);
  return out;
}

const latest = (dates: Array<Date | undefined>) => dates.reduce<Date | null>((at, d) => (d && (!at || d > at) ? d : at), null)?.toISOString() ?? null;

/** How many situations 店家谈得最多的事 lists on the home page (layout J3-3, after AIHOT's 热点榜). */
const RANKED = 10;

/**
 * The most shops first (counted as every count is, tellerOf), then the most items, then the library's order: how
 * many shops told it, not how many owners meet it (HANDOFF §3 rule 1).
 */
const byShops = (a: SituationRow, b: SituationRow) => b.count.shops - a.count.shops || b.count.cases - a.count.cases;

/** 店家谈得最多的事: the situations the most shops told. */
export const rankSituations = (rows: SituationRow[]): SituationRow[] => [...rows].sort(byShops).slice(0, RANKED);

export async function readHome(now = new Date()): Promise<ReferenceHome> {
  const rows = await shownRows(sql`true`, now);
  const placed = bySituation(rows);
  const shown = SITUATIONS.filter((s) => isListed(placed.get(s.slug)));
  const listed = new Map(shown.map((s) => [s.slug, situationRow(s, placed.get(s.slug)!)]));
  return {
    categories: CATEGORIES.map((c) => ({
      key: c.key, title: c.title, situations: shown.filter((s) => s.category === c.key).map((s) => listed.get(s.slug)!).sort(byShops),
    })).filter((c) => c.situations.length),
    ranking: rankSituations([...listed.values()]),
    totals: { situations: shown.length, cases: rows.length },
    updatedAt: latest(rows.map((r) => r.updated_at)),
  };
}

/**
 * One situation's page: its items by cause, under the titles this module writes (situations.ts), newest first; then
 * those in no cause. 5 situations checked 10-24 had about a row in four of their practices under one it does not tell
 * (myfnb 情况页做法组核对-5页-2026-10-24.md), so the practices are not shown.
 */
export async function readSituation(slug: string, now = new Date()): Promise<SituationPage | null> {
  const situation = findSituation(slug);
  if (!situation) return null;
  const rows = await shownRows(sql`${slug} = ANY (c.situations)`, now);
  const cards = (key: string | null) => rows.filter((r) => groupOf(r, situation) === key).map(card);
  const causes = situation.groups.filter((g) => cards(g.key).length);
  return {
    slug, category: { key: situation.category, title: categoryTitle(situation.category)! }, title: situation.title, dek: situation.dek,
    count: countOf(rows),
    causes: causes.map((g) => ({ key: g.key, title: g.title, line: g.line })),
    groups: causes.map((g) => ({ key: g.key, title: g.title, line: g.line, cases: cards(g.key) })),
    rest: cards(null),
    updatedAt: latest(rows.map((r) => r.updated_at)),
  };
}

/** What an item's page shows under its three parts (web/item-part.tsx): the way to the situation it is placed in. */
export async function readItemText(id: string, now = new Date()): Promise<ItemText | null> {
  const [r] = await shownRows(sql`c.article_id = ${id}`, now);
  const situation = r?.story.placements[0] ? findSituation(r.story.placements[0].situation) : undefined;
  if (!r || !situation) return null;
  const rows = await shownRows(sql`${situation.slug} = ANY (c.situations)`, now);
  return { id, situation: { slug: situation.slug, title: situation.title, count: countOf(rows) } };
}

/** The library's pages for the sitemap: the situations the lists show. */
export async function sitemapEntries(now = new Date()): Promise<SitemapEntry[]> {
  const placed = bySituation(await shownRows(sql`true`, now));
  const newest = (list: Row[]) => list.reduce((at, r) => (r.updated_at > at ? r.updated_at : at), list[0]!.updated_at);
  return SITUATIONS.flatMap((s) => {
    const list = placed.get(s.slug) ?? [];
    return isListed(list) ? [{ loc: `/reference/${s.slug}`, lastmod: newest(list), changefreq: "daily", priority: 0.8 }] : [];
  });
}
