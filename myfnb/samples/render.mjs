// 把 pages.mjs 的五个样页排成手机宽度的页面：每页一张长图（JPG）（微信里转发），另合成一份 PDF（原文链接点得开，WhatsApp 里转发）。
// 用法：node myfnb/samples/render.mjs   输出在 .data/samples/（不进仓库）
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ENTRIES, SHOPS, SITUATIONS, SOURCES } from "./pages.mjs";

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.data/samples");
// 本机没有把 Playwright 装进仓库，用全局装的 @playwright/mcp 自带的那份。
const PLAYWRIGHT = process.env.PLAYWRIGHT_PATH ?? path.join(process.env.APPDATA ?? "", "npm/node_modules/@playwright/mcp/node_modules/playwright");
const { chromium } = createRequire(import.meta.url)(PLAYWRIGHT);

const LANG = { 美国: "英文", 英国: "英文", 澳大利亚: "英文", 巴西: "葡萄牙文", 西班牙: "西班牙文", 意大利: "意大利文", 日本: "日文", 韩国: "韩文" };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const shortUrl = (u) => { const x = new URL(u); const p = x.pathname.replace(/\/$/, ""); return x.hostname.replace(/^www\./, "") + (p.length > 28 ? p.slice(0, 26) + "…" : p); };
const circled = (n) => String.fromCodePoint(0x245f + n);
const newestFirst = (keys) => [...keys].sort((a, b) => SOURCES[ENTRIES[b].src].date.localeCompare(SOURCES[ENTRIES[a].src].date));

const CSS = `
:root { --bg:#faf9f6; --surface:#fff; --ink:#202a30; --ink-2:#303c42; --ink-3:#59656b; --ink-4:#657176; --line:#dfe4e1; --soft:#e9ede9;
  --accent:#176b75; --accent-soft:rgba(23,107,117,.08); --amber-soft:rgba(184,135,58,.1); --amber-ink:#7c5a24; }
* { box-sizing:border-box; margin:0; padding:0; }
html { -webkit-text-size-adjust:100%; }
body { background:var(--bg); color:var(--ink); font:15px/1.75 system-ui,-apple-system,"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Malgun Gothic","Yu Gothic",sans-serif; }
a { color:var(--accent); text-decoration:none; }
.bar { display:flex; align-items:baseline; gap:10px; padding:14px 16px 12px; border-bottom:1px solid var(--line); background:var(--surface); }
.logo { font-weight:800; letter-spacing:.14em; font-size:16px; } .logo b { color:var(--accent); }
.tag { color:var(--ink-4); font-size:12px; }
main { padding:18px 16px 8px; }
.crumb { color:var(--ink-4); font-size:13px; margin-bottom:6px; }
h1 { font-size:24px; line-height:1.35; margin-bottom:10px; }
h2 { font-size:17px; margin:26px 0 10px; display:flex; align-items:baseline; gap:8px; }
h2 small { font-size:12px; font-weight:400; color:var(--ink-4); }
.intro { color:var(--ink-2); }
.meta { color:var(--ink-4); font-size:13px; margin-top:8px; }
.how { background:var(--accent-soft); border-radius:12px; padding:2px 14px 12px; margin-top:18px; }
.how h2 { margin-top:14px; }
.how ul { list-style:none; }
.how li { position:relative; padding-left:16px; margin:0 0 12px; break-inside:avoid; }
.how li::before { content:""; position:absolute; left:2px; top:11px; width:6px; height:6px; border-radius:50%; background:var(--accent); }
.ref { display:inline-block; font-size:12px; line-height:1.5; padding:0 6px; margin:2px 2px 0 0; border-radius:6px; background:var(--surface); border:1px solid var(--line); color:var(--accent); white-space:nowrap; }
.note { color:var(--ink-4); font-size:12px; }
.card { background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:14px; margin-bottom:12px; break-inside:avoid; }
.head { display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:12px; color:var(--ink-4); margin-bottom:6px; }
.num { font-weight:700; color:var(--accent); }
.type { background:var(--amber-soft); color:var(--amber-ink); border-radius:4px; padding:0 6px; }
.card h3 { font-size:16px; line-height:1.45; margin-bottom:6px; }
.card .sum { color:var(--ink-2); }
.card h4 { font-size:13px; color:var(--ink-3); margin:10px 0 4px; }
ul.points { padding-left:18px; color:var(--ink-2); } ul.points li { margin-bottom:4px; }
.orig { font-size:12px; color:var(--ink-4); margin-top:10px; padding-top:8px; border-top:1px dashed var(--line); word-break:break-all; }
.where { color:var(--ink-3); margin-bottom:12px; }
.facts { display:grid; grid-template-columns:auto 1fr; gap:4px 12px; background:var(--surface); border:1px solid var(--line); border-radius:12px; padding:12px 14px; font-size:14px; }
.facts dt { color:var(--ink-4); } .facts dd { color:var(--ink-2); }
.lead { font-size:16px; font-weight:600; margin:16px 0 8px; line-height:1.65; }
.teller { color:var(--ink-3); font-size:14px; }
ul.list { padding-left:18px; } ul.list li { margin-bottom:8px; break-inside:avoid; }
table { width:100%; border-collapse:collapse; background:var(--surface); border:1px solid var(--line); border-radius:12px; font-size:14px; overflow:hidden; }
caption { caption-side:top; text-align:left; color:var(--ink-4); font-size:12px; margin-bottom:6px; }
td { padding:7px 12px; border-top:1px solid var(--soft); } tr:first-child td { border-top:0; } td:last-child { text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; }
.timeline { list-style:none; border-left:2px solid var(--line); margin-left:6px; }
.timeline li { padding:0 0 10px 14px; position:relative; break-inside:avoid; }
.timeline li::before { content:""; position:absolute; left:-6px; top:8px; width:10px; height:10px; border-radius:50%; background:var(--accent); }
.timeline b { display:block; font-size:13px; color:var(--accent); }
.chips a { display:inline-block; border:1px solid var(--accent); border-radius:999px; padding:2px 12px; font-size:14px; margin:0 6px 6px 0; }
footer { color:var(--ink-4); font-size:12px; padding:14px 16px 24px; border-top:1px solid var(--line); margin-top:18px; }
.cover h1 { font-size:26px; margin-top:8px; } .cover p { color:var(--ink-2); margin-bottom:12px; }
.cover ol { padding-left:20px; } .cover li { margin-bottom:10px; } .cover li small { display:block; color:var(--ink-4); font-size:12px; }
`;

const BAR = `<header class="bar"><span class="logo"><b>MY</b>F&amp;B</span><span class="tag">餐饮人自己的参考站</span></header>`;
const FOOTER = `<footer>MyF&amp;B 样页（2026 年 10 月）。收集各地店家的做法和经验，按老板遇到的事整理，附原文出处，由你自己判断。摘要和要点由 AI 根据原文整理和写作。</footer>`;

const sourceLine = (s) => `${esc(s.country)} · ${esc(s.outlet)} · ${esc(s.date)}`;
function card(key, n) {
  const e = ENTRIES[key], s = SOURCES[e.src];
  return `<article class="card" id="e-${key}">
  <div class="head">${n ? `<span class="num">${circled(n)}</span>` : ""}<span class="type">${esc(e.type)}</span><span>${sourceLine(s)}</span></div>
  <h3>${esc(e.title)}</h3>
  <p class="sum">${esc(e.summary)}</p>
  <h4>要点</h4><ul class="points">${e.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
  <p class="orig">原文（${LANG[s.country] ?? "外文"}）：<a href="${esc(s.url)}">${esc(shortUrl(s.url))}</a></p>
</article>`;
}

function situation(p) {
  const order = newestFirst(p.entries);
  const num = Object.fromEntries(order.map((k, i) => [k, i + 1]));
  const countries = new Set(order.map((k) => SOURCES[ENTRIES[k].src].country));
  const ref = (k) => { const s = SOURCES[ENTRIES[k].src]; return `<a class="ref" href="#e-${k}">${circled(num[k])} ${esc(s.country)} · ${esc(s.name)} · ${s.year}</a>`; };
  return `<nav class="crumb">参考 › ${esc(p.category)}</nav>
<h1>${esc(p.title)}</h1>
<p class="intro">${esc(p.intro)}</p>
<p class="meta">最近更新：${esc(p.updated)} · 收录 ${order.length} 条 · 来自 ${countries.size} 个国家</p>
<section class="how"><h2>各地店家是怎么做的</h2><ul>
${p.how.map((h) => `<li>${esc(h.text)}<br>${h.refs.map(ref).join("")}</li>`).join("\n")}
</ul><p class="note">每句后面的编号对应下面收录的内容，原文链接在每条最后。</p></section>
<h2>收录的内容 <small>新的在前</small></h2>
${order.map((k) => card(k, num[k])).join("\n")}`;
}

function shop(p) {
  const s = SOURCES[ENTRIES[p.entries[0]].src];
  return `<nav class="crumb">按店逛 › ${esc(p.breadcrumb)}</nav>
<h1>${esc(p.name)}</h1>
<p class="where">${esc(p.where)}</p>
<dl class="facts">${p.facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}<dt>来源</dt><dd>${esc(s.outlet)}</dd></dl>
<p class="lead">${esc(p.lead)}</p>
<p class="teller">${esc(p.teller)}</p>
${p.timeline ? `<h2>经过</h2><ol class="timeline">${p.timeline.map(([t, x]) => `<li><b>${esc(t)}</b>${esc(x)}</li>`).join("")}</ol>` : ""}
<h2>做法与经验</h2><ul class="list">${p.practices.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
${p.numbers ? `<h2>数字</h2><table><caption>${esc(p.numbers.caption)}</caption>${p.numbers.rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</table>` : ""}
${p.adapt ? `<h2>${esc(p.adapt.title)}</h2><ul class="list">${p.adapt.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
<h2>相关情况</h2><p class="chips">${p.situations.map((t) => { const sp = SITUATIONS.find((x) => x.title === t); return `<a href="${sp ? `${sp.file}.html` : "#"}">${esc(t)}</a>`; }).join("")}</p>
<h2>出处</h2>
${p.entries.map((k) => card(k)).join("\n")}`;
}

const page = (title, body) => `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(title)} · MyF&amp;B 样页</title><style>${CSS}</style></head><body>${body}</body></html>`;

const all = [...SITUATIONS.map((p) => ({ p, kind: "情况页", body: situation(p) })), ...SHOPS.map((p) => ({ p, kind: "店页", body: shop(p) }))];
mkdirSync(OUT, { recursive: true });
for (const { p, body } of all) writeFileSync(path.join(OUT, `${p.file}.html`), page(p.title ?? p.name, `${BAR}<main>${body}</main>${FOOTER}`));

const cover = `<div class="sheet cover">${BAR}<main>
<p class="crumb">样页 · 2026 年 10 月</p>
<h1>MyF&amp;B<br>餐饮人自己的参考站</h1>
<p>餐饮小店的经营参考：收集各地店家的做法和经验，按开店、成本、人手、客人等整理，附原文出处，由你自己判断。</p>
<p>下面是 5 个样页：3 个按遇到的事整理的情况页，2 个按店整理的店页。</p>
<ol>${all.map(({ p, kind }) => `<li><a href="#${p.file}">${esc(p.title ?? p.name)}</a><small>${kind} · ${esc(p.category ?? p.where)}</small></li>`).join("")}</ol>
</main></div>`;
// 合订本里每个样页一张长页：链接改指本文件里的位置。
const inBook = (p, body) => body.replace(/href="#e-/g, `href="#${p.file}-e-`).replace(/id="e-/g, `id="${p.file}-e-`).replace(/href="([a-z-]+)\.html"/g, 'href="#$1"');
const book = page("五个样页", `${cover}${all.map(({ p, body }) => `<div class="sheet" id="${p.file}">${BAR}<main>${inBook(p, body)}</main>${FOOTER}</div>`).join("")}`);
writeFileSync(path.join(OUT, "samples-all.html"), book);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
const tab = await ctx.newPage();
// 长页切成几张，每张不超过 SLICE 高：太高太大的图在手机上传不上去（10/4 实测 1.1MB、8,000 多像素高的被拒）。
// 只在段落、卡片之间切，不切断文字。
const SLICE = 2000;
for (const { p } of all) {
  await tab.goto(pathToFileURL(path.join(OUT, `${p.file}.html`)).href);
  const { height, gaps } = await tab.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    gaps: [...document.querySelectorAll("header, nav, h1, h2, p, li, .card, .facts, table, footer")].map((e) => Math.ceil(e.getBoundingClientRect().bottom + window.scrollY) + 4),
  }));
  // 切成高度相近的几张：每一刀取离等分点最近的段落间隙。
  const n = Math.ceil(height / SLICE);
  const cuts = [0];
  for (let k = 1; k < n; k++) {
    const target = (k * height) / n;
    cuts.push(gaps.filter((g) => g > cuts.at(-1) + 300).reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a)));
  }
  cuts.push(height);
  for (let i = 1; i < cuts.length; i++) {
    const name = cuts.length > 2 ? `${p.file}-${i}.jpg` : `${p.file}.jpg`;
    await tab.screenshot({ path: path.join(OUT, name), fullPage: true, type: "jpeg", quality: 80, clip: { x: 0, y: cuts[i - 1], width: 390, height: cuts[i] - cuts[i - 1] } });
    console.log(`${name}  ${cuts[i] - cuts[i - 1]} px tall`);
  }
}
await tab.goto(pathToFileURL(path.join(OUT, "samples-all.html")).href);
await tab.emulateMedia({ media: "print" });
// 每张长页的高度按排出来的内容定（命名页面各有尺寸）。
const heights = await tab.$$eval(".sheet", (els) => els.map((e) => Math.ceil(e.getBoundingClientRect().height)));
await tab.addStyleTag({ content: heights.map((h, i) => `@page p${i} { size: 390px ${Math.max(h, 844) + 4}px; margin: 0 } .sheet:nth-of-type(${i + 1}) { page: p${i} }`).join("\n") });
await tab.pdf({ path: path.join(OUT, "myfnb-samples.pdf"), preferCSSPageSize: true, printBackground: true });
console.log(`myfnb-samples.pdf  ${heights.length} pages`);
await browser.close();
