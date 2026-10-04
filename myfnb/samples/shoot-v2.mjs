// 第二版样页（一页纸报告式）在手机宽度下截图：总览一张、每个详情一张。输出在 .data/samples/v2/。
// 用法：node myfnb/samples/shoot-v2.mjs v2-busy-no-profit.html
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../../.data/samples/v2");
const PLAYWRIGHT = process.env.PLAYWRIGHT_PATH ?? path.join(process.env.APPDATA ?? "", "npm/node_modules/@playwright/mcp/node_modules/playwright");
const { chromium } = createRequire(import.meta.url)(PLAYWRIGHT);

const file = process.argv[2] ?? "v2-busy-no-profit.html";
const name = path.basename(file, ".html").replace(/^v2-/, "");
const body = readFileSync(path.join(HERE, file), "utf8");
// 页面文件按 Artifact 的写法不带 <head>；本地截图时补上同样的外壳。
mkdirSync(OUT, { recursive: true });
const html = path.join(OUT, `${name}.html`);
writeFileSync(html, `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}</style></head><body>${body}</body></html>`);
const ids = [...body.matchAll(/class="detail [a-z]+" id="([a-z0-9-]+)"/g)].map((m) => m[1]);

const browser = await chromium.launch();
const tab = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })).newPage();
for (const id of ["top", ...ids]) {
  await tab.goto(`${pathToFileURL(html).href}#${id}`);
  await tab.evaluate(() => window.scrollTo(0, 0));
  const shot = path.join(OUT, `${name}-${id === "top" ? "0-overview" : id.replace(/^d-/, "")}.jpg`);
  await tab.screenshot({ path: shot, fullPage: true, type: "jpeg", quality: 80 });
  console.log(path.basename(shot), await tab.evaluate(() => document.documentElement.scrollHeight), "px");
}
await browser.close();
