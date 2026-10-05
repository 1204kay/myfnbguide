// The compact reports (site.ts REPORTS.compact), rendered by the production server over a stub api.
// Failure cases: the archive column, the issue calendar or the edition time and motto ("08:00 出刊",
// "每日要闻") come back; the kind switch leaves the page for the bar; one issue still gets a row of
// date chips, or a chip says "今天"; the paper does not fill the main area up to the list pages' width
// (LAYOUT.lists), or keeps one column of stories where it is wide enough for two; a story or a flash opens its item only
// from its headline, or its 原文 or row is a mouse-sized target on a touch screen; a flash an issue lists in
// its section (REPORTS.flashPlacement) lands in 快讯, before the entries in full or in another section; the
// page index leaves a section's flashes out of its count; a short issue (REPORTS.compactBelow) still lists
// its entries in the highlights and the index; an issue saved with a 快讯 loses it; a daily or weekly before
// its first issue does not say what it is or where to go instead, or the daily's says when it comes out;
// the only issue points to earlier ones; the archive keeps its 98px nameplate, its two-column rows or a
// second name for itself.
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { chromium, type Browser } from "@playwright/test";
import type { ReportCitation, ReportDetail, ReportKind, ReportNavigationEntry } from "@aihot/contracts/site";
import { addDays, beijingDate } from "@aihot/contracts/time";
import { FEED, LAYOUT, NAV, REPORTS } from "@aihot/site";
import { weekdayShort } from "../app/lib/format.ts";

// The newest daily is today's, so a chip that says "今天" would show.
const today = beijingDate(Date.now());
const days = [3, 2, 1, 0].map((n) => addDays(today, -n));
const month = today.slice(0, 7);
const citation = (n: number): ReportCitation => ({
  itemId: `report-item-${n}`, title: `第 ${n} 条日报条目`, summary: `第 ${n} 条的摘要，写这家店做了什么。`, sourceName: "Fixture", sourceUrl: `https://example.com/${n}`,
  sourceIconUrl: null, firstParty: false, publishedAt: `${today}T00:00:00Z`, available: true,
});
/** A flash its issue lists in its section (REPORTS.flashPlacement "sections"). */
const brief = (n: number): ReportCitation => ({ ...citation(n), brief: true });
function report(kind: ReportKind, key: string, issueNumber: number): ReportDetail {
  return {
    kind, key, issueNumber, title: "测试刊物", generatedAt: `${today}T00:00:00Z`, lead: null, leadItemId: null, overview: null, highlights: [],
    sections: [{ label: "店家经验", summary: null, items: [citation(1), citation(2), citation(3)] }],
    flashes: [], cover: null, metrics: { totalEvents: 3, sourcesCount: 2 }, readingMinutes: 2, prev: null, next: null,
  };
}
/**
 * A daily as the api sends it: the newest one has 14 entries, eight of them flashes in their sections; the
 * older ones were saved with five entries, two of them in 快讯 at the end.
 */
function daily(key: string, issueNumber: number): ReportDetail {
  if (key !== today) {
    return { ...report("daily", key, issueNumber), leadItemId: "report-item-1", highlights: [citation(2)], flashes: [citation(8), citation(9)], metrics: { totalEvents: 3, sourcesCount: 1 } };
  }
  return {
    ...report("daily", key, issueNumber), leadItemId: "report-item-1", highlights: [citation(2), citation(4), citation(6)],
    sections: [
      { label: "店家经验", summary: null, items: [citation(1), citation(2), citation(3), brief(7), brief(8), brief(9)] },
      { label: "工具与设备", summary: null, items: [citation(6)] },
      { label: "行业趋势", summary: null, items: [citation(4), citation(5), brief(10), brief(11)] },
      { label: "法规与平台", summary: null, items: [brief(12), brief(13), brief(14)] },
    ],
    metrics: { totalEvents: 14, sourcesCount: 1 },
  };
}
const issue = (kind: ReportKind, key: string, issueNumber: number) => (kind === "daily" ? daily(key, issueNumber) : report(kind, key, issueNumber));
/** While set, the api has no daily yet. */
let noDaily = false;
const index: Record<ReportKind, ReportNavigationEntry[]> = {
  daily: days.map((key, i) => ({ key, issueNumber: i + 1, title: `${key} 的头条` })).reverse(),
  weekly: [],
  monthly: [{ key: month, issueNumber: 1, title: "本月" }],
};

let web: ChildProcess;
let origin: string;
let logs = "";
let chrome: Browser;
const api = createServer((req, res) => {
  const path = new URL(req.url!, "http://api.local").pathname;
  res.setHeader("Content-Type", "application/json");
  if (path === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: "2026-10-01T08:00" }));
  if (path === "/api/site/track") { res.statusCode = 204; return res.end(); }
  if (path === "/api/site/reports/daily") return res.end(JSON.stringify({ kind: "daily", items: index.daily.map((e) => ({ ...e, count: 3 })) }));
  const match = /^\/api\/site\/reports\/(daily|weekly|monthly)\/(.+)$/.exec(path);
  if (match) {
    const kind = match[1] as ReportKind;
    const key = match[2]!;
    const issues = kind === "daily" && noDaily ? [] : index[kind];
    const latest = issues[0];
    if (key === "latest-page") return res.end(JSON.stringify({ index: issues, report: latest ? issue(kind, latest.key, latest.issueNumber) : null }));
    if (key.startsWith("navigation/")) return res.end(JSON.stringify({ items: issues }));
    const entry = issues.find((e) => e.key === key);
    if (entry) return res.end(JSON.stringify(issue(kind, key, entry.issueNumber)));
  }
  res.statusCode = 404;
  res.end(JSON.stringify({ code: "not_found" }));
});

before(async () => {
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  web = spawn(process.execPath, [fileURLToPath(new URL("../server.ts", import.meta.url))], {
    env: { ...process.env, WEB_PORT: "0", API_BASE_URL: `http://127.0.0.1:${(api.address() as AddressInfo).port}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`web did not start: ${logs}`)), 15_000);
    web.on("exit", () => { clearTimeout(timeout); reject(new Error(`web exited: ${logs}`)); });
    web.stderr!.on("data", (chunk) => { logs += String(chunk); });
    web.stdout!.on("data", (chunk) => {
      logs += String(chunk);
      const match = logs.match(/"msg":"web started","port":(\d+)/);
      if (match) { origin = `http://127.0.0.1:${match[1]}`; clearTimeout(timeout); resolve(); }
    });
  });
  chrome = await chromium.launch({ channel: "chromium" });
});

after(async () => {
  await chrome?.close();
  if (web && web.exitCode === null) { web.kill("SIGTERM"); await once(web, "exit"); }
  api.closeAllConnections();
  await new Promise<void>((resolve) => api.close(() => resolve()));
});

async function page(path: string) {
  const response = await fetch(origin + path);
  assert.equal(response.status, 200, logs);
  return cheerio.load(await response.text());
}

test("a compact daily has no archive column, calendar, motto or edition time; the switch and the dates stand above the paper", { skip: !REPORTS.compact && "the site keeps the full reports" }, async () => {
  const $ = await page("/daily");
  const main = $("main");
  assert.equal($('nav[aria-label="日报历史"]').length, 0, "no archive column");
  assert.equal(main.find("canvas").length, 0, "no issue calendar");
  for (const word of ["出刊", "要闻", "往期"]) assert.ok(!main.text().includes(word), `the page prints ${word}`);
  const masthead = main.find("header").filter((_, el) => $(el).find("#report-start").length > 0).first();
  assert.equal(masthead.children("p").first().text(), `${today.slice(0, 4)} 年 ${Number(today.slice(5, 7))} 月 ${Number(today.slice(8, 10))} 日 ${weekdayShort(today)} · 第 4 期`);
  const html = main.html()!;
  const switchAt = html.indexOf('aria-label="切换日报、周报、月报"');
  assert.ok(switchAt >= 0 && switchAt < html.indexOf('id="report-start"'), "the kind switch comes before the masthead");
  const chips = main.find('nav[aria-label="最近的日报"] a').toArray().map((a) => $(a).text());
  assert.equal(chips.length, 4, "three issues and 更早");
  assert.ok(!chips.includes("今天"), `chips write dates: ${chips}`);
  assert.equal(main.find('a[href="/daily/archive"]').filter((_, a) => $(a).text().includes("日报合订本")).length, 1, "the paper ends with the way to the archive");
});

test("a daily's flashes stand in their own sections after the entries in full, and the page index counts them there", async () => {
  const $ = await page("/daily");
  const main = $("main");
  assert.equal(main.find("#s-flash").length, 0, "no 快讯");
  // Fourteen entries: past REPORTS.compactBelow, the front page has its highlights and its page index.
  assert.ok(main.text().includes("今日看点"));
  const index = main.find('nav[aria-label="本期版面"] a').toArray().map((a) => $(a).children("span").toArray().slice(1).map((s) => $(s).text()));
  // The lead stands on the front page, not in its section.
  assert.deepEqual(index, ([["店家经验", 5], ["工具与设备", 1], ["行业趋势", 4], ["法规与平台", 3]] as const).map(([label, n]) => [label, `${n} ${REPORTS.entry.measure}`]));
  const first = main.find("#s-1");
  const html = first.html()!;
  assert.ok(html.indexOf('id="r-report-item-3"') < html.indexOf('id="r-report-item-7"'), "flashes follow the entries in full");
  for (const n of [7, 8, 9]) {
    const row = first.find(`li#r-report-item-${n} > a[href="/items/report-item-${n}"]`);
    assert.equal(row.length, 1, `flash ${n} is one link in its section`);
    assert.ok(row.text().includes(`第 ${n} 条日报条目`) && row.text().includes("Fixture"), row.text());
  }
  const rules = main.find("#s-4");
  assert.equal(rules.find("article").length, 0, "a section of flashes only has no stories");
  assert.equal(rules.find("li > a").length, 3);
});

test("a short issue lists each entry once, without highlights or a page index; an issue saved with a 快讯 keeps it", async () => {
  const $ = await page(`/daily/${days[0]}`);
  const main = $("main");
  // Five entries: the lead, two in their section and two in 快讯.
  const short = 5 <= REPORTS.compactBelow;
  assert.equal(main.find('nav[aria-label="本期版面"]').length, short ? 0 : 1);
  assert.equal(main.text().includes("今日看点"), !short);
  assert.equal(main.find("#s-flash-t").text(), "快讯");
  assert.equal(main.find('#s-flash li > a[href="/items/report-item-8"]').length, 1);
});

test("before the first daily the page says what a daily is, without a time, and leads to the list", async () => {
  noDaily = true;
  try {
    const $ = await page("/daily");
    const text = $("main").text();
    assert.ok(text.includes("还没有日报"), text);
    assert.ok(text.includes(REPORTS.noIssue.daily ?? "第一期编好以后会出现在这里。"), text);
    assert.ok(!/\d{1,2}:\d{2}|\d+\s*点|出刊/.test(text), `a time in: ${text}`);
    const list = FEED.start === "all" ? "/all" : NAV.home ? "/latest" : "/";
    assert.equal($(`main a[href="${list}"]`).filter((_, a) => $(a).text().startsWith("看")).length, 1, "the way to the list");
  } finally {
    noDaily = false;
  }
});

test("a compact report with one issue shows no date chips; a weekly before its first issue says what it is", { skip: !REPORTS.compact && "the site keeps the full reports" }, async () => {
  const monthly = await page("/monthly");
  assert.equal(monthly('nav[aria-label="最近的月报"]').length, 0);
  assert.equal(monthly('main a[href="#report-history"]').length, 0, "no way to earlier issues there are none of");
  const weekly = await page("/weekly");
  const text = weekly("main").text();
  assert.ok(text.includes("还没有周报"), text);
  assert.ok(text.includes(REPORTS.noIssue.weekly ?? `周报是${REPORTS.descriptions.weekly}`), text);
  assert.equal(weekly('main a[href="/daily"]').filter((_, a) => weekly(a).text().includes("看日报")).length, 1);
  assert.equal(weekly('main nav[aria-label="切换日报、周报、月报"] a').length, 3, "the switch still offers all three");
});

test("the compact archive is one column under a plain heading, one issue a row, under one name", { skip: !REPORTS.compact && "the site keeps the full reports" }, async () => {
  const $ = await page("/daily/archive");
  assert.match($("title").text(), /^日报合订本 · /);
  assert.equal($("main h1").first().text(), "日报合订本");
  assert.equal($("main h1 svg").length, 0, "no nameplate");
  assert.equal($('nav[aria-label="日报历史"]').length, 0);
  assert.equal($("main h2").first().text(), `${today.slice(0, 4)} 年 ${Number(today.slice(5, 7))} 月`);
  const row = $(`main a[href="/daily/${today}"]`);
  assert.equal(row.length, 1);
  assert.equal(row.children().first().text(), `${Number(today.slice(8, 10))} 日 ${weekdayShort(today)}`);
  assert.ok(row.text().includes(`${today} 的头条`) && row.text().includes(`3 ${REPORTS.entry.measure}`), row.text());
});

/** The paper's widest: the list pages' width (LAYOUT.lists); without one it keeps its narrow layout, under 760px (REPORTS.compact). */
const PAPER = LAYOUT.lists ?? 759;

for (const [name, viewport, touch] of [["a touch tablet", { width: 1024, height: 768 }, true], ["a desktop", { width: 1440, height: 900 }, false]] as const) {
  test(`on ${name} the paper fills the main area up to the list pages' width, two stories a row from 760px; a story or a flash opens from anywhere on it`, { skip: !REPORTS.compact && "the site keeps the full reports" }, async () => {
    const context = await chrome.newContext({ viewport, hasTouch: touch, isMobile: touch });
    try {
      const tab = await context.newPage();
      await tab.goto(origin + "/daily");
      // The main area: the screen less the 180px sidebar and 28px a side (1,200 at 1440, 788 at 1024).
      const width = Math.min(PAPER, viewport.width - 180 - 56);
      const paper = await tab.locator("article.\\@container").first().boundingBox();
      assert.equal(paper?.width, width, `paper ${paper?.width}`);
      assert.equal(await tab.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
      // The lead stands on the front page; its section's stories are the second and third.
      const [first, second] = [await tab.locator("#r-report-item-2").boundingBox(), await tab.locator("#r-report-item-3").boundingBox()];
      assert.ok(first && second);
      assert.equal(second.y === first.y, width >= 760, `stories side by side in a paper ${width}px wide`);
      const row = tab.locator("#r-report-item-7 > a");
      await row.scrollIntoViewIfNeeded();
      const box = (await row.boundingBox())!;
      const opens = await tab.evaluate(([x, y]) => (document.elementFromPoint(x!, y!)?.closest("a") as HTMLAnchorElement | null)?.getAttribute("href"), [box.x + box.width - 4, box.y + box.height / 2]);
      assert.equal(opens, "/items/report-item-7", "the end of a flash's row opens it");
      if (touch) assert.ok(box.height >= 44, `flash row ${box.height}px`);
      // The archive below the reports is a reading page: it stays in the reading column.
      await tab.goto(origin + "/daily/archive");
      const archive = await tab.locator(".report-shell").first().boundingBox();
      assert.equal(archive?.width, Math.min(LAYOUT.column ?? 760, viewport.width - 180 - 56), `archive ${archive?.width}`);
    } finally {
      await context.close();
    }
  });
}

test("on a touch tablet a story opens from anywhere on it and 原文 is 44px", { skip: !REPORTS.compact && "the site keeps the full reports" }, async () => {
  const context = await chrome.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
  try {
    const tab = await context.newPage();
    await tab.goto(origin + "/daily");
    const story = tab.locator("#r-report-item-2");
    await story.scrollIntoViewIfNeeded();
    const summary = await story.locator("p").first().boundingBox();
    const opens = await tab.evaluate(([x, y]) => (document.elementFromPoint(x!, y!)?.closest("a") as HTMLAnchorElement | null)?.getAttribute("href"), [summary!.x + 10, summary!.y + 5]);
    assert.equal(opens, "/items/report-item-2", "a touch on the summary opens the item");
    const original = await story.getByRole("link", { name: /原文/ }).boundingBox();
    assert.ok(original && original.height >= 44 && original.width >= 44, `原文 ${original?.width}×${original?.height}`);
  } finally {
    await context.close();
  }
});
