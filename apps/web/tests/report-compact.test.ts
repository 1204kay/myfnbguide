// The compact reports (site.ts REPORTS.compact), rendered by the production server over a stub api.
// Failure cases: the archive column, the issue calendar or the edition time and motto ("08:00 出刊",
// "每日要闻") come back; the kind switch leaves the page for the bar; one issue still gets a row of
// date chips, or a chip says "今天"; the paper is wider than the reading column, or so wide that it
// switches to its two-column layout; a story opens its item only from its headline, or its 原文 is a
// mouse-sized target on a touch screen; a weekly before its first issue does not say what a weekly is;
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
import { LAYOUT, REPORTS } from "@aihot/site";
import { weekdayShort } from "../app/lib/format.ts";

// The newest daily is today's, so a chip that says "今天" would show.
const today = beijingDate(Date.now());
const days = [3, 2, 1, 0].map((n) => addDays(today, -n));
const month = today.slice(0, 7);
const citation = (n: number): ReportCitation => ({
  itemId: `report-item-${n}`, title: `第 ${n} 条日报条目`, summary: `第 ${n} 条的摘要，写这家店做了什么。`, sourceName: "Fixture", sourceUrl: `https://example.com/${n}`,
  sourceIconUrl: null, firstParty: false, publishedAt: `${today}T00:00:00Z`, available: true,
});
function report(kind: ReportKind, key: string, issueNumber: number): ReportDetail {
  return {
    kind, key, issueNumber, title: "测试刊物", generatedAt: `${today}T00:00:00Z`, lead: null, leadItemId: null, overview: null, highlights: [],
    sections: [{ label: "店家经验", summary: null, items: [citation(1), citation(2), citation(3)] }],
    flashes: [], cover: null, metrics: { totalEvents: 3, sourcesCount: 2 }, readingMinutes: 2, prev: null, next: null,
  };
}
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
    const latest = index[kind][0];
    if (key === "latest-page") return res.end(JSON.stringify({ index: index[kind], report: latest ? report(kind, latest.key, latest.issueNumber) : null }));
    if (key.startsWith("navigation/")) return res.end(JSON.stringify({ items: index[kind] }));
    const entry = index[kind].find((e) => e.key === key);
    if (entry) return res.end(JSON.stringify(report(kind, key, entry.issueNumber)));
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

test("a compact report with one issue shows no date chips; a weekly before its first issue says what it is", { skip: !REPORTS.compact && "the site keeps the full reports" }, async () => {
  const monthly = await page("/monthly");
  assert.equal(monthly('nav[aria-label="最近的月报"]').length, 0);
  assert.equal(monthly('main a[href="#report-history"]').length, 0, "no way to earlier issues there are none of");
  const weekly = await page("/weekly");
  const text = weekly("main").text();
  assert.ok(text.includes("还没有周报"), text);
  assert.ok(text.includes(`周报是${REPORTS.descriptions.weekly}`), text);
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

test("on a touch tablet the paper sits in the reading column, narrow, a story opens from anywhere on it and 原文 is 44px", { skip: !REPORTS.compact && "the site keeps the full reports" }, async () => {
  const context = await chrome.newContext({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });
  try {
    const tab = await context.newPage();
    await tab.goto(origin + "/daily");
    const paper = await tab.locator("article.\\@container").first().boundingBox();
    assert.ok(paper && paper.width < 760 && paper.width >= Math.min(LAYOUT.column ?? 760, 760) - 1, `paper ${paper?.width}`);
    assert.equal(await tab.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    const story = tab.locator("#r-report-item-2");
    // Two stories a row would put the second beside the first.
    const [first, second] = [await tab.locator("#r-report-item-1").boundingBox(), await story.boundingBox()];
    assert.ok(first && second && second.y > first.y, "stories run in one column");
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
