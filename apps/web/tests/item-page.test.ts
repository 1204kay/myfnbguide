// An item's page as the site configures it (site/site.ts LAYOUT.column, DATES, ITEM_COPY, NAV), rendered by the
// production server over a stub api. Failure cases: the reader's one column still has rails beside the article, or its
// parts out of order (the reason only in a rail, the buttons far from the title); the date shows the time of day, or
// does not say which date is the original's and which the collection's, or names the source twice when it is also the
// author; an archived item's year is missing; the tags
// keep "#", the category tags, more than three, or topics whose pages the site hides; back from an item opened
// directly leads to / (the module home page) or uses the old names.
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
import type { SiteItemDetail } from "@aihot/contracts/site";
import { feedPath } from "@aihot/contracts/routes";
import { CATEGORY_TAGS } from "@aihot/industry/taxonomy";
import { DATES, ITEM_COPY, LAYOUT, NAV } from "@aihot/site";
import { monthDay } from "../app/lib/format.ts";

const NAME = NAV.labels[feedPath()] ?? "精选";
const item: SiteItemDetail = {
  id: "item-fixture", title: "一家店的做法", originalTitle: "How one shop did it", summary: "固定导读", reason: "固定理由", source: { name: "Fixture" },
  links: { original: "https://example.org/a" }, publishedAt: "2026-10-02T02:00:00.000Z", discoveredAt: "2026-10-03T02:00:00.000Z", timelineAt: "2026-10-03T02:00:00.000Z",
  category: "tip", tags: [CATEGORY_TAGS[0], "成本/利润", "菜单/定价", "人与用工", "马来西亚"], score: 80, selected: true, channel: "news", story: null,
  x: null, readingMode: "full", author: "Fixture", body: null, outline: [], relatedStories: [], topics: [{ slug: "costs", name: "成本" }] as SiteItemDetail["topics"],
  indexable: true, markdownAvailable: false, group: null, hasTranslation: false, bodyLanguage: "zh",
};
const items: Record<string, SiteItemDetail> = {
  [item.id]: item,
  "item-archive": { ...item, id: "item-archive", publishedAt: "2016-03-02T02:00:00.000Z", selected: false, reason: null },
  "item-undated": { ...item, id: "item-undated", publishedAt: null },
};
let web: ChildProcess;
let origin: string;
let logs = "";

const api = createServer((req, res) => {
  const url = new URL(req.url!, "http://local");
  const p = url.pathname;
  res.setHeader("Content-Type", "application/json");
  if (p === "/api/health") return res.end("{}");
  if (p === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: null }));
  const found = items[p.replace("/api/site/items/", "")];
  if (found) return res.end(JSON.stringify(found));
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
});

after(async () => {
  if (web?.exitCode === null) {
    web.kill("SIGTERM");
    await once(web, "exit");
  }
  api.closeAllConnections();
  await new Promise<void>((resolve) => api.close(() => resolve()));
});

async function page(id: string) {
  const res = await fetch(`${origin}/items/${id}`);
  assert.equal(res.status, 200, id);
  return cheerio.load(await res.text());
}

test("in the reader's one column: source and dates, title, original title, AI 导读, reason, buttons, tags; no rails", { skip: !LAYOUT.column && "the engine's rails" }, async () => {
  const $ = await page(item.id);
  assert.equal($("main aside").length, 0, "no rails");
  const text = $("main article").text();
  const order = ["Fixture", item.title, item.originalTitle!, "AI 导读", item.summary!, ITEM_COPY.reasonLabel, item.reason!, "打开原文", "分享", "成本/利润"].map((s) => [s, text.indexOf(s)] as const);
  for (const [s, i] of order) assert.ok(i >= 0, `${s} is on the page`);
  assert.deepEqual(order.map(([s]) => s), [...order].sort((a, b) => a[1] - b[1]).map(([s]) => s), "in reading order");
  assert.equal($("main h1").length, 1);
  assert.ok($("main h1").hasClass("lg:text-[30px]"));
  assert.ok($("main article").text().includes("精选"), "the selected item is marked in its source line");
  // The back row's way when opened directly: the featured list, under its name.
  assert.ok($("main a").toArray().some((a) => $(a).attr("href") === feedPath() && $(a).text() === NAME));
});

test("dates to the day: the original's and the collection's, named; the year on another year's", { skip: DATES.clock && "the time of day is shown" }, async () => {
  const line = async (id: string) => (await page(id))("main article > div").first().text();
  const dated = await line(item.id);
  assert.ok(dated.includes(`原文发布：${monthDay("2026-10-02")}`) && dated.includes(`收录：${monthDay("2026-10-03")}`), dated);
  assert.equal(dated.split("Fixture").length, 2, `an author who is the source is not named twice: ${dated}`);
  assert.ok(!/\d{2}:\d{2}/.test(dated), `no time of day: ${dated}`);
  assert.ok((await line("item-archive")).includes(`原文发布：${monthDay("2016-03-02")}`));
  assert.ok(monthDay("2016-03-02").includes("2016"));
  const undated = await line("item-undated");
  assert.ok(!undated.includes("原文发布") && undated.includes(`收录：${monthDay("2026-10-03")}`), undated);
});

test("the tags as the site writes them, and no topics while their pages are hidden", async () => {
  const $ = await page(item.id);
  const chips = $('main article a[href^="/all?tag="]').toArray().map((a) => $(a).text());
  const tags = item.tags.filter((t) => ITEM_COPY.categoryTags || t !== CATEGORY_TAGS[0]);
  const shown = LAYOUT.column ? tags.slice(0, 3) : tags.slice(0, 6);
  assert.deepEqual(chips, shown.map((t) => (ITEM_COPY.tagHash ? `#${t}` : t)));
  assert.equal($('main a[href^="/topics/"]').length > 0, !NAV.hidden.includes("/topics"));
});

test("an item not selected goes back to 全部 under the name the navigation gives it", async () => {
  const $ = await page("item-archive");
  const back = $("header[data-phone-bar] button").first().text();
  assert.equal(back, NAV.hidden.includes("/all") ? NAME : "全部");
});
