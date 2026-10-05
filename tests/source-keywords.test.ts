// A general outlet's whole feed kept to the site's trade by keywords in the title or summary: Chinese
// words match inside words, Latin-script words match whole words, whatever the case. Sources without
// the key keep everything they kept before.
import assert from "node:assert/strict";
import { test } from "node:test";
import { unsupportedConfig } from "@aihot/backend/sources/config-keys";
import { admitListing } from "@aihot/backend/sources/filters";
import type { Candidate } from "@aihot/backend/sources/types";

const source = (config: Record<string, unknown>) => ({ id: "test-keywords", kind: "rss", config }) as never;
const entry = (title: string, extra: Partial<Candidate> = {}): Candidate => ({ url: `https://news.example/a/${encodeURIComponent(title)}`, title, ...extra });
const titles = (kept: Candidate[]) => kept.map((c) => c.title);

test("only entries naming a keyword in their title or summary are kept", () => {
  const kept = admitListing([
    entry("吉隆坡餐饮业者：店租再涨两成"),
    entry("国会三读通过预算案"),
    entry("本周要闻", { excerpt: "槟城一家茶餐厅改了营业时间" }),
    entry("本周要闻二", { bodyText: "正文里提到餐饮业者，标题和摘要都没有提到" }),
    entry("Hawker centres face higher rents"),
    entry("KFC中国开出新店"),
  ], source({ allowKeywords: ["餐饮", "餐厅", "hawker", "kfc"] }));
  assert.deepEqual(titles(kept), ["吉隆坡餐饮业者：店租再涨两成", "本周要闻", "Hawker centres face higher rents", "KFC中国开出新店"],
    "the body is not read, only the title and summary");
});

test("keywords match whatever the case; Latin-script keywords match whole words only", () => {
  const kept = admitListing([
    entry("RESTAURANT owners meet the minister"),
    entry("Restaurants close early this week"),
    entry("Team Malaysia wins gold"),
    entry("Bubbletea chains expand"),
    entry("Tea prices rise again"),
    entry("Outlets reopen", { excerpt: "Most f&b operators in the mall reopened on Monday." }),
  ], source({ allowKeywords: ["Restaurant", "tea", "F&B"] }));
  assert.deepEqual(titles(kept), ["RESTAURANT owners meet the minister", "Tea prices rise again", "Outlets reopen"],
    "a plural is another word (list it), and tea is in neither Team nor Bubbletea");
});

test("keywords apply together with the URL, category, noise and publication rules", () => {
  const at = new Date("2026-10-03T00:00:00Z");
  const kept = admitListing([
    entry("餐饮业者谈店租", { publishedAt: at, categories: ["本地"] }),
    entry("餐饮业者谈人手", { url: "https://other.example/a/1", publishedAt: at, categories: ["本地"] }),
    entry("专访：部长谈经济", { publishedAt: at, categories: ["本地"] }),
    entry("餐饮展销会（广告）", { publishedAt: at, categories: ["本地"] }),
    entry("餐饮业者谈食材", { publishedAt: new Date("2026-09-20T00:00:00Z"), categories: ["本地"] }),
    entry("餐饮业者谈外卖", { publishedAt: at, categories: ["国际"] }),
  ], source({
    allowUrlPrefixes: ["https://news.example/"],
    allowCategories: ["本地"],
    allowKeywords: ["餐饮"],
    ingestNoiseFilter: { dropMarkers: ["广告"], keepIfMatches: ["专访"] },
    publishedAfter: "2026-10-01T00:00:00Z",
  }), at.getTime());
  assert.deepEqual(titles(kept), ["餐饮业者谈店租"], "the noise exemption does not admit an entry outside the keywords");
});

test("a source without keywords keeps everything", () => {
  const all = [entry("国会三读通过预算案"), entry("Team Malaysia wins gold")];
  assert.deepEqual(titles(admitListing(all, source({}))), titles(all));
  assert.deepEqual(titles(admitListing(all, source({ allowKeywords: [] }))), titles(all));
});

test("listing sources take a list of keywords; other channels and malformed lists are refused", () => {
  for (const kind of ["rss", "web_list", "json_list"] as const) {
    assert.deepEqual(unsupportedConfig(kind, { allowKeywords: ["餐饮", "F&B"] }), []);
  }
  for (const kind of ["x_search", "mp_account", "external"] as const) {
    assert.deepEqual(unsupportedConfig(kind, { allowKeywords: ["餐饮"] }), ["allowKeywords"]);
  }
  for (const allowKeywords of ["餐饮", [""], ["餐饮", "  "], [1], null]) {
    assert.deepEqual(unsupportedConfig("rss", { allowKeywords }), ["allowKeywords"], JSON.stringify(allowKeywords));
  }
});
