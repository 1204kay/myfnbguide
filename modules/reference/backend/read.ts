// What the reference pages read: cases that may be shown, of items that are selected and public now
// (publication/scope.ts), so a withdrawn or corrected item leaves the pages with the rest of the site.
// The country is the shop's, from the case; the source's own country is its first source tag.
import { beijingDate } from "@aihot/contracts/time";
import { sql } from "@aihot/backend/db";
import { publicSourceName } from "@aihot/backend/publication/rules";
import { selectedCondition } from "@aihot/backend/publication/scope";
import { categoryTitle, CATEGORIES, findSituation, SITUATIONS } from "../situations.ts";
import type { CaseCard, CasePage, CaseStory, ReferenceHome, ShopPage, SituationPage } from "../types.ts";
import { problemKind } from "./checks.ts";

/** Source tags that say what a source is, not where it is. */
const KINDS = new Set(["媒体", "协会", "平台", "播客", "服务商"]);
/** The language of an original, by its source's country. */
const LANGUAGE: Record<string, string> = {
  中国: "中文", 中国台湾: "中文", 中国香港: "中文", 日本: "日文", 韩国: "韩文", 巴西: "葡萄牙文", 葡萄牙: "葡萄牙文",
  意大利: "意大利文", 西班牙: "西班牙文", 阿根廷: "西班牙文", 墨西哥: "西班牙文", 法国: "法文", 德国: "德文", 奥地利: "德文",
  美国: "英文", 英国: "英文", 加拿大: "英文", 澳大利亚: "英文", 新西兰: "英文", 爱尔兰: "英文", 印度: "英文",
};

interface Row {
  id: string;
  story: CaseStory;
  shop_key: string | null;
  updated_at: Date;
  url: string;
  published_at: Date | null;
  timeline_at: Date;
  source_name: string;
  source_tags: string[];
}

async function shownCases(where: ReturnType<typeof sql>, now: Date): Promise<Row[]> {
  return sql<Row[]>`
    SELECT c.article_id AS id, c.story, c.shop_key, c.updated_at, p.url, p.published_at, p.timeline_at, s.name AS source_name, s.tags AS source_tags
    FROM reference_cases c
    JOIN publications p ON p.article_id = c.article_id
    JOIN sources s ON s.id = p.source_id
    WHERE c.status = 'story' AND ${selectedCondition(now)} AND ${where}
    ORDER BY p.timeline_at DESC`;
}

const sourceCountry = (r: Row) => r.source_tags.find((t) => !KINDS.has(t)) ?? null;
/** "2026 年 10 月", in Beijing time like every date on the site. */
function month(at: Date): string {
  const [year, m] = beijingDate(at).split("-");
  return `${year} 年 ${Number(m)} 月`;
}

function card(r: Row, line: string): CaseCard {
  return { id: r.id, title: r.story.title, line, src: [r.story.shop.country, publicSourceName(r.source_name), month(r.published_at ?? r.timeline_at)].join(" · ") };
}

export async function readHome(now = new Date()): Promise<ReferenceHome> {
  const rows = await shownCases(sql`true`, now);
  const bySituation = new Map<string, Row[]>();
  for (const r of rows) for (const slug of new Set(r.story.placements.map((p) => p.situation))) bySituation.set(slug, [...(bySituation.get(slug) ?? []), r]);
  const shops = new Map<string, Row[]>();
  for (const r of rows) if (r.shop_key) shops.set(r.shop_key, [...(shops.get(r.shop_key) ?? []), r]);
  const countries = (list: Row[]) => new Set(list.map((r) => r.story.shop.country)).size;
  // A situation shows once two cases are in it (HANDOFF §9.2): one alone is not a page yet.
  const shown = SITUATIONS.filter((s) => (bySituation.get(s.slug)?.length ?? 0) >= 2);
  return {
    categories: CATEGORIES.map((c) => ({
      key: c.key, title: c.title,
      situations: shown.filter((s) => s.category === c.key).map((s) => ({ slug: s.slug, title: s.title, dek: s.dek, cases: bySituation.get(s.slug)!.length, countries: countries(bySituation.get(s.slug)!) })),
    })),
    shops: [...shops.entries()].map(([key, list]) => {
      const shop = list[0]!.story.shop;
      return { key, name: shop.name!, line: list[0]!.story.title, src: [shop.country, shop.city, shop.kind ?? shop.size].filter(Boolean).join(" · "), cases: list.length };
    }),
    totals: { situations: shown.length, cases: rows.length, countries: countries(rows) },
  };
}

export async function readSituation(slug: string, now = new Date()): Promise<SituationPage | null> {
  const situation = findSituation(slug);
  if (!situation) return null;
  const rows = await shownCases(sql`${slug} = ANY (c.situations)`, now);
  const placed = rows.map((r) => ({ r, p: r.story.placements.find((p) => p.situation === slug)! }));
  const latest = rows.reduce<Date | null>((at, r) => (!at || r.updated_at > at ? r.updated_at : at), null);
  return {
    slug, category: { key: situation.category, title: categoryTitle(situation.category)! }, title: situation.title, dek: situation.dek,
    groups: situation.groups.map((g) => ({ ...g, cases: placed.filter(({ p }) => p.group === g.key).map(({ r, p }) => card(r, p.card)) })),
    others: placed.filter(({ p }) => !situation.groups.some((g) => g.key === p.group)).map(({ r, p }) => card(r, p.card)),
    metrics: { cases: rows.length, countries: new Set(rows.map((r) => r.story.shop.country)).size, updatedAt: latest?.toISOString() ?? null },
  };
}

export async function readCase(id: string, now = new Date()): Promise<CasePage | null> {
  const [r] = await shownCases(sql`c.article_id = ${id}`, now);
  if (!r) return null;
  const country = sourceCountry(r);
  return {
    id: r.id, story: r.story, shopKey: r.shop_key,
    source: { name: publicSourceName(r.source_name), country, url: r.url, language: (country && LANGUAGE[country]) ?? null, publishedAt: (r.published_at ?? r.timeline_at).toISOString(), audioOnly: r.source_tags.includes("播客") },
    situations: r.story.placements.flatMap((p) => {
      const s = findSituation(p.situation);
      return s ? [{ slug: s.slug, title: s.title, group: s.groups.find((g) => g.key === p.group)?.title ?? null }] : [];
    }),
  };
}

export async function readShop(key: string, now = new Date()): Promise<ShopPage | null> {
  const rows = await shownCases(sql`c.shop_key = ${key}`, now);
  if (!rows.length) return null;
  return { key, shop: rows[0]!.story.shop, cases: rows.map((r) => card(r, r.story.lead)) };
}

/**
 * How far the writing is, in numbers only (like /api/site/stats): the selected items' cases by status, and
 * how many held cases each kind of problem stopped (a case counts once for each kind it has).
 */
export async function readStatus(now = new Date()): Promise<{ counts: Record<string, number>; held: Record<string, number> }> {
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
  return { counts, held };
}
