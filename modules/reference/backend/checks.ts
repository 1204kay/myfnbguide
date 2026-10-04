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
  // "2.5 million", "1.2 万", "3 mil": the value written out.
  for (const m of normal.matchAll(/(\d+(?:[.,]\d+)?)\s*(million|万|mil\b|k\b)/gi)) {
    const n = Number(m[1]!.replace(",", "."));
    const scale = /^million|mil$/i.test(m[2]!) ? 1_000_000 : m[2] === "万" ? 10_000 : 1000;
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
    // "120 万" for an original's "1.2 million".
    const unit = /^\s*([万亿])/.exec(normal.slice(m.index + token.length))?.[1];
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
  [/讲(?![述解座究义课台])/u, "“讲”改成“说”“介绍”“谈到”"],
  [/砍/u, "“砍”改成“削减”“取消”"],
  [/搞|弄(?!清)/u, "“搞”“弄”改成“做”“处理”"],
  [/啥|咋/u, "“啥”“咋”改成“什么”“怎么”"],
  [/掉了/u, "“掉了”改成“下降”“失去”"],
  [/坑/u, "“坑”改成“风险”“陷阱”"],
  [/网红/u, "“网红”改成“在社交媒体上走红”"],
  [/老板们|别家店|做餐饮的人/u, "改成“经营者”“其他店家”"],
  [/同行/u, "不用“同行”，写“其他店家”“经营者”或店名"],
  [/全国|我国|国内|本地|本市/u, "写出具体的国家或城市名"],
  [/限额以上/u, "统计口径换成白话"],
  [/用得上|帮你|少走弯路|干货|揭秘|必看|权威|最全/u, "不替内容担保，不说读者会得到什么"],
  [/你应该|建议你|务必|一定要|老板要/u, "只说明这家店怎么做，不教读者"],
  [/先看|再看|首先|其次|第一步|第二步/u, "不用说明顺序的词"],
];

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
  for (const [where, text, fromSource] of texts(story)) {
    if (!text) continue;
    const missing = fromSource ? unfoundNumbers(text, source) : [];
    if (missing.length) problems.push(`${where}的数字 ${missing.join("、")} 在原文里找不到：删掉，或改成原文写的数字；要算出来的数放进图，由程序计算`);
    for (const [pattern, fix] of WORDING) {
      const hit = pattern.exec(text);
      if (hit) problems.push(`${where}用了“${hit[0]}”：${fix}`);
    }
  }
  // Example captions may only name the example's own numbers.
  for (const [i, part] of story.parts.entries()) for (const b of part.blocks) {
    if (b.type !== "example") continue;
    const own = new Set(exampleNumbers(b).flatMap(forms));
    const stray = (b.caption.normalize("NFKC").match(DIGITS) ?? []).filter((t) => !forms(t).some((f) => own.has(f)) && Number(t.replace(/,/g, "")) > SMALL);
    if (stray.length) problems.push(`第 ${i + 1} 段举例的说明里有 ${stray.join("、")}：说明里只能用举例自己的数字，计算结果由程序写`);
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
