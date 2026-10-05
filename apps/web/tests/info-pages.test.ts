// The site's own pages as the site words them (site.ts ABOUT, AGENT, SITE, DATES, NAV), rendered by the
// production server over a stub api. Failure cases: the about page sends readers to the featured list,
// counts in 信源 and 动态, or shows the last 24 hours and the kinds of source the site turned off; its last
// stage ignores what the modules count, or shows nothing without them; a plain head keeps its buttons beside
// the headline; the agent page lists other tools than the MCP server offers (the hot list's while the site
// keeps it out of its navigation), ignores its examples, or scrolls sideways on a phone; the feedback tips come
// after the form on phones; a phone gets no outline of the terms, or the terms and privacy pages do not link to
// each other and to 反馈 alike; the changelog shows times the site keeps off its pages, or this year's year on a
// site that spaces its dates; headings outgrow the site's one set (26px on phones, 30px on desktops).
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import { chromium, type Browser } from "@playwright/test";
import { MCP_TOOL_NAMES, MCP_TOOLS } from "@aihot/contracts/mcp";
import { beijingDate } from "@aihot/contracts/time";
import type { SiteStats } from "@aihot/contracts/site";
import { ABOUT, AGENT, DATES, NAV, REPORTS, SITE } from "@aihot/site";
import { monthDay } from "../app/lib/format.ts";

const stats: SiteStats = {
  sources: 75, sourceKinds: { rss: 69, web_list: 6 }, items: 1910, selected: 244, dailies: 5, day: { collected: 0, selected: 0 },
  sampleSources: [{ name: "Fixture", kind: "rss", heatOnly: false }], latest: [], figures: [],
};
/** The about page's head as the other info pages have it (site.ts ABOUT.page.plainHead). */
const PLAIN_HEAD = ABOUT.page.plainHead;
/** A release of this year's and one of an earlier year's. */
const THIS_YEAR = `${beijingDate(Date.now()).slice(0, 4)}-10-01`;
const releases = [
  { date: THIS_YEAR, time: "08:00", kind: "公告", title: "试运行", body: ["固定正文"] },
  { date: "2019-02-19", time: "09:00", kind: "更新", title: "往年", body: ["固定正文"] },
];
let web: ChildProcess;
let origin: string;
let logs = "";
let chrome: Browser;
const api = createServer((req, res) => {
  const path = new URL(req.url!, "http://api.local").pathname;
  res.setHeader("Content-Type", "application/json");
  if (path === "/api/health") return res.end("{}");
  if (path === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: "2026-10-01T08:00" }));
  if (path === "/api/site/track") { res.statusCode = 204; return res.end(); }
  if (path === "/api/site/stats") return res.end(JSON.stringify(stats));
  if (path === "/api/site/contact") return res.end(JSON.stringify({ wechatQr: null, feishuQr: null, makerAvatar: null }));
  if (path === "/api/site/changelog") return res.end(JSON.stringify({ latestVersion: "2026-10-01T08:00", releases }));
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

async function page(path: string, status = 200) {
  const response = await fetch(origin + path);
  assert.equal(response.status, status, logs);
  return cheerio.load(await response.text());
}

test("the about page leads where the site says, names its stages and counts in its words", async () => {
  const $ = await page("/about");
  const header = $("main header").filter((_, el) => $(el).find("h1").length > 0).first();
  const actions = header.find("a").toArray().map((a) => [$(a).attr("href"), $(a).text()]);
  if (ABOUT.page.actions) assert.deepEqual(actions, ABOUT.page.actions.map(([text, to]) => [to, text]));
  else assert.ok(!actions.some(([to]) => to === "/" && NAV.home), "the featured list's button leads to the featured list, not the home page");
  const stages = $("main ol h3").toArray().map((h) => $(h).text());
  if (ABOUT.page.stepTitles) assert.deepEqual(stages, Object.values(ABOUT.page.stepTitles));
  const text = $("main").text();
  assert.ok(text.includes(`75${REPORTS.metricUnits.sourcesCount ?? "个来源"}`), text);
  assert.ok(!/信源|动态/.test(text), "one name for sources and items");
  if (ABOUT.page.statNotes === false) assert.ok(!text.includes("过去 24 小时") && !text.includes("RSS 69"), "no notes under the stages");
  if (ABOUT.page.riverNote) assert.ok(text.includes(ABOUT.page.riverNote));
});

test("the about page's last stage counts what the modules have put together, the dailies without them", async () => {
  const last = async () => (await page("/about"))("main ol li").last().text();
  assert.ok((await last()).includes(`5${REPORTS.metricUnits.reportsCovered}`), "no module counts: the dailies");
  stats.figures = [{ value: 41, unit: "种情况" }, { value: 328, unit: "条原文" }];
  try {
    const text = await last();
    assert.ok(text.includes("41种情况") && text.includes("328条原文"), text);
    assert.ok(!text.includes(`5${REPORTS.metricUnits.reportsCovered}`), `in place of the dailies: ${text}`);
  } finally {
    stats.figures = [];
  }
});

test("a plain about head puts the buttons under the lead", { skip: !PLAIN_HEAD && "the site keeps the large head" }, async () => {
  const context = await chrome.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    const tab = await context.newPage();
    await tab.goto(`${origin}/about`);
    const head = tab.locator("main header", { has: tab.locator("h1") });
    const lead = await head.locator("h1 + p").boundingBox();
    const button = await head.locator("a").first().boundingBox();
    assert.ok(lead && button && button.y >= lead.y + lead.height, `button ${button?.y}, lead ends ${lead && lead.y + lead.height}`);
  } finally {
    await context.close();
  }
});

test("the agent page lists the tools the MCP server offers, reads the site's coverage and examples, and leaves out the hot list it hides", async () => {
  const $ = await page("/agent?tab=mcp");
  assert.ok($("main header p").first().text().includes(AGENT.covers), "the lead names what the ways in read");
  const panel = $("#agent-panel").text();
  if (AGENT.examples.latest) assert.ok(panel.includes(AGENT.examples.latest));
  const listed = $("#agent-panel table code").toArray().map((c) => $(c).text());
  assert.deepEqual(listed.slice(0, MCP_TOOLS.length), MCP_TOOLS.map((t) => t.name), "the server's tools, in its order; the modules' follow");
  assert.ok(panel.includes(`多出 ${listed.length} 个工具`), "counted as listed");
  const hidden = NAV.hidden.includes("/hot");
  for (const tool of [MCP_TOOL_NAMES.hot, MCP_TOOL_NAMES.story]) assert.equal(panel.includes(tool), !hidden, tool);
  const api = (await page("/agent?tab=api"))("#agent-panel").text();
  assert.equal(api.includes("/api/v1/hot-topics"), !hidden);
});

test("on a phone the agent tables stack and nothing scrolls sideways; the feedback tips come before the form", async () => {
  const context = await chrome.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  try {
    const tab = await context.newPage();
    for (const which of ["mcp", "rss", "api"]) {
      await tab.goto(`${origin}/agent?tab=${which}`);
      assert.equal(await tab.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, which);
      assert.equal(await tab.locator("#agent-panel table").first().evaluate((t) => getComputedStyle(t).display), "block", which);
    }
    await tab.goto(`${origin}/feedback`);
    const tips = await tab.getByText("写清楚这几点，处理更快").first().boundingBox();
    const form = await tab.locator("main form").boundingBox();
    assert.ok(tips && form && tips.y < form.y, "tips first");
    assert.equal(await tab.locator("main h1").textContent(), SITE.feedbackTitle ?? "说说你的想法");
    const send = await tab.getByRole("button", { name: "发送反馈" }).boundingBox();
    assert.ok(send && send.height >= 48 && send.width > 300, `send ${send?.width}×${send?.height}`);
  } finally {
    await context.close();
  }
});

test("the terms fold their outline before the text on phones; terms and privacy link to each other and to 反馈", async () => {
  const terms = await page("/terms");
  const toc = terms("main details").filter((_, d) => terms(d).children("summary").text().trim() === "目录");
  assert.equal(toc.length, 1);
  assert.equal(toc.attr("open"), undefined, "folded at first");
  assert.ok(terms("main h2").toArray().some((h) => terms(h).text().includes("精选：哪些条目会入选")));
  const privacy = await page("/privacy");
  const foot = ($: cheerio.CheerioAPI) => $("main article > div").last().find("a").toArray().map((a) => $(a).attr("href"));
  assert.deepEqual(foot(terms).slice(0, 2), ["/privacy", "/feedback"]);
  assert.deepEqual(foot(privacy), ["/terms", "/feedback"]);
});

test("the changelog keeps times off the page when the site does", { skip: DATES.clock && "the site shows times" }, async () => {
  const $ = await page("/changelog");
  assert.ok(!$("main").text().includes("08:00"));
});

test("the changelog writes its dates as the site does: this year's without the year", { skip: !DATES.spaced && "the full date" }, async () => {
  const $ = await page("/changelog");
  const headings = $("main section h2 time").toArray().map((t) => $(t).text().trim());
  assert.deepEqual(headings, [monthDay(THIS_YEAR), monthDay("2019-02-19")]);
  assert.ok(!headings[0]!.includes(THIS_YEAR.slice(0, 4)) && headings[1]!.startsWith("2019"), headings.join(" | "));
});

test("page headings are 26px on phones and 30px on desktops", async () => {
  for (const [width, size] of [[390, "26px"], [1440, "30px"]] as const) {
    const context = await chrome.newContext({ viewport: { width, height: 900 } });
    try {
      const tab = await context.newPage();
      for (const path of ["/changelog", "/feedback", "/agent", "/terms", "/no-such-page", ...(PLAIN_HEAD ? ["/about"] : [])]) {
        await tab.goto(origin + path);
        assert.equal(await tab.locator("main h1").first().evaluate((h) => getComputedStyle(h).fontSize), size, `${path} at ${width}`);
      }
    } finally {
      await context.close();
    }
  }
});
