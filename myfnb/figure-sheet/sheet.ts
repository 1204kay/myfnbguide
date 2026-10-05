// 图的总览（布局定案 J10）：把参考库里程序画的图全部渲染出来、截图、量字号和出界，给逐张审图用。
//
// 用法（一条命令重新生成全部；浏览器目录换成本机 Playwright 浏览器所在的目录）：
//   PLAYWRIGHT_BROWSERS_PATH=<浏览器目录> node myfnb/figure-sheet/sheet.ts [--refresh] [--base https://new.myfnbguide.com]
//
// 做的事：
//   1. 用 rolldown 打包同目录的 entry.tsx（它引用页面上实际的组件 figures.tsx、ui.tsx），在 Node 里渲染成 HTML；样式表用
//      Tailwind 按 apps/web/app/app.css 现编（与网站构建同一套来源），浅色、深色两套变量都来自 app.css。
//   2. 图有三类：50 张情况图（SituationDrawing / 情况页图卡）；带分组的情况图每一组突出时的样子（GroupDrawing focus）；
//      故事里程序按原文数字画的图（compare、parts、example），数据取自线上只读接口 /api/reference/situations/<slug> 和
//      /api/reference/cases/<id>，挑 28–30 篇带图的故事（各情况轮流取，补齐没出现过的图种）。接口结果存在
//      .data/figure-sheet/cache/，再跑时直接用；加 --refresh 重新取。
//   3. 每张图截四种（png/<id>--<种>.png，静态 HTML 在 html/）：
//        phone-light / phone-dark  手机 390 宽，卡片宽 358（情况页图卡；做法卡上的分组图；故事页的图）
//        narrow-light              最窄的位置：情况图在参考首页第 1 名大卡右栏（≥ 1280，宽 260，最高 200）；
//                                  分组图在 ≥ 961 做法卡右栏（宽 280，最高 220）；故事的图在 320 宽手机（卡片宽 288）
//        desktop-light             电脑：情况页图卡（栏宽 760，图最宽 360）；分组图在单店做法行卡上（图宽 328）；
//                                  故事页（栏宽 760）
//   4. 同时量：图里每个 text 实际显示的字号（px，小于 11 算问题）、是否超出 svg 的边框（会被裁掉）、文字之间是否重叠
//      （按字形的实际范围算）；HTML 部分：字号、标签（不长于 24 个字的块）在两个字之间折行（「处理杂｜事」）、数字和
//      单位分在两行、文字超出卡片、文字被容器截掉；句子里断在词中间的只列在 proseBreaks 供参考（中文排版常见）。
//      写进 measure.json。
//   5. 总览图：手机宽度浅色、深色各一套，每页 12 张，图下写编号和名称（有问题的再写一行），在 sheets/；文件清单在 index.md。
// 只读线上接口，不登录、不提交表单。输出全部在 .data/figure-sheet/（不进 git），每次运行先清掉上次的图和页面。
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rolldown } from "rolldown";
import { compile, optimize } from "@tailwindcss/node";
import { Scanner } from "@tailwindcss/oxide";
import { chromium, type Browser, type Page } from "@playwright/test";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const OUT = path.join(ROOT, ".data", "figure-sheet");
const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const BASE = (arg("--base") ?? "https://new.myfnbguide.com").replace(/\/$/, "");
const REFRESH = process.argv.includes("--refresh");
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) console.warn("提示：没有设 PLAYWRIGHT_BROWSERS_PATH，Playwright 会去默认目录找浏览器。");

/** 故事的图挑多少篇：先取够 STORIES 篇，再为还没出现过的图种补到 STORIES_MAX 篇；最多取 FETCH_MAX 篇故事。 */
const STORIES = 28;
const STORIES_MAX = 30;
const FETCH_MAX = 220;
const FIGURE_BLOCKS = new Set(["compare", "parts", "example"]);
/** 图里的字实际显示不小于 11px（布局定案 B2）。 */
const SMALL = 11;

// ---------------------------------------------------------------------------------------------------------------
// 1. 打包渲染入口、编样式表

for (const dir of ["build", "html", "png", "sheets"]) rmSync(path.join(OUT, dir), { recursive: true, force: true });
for (const dir of ["build", "html", "png", "sheets", "cache"]) mkdirSync(path.join(OUT, dir), { recursive: true });

const bundle = await rolldown({
  input: path.join(HERE, "entry.tsx"),
  platform: "node",
  cwd: ROOT,
  // npm 包在运行时从 node_modules 读；工作区的包（@aihot/*，源码是 TS）打进来。
  external: (id) => /^(react|react-dom|react-router|motion|scheduler)(\/|$)/.test(id),
  resolve: { alias: { "@aihot/web": path.join(ROOT, "apps/web/app") } },
  transform: { jsx: "react-jsx" },
  tsconfig: false,
  logLevel: "warn",
});
const ENTRY = path.join(OUT, "build", "entry.mjs");
await bundle.write({ file: ENTRY, format: "esm" });
await bundle.close();
const R: typeof import("./entry.tsx") = await import(`${pathToFileURL(ENTRY).href}?t=${Date.now()}`);

/** 与 @tailwindcss/vite 同样的扫描来源（app.css 的 @source 加 apps/web），再加 entry.tsx 自己。 */
async function siteCss(): Promise<string> {
  const file = path.join(ROOT, "apps/web/app/app.css");
  const compiler = await compile(readFileSync(file, "utf8"), { base: path.dirname(file), onDependency: () => {} });
  const root = compiler.root === "none" ? [] : compiler.root === null ? [{ base: path.join(ROOT, "apps/web"), pattern: "**/*", negated: false }] : [{ ...compiler.root, negated: false }];
  const scanner = new Scanner({ sources: [...root, ...compiler.sources, { base: HERE, pattern: "*.tsx", negated: false }] });
  return optimize(compiler.build(scanner.scan()), { minify: false }).code;
}
writeFileSync(path.join(OUT, "build", "site.css"), await siteCss());

// ---------------------------------------------------------------------------------------------------------------
// 2. 故事的数据（线上只读接口，存进 cache/）

async function api<T>(route: string): Promise<T | null> {
  const file = path.join(OUT, "cache", `${route.replace(/^\/api\/reference\//, "").replace(/[\\/]/g, "_")}.json`);
  if (!REFRESH && existsSync(file)) return JSON.parse(readFileSync(file, "utf8")) as T | null;
  const res = await fetch(BASE + route, { headers: { accept: "application/json" } });
  if (!res.ok && res.status !== 404) throw new Error(`${route}: HTTP ${res.status}`);
  const data = res.ok ? ((await res.json()) as T) : null;
  writeFileSync(file, JSON.stringify(data));
  return data;
}

type Block = Parameters<typeof R.storyFigure>[0];
interface CaseData { id: string; story: { title: string; parts: Array<{ heading: string; blocks: Block[] }> } }
interface Story { slug: string; id: string; title: string; blocks: Block[] }

/** 一种情况页里出现的故事 id，按页面上的顺序（新旧两版接口都适用：做法行的 caseId、故事卡的 id）。 */
function caseIds(page: unknown): string[] {
  const ids: string[] = [];
  const walk = (v: unknown, key?: string) => {
    if (Array.isArray(v)) for (const x of v) {
      if (key === "cases" && x && typeof (x as { id?: unknown }).id === "string") ids.push((x as { id: string }).id);
      walk(x, key);
    }
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) {
      if (k === "caseId" && typeof x === "string") ids.push(x);
      walk(x, k);
    }
  };
  walk(page);
  return [...new Set(ids)];
}

const blockName = (b: Block) => (b.type === "example" ? `example:${(b as { kind: string }).kind}` : b.type);

async function pickStories(): Promise<Story[]> {
  const perSituation: Array<[string, string[]]> = [];
  for (const s of R.situations) perSituation.push([s.slug, caseIds(await api(`/api/reference/situations/${s.slug}`))]);
  // 各情况轮流取一篇，样本分散在各种情况里。
  const queue: Array<[string, string]> = [];
  const seen = new Set<string>();
  for (let round = 0; perSituation.some(([, ids]) => ids.length > round); round++) {
    for (const [slug, ids] of perSituation) if (ids[round] && !seen.has(ids[round]!)) { seen.add(ids[round]!); queue.push([slug, ids[round]!]); }
  }
  const stories: Story[] = [];
  const kinds = new Set<string>();
  for (let i = 0; i < Math.min(queue.length, FETCH_MAX) && stories.length < STORIES_MAX; i += 4) {
    const batch = await Promise.all(queue.slice(i, i + 4).map(async ([slug, id]) => [slug, await api<CaseData>(`/api/reference/cases/${id}`)] as const));
    for (const [slug, c] of batch) {
      if (!c || stories.length >= STORIES_MAX) continue;
      const blocks = c.story.parts.flatMap((p) => p.blocks).filter((b) => FIGURE_BLOCKS.has(b.type));
      // 取够以后，只收带新图种的。
      if (!blocks.length || (stories.length >= STORIES && blocks.every((b) => kinds.has(blockName(b))))) continue;
      stories.push({ slug, id: c.id, title: c.story.title, blocks });
      for (const b of blocks) kinds.add(blockName(b));
    }
  }
  return stories;
}
const stories = await pickStories();

// ---------------------------------------------------------------------------------------------------------------
// 3. 要截的图和每种的位置

type VariantName = "phone-light" | "phone-dark" | "narrow-light" | "desktop-light";
const VARIANTS: VariantName[] = ["phone-light", "phone-dark", "narrow-light", "desktop-light"];
/** 一种截法：视口宽、舞台（图所在的栏）宽（fit 为按内容）、深浅色、放在哪里（写进 measure.json）、HTML。 */
interface Shot { viewport: number; column: number | "fit"; dark: boolean; place: string; markup: string }
interface Figure { id: string; kind: "situation" | "group" | "story"; label: string; name: string; slug: string; shots: Record<VariantName, Shot> }

const phone = (markup: string, place: string, dark: boolean): Shot => ({ viewport: 390, column: 358, dark, place, markup });
const figures: Figure[] = [];

for (const s of R.situations) {
  if (!s.kind) continue;
  const card = R.situationCard(s.slug);
  figures.push({
    id: `s-${s.slug}`, kind: "situation", label: s.slug, name: s.title, slug: s.slug,
    shots: {
      "phone-light": phone(card, "情况页图卡，手机（卡宽 358）", false),
      "phone-dark": phone(card, "情况页图卡，手机（卡宽 358）", true),
      "narrow-light": { viewport: 1440, column: "fit", dark: false, place: "参考首页第 1 名大卡右栏，≥ 1280（宽 260，最高 200）", markup: R.homeColumn(s.slug) },
      "desktop-light": { viewport: 1440, column: 760, dark: false, place: "情况页图卡，电脑（栏宽 760，图最宽 360）", markup: card },
    },
  });
}
for (const s of R.situations) {
  if (!s.grouped) continue;
  s.groups.forEach((g, i) => {
    const practice = R.groupFigure(s.slug, g.title, "practice");
    figures.push({
      id: `g-${s.slug}-${i + 1}`, kind: "group", label: `${s.slug} · 第 ${i + 1} 组`, name: g.title, slug: s.slug,
      shots: {
        "phone-light": phone(practice, "做法卡上的分组图，手机（卡宽 358）", false),
        "phone-dark": phone(practice, "做法卡上的分组图，手机（卡宽 358）", true),
        "narrow-light": { viewport: 1440, column: "fit", dark: false, place: "做法卡右栏，≥ 961（宽 280，最高 220）", markup: practice },
        "desktop-light": { viewport: 1440, column: 760, dark: false, place: "单店做法行卡最上面，电脑（图宽 328，最高 220）", markup: R.groupFigure(s.slug, g.title, "rows") },
      },
    });
  });
}
for (const st of stories) {
  st.blocks.forEach((b, i) => {
    const markup = R.storyFigure(b);
    figures.push({
      id: `c-${st.id}-${i + 1}`, kind: "story", label: `${st.slug} · ${blockName(b)}`, name: st.title, slug: st.slug,
      shots: {
        "phone-light": phone(markup, "故事页，手机（卡宽 358）", false),
        "phone-dark": phone(markup, "故事页，手机（卡宽 358）", true),
        "narrow-light": { viewport: 320, column: 288, dark: false, place: "故事页，320 宽手机（卡宽 288）", markup },
        "desktop-light": { viewport: 1440, column: 760, dark: false, place: "故事页，电脑（栏宽 760）", markup },
      },
    });
  });
}

/** 静态页：网站的样式表、页面底色，图放在 id="stage" 的栏里（四周 16px，手机上就是页面左右的边距）。 */
function pageHtml(shot: Shot, title: string): string {
  const width = shot.column === "fit" ? "width: fit-content" : `width: ${shot.column}px`;
  return `<!doctype html>
<html lang="zh-CN"${shot.dark ? ' data-theme="dark"' : ""}>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title>
<link rel="stylesheet" href="../build/site.css">
<style>body { margin: 0 } #stage { ${width}; padding: 16px; } #stage > * { margin-top: 0 }</style></head>
<body><main id="stage">${shot.markup}</main></body></html>`;
}
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------------------------------------------------------------------------------------------------------------
// 4. 截图和量（measure 在页面里运行）

interface Problem { type: "small" | "clipped" | "overlap" | "broken-word" | "number-split" | "truncated" | "overflow"; text: string; detail: string }
interface Measured {
  svgs: Array<{ width: number; height: number; drawnWidth: number; scale: number; texts: Array<{ text: string; px: number; faded: boolean }> }>;
  svgMinPx: number | null;
  htmlMinPx: number | null;
  problems: Problem[];
  /** 长句里被折断的词（正文式的标注、算式和结论句）：中文排版里常见，只列出来供参考，不算问题。 */
  proseBreaks: string[];
}

function measure(SMALL: number): Measured {
  const stage = document.getElementById("stage")!;
  const ctx = document.createElement("canvas").getContext("2d")!;
  const problems: Problem[] = [];
  const proseBreaks: string[] = [];
  const round = (n: number) => Math.round(n * 10) / 10;
  const svgs: Measured["svgs"] = [];
  let svgMin: number | null = null;
  let htmlMin: number | null = null;

  for (const svg of stage.querySelectorAll("svg")) {
    const box = svg.getBoundingClientRect();
    const ctm = svg.getScreenCTM()!;
    const scale = Math.hypot(ctm.a, ctm.b);
    const texts: Measured["svgs"][number]["texts"] = [];
    const inks: Array<{ text: string; l: number; r: number; t: number; b: number }> = [];
    for (const t of svg.querySelectorAll("text")) {
      const content = (t.textContent ?? "").trim();
      if (!content) continue;
      const cs = getComputedStyle(t);
      const m = t.getScreenCTM()!;
      const s = Math.hypot(m.a, m.b);
      const px = parseFloat(cs.fontSize) * s;
      let opacity = 1;
      for (let e: Element | null = t; e && e !== svg.parentElement; e = e.parentElement) opacity *= parseFloat(getComputedStyle(e).opacity);
      texts.push({ text: content, px: round(px), faded: opacity < 0.9 });
      svgMin = svgMin === null ? px : Math.min(svgMin, px);
      if (px < SMALL - 0.05) problems.push({ type: "small", text: content, detail: `${round(px)}px` });
      // 字形的实际范围：竖向是基线加上画布量出的字形高低；横向取字宽框和画布字形边界的交集（画布在字的边缘会多算约
      // 1px，放大截图核过：贴着图框左边的字没有被裁）。
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const mt = ctx.measureText(t.textContent ?? "");
      const p = t.getStartPositionOfChar(0);
      const o = new DOMPoint(p.x, p.y).matrixTransform(m);
      const adv = t.getBoundingClientRect();
      const ink = {
        text: content,
        l: Math.max(adv.left, o.x - mt.actualBoundingBoxLeft * s), r: Math.min(adv.right, o.x + mt.actualBoundingBoxRight * s),
        t: o.y - mt.actualBoundingBoxAscent * s, b: o.y + mt.actualBoundingBoxDescent * s,
      };
      inks.push(ink);
      const out = Math.max(box.left - ink.l, ink.r - box.right, box.top - ink.t, ink.b - box.bottom);
      if (out > 1) problems.push({ type: "clipped", text: content, detail: `超出图框 ${round(out)}px，超出的部分被裁掉` });
    }
    for (let i = 0; i < inks.length; i++) for (let j = i + 1; j < inks.length; j++) {
      const a = inks[i]!, b = inks[j]!;
      const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
      const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
      if (w > 1 && h > 1) problems.push({ type: "overlap", text: `${a.text} ／ ${b.text}`, detail: `重叠 ${round(w)}×${round(h)}px` });
    }
    const vb = svg.viewBox.baseVal;
    svgs.push({ width: round(box.width), height: round(box.height), drawnWidth: round((vb?.width || box.width / scale) * scale), scale: Math.round(scale * 1000) / 1000, texts });
  }

  // HTML 的字按所在的块（标签、段落、横条里的一段）归在一起，量每个字在第几行，再看折行的地方断在哪里。
  const words = new Intl.Segmenter("zh-Hans", { granularity: "word" });
  const range = document.createRange();
  const blocks = new Map<Element, Array<{ ch: string; mid: number | null; px: number; at: number }>>();
  const clippedBy = (el: Element, frame: Element) => {
    for (let e: Element | null = el; e && e !== frame; e = e.parentElement) if (/hidden|clip/.test(getComputedStyle(e).overflowX)) return true;
    return false;
  };
  const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const el = node.parentElement!;
    if (!node.data.trim() || el.closest("svg")) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    htmlMin = htmlMin === null ? px : Math.min(htmlMin, px);
    if (px < SMALL - 0.05) problems.push({ type: "small", text: node.data.trim(), detail: `${round(px)}px` });
    let block: Element = el;
    while (block !== stage && ["inline", "contents"].includes(getComputedStyle(block).display)) block = block.parentElement!;
    const chars = blocks.get(block) ?? [];
    for (let i = 0; i < node.length; i++) {
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const r = range.getClientRects()[0];
      chars.push({ ch: node.data[i]!, mid: r && /\S/.test(node.data[i]!) ? r.top + r.height / 2 : null, px, at: chars.length });
    }
    blocks.set(block, chars);
    // 文字跑出所在的卡片（卡片外面的小标签按舞台算；被容器截掉的另算，见下面的 truncated）。
    const frame = el.closest(".card") ?? stage;
    if (!clippedBy(el, frame)) {
      range.selectNodeContents(node);
      const tr = range.getBoundingClientRect();
      const fr = frame.getBoundingClientRect();
      const out = Math.max(fr.left - tr.left, tr.right - fr.right);
      if (out > 0.5) problems.push({ type: "overflow", text: node.data.trim(), detail: `超出卡片 ${round(out)}px` });
    }
  }
  const WORD = /[一-鿿A-Za-z0-9]/;
  for (const chars of blocks.values()) {
    const text = chars.map((c) => c.ch).join("").replace(/\s+/g, " ").trim();
    // 标签：不长于 24 个字的块（图例、横条和柱子的名字、时间表的一行）；更长的是句子（图下的标注、结论句）。
    const label = text.replace(/\s/g, "").length <= 24;
    const shown = chars.filter((c) => c.mid !== null);
    const lines: number[] = [];
    for (const m of shown.map((c) => c.mid!).sort((a, b) => a - b)) if (!lines.length || m - lines[lines.length - 1]! > chars[0]!.px * 0.6) lines.push(m);
    const lineOf = (c: { mid: number | null; px: number }) => lines.findIndex((l) => Math.abs(c.mid! - l) <= c.px * 0.6);
    if (lines.length < 2) continue;
    const joined = chars.map((c) => c.ch).join("");
    const wordAt = new Map<number, string>();
    for (const sg of words.segment(joined)) if (sg.isWordLike && sg.segment.length > 1) for (let i = sg.index; i < sg.index + sg.segment.length; i++) wordAt.set(i, `${sg.index}:${sg.segment}`);
    for (let k = 1; k < shown.length; k++) {
      const a = shown[k - 1]!, b = shown[k]!;
      if (lineOf(a) === lineOf(b)) continue;
      const around = `${joined.slice(Math.max(0, a.at - 7), a.at + 1).trimStart()}｜${joined.slice(b.at, b.at + 7).trimEnd()}`;
      // 数字和后面的单位分在两行（「300,000｜卢比」）。
      if (/[\d%]/.test(a.ch) && /[一-鿿]/.test(b.ch)) problems.push({ type: "number-split", text, detail: `${label ? "标签" : "句子"}里「${around}」` });
      else if (label && WORD.test(a.ch) && WORD.test(b.ch)) problems.push({ type: "broken-word", text, detail: `「${around}」` });
      else if (!label && wordAt.has(a.at) && wordAt.get(a.at) === wordAt.get(b.at)) proseBreaks.push(`「${around}」：${text.slice(0, 40)}${text.length > 40 ? "…" : ""}`);
    }
  }
  // 被容器截掉的文字（不折行、超出部分隐藏的标签，例如横条里的分段名）。
  for (const el of stage.querySelectorAll<HTMLElement>("*")) {
    if (el.closest("svg")) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim()).map((n) => n.textContent!.trim()).join("");
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (/hidden|clip/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1) problems.push({ type: "truncated", text: own, detail: `只显示了 ${el.clientWidth}px，文字要 ${el.scrollWidth}px` });
  }
  return { svgs, svgMinPx: svgMin === null ? null : round(svgMin), htmlMinPx: htmlMin === null ? null : round(htmlMin), problems, proseBreaks };
}

interface Result { figure: Figure; variant: VariantName; html: string; png: string; measured: Measured }

async function shoot(browser: Browser): Promise<Result[]> {
  const jobs = figures.flatMap((figure) => VARIANTS.map((variant) => ({ figure, variant })));
  const results: Result[] = [];
  const contexts = new Map<number, Awaited<ReturnType<Browser["newContext"]>>>();
  const context = async (width: number) => {
    if (!contexts.has(width)) contexts.set(width, await browser.newContext({ viewport: { width, height: width < 961 ? 844 : 900 }, deviceScaleFactor: 2 }));
    return contexts.get(width)!;
  };
  const pages = new Map<string, Page>();
  const run = async (lane: number, job: { figure: Figure; variant: VariantName }) => {
    const shot = job.figure.shots[job.variant];
    const key = `${lane}-${shot.viewport}`;
    if (!pages.has(key)) pages.set(key, await (await context(shot.viewport)).newPage());
    const page = pages.get(key)!;
    const name = `${job.figure.id}--${job.variant}`;
    const html = path.join(OUT, "html", `${name}.html`);
    const png = path.join(OUT, "png", `${name}.png`);
    writeFileSync(html, pageHtml(shot, `${job.figure.label} ${job.figure.name}`));
    await page.goto(pathToFileURL(html).href);
    await page.evaluate(() => document.fonts.ready);
    const measured = await page.evaluate(measure, SMALL);
    await page.locator("#stage").screenshot({ path: png });
    results.push({ figure: job.figure, variant: job.variant, html, png, measured });
  };
  const LANES = 4;
  let next = 0;
  await Promise.all(Array.from({ length: LANES }, async (_, lane) => {
    while (next < jobs.length) await run(lane, jobs[next++]!);
  }));
  for (const c of contexts.values()) await c.close();
  return results;
}

const browser = await chromium.launch();
const results = await shoot(browser);

// ---------------------------------------------------------------------------------------------------------------
// 5. 总览图、measure.json、index.md

const rel = (file: string) => path.relative(OUT, file).split(path.sep).join("/");
const byId = new Map<string, Partial<Record<VariantName, Result>>>();
for (const r of results) byId.set(r.figure.id, { ...byId.get(r.figure.id), [r.variant]: r });

const PROBLEM_NAMES: Record<Problem["type"], string> = {
  small: "字号小于 11px", clipped: "出界", overlap: "重叠", "broken-word": "折断", "number-split": "数字和单位分行",
  truncated: "文字被截掉", overflow: "超出卡片",
};
/** 一张图四种截法里的问题，按种类合并：「出界 2（手机、窄栏）」。 */
function problemLine(id: string): string {
  const counts = new Map<string, Set<string>>();
  for (const [variant, r] of Object.entries(byId.get(id) ?? {})) for (const p of r!.measured.problems) {
    const k = PROBLEM_NAMES[p.type];
    counts.set(k, (counts.get(k) ?? new Set()).add(variant));
  }
  return [...counts].map(([k, v]) => `${k}（${[...v].join("、")}）`).join("；");
}

const PER_SHEET = 12;
const sheets: string[] = [];
for (const theme of ["light", "dark"] as const) {
  const variant: VariantName = theme === "light" ? "phone-light" : "phone-dark";
  const total = Math.ceil(figures.length / PER_SHEET);
  for (let n = 0; n < total; n++) {
    const part = figures.slice(n * PER_SHEET, (n + 1) * PER_SHEET);
    const cells = part.map((f) => {
      const r = byId.get(f.id)![variant]!;
      const issues = problemLine(f.id);
      return `<figure><img src="../${rel(r.png)}" width="390" alt=""><figcaption><b>${escape(f.label)}</b><br>${escape(f.name)}${issues ? `<br><span class="bad">${escape(issues)}</span>` : ""}</figcaption></figure>`;
    }).join("");
    const html = `<!doctype html><html lang="zh-CN"${theme === "dark" ? ' data-theme="dark"' : ""}><head><meta charset="utf-8"><link rel="stylesheet" href="../build/site.css">
<style>
body { margin: 0; background: color-mix(in srgb, var(--ink) 9%, var(--bg)); color: var(--ink-2); font-size: 14px; }
header { padding: 20px 24px 0; font-size: 15px; color: var(--ink-3) } header b { color: var(--ink); font-size: 18px; margin-right: 10px }
main { display: grid; grid-template-columns: repeat(4, 390px); gap: 28px 20px; padding: 20px 24px 28px; align-items: start; width: max-content }
figure { margin: 0 } img { display: block; border-radius: 4px } figcaption { margin-top: 8px; font-size: 13px; line-height: 1.5 } figcaption b { color: var(--ink) }
.bad { color: var(--hot) }
</style></head><body><header><b>MyF&amp;B 图总览</b>手机宽度（卡宽 358），${theme === "light" ? "浅色" : "深色"} · 第 ${n + 1}/${total} 页 · 第 ${n * PER_SHEET + 1}–${n * PER_SHEET + part.length} 张，共 ${figures.length} 张</header><main>${cells}</main></body></html>`;
    const file = path.join(OUT, "sheets", `sheet-${theme}-${String(n + 1).padStart(2, "0")}.html`);
    writeFileSync(file, html);
    sheets.push(file);
  }
}
{
  const page = await (await browser.newContext({ viewport: { width: 1720, height: 1200 }, deviceScaleFactor: 2 })).newPage();
  for (const file of sheets) {
    await page.goto(pathToFileURL(file).href);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    });
    await page.screenshot({ path: file.replace(/\.html$/, ".jpg"), fullPage: true, type: "jpeg", quality: 82 });
  }
}
await browser.close();

const issues = results.filter((r) => r.measured.problems.length).map((r) => ({
  id: r.figure.id, variant: r.variant, label: r.figure.label, name: r.figure.name, png: rel(r.png), problems: r.measured.problems,
}));
writeFileSync(path.join(OUT, "measure.json"), JSON.stringify({
  generatedAt: new Date().toISOString(),
  api: BASE,
  rule: `图里的文字实际显示不小于 ${SMALL}px（布局定案 B2）；出界按字形的实际范围和 svg 的边框比；重叠按字形的实际范围算（大于 1×1px）`,
  browser: `Chromium ${browser.version()}，Windows 字体（中文为微软雅黑），deviceScaleFactor 2`,
  variants: {
    "phone-light": "手机 390 宽，卡宽 358，浅色", "phone-dark": "同上，深色",
    "narrow-light": "最窄的位置：情况图在首页第 1 名大卡右栏（260，最高 200）；分组图在做法卡右栏（280，最高 220）；故事的图在 320 宽手机（卡宽 288）",
    "desktop-light": "电脑：情况页图卡（图最宽 360）；分组图在单店做法行卡（图宽 328）；故事页（栏宽 760）",
  },
  summary: Object.fromEntries(Object.keys(PROBLEM_NAMES).map((t) => [t, issues.flatMap((i) => i.problems.filter((p) => p.type === t).map((p) => `${i.id} [${i.variant}] ${p.text}：${p.detail}`))])),
  issues,
  figures: figures.map((f) => ({
    id: f.id, kind: f.kind, label: f.label, name: f.name, slug: f.slug,
    variants: Object.fromEntries(VARIANTS.map((v) => {
      const r = byId.get(f.id)![v]!;
      return [v, { place: f.shots[v].place, html: rel(r.html), png: rel(r.png), ...r.measured }];
    })),
  })),
}, null, 1));

const KIND_TITLES = { situation: "情况图（每种情况一张）", group: "分组图（带分组的情况图，每一组突出）", story: "故事里程序画的图（原文数据图、举例算例）" };
const md = [
  "# 图的总览",
  "",
  `生成于 ${new Date().toISOString().slice(0, 16).replace("T", " ")}（UTC）。重新生成：\`PLAYWRIGHT_BROWSERS_PATH=<浏览器目录> node myfnb/figure-sheet/sheet.ts\`（加 \`--refresh\` 重新取线上故事数据）。`,
  "下面的路径都相对于 `.data/figure-sheet/`；每张图的静态 HTML 在 `html/`，文件名与截图相同。量出来的结果在 `measure.json`（`summary` 按问题种类列出）。",
  "",
  "## 总览图",
  "",
  ...sheets.map((f) => `- [${rel(f).replace(/\.html$/, ".jpg")}](${rel(f).replace(/\.html$/, ".jpg")})`),
  "",
  ...(["situation", "group", "story"] as const).flatMap((kind) => [
    `## ${KIND_TITLES[kind]}`,
    "",
    "| 编号 | 名称 | 手机浅色 | 手机深色 | 最窄位置 | 电脑 | 量出的问题 |",
    "|---|---|---|---|---|---|---|",
    ...figures.filter((f) => f.kind === kind).map((f) => {
      const r = byId.get(f.id)!;
      return `| ${f.label} | ${f.name} | ${VARIANTS.map((v) => `[png](${rel(r[v]!.png)})`).join(" | ")} | ${problemLine(f.id) || "—"} |`;
    }),
    "",
  ]),
].join("\n");
writeFileSync(path.join(OUT, "index.md"), md);

console.log(`图 ${figures.length} 张（情况 ${figures.filter((f) => f.kind === "situation").length}，分组 ${figures.filter((f) => f.kind === "group").length}，故事 ${figures.filter((f) => f.kind === "story").length}，来自 ${stories.length} 篇故事），截图 ${results.length} 张，总览 ${sheets.length} 页。`);
for (const [type, name] of Object.entries(PROBLEM_NAMES)) {
  const n = issues.reduce((sum, i) => sum + i.problems.filter((p) => p.type === type).length, 0);
  if (n) console.log(`  ${name}：${n} 处`);
}
console.log(`输出：${OUT}`);
