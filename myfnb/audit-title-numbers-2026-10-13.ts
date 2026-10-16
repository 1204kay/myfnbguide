// 2026-10-13：逐篇核对故事标题里的数目（金额、店数、年数、百分比、“十条”“七个”）和原文、正文对不对得上。
// 只读，不调模型，不写库。线上约 260 篇故事不在任何（够厚的）情况页里，当时只抽了标题带 3–20 数目的 65 篇读过；
// 这里把所有显示中的故事都过一遍，不在情况页里的单独标出来。写入时的检查程序对 12 以下的数不查（checks.ts SMALL），
// 这里不留这个例外。
//
// 每个标题里的数分两类：
//   数字：带单位的金额、百分比、年数、大于 12 的数 → 必须在原文里写着（用写入时同一套读法：lakh、万、空格千位、英文数词……）
//   个数：“十条”“七个”“五步”这类 → 原文写着这个数，或者正文数得到这么多条（列表、步骤、小标题），算对得上
// 结论四档：OK（对得上）/ 个数对不上 / 数字在原文里找不到 / 原文已删除。
//
// 不带参数打印汇总，并把全部明细写到 .data/title-numbers-2026-10-13.tsv（不进仓库）；--all 同时打印 OK 的明细。
//   sudo docker compose exec -T worker node myfnb/audit-title-numbers-2026-10-13.ts [--all]
// 取出明细：sudo docker compose exec -T worker cat .data/title-numbers-2026-10-13.tsv > ~/title-numbers.tsv
// --context：每条没对上的，再打印正文里提到这个数的一段、原文里数值相近（一半到两倍）的几段，供逐篇对着原文判断。
// 10-16 经 myfnb-ops 跑时 worker 写不了 .data（EACCES），明细写不进去就只打印，不中断。
import { mkdirSync, writeFileSync } from "node:fs";
import { closeDb, sql } from "@aihot/backend/db";
import { loadAnalyzeInput } from "@aihot/backend/editorial/analyze";
import { renderContext } from "@aihot/backend/editorial/writing";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { selectedCondition } from "@aihot/backend/publication/scope";
import { SERVER_MODULES } from "@aihot/site/modules/server";
import { kanjiNumber, sourceNumbers } from "../modules/reference/backend/checks.ts";
import { LISTED } from "../modules/reference/backend/read.ts";
import { OWNERS } from "../modules/reference/situations.ts";
import type { CaseStory } from "../modules/reference/types.ts";

installModules(SERVER_MODULES);
const showAll = process.argv.includes("--all");
const withContext = process.argv.includes("--context");

/** text 里 needle 前后各 60 字，换行压成空格。 */
function around(text: string, at: number, length: number): string {
  return text.slice(Math.max(0, at - 60), at + length + 60).replace(/\s+/g, " ");
}

/** 原文里数值在 value 的一半到两倍之间的数（最多 4 段），以及正文里提到这个数的那段。 */
function context(storyText: string, sourceText: string, n: Mention): string[] {
  const out: string[] = [];
  const inStory = storyText.normalize("NFKC").indexOf(n.text.replace(/[^\d.%一-龥]/gu, "").slice(0, 4));
  if (inStory >= 0) out.push(`    正文：…${around(storyText.normalize("NFKC"), inStory, n.text.length)}…`);
  let shown = 0;
  for (const m of sourceText.matchAll(/\d[\d,. ]*\d|\d/g)) {
    const v = Number(m[0].replace(/[, ]/g, ""));
    if (!Number.isFinite(v) || v < n.value / 2 || v > n.value * 2) continue;
    out.push(`    原文：…${around(sourceText, m.index!, m[0].length)}…`);
    if (++shown >= 4) break;
  }
  if (!shown) out.push("    原文：没有数值相近的数字");
  return out;
}

/** 个数后面跟的量词：数出来的是“几条、几步”，不是金额。 */
const COUNTER = "个|条|项|步|件|种|招|点|大|类|位|家|名|次|道|篇|段|套|样|层|轮|人|句|则|关|招";
const KANJI = "〇零一二两三四五六七八九十百千万";
/** 汉字数后面跟这些，是年数、金额、倍数，不是“几条”：按数字核对。 */
const MEASURE = "年|岁|个月|月|周|天|倍|成|万|亿|元|美元|日元|欧元|英镑";
const TOKEN = new RegExp(`(\\d+(?:[.,]\\d+)*\\s*[%％]?|[${KANJI}]+)(?:(\\s*(?:${COUNTER}))|(?:\\s*(${MEASURE})))?`, "gu");

const EN: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, dozen: 12,
};

interface Mention { text: string; value: number; counted: boolean }

/** 标题里的数：数字和汉字数。单个“一”“两”（一家、两位）不当数目，3 以下的个数也不查。 */
function mentions(title: string): Mention[] {
  const out: Mention[] = [];
  const normal = title.normalize("NFKC");
  for (const m of normal.matchAll(TOKEN)) {
    const raw = m[1]!.trim();
    const counted = Boolean(m[2]);
    const measured = Boolean(m[3]);
    const isKanji = new RegExp(`^[${KANJI}]+$`, "u").test(raw);
    const base = isKanji ? kanjiNumber(raw) : Number(raw.replace(/[%,]/g, "").replace(/\s/g, ""));
    // “3.5 万美元”：原文写 35,000 或 3.5 万都算，核对时按整数 35000 找（sourceNumbers 两种写法都读成 35000）。
    const value = base !== null && m[3] === "万" ? Math.round(base * 10_000) : base !== null && m[3] === "亿" ? Math.round(base * 100_000_000) : base;
    if (value === null || !Number.isFinite(value)) continue;
    if (isKanji && !counted && !measured) continue; // “十分”“万一”这类，没有量词也没有单位的汉字数不当数目
    if (isKanji && value < 3) continue; // 一家、两位
    out.push({ text: (raw + (m[2] ?? m[3] ?? "")).replace(/\s+/g, ""), value, counted });
  }
  return out;
}

/** 原文里写出来的数，加上英文数词（one … twenty）。 */
function sourceValues(text: string): Set<string> {
  const found = sourceNumbers(text);
  for (const w of text.toLowerCase().match(/[a-z]+/g) ?? []) if (w in EN) found.add(String(EN[w]));
  return found;
}

/** 正文数得到几条：列表项、步骤、小标题，各自的最大值和总和。 */
function bodyCounts(story: CaseStory): Set<number> {
  const counts = new Set<number>([story.parts.length]);
  let lists = 0;
  for (const part of story.parts) for (const b of part.blocks) {
    if (b.type === "list") { counts.add(b.items.length); lists += b.items.length; }
    if (b.type === "flow") { counts.add(b.steps.length); lists += b.steps.length; }
    if (b.type === "numbers" || b.type === "compare" || b.type === "parts") counts.add(b.items.length);
  }
  if (lists) counts.add(lists);
  return counts;
}

const now = new Date();
const listed = new Set((await sql<{ slug: string }[]>`
  SELECT u.slug FROM reference_cases c
  JOIN publications p ON p.article_id = c.article_id
  CROSS JOIN LATERAL unnest(c.situations) AS u(slug)
  WHERE c.status = 'story' AND ${selectedCondition(now)} GROUP BY u.slug
  HAVING count(DISTINCT CASE
    WHEN p.source_id IN ${sql(Object.keys(OWNERS))} THEN 'source:' || p.source_id
    WHEN c.shop_key IS NOT NULL THEN 'shop:' || c.shop_key
    WHEN c.story #>> '{shop,speaker}' IN ('adviser', 'vendor', 'media') THEN NULL
    ELSE 'source:' || p.source_id END) >= ${LISTED.fromShops}`).map((r) => r.slug));

const rows = await sql<{ id: string; story: CaseStory; situations: string[] }[]>`
  SELECT c.article_id AS id, c.story, c.situations FROM reference_cases c
  JOIN publications p ON p.article_id = c.article_id
  WHERE c.status = 'story' AND ${selectedCondition(now)} ORDER BY c.article_id`;

const tsv: string[] = ["id\t在情况页\t结论\t标题\t数\t类别\t说明"];
const tally = { stories: 0, withNumber: 0, notOnPage: 0, notOnPageWithNumber: 0, ok: 0, count: 0, figure: 0, gone: 0 };
const shown: string[] = [];
for (const r of rows) {
  tally.stories++;
  const onPage = r.situations.some((s) => listed.has(s));
  if (!onPage) tally.notOnPage++;
  const found = mentions(r.story.title);
  if (!found.length) continue;
  tally.withNumber++;
  if (!onPage) tally.notOnPageWithNumber++;
  const a = await loadAnalyzeInput(r.id);
  for (const n of found) {
    let verdict = "OK", note = "";
    if (!a) { verdict = "原文已删除"; tally.gone++; }
    else {
      const sourceText = renderContext(a);
      const source = sourceValues(sourceText);
      const inSource = source.has(String(n.value));
      if (n.counted) {
        const body = bodyCounts(r.story);
        if (inSource) note = "原文写着这个数";
        else if (body.has(n.value)) note = `正文数得到 ${n.value} 条`;
        else { verdict = "个数对不上"; note = `原文没写，正文能数到 ${[...body].filter((x) => x > 1).sort((x, y) => x - y).join("/") || "无"}`; tally.count++; }
      } else if (!inSource) { verdict = "数字在原文里找不到"; tally.figure++; }
      else note = "原文写着";
    }
    if (verdict === "OK") tally.ok++;
    tsv.push([r.id, onPage ? "是" : "否", verdict, r.story.title, n.text, n.counted ? "个数" : "数字", note].join("\t"));
    if (verdict !== "OK" || showAll) shown.push(`${verdict}\t${onPage ? "页内" : "页外"}\t${r.id}\t「${r.story.title}」\t${n.text}\t${note}`);
    if (verdict !== "OK" && withContext && a) shown.push(...context(JSON.stringify(r.story.parts), renderContext(a), n));
  }
}
let saved = true;
try {
  mkdirSync(".data", { recursive: true });
  writeFileSync(".data/title-numbers-2026-10-13.tsv", tsv.join("\n") + "\n");
} catch { saved = false; }
console.log(shown.join("\n"));
console.log(`\n显示中的故事 ${tally.stories} 篇，其中不在够厚的情况页里 ${tally.notOnPage} 篇；标题带数目的 ${tally.withNumber} 篇（页外 ${tally.notOnPageWithNumber} 篇）`);
console.log(`逐个数核对：OK ${tally.ok}，个数对不上 ${tally.count}，数字在原文里找不到 ${tally.figure}，原文已删除 ${tally.gone}`);
console.log(saved ? "明细：.data/title-numbers-2026-10-13.tsv" : "明细没写成（.data 不可写），以上面打印的为准");
await stopBoss();
await closeDb();
