// 精选, 全部, search, tags and 收藏 as the site configures them (site/site.ts NAV.search, FEED, LAYOUT, SEARCH,
// STARRED, DATES), rendered by the production server over a stub api. Failure cases: the featured list is still
// cut into days, or marks every card 精选; 全部 and the results mark 精选 on desktops only, or show the time of day;
// phones and desktops name the list differently, or the switch to 全部 is missing on one of them; the filter keeps
// the pack's short labels or calls its first option 全部 beside the switch; a list keeps its own search field beside
// the shell's; a search shows when it was updated or the old sort names; a tag page titles itself "#…"; touch
// screens get mouse-sized switches, filters or bookmarks; the lists are wider than the reader's column or start at
// different left edges; 收藏 keeps its notice box, misses its 备份 section or its way back to the lists.
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { chromium, expect, type Browser } from "@playwright/test";
import type { FeedItemSummary } from "@aihot/contracts/site";
import { feedPath } from "@aihot/contracts/routes";
import { CATEGORIES } from "@aihot/industry/taxonomy";
import { DATES, FEED, ITEM_COPY, LAYOUT, NAV, SEARCH, SITE, STARRED } from "@aihot/site";
import { monthDay, weekdayShort } from "../app/lib/format.ts";

const SHELL = NAV.search === "shell";
const CARDS = FEED.style === "cards";
const NAME = NAV.labels[feedPath()] ?? "精选";
const at = "2026-10-04T08:00:00.000Z";
const DAY = monthDay("2026-10-04");
const base: FeedItemSummary = { id: "feed-selected", title: "入选的条目", summary: "固定摘要", reason: "固定理由", source: { name: "Fixture" }, publishedAt: at, timelineAt: at, category: "tip", tags: [], score: 80, selected: true, channel: "news", x: null };
const others: FeedItemSummary = { ...base, id: "feed-other", title: "没入选的条目", reason: null, selected: false };
let web: ChildProcess;
let origin: string;
let logs = "";
let chrome: Browser;

const api = createServer((req, res) => {
  const url = new URL(req.url!, "http://local");
  const p = url.pathname;
  res.setHeader("Content-Type", "application/json");
  if (p === "/api/health") return res.end("{}");
  if (p === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: null }));
  if (p === "/api/site/track") { res.statusCode = 204; return res.end(); }
  if (p === "/api/site/timeline") return res.end(JSON.stringify({ filters: { channel: "all", category: url.searchParams.get("category"), tag: url.searchParams.get("tag") }, cards: [base, { ...base, id: "feed-selected-2", title: "另一条入选的条目" }].map((item) => ({ key: item.id, anchorAt: at, item, group: null })), nextCursor: null, hot: null, dayCounts: { "2026-10-04": 2 } }));
  if (p === "/api/site/pool") {
    const filters = { channel: "all", category: url.searchParams.get("category"), tag: url.searchParams.get("tag"), q: url.searchParams.get("q"), tab: url.searchParams.get("tab") === "relevance" ? "relevance" : "time" };
    return res.end(JSON.stringify({ filters, items: [base, others], page: 1, pageCount: 1, total: 2, todayCount: 2, freshness: at }));
  }
  if (p === "/api/site/items/availability") return res.end(JSON.stringify({}));
  if (p === "/api/site/search/suggestions") return res.end(JSON.stringify({ topics: [], hot: [] }));
  res.statusCode = 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => {
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = (probe.address() as AddressInfo).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  origin = `http://127.0.0.1:${port}`;
  web = spawn(process.execPath, [fileURLToPath(new URL("../server.ts", import.meta.url))], {
    env: { ...process.env, WEB_PORT: String(port), SITE_URL: origin, API_BASE_URL: `http://127.0.0.1:${(api.address() as AddressInfo).port}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(logs)), 15000);
    web.once("exit", () => {
      clearTimeout(timer);
      reject(new Error(logs));
    });
    web.stderr!.on("data", (x) => (logs += String(x)));
    web.stdout!.on("data", (x) => {
      logs += String(x);
      if (logs.includes('"msg":"web started"')) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
  chrome = await chromium.launch({ channel: "chromium" });
});

after(async () => {
  await chrome?.close();
  if (web?.exitCode === null) {
    web.kill("SIGTERM");
    await once(web, "exit");
  }
  api.closeAllConnections();
  await new Promise<void>((resolve) => api.close(() => resolve()));
});

async function page(path: string) {
  const res = await fetch(origin + path);
  assert.equal(res.status, 200, path);
  return cheerio.load(await res.text());
}

test("精选 lies flat with each card's date; 全部, a search and a tag group by day and mark 精选, on phones as on desktops", { skip: !CARDS && "the timeline" }, async () => {
  const latest = await page(feedPath());
  const cards = latest("main article");
  assert.equal(cards.length, 2);
  assert.ok(cards.toArray().every((a) => latest(a).find("header time").text().includes(DAY)), "each featured card carries its date");
  assert.ok(!cards.text().includes("精选"), "no 精选 mark in the featured list");
  for (const path of ["/all", "/all?q=fixture", "/all?tag=fixture"]) {
    const $ = await page(path);
    assert.ok($("main time").toArray().some((t) => $(t).text() === `${DAY} ${weekdayShort("2026-10-04")}`), `${path}: a day heading`);
    assert.ok($('main article[data-item-id="feed-selected"]').text().includes("精选"), `${path}: the selected item is marked`);
    assert.ok(!$('main article[data-item-id="feed-other"]').text().includes("精选"), `${path}: the other is not`);
    assert.ok($('main article[data-item-id="feed-selected"] p').toArray().some((p) => $(p).hasClass("line-clamp-2") && $(p).text().includes(ITEM_COPY.reasonLabel)), `${path}: the reason in two lines`);
    if (!DATES.clock) assert.ok(!$("main").text().includes("16:00"), `${path}: no time of day`);
  }
  const context = await chrome.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  try {
    const tab = await context.newPage();
    await tab.goto(origin + "/all");
    await expect(tab.locator('article[data-item-id="feed-selected"]').getByText("精选", { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("the two lists share one head on phones and desktops: the name with 精选 | 全部, the lead, the section filter from 不限; the shell carries search", { skip: !SHELL && "search lives on the list pages" }, async () => {
  const names = CATEGORIES.map((c) => (FEED.filterNames === "section" ? c.section : c.label));
  for (const [path, scope] of [[feedPath(), "featured"], ["/all", "all"]] as const) {
    const $ = await page(path);
    assert.deepEqual($("main h1").toArray().map((h) => $(h).text()), [NAME], path);
    const scopes = $('main nav[aria-label="看精选或全部"] a').toArray().map((a) => [$(a).text(), $(a).attr("href")]);
    assert.deepEqual(scopes, [["精选", feedPath()], ["全部", "/all"]], path);
    assert.equal($('main nav[aria-label="看精选或全部"]').length, 1, `${path}: one switch for phones and desktops`);
    if (FEED.leads) assert.ok($("main").text().includes(FEED.leads[scope]), `${path}: its lead`);
    assert.deepEqual($('main nav[aria-label="筛选"] a').toArray().map((a) => $(a).text()), ["不限", ...names], path);
    assert.equal($("main input[name=q]").length, 0, `${path}: no search field of its own`);
    const bar = $("header[data-phone-bar]").first();
    assert.equal(bar.find('a[href="/"]').length, 1, `${path}: the brand leads home`);
    assert.equal(bar.find('button[aria-label="搜索"]').length, 1, `${path}: search in the bar`);
  }
  const filtered = await page(`${feedPath()}?category=tip`);
  assert.equal(filtered('link[rel="canonical"]').attr("href"), `${origin}${feedPath()}?category=tip`);
  if (feedPath() !== "/") assert.equal(filtered("title").text(), `${NAME} · ${SITE.name}`);
  assert.equal(filtered('main nav[aria-label="筛选"] a[aria-current="page"]').text(), names[0]);
  assert.ok(filtered("main").text().includes(`只看${names[0]}`), "the filter in use as a chip on phones");
});

test("a search has its own heading, the items under their title with the count, the two sorts and their note", { skip: !SHELL && "search lives on the list pages" }, async () => {
  const $ = await page(`/all?q=${encodeURIComponent("涨价")}`);
  assert.equal($("main h1").text(), "搜索“涨价”");
  assert.equal($("title").text(), `搜索“涨价” · ${SITE.name}`);
  if (SEARCH.itemsTitle) assert.equal($("main h2").filter((_, h) => $(h).text() === SEARCH.itemsTitle).length, 1);
  const text = $("main").text();
  assert.ok(text.includes("找到 2 条"));
  if (!DATES.clock) assert.ok(!text.includes("更新于"), "no update time");
  assert.deepEqual($('main nav[aria-label="搜索排序"] a').toArray().map((a) => $(a).text()), [SEARCH.sorts.time, SEARCH.sorts.relevance]);
  if (SEARCH.sortNote) assert.ok(text.includes(SEARCH.sortNote));
  assert.equal($('main nav[aria-label="看精选或全部"]').length, 0, "no 精选 | 全部 beside the sorts");
});

test("a tag page names the tag without #, says what it lists and how many, and the tag clears from a chip", { skip: (!SHELL || ITEM_COPY.tagHash) && "the engine's tag page" }, async () => {
  const $ = await page(`/all?tag=${encodeURIComponent("成本/利润")}`);
  assert.equal($("main h1").text(), "标签：成本/利润");
  assert.ok($("main").text().includes("全部条目里带这个标签的，按时间排列。共 2 条"));
  const chip = $('main a[aria-label="取消标签：成本/利润"]');
  assert.equal(chip.attr("href"), "/all");
  assert.ok(!chip.parent().hasClass("lg:hidden"), "the chip on desktops too");
});

test("touch screens get 44px switches, filters and bookmarks; the lists are one column wide with one left edge", { skip: !(SHELL && CARDS && LAYOUT.column) && "the engine's layout" }, async () => {
  for (const [width, height] of [[390, 844], [1024, 768]]) {
    const context = await chrome.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true });
    try {
      const tab = await context.newPage();
      await tab.goto(origin + feedPath());
      const heights = async (selector: string) => tab.locator(selector).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height).filter((h) => h > 0));
      const targets = {
        scopes: await heights('main nav[aria-label="看精选或全部"] a'),
        bookmarks: await heights('main article button[aria-label="收藏"]'),
        filter: width < 961 ? await heights('main button[aria-label^="筛选"]') : await heights('main nav[aria-label="筛选"] a'),
      };
      for (const [name, list] of Object.entries(targets)) {
        assert.ok(list.length > 0, `${width}: ${name}`);
        assert.ok(list.every((h) => h >= 44), `${width}: ${name} ${list}`);
      }
    } finally {
      await context.close();
    }
  }
  const context = await chrome.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    const tab = await context.newPage();
    const edges: Array<[string, number, number]> = [];
    for (const path of [feedPath(), "/all", "/all?q=fixture", "/starred"]) {
      await tab.goto(origin + path);
      const box = await tab.locator("main h1").first().evaluate((h) => h.parentElement!.closest("main > div > div")!.getBoundingClientRect());
      edges.push([path, box.left, box.width]);
    }
    assert.ok(edges.every(([, left, width]) => left === edges[0]![1] && width === LAYOUT.column), JSON.stringify(edges));
  } finally {
    await context.close();
  }
});

test("收藏: the note in one line, the cards with 精选, removal by the bookmark, a 备份 section; with nothing, both ways in", { skip: !STARRED.backup && "the engine's 收藏" }, async () => {
  const context = await chrome.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  try {
    const tab = await context.newPage();
    await tab.goto(origin + "/more");
    await tab.evaluate((starred) => localStorage.setItem("aihot-starred-items", JSON.stringify(starred)), [
      { id: "feed-selected", title: "入选的条目", summary: "固定摘要", sourceName: "Fixture", savedAt: at, publishedAt: at, score: 80, aiSelected: true },
      { id: "feed-other", title: "没入选的条目", summary: null, sourceName: "Fixture", savedAt: at, publishedAt: null, score: null, aiSelected: false },
    ]);
    await tab.goto(origin + "/starred");
    await expect(tab.getByRole("heading", { name: "收藏", level: 1 })).toBeVisible();
    await expect(tab.getByText(STARRED.note, { exact: true })).toBeVisible();
    assert.equal(await tab.title(), `收藏 · ${SITE.name}`);
    const cards = tab.locator("main li[data-card-key]");
    await expect(cards).toHaveCount(2);
    await expect(cards.first().getByText("精选", { exact: true })).toBeVisible();
    await expect(cards.first().getByText(`· ${DAY}`)).toBeVisible();
    await expect(cards.nth(1).getByText("精选", { exact: true })).toHaveCount(0);
    const backup = tab.locator("main section").filter({ has: tab.getByRole("heading", { name: "备份" }) });
    await expect(backup.getByRole("button", { name: "导出收藏" })).toBeVisible();
    await expect(backup.getByRole("button", { name: "从文件导入" })).toBeVisible();
    await expect(backup.getByText(STARRED.backup!, { exact: true })).toBeVisible();
    const bookmark = cards.first().getByRole("button", { name: "取消收藏" });
    assert.ok((await bookmark.evaluate((b) => b.getBoundingClientRect().height)) >= 44);
    await cards.nth(1).getByRole("button", { name: "取消收藏" }).click();
    await bookmark.click();
    await expect(tab.getByText(STARRED.empty, { exact: true })).toBeVisible();
    const ways = await tab.locator("main a").evaluateAll((links) => links.map((a) => [a.textContent, a.getAttribute("href")]));
    const expected = NAV.home ? [[`去${NAV.labels["/"] ?? "/"}`, "/"], [`去${NAME}`, feedPath()]] : [[`去看${NAME} →`, feedPath()]];
    for (const way of expected) assert.ok(ways.some(([text, href]) => text === way[0] && href === way[1]), `${way}: ${JSON.stringify(ways)}`);
  } finally {
    await context.close();
  }
});

test("a busy search leads back to the featured list at its address, under its name", async () => {
  const $ = await page("/all/search-busy?q=fixture");
  const links = $("main a").toArray().map((a) => [$(a).text(), $(a).attr("href")]);
  assert.ok(links.some(([text, href]) => text === `回到${NAME}` && href === feedPath()), JSON.stringify(links));
});
