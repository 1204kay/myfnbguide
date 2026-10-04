// The program's reading of a written case before anyone sees it: every number must be found in the original
// (examples excepted: their numbers are the program's own), and the reader-facing wording rules hold
// (myfnb/HANDOFF.md §3, §3.1). No model is asked; a case that fails is written once more with the problems
// named, and held back if it still fails.
import type { Block, CaseStory } from "../types.ts";
import { exampleNumbers } from "./examples.ts";
import { SITUATIONS } from "../situations.ts";

/** Counts this small read as words, not data ("3 家店", "2 个人"), and are not looked up. */
const SMALL = 12;

const KANJI: Record<string, number> = { 〇: 0, 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const KANJI_UNIT: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };

/** "二十六" → 26, "三千五百" → 3500, "一万二千" → 12000; null when it is not a number. */
export function kanjiNumber(text: string): number | null {
  let total = 0, section = 0, digit: number | null = null;
  for (const ch of text) {
    if (ch in KANJI) digit = KANJI[ch]!;
    else if (ch in KANJI_UNIT) { section += (digit ?? 1) * KANJI_UNIT[ch]!; digit = null; }
    else if (ch === "万") { total += (section + (digit ?? 0)) * 10_000; section = 0; digit = null; }
    else return null;
  }
  const n = total + section + (digit ?? 0);
  return text ? n : null;
}

const WORDS: Record<string, number> = {
  thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
};

/** The ways one written number may be meant: "1,503" and "1.503" as 1503, "1.5" as 1.5. */
function forms(token: string): string[] {
  const t = token.replace(/[，,](?=\d{3}\b)/g, ",");
  const out = new Set<string>([t.replace(/[,.\s]/g, "")]);
  if (/^\d+(?:,\d{3})*\.\d+$/.test(t)) out.add(t.replace(/,/g, ""));
  if (/^\d+,\d{1,2}$/.test(t)) out.add(t.replace(",", "."));
  return [...out].map((f) => f.replace(/^0+(?=\d)/, ""));
}

const DIGITS = /\d+(?:[.,]\d+)*/g;

/** Every number the original writes, in every form it may be read. */
export function sourceNumbers(text: string): Set<string> {
  const normal = text.normalize("NFKC");
  const found = new Set<string>();
  for (const token of normal.match(DIGITS) ?? []) for (const f of forms(token)) found.add(f);
  for (const run of normal.match(/[〇零一二两三四五六七八九十百千万]+/g) ?? []) {
    const n = kanjiNumber(run);
    if (n !== null) found.add(String(n));
  }
  for (const word of normal.toLowerCase().match(/[a-z]+/g) ?? []) if (word in WORDS) found.add(String(WORDS[word]));
  // "2.5 million", "1,2 milhão", "1.2 万", "3만", "5 mil" (thousand in Portuguese and Spanish), "55k": the value written out.
  const SCALES: Array<[RegExp, number]> = [[/^(million|millions|milh(?:ão|ões)|millones?|milioni?|億|억)$/i, 1_000_000], [/^(万|만)$/, 10_000], [/^(mil|k|千|천|thousand)$/i, 1000]];
  for (const m of normal.matchAll(/(\d+(?:[.,]\d+)?)\s*(millions?|milh(?:ão|ões)|millones?|milioni?|thousand|mil\b|k\b|[万만億억千천])/gi)) {
    const n = Number(m[1]!.replace(",", "."));
    const scale = SCALES.find(([word]) => word.test(m[2]!))![1] * (/^(億|억)$/.test(m[2]!) ? 100 : 1);
    found.add(String(Math.round(n * scale)));
  }
  return found;
}

/** The numbers of a story text that are not in the original. */
export function unfoundNumbers(text: string, source: Set<string>): string[] {
  const missing: string[] = [];
  const normal = text.normalize("NFKC");
  for (const m of normal.matchAll(DIGITS)) {
    const token = m[0];
    const value = Number(token.replace(/,/g, ""));
    if (Number.isFinite(value) && value <= SMALL && !token.includes(".")) continue;
    // "120 万", "300 多万" for an original's "1.2 million", "3 million".
    const unit = /^\s*多?([万亿])/.exec(normal.slice(m.index + token.length))?.[1];
    const scaled = unit ? [String(Math.round(value * (unit === "万" ? 10_000 : 100_000_000)))] : [];
    if (![...forms(token), ...scaled].some((f) => source.has(f))) missing.push(token);
  }
  return missing;
}

/**
 * Words a reader must not meet (HANDOFF §3): spoken or slang words, promises about the content, “同行”,
 * a country left as “全国/本地”, teaching the reader. Each with what to write instead, for the second try.
 */
const WORDING: Array<[RegExp, string]> = [
  // 演讲、主讲、讲座、讲究、讲话（名词）这类书面词不算。
  [/(?<![演主听宣])讲(?![述解座究义课台话师稿])/u, "“讲”改成“说”“介绍”“谈到”"],
  [/砍|废掉|废了/u, "“砍”“废掉”改成“削减”“取消”"],
  [/搞|弄(?!清)/u, "“搞”“弄”改成“做”“处理”"],
  [/啥|咋/u, "“啥”“咋”改成“什么”“怎么”"],
  [/掉了/u, "“掉了”改成“下降”“失去”"],
  [/坑/u, "“坑”改成“风险”“陷阱”"],
  [/档口|摊档/u, "“档口”“摊档”改成“摊位”"],
  [/逛/u, "“逛”改成“浏览”“走访”“参观”"],
  [/关掉/u, "“关掉”改成“关闭”"],
  [/扛|干活|管用/u, "口语词，改成“承担”“工作”“有效”这类书面说法"],
  // Japanese words written in Chinese characters that a Chinese reader does not use this way.
  [/配膳|下膳|即战力|即戦力|月额|现地调查/u, "日文词，换成中文说法（送餐、收碗盘、马上能独当一面的人、月费、现场勘查）"],
  [/网红/u, "“网红”改成“在社交媒体上走红”"],
  [/老板们|别家店|做餐饮的人/u, "改成“经营者”“其他店家”"],
  [/同行/u, "不用“同行”，写“其他店家”“经营者”或店名"],
  [/全国|我国|国内/u, "写出具体的国家名"],
  [/本地|本市/u, "写成“当地”或具体的城市名"],
  [/限额以上/u, "统计口径换成白话"],
  [/用得上|帮你|少走弯路|干货|揭秘|必看|权威|最全/u, "不替内容担保，不说读者会得到什么"],
  [/你应该|建议你|务必|一定要|老板要(?!求)/u, "只说明这家店怎么做，不教读者"],
  [/先看|(?<!不)再看(?!重)|首先|其次|第一步|第二步/u, "不用说明顺序的词"],
  [/原价率|原価率/u, "写成“食材成本率”"],
];

/**
 * At most this many characters a reader reads, examples left out (HANDOFF §2.3: no whole rewrite). The sample's
 * stories are 325–1,109; the prompt asks 400–800. 1,100 held back 25 of 118 on 10/4 even with every block capped.
 */
export const MAX_CHARS = 1300;

const chars = (text: string) => [...text.replace(/\s/g, "")].length;

/**
 * Text left in a foreign language: Japanese or Korean beyond a short name in 「」, or a run of eight Latin
 * words (a sentence, not a name).
 */
export function untranslated(text: string): string | null {
  const bare = text.replace(/「[^「」]{1,12}」/g, "");
  if ((bare.match(/[\u3040-\u309f]/g)?.length ?? 0) >= 6) return "日文";
  if ((bare.match(/[\uac00-\ud7af]/g)?.length ?? 0) >= 6) return "韩文";
  if (/(?:[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’-]*[\s,;:]+){7,}[A-Za-zÀ-ÿ]/.test(text)) return "外文句子";
  return null;
}

/** Headings that are labels instead of content (HANDOFF §3.1). */
const LABELS = /^(这是谁|是谁|谁|发生了什么|经过|为什么|原因|怎么做|做法|结果|总结|小结|结语|背景|启示|要点)$/u;

function blockTexts(block: Block): string[] {
  switch (block.type) {
    case "text": return [block.text];
    case "list": return block.items.flatMap((i) => [i.lead ?? "", i.text]);
    case "flow": return block.steps;
    case "quote": return [block.text, block.who];
    case "compare": return [block.caption, ...block.items.map((i) => i.label)];
    case "parts": return [block.caption, ...block.items.map((i) => i.label), block.against?.label ?? ""];
    case "example": return [block.caption];
  }
}

/** Every text of a story a reader reads, with where it is and whether its numbers come from the original. */
function texts(story: CaseStory): Array<[where: string, text: string, fromSource: boolean]> {
  return [
    ["标题", story.title, true], ["开头", story.lead, true], ["人物", story.who, true], ["结尾说明", story.open ?? "", true],
    ...story.placements.map((p): [string, string, boolean] => [`卡片（${p.situation}）`, p.card, true]),
    ...story.parts.flatMap((part, i) => [[`第 ${i + 1} 段的小标题`, part.heading, !part.blocks.some((b) => b.type === "example")] as [string, string, boolean],
      ...part.blocks.map((b): [string, string, boolean] => [`第 ${i + 1} 段`, blockTexts(b).join("\n"), b.type !== "example"])]),
  ];
}

/** Numbers drawn as data must also be in the original. */
function dataValues(story: CaseStory): Array<[string, number]> {
  return story.parts.flatMap((part, i) => part.blocks.flatMap((b): Array<[string, number]> =>
    b.type === "compare" || b.type === "parts"
      ? [...b.items, ...(b.type === "parts" && b.against ? [b.against] : [])].map((item) => [`第 ${i + 1} 段的图`, item.value])
      : []));
}

/** What is wrong with a written case, each as a sentence the writer can act on; empty when it may be shown. */
export function checkStory(story: CaseStory, sourceText: string): string[] {
  const source = sourceNumbers(sourceText);
  const problems: string[] = [];
  const all = texts(story).filter(([, , fromSource]) => fromSource).map(([, text]) => text).join("");
  const total = chars(all);
  if (total > MAX_CHARS) {
    // Name the longest parts, so the second try knows where to cut.
    const parts = story.parts.map((part, i) => [i + 1, chars(part.heading + part.blocks.filter((b) => b.type !== "example").flatMap(blockTexts).join(""))] as const)
      .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => `第 ${n} 段 ${c} 字`).join("、");
    problems.push(`全文 ${total} 字，太长：要在 800 字以内。${parts}，人物 ${chars(story.who)} 字；每段删到 200 字以内，人物删到 100 字以内，次要的段落整段删掉，只留经过、做法和数字`);
  }
  if ((all.match(/(?:原文|文章)(?:说|提到|还说|还提到|认为|强调|指出|建议|列出|举了)/g)?.length ?? 0) > 2) problems.push("反复写“原文说”“文章提到”：直接写这家店或这个人做了什么，不逐条转述原文的论点");
  for (const [where, text, fromSource] of texts(story)) {
    if (!text) continue;
    const foreign = untranslated(text);
    if (foreign) problems.push(`${where}有没有翻译的${foreign}：原话和说明都译成中文，只有店名、人名、菜名可以保留原文`);
    const missing = fromSource ? unfoundNumbers(text, source) : [];
    if (missing.length) problems.push(`${where}的数字 ${missing.join("、")} 在原文里找不到：删掉，或改成原文写的数字；要算出来的数放进图，由程序计算`);
    for (const [pattern, fix] of WORDING) {
      const hit = pattern.exec(text);
      // The words around it, so the second try (and whoever reads the held cases) finds the very place.
      if (hit) problems.push(`${where}用了“${hit[0]}”（“${text.slice(Math.max(0, hit.index - 8), hit.index + hit[0].length + 8)}”）：${fix}`);
    }
  }
  // Example captions may only name the example's own numbers.
  for (const [i, part] of story.parts.entries()) for (const b of part.blocks) {
    if (b.type !== "example") continue;
    // The caption may set the example against the original ("原文的规则是加 2"): its own numbers or the original's.
    const own = new Set(exampleNumbers(b).flatMap(forms));
    const stray = (b.caption.normalize("NFKC").match(DIGITS) ?? []).filter((t) => !forms(t).some((f) => own.has(f) || source.has(f)) && Number(t.replace(/,/g, "")) > SMALL);
    if (stray.length) problems.push(`第 ${i + 1} 段举例的说明里有 ${stray.join("、")}：说明里只能用举例的输入和原文写的数字，计算结果由程序写`);
  }
  for (const [where, value] of dataValues(story)) {
    if (value > SMALL && !forms(String(value)).some((f) => source.has(f))) problems.push(`${where}里的 ${value} 在原文里找不到：图里只放原文写的数字`);
  }
  for (const [i, part] of story.parts.entries()) {
    if (LABELS.test(part.heading.trim())) problems.push(`第 ${i + 1} 段的小标题“${part.heading}”是分格标签：直接写内容，写成某人做了什么`);
  }
  for (const p of story.placements) {
    const situation = SITUATIONS.find((s) => s.slug === p.situation);
    if (!situation) problems.push(`情况 ${p.situation} 不在清单里`);
    else if (p.group && !situation.groups.some((g) => g.key === p.group)) problems.push(`情况 ${p.situation} 没有 ${p.group} 这一组`);
  }
  return problems;
}

/** What kind of problem a sentence of checkStory (or readOutput) names, for counting which check holds cases back. */
export function problemKind(problem: string): string {
  const number = /^(.+?)(?:的数字|里的 [\d.]+) .*在原文里找不到/.exec(problem);
  if (number) return `数字不在原文：${number[1]!.replace(/第 \d+ 段/, "正文").replace(/（.*）/, "")}`;
  const word = /用了“([^”]+)”/.exec(problem);
  if (word) return `用词：${word[1]}`;
  // How much too long, so the limit can be set from what the writer does: 1,300–1,600, 1,600–2,000, over 2,000.
  const total = /^全文 (\d+) 字/.exec(problem);
  if (total) { const n = Number(total[1]); return `太长：全文${n < 1600 ? " 1,300–1,600" : n < 2000 ? " 1,600–2,000" : "超过 2,000"} 字`; }
  for (const [pattern, kind] of [[/太长/, "太长：某一块"], [/没有翻译/, "没有翻译"], [/原文说/, "反复写原文说"], [/分格标签/, "分格标签"],
    [/举例/, "举例"], [/^格式不对/, "格式"], [/不在清单|这一组/, "情况或分组"]] as const) if (pattern.test(problem)) return kind;
  return "其他";
}
