// 版面守护（全站布局方案 E 第 5 包、H 第 23 条，myfnb/layout-2026-10-05.md）：上游合并会悄悄改版面，别的检查不会报警，所以
// 每次合并上游以后、推 main 以前跑一次。用本机 Playwright 按 14 种尺寸（Chromium；宽度 < 1280 按触屏模拟）加一个带微信 UA 的
// WebKit（390×844）打开读者主路径各页，截第一屏，量这几项：
//   ① 横向滚动：页面比视口宽就算（scrollWidth > clientWidth）。
//   ② 最小字号：可见文字不小于 12px（底栏文字 10.5px 例外，A6）；图里的文字实际不小于 11px，宽度 ≥ 961 时不大于 17px（B2）。
//   ③ 触屏点按区：触屏（hover: none）上可点的东西不小于 44×44px，段落里的行内链接除外（A9）；铺满整张卡的链接按卡片量。
//   ④ 版心宽度：主路径各页内容的左右边界，手机不宽于屏宽减 32，641–960 不宽于 608，≥ 961 不宽于 760（A5）。
//   ⑤ 主路径左边缘：同一尺寸下主路径各页的左边缘相同（A5；说明类页面和打不开的页不比）。
//   ⑥ 正文每行字数：40 字以上的段落每行不超过 46 个汉字的宽度（A5：760 栏、17px 约 44 字）；里面是块的列表项（卡片）不算段落。
// 结果和同目录的 baseline.json 比：基线里没有的问题、版心宽度或左边缘和基线差 2px 以上的，都算新问题，打印出来并以 1 退出；
// 基线里已有的问题只列出来。版面是有意改的（例如第 2–4 包上线以后），看过截图确认无误再加 --write 重写基线。
//   PLAYWRIGHT_BROWSERS_PATH=<浏览器目录> node myfnb/layout-check/check.ts [--base https://new.myfnbguide.com] [--write] [--shots <目录>]
// 截图默认放 .data/layout-check/（不提交）。只读线上页面，不登录、不提交表单。
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, webkit, type Browser, type Page } from "@playwright/test";

const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const BASE = (arg("--base") ?? "https://new.myfnbguide.com").replace(/\/$/, "");
const WRITE = process.argv.includes("--write");
const SHOTS = arg("--shots") ?? path.join(".data", "layout-check");
const BASELINE = new URL("./baseline.json", import.meta.url);

/** 方案 G 第 5 包的 14 种尺寸，宽度 < 1280 按触屏（手机、平板、触屏笔记本），另加微信里的 iPhone。 */
const SIZES: Array<[number, number]> = [
  [320, 568], [360, 780], [390, 844], [430, 932], [844, 390], [600, 960], [768, 1024], [834, 1194],
  [1024, 768], [1194, 834], [1280, 800], [1440, 900], [1920, 1080], [2560, 1440],
];
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0 Mobile Safari/537.36";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const WECHAT = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.50(0x1800323c) NetType/WIFI Language/zh_CN";
interface Profile { key: string; engine: "chromium" | "webkit"; width: number; height: number; touch: boolean; ua?: string }
const PROFILES: Profile[] = [
  ...SIZES.map(([width, height]): Profile => ({
    key: `${width}x${height}`, engine: "chromium", width, height, touch: width < 1280, ua: width < 1024 ? ANDROID : width < 1280 ? IPAD : undefined,
  })),
  { key: "390x844-wechat", engine: "webkit", width: 390, height: 844, touch: true, ua: WECHAT },
];

/**
 * 读者主路径（reader）和说明类页面；没有固定地址的从另一页（from）的第一个链接（link）找，through 是先走进去再找的那一层
 * 链接（店家页只从同一家店另有故事的故事页链接过去）。
 */
interface PageSpec { name: string; reader: boolean; path?: string; from?: string; through?: string; link?: string }
const PAGES: PageSpec[] = [
  { name: "home", reader: true, path: "/" },
  { name: "latest", reader: true, path: "/latest" },
  { name: "all", reader: true, path: "/all" },
  { name: "search", reader: true, path: "/all?q=%E6%88%BF%E7%A7%9F" },
  { name: "situation", reader: true, path: "/reference/busy-no-profit" },
  { name: "case", reader: true, from: "situation", link: 'a[href^="/reference/cases/"]' },
  { name: "shop", reader: true, from: "situation", through: 'a[href^="/reference/cases/"]', link: 'a[href^="/reference/shops/"]' },
  { name: "item", reader: true, from: "all", link: 'a[href^="/items/"]' },
  { name: "starred", reader: true, path: "/starred" },
  { name: "more", reader: true, path: "/more" },
  { name: "daily", reader: true, path: "/daily" },
  { name: "archive", reader: true, path: "/daily/archive" },
  { name: "about", reader: false, path: "/about" },
  { name: "agent", reader: false, path: "/agent" },
];

interface Metrics {
  url: string; status: number; hScroll: number;
  column: { left: number; width: number } | null;
  font: { min: number; text: string } | null;
  figure: { min: number; max: number } | null;
  smallTargets: string[]; touch: boolean;
  cpl: { max: number; text: string } | null;
}
interface Problem { profile: string; page: string; rule: string; detail: string }

/** Runs in the page: the measurements above, from what is on screen after loading. */
function measure() {
  const main = document.querySelector("#main") ?? document.body;
  // The bars fixed to the bottom (the tab bar, the article toolbar that takes its place) have 10.5px labels (A6).
  const bottomBars = [...document.querySelectorAll("nav")].filter((n) => getComputedStyle(n).position === "fixed" && getComputedStyle(n).bottom === "0px");
  const shown = (el: Element) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0.5 && r.height > 0.5 && cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0
      && !el.closest('[aria-hidden="true"], [inert], .sr-only');
  };
  const floating = (el: Element) => {
    for (let a: Element | null = el; a && a !== document.body; a = a.parentElement) {
      const p = getComputedStyle(a).position;
      if (p === "fixed" || p === "sticky") return true;
    }
    return false;
  };
  const ownText = (el: Element) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());
  const round = (n: number) => Math.round(n * 10) / 10;

  // ④ The column: the extent of what is drawn in the main area (text, images, borders, scrollers), each box cut to the
  // containers that clip it; bars that stay on screen are not part of the page.
  let left = Infinity;
  let right = -Infinity;
  for (const el of main.querySelectorAll("*")) {
    if (!shown(el) || floating(el)) continue;
    const cs = getComputedStyle(el);
    const bordered = ["Left", "Right", "Top", "Bottom"].some((s) => parseFloat(cs.getPropertyValue(`border-${s.toLowerCase()}-width`)) > 0 && cs.getPropertyValue(`border-${s.toLowerCase()}-style`) !== "none");
    const drawn = ownText(el) || /^(IMG|SVG|VIDEO|CANVAS|INPUT|SELECT|TEXTAREA|BUTTON|HR|IFRAME)$/i.test(el.tagName) || bordered || /(auto|scroll)/.test(cs.overflowX);
    if (!drawn) continue;
    let { left: l, right: r } = el.getBoundingClientRect();
    for (let a = el.parentElement; a && a !== main.parentElement; a = a.parentElement) {
      if (getComputedStyle(a).overflowX === "visible") continue;
      const box = a.getBoundingClientRect();
      l = Math.max(l, box.left);
      r = Math.min(r, box.right);
    }
    if (r - l < 1) continue;
    left = Math.min(left, l);
    right = Math.max(right, r);
  }

  // ② The smallest text on the page, the bottom bars' labels aside, and the figures' text as drawn.
  let font: { min: number; text: string } | null = null;
  for (const el of document.querySelectorAll("body *")) {
    if (!ownText(el) || !shown(el) || bottomBars.some((b) => b.contains(el)) || el.closest("svg")) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (!font || size < font.min) font = { min: round(size), text: el.textContent!.trim().slice(0, 16) };
  }
  const drawnText: number[] = [];
  for (const svg of main.querySelectorAll("svg")) {
    const vb = svg.viewBox?.baseVal;
    if (!vb || !vb.width || !shown(svg)) continue;
    const scale = svg.getBoundingClientRect().width / vb.width;
    for (const t of svg.querySelectorAll("text")) drawnText.push(round(parseFloat(getComputedStyle(t).fontSize) * scale));
  }
  const figure = drawnText.length ? { min: Math.min(...drawnText), max: Math.max(...drawnText) } : null;

  // ③ Touch targets under 44px; a link inside running text is exempt. A link stretched over its card (its ::after
  // laid over the nearest positioned box, as the list and story cards do) is as big as that box.
  const touch = matchMedia("(hover: none)").matches;
  const small: string[] = [];
  const target = (el: Element) => {
    const after = getComputedStyle(el, "::after");
    if (after.content === "none" || after.position !== "absolute" || after.top !== "0px" || after.left !== "0px") return el.getBoundingClientRect();
    for (let a: Element | null = el; a; a = a.parentElement) if (getComputedStyle(a).position !== "static") return a.getBoundingClientRect();
    return el.getBoundingClientRect();
  };
  if (touch) {
    for (const el of document.querySelectorAll('a[href], button, [role="button"], [role="tab"], input:not([type="hidden"]), select, textarea, summary')) {
      if (!shown(el)) continue;
      if (el.tagName === "A" && getComputedStyle(el).display === "inline" && el.parentElement && ownText(el.parentElement)) continue;
      const r = target(el);
      if (r.width < 43.5 || r.height < 43.5) {
        const name = (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 14);
        small.push(`${name} ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    }
  }

  // ⑥ Characters per line of reading text: the line's width over the font size (one Chinese character is one em).
  // An item that holds blocks (a list's card, a row of a number and a title) is a container, not a paragraph.
  let cpl: { max: number; text: string } | null = null;
  for (const el of main.querySelectorAll("p, li, blockquote, dd")) {
    const text = el.textContent!.trim();
    if (text.length < 40 || !shown(el) || [...el.children].some((c) => !getComputedStyle(c).display.startsWith("inline"))) continue;
    const cs = getComputedStyle(el);
    const width = el.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const n = Math.round(width / parseFloat(cs.fontSize));
    if (!cpl || n > cpl.max) cpl = { max: n, text: text.slice(0, 16) };
  }

  const de = document.documentElement;
  return {
    hScroll: Math.max(0, de.scrollWidth - de.clientWidth),
    column: Number.isFinite(left) ? { left: Math.round(left), width: Math.round(right - left) } : null,
    font, figure, smallTargets: small, touch, cpl,
  };
}

async function open(page: Page, url: string) {
  const res = await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 45000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(500);
  return res?.status() ?? 0;
}

/** The addresses of the pages found through another page's first link (behind one of its `through` links), read once at desktop width. */
async function resolvePaths(browser: Browser): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const p of PAGES) {
    if (p.path) {
      found.set(p.name, p.path);
      continue;
    }
    const from = found.get(p.from!);
    if (!from) continue;
    await open(page, from);
    const ways = p.through ? [...new Set(await page.locator(p.through).evaluateAll((as) => as.map((a) => a.getAttribute("href")!)))].slice(0, 12) : [from];
    let href: string | null = null;
    for (const way of ways) {
      if (way !== from) await open(page, way);
      href = await page.locator(p.link!).first().getAttribute("href", { timeout: 2000 }).catch(() => null);
      if (href) break;
    }
    if (href) found.set(p.name, href);
    else console.log(`没有找到 ${p.name}：${from}${p.through ? " 链接到的页" : ""}上没有 ${p.link}`);
  }
  await page.close();
  return found;
}

/** The rules of the plan (A5, A6, A9, B2) for one page in one profile; the left edges are compared after all pages. */
function check(profile: Profile, spec: PageSpec, m: Metrics): Problem[] {
  const out: Problem[] = [];
  const add = (rule: string, detail: string) => out.push({ profile: profile.key, page: spec.name, rule, detail });
  if (m.hScroll > 0) add("横向滚动", `页面比视口宽 ${m.hScroll}px`);
  if (m.font && m.font.min < 12) add("最小字号", `${m.font.min}px（${m.font.text}）`);
  if (m.figure && m.figure.min < 11) add("图中字号", `最小 ${m.figure.min}px`);
  if (m.figure && profile.width >= 961 && m.figure.max > 17) add("图中字号", `最大 ${m.figure.max}px`);
  if (m.smallTargets.length) add("点按区", `${m.smallTargets.length} 个不足 44px：${m.smallTargets.slice(0, 6).join("、")}`);
  if (spec.reader && m.status === 200 && m.column) {
    const limit = profile.width <= 640 ? profile.width - 32 : profile.width <= 960 ? 608 : 760;
    if (m.column.width > limit + 2) add("版心宽度", `${m.column.width}px，超过 ${limit}px`);
  }
  if (m.cpl && m.cpl.max > 46) add("每行字数", `约 ${m.cpl.max} 字（${m.cpl.text}）`);
  return out;
}

const browsers = { chromium: await chromium.launch(), webkit: await webkit.launch() };
const paths = await resolvePaths(browsers.chromium);
const results: Record<string, Record<string, Metrics>> = {};
const problems: Problem[] = [];

// Three profiles at a time: the server is a small one.
const queue = [...PROFILES];
await Promise.all([1, 2, 3].map(async () => {
  for (let profile = queue.shift(); profile; profile = queue.shift()) {
    const context = await browsers[profile.engine].newContext({
      viewport: { width: profile.width, height: profile.height }, deviceScaleFactor: 1, isMobile: profile.touch, hasTouch: profile.touch,
      userAgent: profile.ua, colorScheme: "light", locale: "zh-CN", reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const dir = path.join(SHOTS, profile.key);
    mkdirSync(dir, { recursive: true });
    results[profile.key] = {};
    for (const spec of PAGES) {
      const url = paths.get(spec.name);
      if (!url) continue;
      try {
        const status = await open(page, url);
        const m: Metrics = { url, status, ...(await page.evaluate(measure)) };
        results[profile.key]![spec.name] = m;
        problems.push(...check(profile, spec, m));
        await page.screenshot({ path: path.join(dir, `${spec.name}.png`) });
      } catch (error) {
        problems.push({ profile: profile.key, page: spec.name, rule: "打不开", detail: String(error).split("\n")[0]!.slice(0, 160) });
      }
    }
    await context.close();
    console.log(`${profile.key} 量完`);
  }
}));
await browsers.chromium.close();
await browsers.webkit.close();

// ⑤ Within one profile, every reader page that opened starts at the same left edge as most of them.
for (const profile of PROFILES) {
  const lefts = PAGES.filter((p) => p.reader).map((p) => ({ p, m: results[profile.key]?.[p.name] })).filter((x) => x.m?.status === 200 && x.m.column);
  const counts = new Map<number, number>();
  for (const { m } of lefts) counts.set(m!.column!.left, (counts.get(m!.column!.left) ?? 0) + 1);
  const usual = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
  for (const { p, m } of lefts) {
    if (usual !== undefined && Math.abs(m!.column!.left - usual) > 1) {
      problems.push({ profile: profile.key, page: p.name, rule: "左边缘", detail: `${m!.column!.left}px，其他主路径页是 ${usual}px` });
    }
  }
}

const key = (p: Problem) => `${p.profile} ${p.page} ${p.rule}`;
const line = (p: Problem) => `  ${p.profile} ${p.page}：${p.rule} ${p.detail}`;
const order = (a: Problem, b: Problem) => key(a).localeCompare(key(b));
if (WRITE) {
  writeFileSync(BASELINE, `${JSON.stringify({ base: BASE, takenAt: new Date().toISOString(), problems: problems.sort(order), results }, null, 1)}\n`);
  console.log(`基线已写入 ${fileURLToPath(BASELINE)}：${PROFILES.length} 种尺寸，问题 ${problems.length} 处。\n${problems.map(line).join("\n")}`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(BASELINE, "utf8")) as { problems: Problem[]; results: Record<string, Record<string, Metrics>> };
const known = new Set(baseline.problems.map(key));
const fresh = problems.filter((p) => !known.has(key(p)));
// The column moving at all, against the baseline, is what an upstream merge changing the layout looks like.
for (const [profile, pages] of Object.entries(results)) {
  for (const [name, m] of Object.entries(pages)) {
    const was = baseline.results[profile]?.[name];
    if (!was?.column || !m.column || was.status !== 200 || m.status !== 200) continue;
    const moved = [["左边缘", was.column.left, m.column.left], ["版心宽度", was.column.width, m.column.width]].filter(([, a, b]) => Math.abs(Number(a) - Number(b)) > 2);
    for (const [rule, a, b] of moved) fresh.push({ profile, page: name, rule: `${rule}变了`, detail: `基线 ${a}px，现在 ${b}px` });
  }
}
const old = problems.filter((p) => known.has(key(p)));
console.log(`基线里已有的问题 ${old.length} 处${old.length ? `：\n${old.sort(order).map(line).join("\n")}` : ""}`);
console.log(fresh.length ? `\n新问题 ${fresh.length} 处：\n${fresh.sort(order).map(line).join("\n")}` : "\n没有新问题。");
process.exit(fresh.length ? 1 : 0);
