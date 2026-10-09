// The program's reading of a written case before anyone sees it: every number must be found in the original
// (examples excepted: their numbers are the program's own), and the reader-facing wording rules hold
// (myfnb/HANDOFF.md §3, §3.1). No model is asked; a case that fails goes back to the writer with the problems
// named, at most twice (backend/write.ts), and is held back if it still fails.
import { READER_WORDING } from "@aihot/industry/wording";
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
/** Whether a sentence says a heading again: most of the heading's characters (six or more of them) are in it. */
function echoes(sentence: string, heading: string): boolean {
  const own = new Set(sentence);
  const chars = [...new Set(heading)];
  return chars.length >= 6 && chars.filter((c) => own.has(c)).length / chars.length >= 0.7;
}

/** Money units, to find a figures card that mixes two. */
const MONEY = /万美元|亿美元|美元|美分|万元|亿元|日元|万日元|欧元|英镑|韩元|港元|新台币|澳元|加元|元/u;
/** An opening that labels its speaker instead of saying who they are: 说话的人是, 这期节目的主持人是. */
const LABEL_OPENING = /^(?:说话的人|这期(?:节目|播客)的主持人|主讲人|讲述者)是/u;

/** Labels of numbers that are changes already. */
const CHANGE = /增长|增加|提升|提高|下降|下滑|减少|上涨|下跌|同比|环比|涨幅|降幅/u;

/** A number that is a figure: a decimal, or a whole number above 12 that is no year (days, months, 第 36 届 aside). */
const figure = (t: string) => /[.,]/.test(t) || (Number(t) > SMALL && !/^(?:19|20)\d\d$/.test(t));

/**
 * The summary's figures a write-up's opening says again (prompts/body.md lead): the reader has just read them. Days,
 * months (whole numbers up to 12) and years are left out, and one number alone (第 36 届) is no restating: two or
 * more are (live write-ups of 10/9 repeated the summary's 46.7, 0.5, 43.9 and 3.8).
 */
export function repeatedNumbers(lead: string, summary: string): string[] {
  const repeated = summaryFigures(lead, summary);
  return repeated.length > 1 ? repeated : [];
}

/** The summary's figures a text writes again. */
export function summaryFigures(text: string, summary: string): string[] {
  const shown = sourceNumbers(summary);
  const tokens = text.normalize("NFKC").match(DIGITS) ?? [];
  return [...new Set(tokens.filter((t) => figure(t) && forms(t).some((f) => shown.has(f))))];
}

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
 * Words a reader must not meet: the site's list (industry/wording.ts, also read when items are written), and
 * two of a story's own (HANDOFF §3.1). Each with what to write instead, for the next try.
 */
export const WORDING: ReadonlyArray<readonly [RegExp, string]> = [
  ...READER_WORDING,
  [/先看|(?<!不)再看(?!重)|首先|其次|第一步|第二步/u, "不用说明顺序的词"],
  [/原价率|原価率/u, "写成“食材成本率”"],
  [/原文未提供|未提供更多(?:细节|信息)|该内容来自|节目还(?:谈到|提到|介绍了|讨论了)/u, "不写给自己看的话：说不出内容的细节就不提"],
];

/** Where-from words a title must not open with: the card's source line already names the country and the source (layout D4). */
const SOURCE_WORDS = /播客|系统商|服务商|软件商|顾问|媒体|博客|店主|老板|协会|平台|专栏/u;

/** "美国播客：", "日本一家": how a title opens when it repeats the source line; null when it does not. */
/**
 * An opening that says where the article came from, or what it is about, rather than what it says: 这篇文章来自,
 * 由某网转载, 红餐网整编发布, 这篇文章说的是.
 */
const MEDIA_LINE = /这(?:篇|条)(?:文章|消息|报道|内容)?来自|转载|整编|整理发布|^(?:这|本)(?:篇|期|条)(?:文章|报道|节目|播客|消息)?(?:说的是|讲的是|谈的是|介绍的是|讨论的是)/u;
/** An opening put as a question: the writing rules ask for a statement (prompts/case.md lead). */
const QUESTION = /[？?]|(?:哪里|为什么|怎么办|吗)[。]?$/u;

export function titleOpening(story: CaseStory): string | null {
  // Up to 24 characters before the colon: 餐厅顾问 Chip Klose： is 17 (live stories of 10/9).
  const colon = /^([^，。：:]{1,24})[：:]/u.exec(story.title);
  if (colon && SOURCE_WORDS.test(colon[1]!)) return colon[0];
  // A city as the title may write it: 京都 for 京都市.
  for (const place of [story.shop.country, story.shop.city?.replace(/(?<=..)[市县省]$/u, "")]) {
    const hit = place && new RegExp(`^${place.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.{0,4}?一家`, "u").exec(story.title);
    if (hit) return hit[0];
  }
  return null;
}

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
    case "numbers": return [block.point ?? "", block.caption ?? "", ...block.items.flatMap((i) => [i.value, i.label])];
    case "change": return [block.caption ?? "", block.before.label, block.before.text, block.after.label, block.after.text];
  }
}

/** Every text of a story a reader reads, with where it is and whether its numbers come from the original. */
function texts(story: CaseStory): Array<[where: string, text: string, fromSource: boolean]> {
  return [
    ["标题", story.title, true], ["开头", story.lead, true], ["人物", story.who, true], ["结尾说明", story.open ?? "", true], ["店家说明", story.shop.label ?? "", true],
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
    // Name the longest parts, so the next try knows where to cut.
    const parts = story.parts.map((part, i) => [i + 1, chars(part.heading + part.blocks.filter((b) => b.type !== "example").flatMap(blockTexts).join(""))] as const)
      .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => `第 ${n} 段 ${c} 字`).join("、");
    problems.push(`全文 ${total} 字，太长：要在 800 字以内。${parts}，人物 ${chars(story.who)} 字；每段删到 200 字以内，人物删到 100 字以内，次要的段落整段删掉，只留经过、做法和数字`);
  }
  // 认为 and 建议 say whose view it is, which the writing rules ask for (rules-reader-copy 3): no retelling.
  if ((all.match(/(?:原文|文章)(?:说|提到|还说|还提到|强调|指出|列出|举了)/g)?.length ?? 0) > 2) problems.push("反复写“原文说”“文章提到”：直接写这家店或这个人做了什么，不逐条转述原文的论点");
  for (const [where, text, fromSource] of texts(story)) {
    if (!text) continue;
    const foreign = untranslated(text);
    if (foreign) problems.push(`${where}有没有翻译的${foreign}：原话和说明都译成中文，只有店名、人名、菜名可以保留原文`);
    const missing = fromSource ? unfoundNumbers(text, source) : [];
    if (missing.length) problems.push(`${where}的数字 ${missing.join("、")} 在原文里找不到：删掉，或改成原文写的数字；要算出来的数放进图，由程序计算`);
    for (const [pattern, fix] of WORDING) {
      const hit = pattern.exec(text);
      // The words around it, so the next try (and whoever reads the held cases) finds the very place.
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
  // Figures written out in the text with no figure to read them from (live write-ups of 10/9: survey results, sales
  // and forecasts in paragraphs only).
  const plain = new Set(["text", "list", "quote"]);
  if (story.parts.every((p) => p.blocks.every((b) => plain.has(b.type)))) {
    const written = new Set(story.parts.flatMap((p) => p.blocks.flatMap(blockTexts)).join("\n").normalize("NFKC").match(DIGITS)?.filter(figure) ?? []);
    if (written.size >= 3) problems.push(`正文写了 ${[...written].slice(0, 6).join("、")} 这些数字，却没有一张图：把最关键的 1 到 3 个放进 numbers 块（前后对比的用 compare），文字里不再逐个重复`);
  }
  const prose = story.parts.flatMap((p) => p.blocks.filter((b) => b.type === "text" || b.type === "list").flatMap(blockTexts)).join("\n");
  const bare = (t: string) => t.normalize("NFKC").replace(/[\s，。、；：！？“”‘’「」（）,.;:!?"'()]/g, "");
  for (const [i, part] of story.parts.entries()) for (const b of part.blocks) {
    // A compare draws one quantity before and after; changes already (增长 29%, 同比提升 13.1%) set side by side make a
    // difference that means nothing (a live story of 10/9 drew 订单量增长 29% against 营收同比 13.1%: −54.8%).
    const change = b.type === "compare" ? b.items.find((x) => CHANGE.test(x.label)) : undefined;
    if (change) problems.push(`第 ${i + 1} 段的对比图里“${change.label}”本身就是变化的数：对比图只放同一个数的前后（去年和今年），涨幅和增长率放进 numbers`);
    // Figures in one card are read against each other: money in two units (3.02 美元 beside 437.95 美分, 10/9) cannot be.
    const money = b.type === "numbers" ? [...new Set(b.items.map((x) => MONEY.exec(x.value)?.[0]).filter(Boolean))] : [];
    if (money.length > 1) problems.push(`第 ${i + 1} 段的数字卡里有 ${money.join("和")} 两种单位：读者没法直接比，分开放，或只留同一种单位的数`);
    // The card's sentence says what its figures show, not the heading over it again (10/9: 周一会员日 9.9 元猪脚饭 over
    // 每周一9.9元会员日，让周一的生意变好).
    if (b.type === "numbers" && b.point && echoes(bare(b.point), bare(part.heading))) problems.push(`第 ${i + 1} 段数字卡上的结论“${b.point}”和小标题“${part.heading}”说的是同一件事：小标题写做法，卡片写这些数字说明的结果`);
    // A quote is the words once: the text around it does not say them again.
    if (b.type === "quote" && bare(b.text).length >= 12 && bare(prose).includes(bare(b.text))) problems.push(`第 ${i + 1} 段的原话“${b.text.slice(0, 20)}”在文字里又写了一遍：删掉文字里的那一句，只留原话`);
  }
  for (const [i, part] of story.parts.entries()) {
    if (LABELS.test(part.heading.trim())) problems.push(`第 ${i + 1} 段的小标题“${part.heading}”是分格标签：直接写内容，写成某人做了什么`);
  }
  // Where the article came from is on the page's source line; the opening says who speaks or what the reader needs.
  for (const [where, text] of [["开头", story.lead], ["人物", story.who]] as const) {
    const hit = MEDIA_LINE.exec(text);
    if (hit) problems.push(`${where}写了这篇文章从哪里来（“${hit[0]}”）：页面的来源行已经写了媒体名，直接写说话的人是谁或读后面需要知道的背景`);
  }
  if (LABEL_OPENING.test(story.lead.trim())) problems.push(`开头写成了“${LABEL_OPENING.exec(story.lead.trim())![0]}……”：直接从这个人写起（“Brandon Robinson 是……的创始人”）`);
  if (QUESTION.test(story.lead.trim())) problems.push(`开头写成了问句（“${story.lead.slice(-12)}”）：写成陈述句`);
  const opening = titleOpening(story);
  if (opening) problems.push(`标题以“${opening}”开头：页面的来源行已经写了国家和来源，标题直接写这家店做了什么`);
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
  for (const [pattern, kind] of [[/太长/, "太长：某一块"], [/没有翻译/, "没有翻译"], [/原文说/, "反复写原文说"], [/分格标签/, "分格标签"], [/^标题以/, "标题以国家或来源开头"], [/从哪里来/, "开头写来源"], [/写成了问句/, "开头是问句"], [/直接从这个人写起/, "开头像填表"], [/两种单位/, "数字卡单位不同"], [/说的是同一件事/, "数字卡重复小标题"], [/重复了导读/, "开头重复导读"], [/没有一张图/, "有数字没有图"], [/本身就是变化/, "对比图用错"], [/又写了一遍/, "原话重复"],
    [/举例/, "举例"], [/^格式不对/, "格式"], [/不在清单|这一组/, "情况或分组"]] as const) if (pattern.test(problem)) return kind;
  return "其他";
}
