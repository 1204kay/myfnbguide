// The item page's blocks from the site's modules (WebModule.itemPart), rendered by the production server over a stub
// api. Failure cases: a module's block is missing from an item it has something on, drawn for one it has nothing on
// (its api answers 404), or a failing module api takes the item page down with it.
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import type { SiteItemDetail } from "@aihot/contracts/site";

const at = "2026-10-04T08:00:00.000Z";
const detail = (id: string): SiteItemDetail => ({
  id, title: "条目标题", summary: "固定摘要", reason: null, source: { name: "Fixture" }, publishedAt: at, timelineAt: at, category: null, tags: [], score: 50,
  selected: false, channel: "news", x: null, originalTitle: null, links: { original: "https://example.org/a" }, discoveredAt: at, story: null,
  readingMode: "full", author: null, body: null, outline: [], relatedStories: [], topics: [], indexable: true, markdownAvailable: true, group: null,
  hasTranslation: false, bodyLanguage: "zh",
} as SiteItemDetail);
const WRITTEN = { kind: "body", body: { lead: "美国一家餐饮媒体介绍一家小酒馆的布草账单。", parts: [{ heading: "账单四年涨到每周 1,503 美元", blocks: [{ type: "text", text: "店里没有人批准过一次大涨价。" }] }], open: null } };

let web: ChildProcess;
let origin: string;
let logs = "";

const api = createServer((req, res) => {
  const p = new URL(req.url!, "http://local").pathname;
  res.setHeader("Content-Type", "application/json");
  if (p === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: null }));
  const item = /^\/api\/site\/items\/([^/]+)$/.exec(p);
  if (item) return res.end(JSON.stringify(detail(item[1]!)));
  if (p === "/api/reference/items/written") return res.end(JSON.stringify(WRITTEN));
  if (p === "/api/reference/items/broken") { res.writeHead(500); return res.end("{}"); }
  res.writeHead(404);
  res.end("{}");
});

before(async () => {
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  web = spawn(process.execPath, [fileURLToPath(new URL("../server.ts", import.meta.url))], {
    env: { ...process.env, WEB_PORT: "0", TRUST_PROXY: "false", API_BASE_URL: `http://127.0.0.1:${(api.address() as AddressInfo).port}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`web did not start: ${logs}`)), 15000);
    web.on("exit", () => { clearTimeout(timer); reject(new Error(`web exited: ${logs}`)); });
    web.stderr!.on("data", (chunk) => { logs += String(chunk); });
    web.stdout!.on("data", (chunk) => {
      const match = String(chunk).match(/"msg":"web started","port":(\d+)/);
      if (match) { origin = `http://127.0.0.1:${match[1]}`; clearTimeout(timer); resolve(); }
    });
  });
});

after(async () => {
  if (web && web.exitCode === null) { web.kill("SIGTERM"); await once(web, "exit"); }
  api.closeAllConnections();
  await new Promise<void>((resolve) => api.close(() => resolve()));
});

async function page(path: string): Promise<string> {
  const res = await fetch(origin + path);
  assert.equal(res.status, 200, `${path}: ${logs}`);
  return res.text();
}

// The site's reference module gives the item page its write-up (modules/reference/web/item-part.tsx).
test("an item page draws a module's block where its api has something, and leaves it out where not", async () => {
  const written = await page("/items/written");
  for (const text of ["正文 · AI 整理自原文", WRITTEN.body.lead, WRITTEN.body.parts[0]!.heading]) assert.ok(written.includes(text), text);
  for (const id of ["nothing", "broken"]) {
    const html = await page(`/items/${id}`);
    assert.ok(html.includes("固定摘要") && !html.includes("正文 · AI 整理自原文"), `${id}: the page without the block`);
  }
});
