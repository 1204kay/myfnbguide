// The shell as the site configures it (site/site.ts NAV, SEARCH, LAYOUT, FEED), rendered by the production server
// over a stub api. Failure cases: / still shows the featured list when a module page is the home page, or the
// list is lost; a site whose list starts at 全部 still serves the featured list, or keeps 精选 | 全部; the sidebar
// keeps the engine's titled sections, misses an entry, names one other than the site does, or lights the wrong one
// (全部 beside 精选, a search, the report kinds); the phone tab bar lights a tab for a search; the error page sends
// readers to 全部动态 the site no longer lists; 我的 ignores the site's groups or splits into columns; the shell's
// search cannot be opened from the sidebar or "/" on desktops, or from the tab pages' bar on phones; touch screens
// get mouse-sized targets; the changelog dot shows on a site that turned it off.
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
import { FEED, NAV, SEARCH } from "@aihot/site";

/** Where the list's way in leads: the featured list, or 全部 where the site's list starts there (FEED.start). */
const LIST = FEED.start === "all" ? "/all" : feedPath();

const at = "2026-10-04T08:00:00.000Z";
const item: FeedItemSummary = { id: "shell-fixture", title: "外壳检查条目", summary: "固定摘要", reason: "固定理由", source: { name: "Fixture" }, publishedAt: at, timelineAt: at, category: "tip", tags: [], score: 80, selected: true, channel: "news", x: null };
const hits: string[] = [];
let web: ChildProcess;
let origin: string;
let logs = "";
let chrome: Browser;

const api = createServer((req, res) => {
  const url = new URL(req.url!, "http://local");
  const p = url.pathname;
  res.setHeader("Content-Type", "application/json");
  if (p === "/api/health") return res.end("{}");
  if (p === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: "2026-10-01T08:00" }));
  if (p === "/api/site/track") { res.statusCode = 204; return res.end(); }
  hits.push(req.url!);
  if (p === "/api/reference") return res.end(JSON.stringify({ categories: [], ranking: [], kinds: [], totals: { situations: 0, cases: 0, countries: 0 } }));
  if (p === "/api/site/timeline") return res.end(JSON.stringify({ filters: { channel: "all", category: null, tag: null }, cards: [{ key: item.id, anchorAt: at, item, group: null }], nextCursor: null, hot: null, dayCounts: { "2026-10-04": 1 } }));
  if (p === "/api/site/pool") return res.end(JSON.stringify({ filters: { channel: "all", category: null, tag: url.searchParams.get("tag"), q: url.searchParams.get("q"), tab: "time" }, items: [item], page: 1, pageCount: 1, total: 1, todayCount: 1, freshness: at }));
  if (p === "/api/site/search/suggestions") return res.end(JSON.stringify({ topics: [], hot: [] }));
  if (p === "/api/site/reports/daily") return res.end(JSON.stringify({ items: [] }));
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
  const res = await fetch(origin + path, { redirect: "manual" });
  return { status: res.status, location: res.headers.get("location"), $: cheerio.load(await res.text()) };
}

/** The sidebar's entries as [address, lit] in order, a group per array. */
function sidebarOf($: cheerio.CheerioAPI) {
  return $('nav[aria-label="主导航"] > div').toArray().map((group) => $(group).find("a").toArray().map((a) => [$(a).attr("href"), $(a).attr("aria-current") === "page"] as const));
}

const lit = ($: cheerio.CheerioAPI) => sidebarOf($).flat().filter(([, on]) => on).map(([to]) => to);
/** The phone tab bar's lit tab, by address, as the server renders it (the tab the page declares). */
const tabLit = ($: cheerio.CheerioAPI) => $('nav[aria-label="底部导航"] a[aria-current="page"]').toArray().map((a) => $(a).attr("href"));

test("the home page is the site's module page, and the list lives at its own address", { skip: !NAV.home && "the featured list is the home page" }, async () => {
  const start = hits.length;
  const home = await page("/");
  assert.equal(home.status, 200);
  assert.ok(hits.slice(start).includes("/api/reference"), "/ renders the module page");
  assert.deepEqual(lit(home.$), ["/"]);
  const list = await page(LIST);
  assert.equal(list.status, 200);
  assert.ok(list.$("body").text().includes(item.title), "the list renders at its address");
  assert.deepEqual(lit(list.$), [LIST]);
  const old = await page("/reference");
  assert.deepEqual([old.status, old.location], [301, "/"]);
});

test("a site whose list starts at 全部 sends the featured list's address there with its filter, and keeps no 精选 | 全部", { skip: FEED.start !== "all" && "the list starts at 精选" }, async () => {
  const old = await page(`${feedPath()}?category=tip`);
  assert.deepEqual([old.status, old.location], [301, "/all?category=tip"]);
  const { status, $ } = await page("/all");
  assert.equal(status, 200);
  assert.equal($('nav[aria-label="看精选或全部"]').length, 0, "no 精选 | 全部");
  assert.equal($("main h1").text(), NAV.labels["/all"] ?? "全部动态");
  assert.equal($(`nav[aria-label="主导航"] a[href="${feedPath()}"]`).length, 0, "the featured list is no way in");
});

test("the sidebar and the tab bar show the site's names; the sidebar its groups untitled, its foot links, and the appearance in words", { skip: !NAV.sidebar && "the engine's sections" }, async () => {
  const { $ } = await page(LIST);
  const groups = sidebarOf($).map((g) => g.map(([to]) => to));
  assert.deepEqual(groups, NAV.sidebar!.map((g) => g.filter((to) => !NAV.hidden.includes(to))).filter((g) => g.length));
  const aside = $("aside").first();
  for (const title of ["内容", "更多"]) assert.ok(!aside.text().includes(title), `no section title ${title}`);
  for (const [to, label] of Object.entries(NAV.labels)) {
    const link = $(`nav[aria-label="主导航"] a[href="${to}"]`);
    if (link.length) assert.equal(link.text().trim(), label, to);
    const tab = $(`nav[aria-label="底部导航"] a[href="${to}"]`);
    if (tab.length) assert.equal(tab.text().trim(), label, `tab ${to}`);
  }
  assert.equal($(`nav[aria-label="主导航"] a[href="${LIST}"]`).length, 1, "the list is a way in");
  assert.equal($(`nav[aria-label="底部导航"] a[href="${LIST}"]`).length, 1, "the list is a tab");
  assert.deepEqual($('nav[aria-label="站点说明"] a').toArray().map((a) => $(a).attr("href")), NAV.sidebarFoot);
  if (NAV.themeText) assert.deepEqual(aside.find('[role="radiogroup"] [role="radio"]').toArray().map((b) => $(b).text()), ["浅色", "深色", "跟随系统"]);
  if (NAV.search === "shell") assert.equal(aside.find('button[aria-keyshortcuts="/"]').text().replace("/", "").trim(), "搜索");
});

test("the sidebar lights 日报 below the reports, the list on 全部 and its tags, and nothing for a search; the tab bar lights no tab for a search either", { skip: !NAV.sidebar && "the engine's sections" }, async () => {
  assert.deepEqual(lit((await page("/daily/archive")).$), ["/daily"]);
  if (NAV.hidden.includes("/all")) assert.deepEqual(lit((await page("/all?tag=fixture")).$), [feedPath()]);
  if (FEED.start === "all") {
    for (const path of ["/all", "/all?tag=fixture"]) {
      const { $ } = await page(path);
      assert.deepEqual([lit($), tabLit($)], [["/all"], ["/all"]], path);
    }
  }
  if (NAV.search === "shell") {
    for (const path of ["/all?q=fixture", "/all?q=fixture&tag=fixture"]) {
      const { $ } = await page(path);
      assert.deepEqual([lit($), tabLit($)], [[], []], path);
    }
  }
  assert.deepEqual(lit((await page("/no-such-page")).$), []);
});

test("a missing page leads to the home page and, beside a module home page, to the featured list", async () => {
  const { status, $ } = await page("/no-such-page");
  assert.equal(status, 404);
  const buttons = $("h1").filter((_, h) => $(h).text() === "这里没有内容").parent().find("a").toArray().map((a) => $(a).attr("href"));
  assert.deepEqual(buttons, NAV.home ? ["/", LIST] : ["/", "/all"]);
});

test("我的 lists the site's groups in one column, with the tab pages' bar", { skip: !NAV.meGroups && "the engine's groups" }, async () => {
  const { $ } = await page("/more");
  const main = $("main");
  const titles = main.find("section > h2").toArray().map((h) => $(h).text());
  assert.deepEqual(titles, NAV.meGroups!.flatMap((g) => (g.title ? [g.title] : [])));
  const rows = main.find("section li a").toArray().map((a) => $(a).attr("href"));
  assert.deepEqual(rows, NAV.meGroups!.flatMap((g) => g.rows).filter((to) => to !== "theme" && !NAV.hidden.includes(to)));
  assert.equal(main.find('a[href="/feed.xml"]').length, 0, "no RSS line");
  if (NAV.search === "shell") {
    const bar = $("header[data-phone-bar]").first();
    assert.equal(bar.find('a[href="/"]').length, 1, "the brand leads home");
    assert.equal(bar.find('button[aria-label="搜索"]').length, 1);
  }
  const context = await chrome.newContext({ viewport: { width: 1440, height: 900 } });
  const tab = await context.newPage();
  try {
    await tab.goto(origin + "/more");
    const boxes = await tab.locator("main section").evaluateAll((sections) => sections.map((s) => s.getBoundingClientRect()).map((r) => [r.left, r.top, r.width]));
    assert.ok(boxes.every(([left, , width]) => left === boxes[0]![0] && width === boxes[0]![2]), `one column: ${JSON.stringify(boxes)}`);
    assert.ok(boxes.every(([, top], i) => i === 0 || top > boxes[i - 1]![1]));
  } finally {
    await context.close();
  }
});

test("the shell's search opens from the sidebar or / as a dialog, and from the tab pages' bar on phones", { skip: NAV.search !== "shell" && "search lives on the list pages" }, async () => {
  const desk = await chrome.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    const tab = await desk.newPage();
    await tab.goto(origin + "/");
    const start = hits.length;
    await tab.locator("main").click({ position: { x: 5, y: 5 } });
    await tab.keyboard.press("/");
    const dialog = tab.getByRole("dialog", { name: "搜索" });
    const field = dialog.getByPlaceholder(SEARCH.placeholder);
    await expect(field).toBeFocused();
    if (SEARCH.note) await expect(dialog.getByText(SEARCH.note)).toBeVisible();
    const panel = await field.evaluate((input) => input.closest("form")!.parentElement!.getBoundingClientRect().width);
    assert.equal(panel, 560);
    await tab.keyboard.press("Escape");
    await expect(field).not.toBeFocused();
    await tab.locator("aside").getByRole("button", { name: /搜索/ }).click();
    await expect(field).toBeFocused();
    const suggests = !NAV.hidden.includes("/hot") || !NAV.hidden.includes("/topics");
    assert.equal(hits.slice(start).filter((h) => h === "/api/site/search/suggestions").length, suggests ? 1 : 0, "suggestions only for pages in the navigation");
  } finally {
    await desk.close();
  }
  const phone = await chrome.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  try {
    const tab = await phone.newPage();
    await tab.goto(origin + "/more");
    await tab.locator("header[data-phone-bar]").getByRole("button", { name: "搜索" }).click();
    const field = tab.getByRole("dialog", { name: "搜索" }).getByPlaceholder(SEARCH.placeholder);
    await expect(field).toBeFocused();
    assert.equal(await tab.getByRole("dialog", { name: "搜索" }).evaluate((d) => d.getBoundingClientRect().width), 390);
  } finally {
    await phone.close();
  }
});

test("touch screens get 44px targets in the sidebar, the appearance switch and switches; the changelog dot follows the site", async () => {
  for (const touch of [true, false]) {
    const context = await chrome.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: touch, isMobile: touch });
    try {
      const tab = await context.newPage();
      await tab.goto(origin + LIST);
      assert.equal(await tab.evaluate(() => matchMedia("(hover: none)").matches), touch);
      // Shown at this width only: the phones' bar is in the page but not displayed.
      const heights = async (selector: string) => tab.locator(selector).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height).filter((h) => h > 0));
      const sides = await heights('nav[aria-label="主导航"] a');
      const themes = await heights('aside [role="radio"]');
      const tabs = await heights("main [data-pill-track] a, main [data-pill-track] button");
      for (const [name, list] of Object.entries({ sides, themes, tabs })) {
        assert.ok(list.length > 0, name);
        if (touch) assert.ok(list.every((h) => h >= 44), `${name}: ${list}`);
        else assert.ok(list.some((h) => h < 44), `${name} keep mouse sizes: ${list}`);
      }
      if (touch) {
        assert.ok((await heights('nav[aria-label="站点说明"] a')).every((h) => h >= 44));
        const widths = await tab.locator('aside [role="radio"]').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width));
        assert.ok(widths.every((w) => w >= 44), `appearance widths: ${widths}`);
      }
      const track = await tab.locator('aside [role="radiogroup"]').evaluate((g) => [g.scrollWidth, g.clientWidth]);
      assert.ok(track[0]! <= track[1]!, `the appearance fits its track: ${track}`);
      await tab.waitForLoadState("networkidle");
      if (!NAV.changelogDot) assert.equal(await tab.locator('[aria-label="有新的更新"]').count(), 0, "a changelog newer than this reader's last visit lights nothing");
    } finally {
      await context.close();
    }
  }
});
