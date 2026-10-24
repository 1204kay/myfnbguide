// Run after `npm run build -w @aihot/web`. A report page's blocks from the site's modules (WebModule.reportPart),
// rendered by the production server over a synthetic api. Failure cases: the block missing under a weekly its module
// has something on, drawn under one it has nothing on (404), a failing module api taking the weekly down with it, a
// daily asking a module that only answers weeklies, and the module's own page not drawing in the report frame.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import type { ReportDetail, ReportKind, ReportCitation } from "@aihot/contracts/site";
import { fakeApi, startWebServer, type WebServer } from "./web-server.ts";

const report = (kind: ReportKind, key: string): ReportDetail => ({
  kind, key, issueNumber: 1, title: "测试刊物", generatedAt: "2026-10-19T02:00:00Z",
  lead: null, leadItemId: null, overview: null, highlights: [], sections: [], flashes: [], cover: null, metrics: {}, readingMinutes: 1, prev: null, next: null,
});
const cited = (n: number): ReportCitation => ({
  itemId: `i${n}`, title: `第 ${n} 篇`, summary: `第 ${n} 家说的那一句。`, sourceName: `来源${n}`, sourceUrl: `https://example.org/${n}`,
  sourceIconUrl: null, firstParty: false, publishedAt: "2026-10-14T02:00:00Z", available: true,
});
const asked: string[] = [];
let web: WebServer;
const api = fakeApi((url, res) => {
  const p = url.pathname;
  if (p.startsWith("/api/trends/")) asked.push(p);
  if (p === "/api/trends/2026-W43/line") return { key: "2026-W43", topics: 2 };
  if (p === "/api/trends/2026-W41/line") { res.statusCode = 500; return {}; }
  if (p === "/api/trends/2026-W43") return { key: "2026-W43", periodStart: "2026-10-12", periodEnd: "2026-10-18", topics: [{ heading: "店面越开越小", items: [1, 2, 3].map(cited) }] };
  const m = /^\/api\/site\/reports\/(daily|weekly|monthly)\/(.+)$/.exec(p);
  if (m) {
    const kind = m[1] as ReportKind;
    if (m[2]!.startsWith("navigation/")) return { items: [] };
    if (m[2] === "latest-page") return { index: [], report: report(kind, kind === "weekly" ? "2026-W43" : "2026-10-19") };
    return report(kind, m[2]!);
  }
});

before(async () => { web = await startWebServer(api); });
after(() => web.stop());

const page = async (path: string) => {
  const r = await fetch(`${web.origin}${path}`);
  assert.equal(r.status, 200, web.logs());
  return r.text();
};

test("a weekly with trends ends with the line to them, the latest weekly too", async () => {
  for (const path of ["/weekly/2026-W43", "/weekly"]) {
    const html = await page(path);
    assert.match(html, /这周几家都在讲/);
    assert.match(html, /href="\/trends\/2026-W43"/);
  }
});

test("a weekly with none, or whose module api fails, has no line and still renders", async () => {
  for (const path of ["/weekly/2026-W42", "/weekly/2026-W41"]) assert.doesNotMatch(await page(path), /这周几家都在讲/);
});

test("a daily does not ask a module that only answers weeklies", async () => {
  asked.length = 0;
  assert.doesNotMatch(await page("/daily/2026-10-19"), /这周几家都在讲/);
  assert.deepEqual(asked, []);
});

test("the week's page lists each topic's reports with our sentence, in the report frame", async () => {
  const html = await page("/trends/2026-W43");
  assert.match(html, /店面越开越小/);
  assert.match(html, /第 2 家说的那一句。/);
  assert.match(html, /href="https:\/\/example.org\/2"/);
  assert.match(html, /<header class="pt-5 lg:pt-0">/, "the report masthead's frame");
  const missing = await fetch(`${web.origin}/trends/2026-W40`);
  assert.equal(missing.status, 404);
});
