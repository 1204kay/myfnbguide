// The site's navigation option (site/site.ts NAV.hidden), rendered by the production server over a stub api.
// Failure case: a hidden way in still shows in the sidebar, the tab bar or 我的.
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { NAV } from "@aihot/site";

let web: ChildProcess;
let origin: string;
let logs = "";

const api = createServer((req, res) => {
  const url = new URL(req.url!, "http://local");
  const filters = { channel: "all", category: url.searchParams.get("category"), tag: null };
  res.setHeader("Content-Type", "application/json");
  if (url.pathname === "/api/site/meta") return res.end(JSON.stringify({ changelogVersion: null }));
  if (url.pathname === "/api/site/timeline") return res.end(JSON.stringify({ cards: [], nextCursor: null, dayCounts: {}, hot: [], filters }));
  if (url.pathname === "/api/site/pool") {
    return res.end(JSON.stringify({ filters: { ...filters, q: null, tab: "time" }, items: [], page: 1, pageCount: 1, total: 0, todayCount: 0, freshness: null }));
  }
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

test("hidden ways in leave the sidebar, the tab bar and 我的", async () => {
  for (const path of ["/", "/more"]) {
    const html = await page(path);
    for (const to of NAV.hidden) assert.equal(html.includes(`href="${to}"`), false, `${path}: ${to} is linked`);
  }
});
