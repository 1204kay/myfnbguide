// 金额旁边补美元（Kay 11-06：「用其他国家的货币可以 但是要有美金对比」「这是全站的优化」）。
// 原文币种照写（industry/prompts/rules-domain.md 第 24 行），读者打开时由这里在金额后面补「（约 US$…）」；库里存的文字
// 不改，所以核对员、改稿和十一说的听稿都看不到这个数。汇率是 backend/rates.ts 每天取的那一份，不按文章日期：读者
// 想知道的是这笔钱现在大概值多少美元。取两位有效数字，前面写「约」。
//
// 只认写明了币种的金额。单写「元」的，看同一段（同一个对象和它的来源名，来源名里写着国家）里说的是哪里：只提到
// 一个地方就按那里的钱算，一处都没提或者提到几处，分不清，不加。「$」「¥」分不清是哪国的，不加。
// 网址、链接、RSS 的 guid 里的字不动（「/RM50-meal」补了链接就坏了，guid 一变阅读器会再推一次）。

/** 1 美元换多少这种货币，键是大写代码（USD 以外）。 */
export type PerUsd = Readonly<Record<string, number>>;

// 写在数字后面的币种。长的写在前面，「美元」「美分」也在里面，认出来就跳过，免得「元」被当成人民币。
const SUFFIX: ReadonlyArray<readonly [string, string | null]> = [
  ["元人民币", "CNY"], ["人民币", "CNY"],
  ["新加坡元", "SGD"], ["新西兰元", "NZD"], ["澳门元", "MOP"], ["澳门币", "MOP"],
  ["印度卢比", "INR"], ["印尼卢比", "IDR"], ["巴基斯坦卢比", "PKR"], ["斯里兰卡卢比", "LKR"], ["尼泊尔卢比", "NPR"],
  ["菲律宾比索", "PHP"], ["墨西哥比索", "MXN"], ["智利比索", "CLP"], ["阿根廷比索", "ARS"], ["哥伦比亚比索", "COP"],
  ["瑞典克朗", "SEK"], ["挪威克朗", "NOK"], ["丹麦克朗", "DKK"], ["捷克克朗", "CZK"], ["冰岛克朗", "ISK"],
  ["瑞士法郎", "CHF"], ["瑞郎", "CHF"], ["巴西雷亚尔", "BRL"], ["雷亚尔", "BRL"], ["南非兰特", "ZAR"], ["兰特", "ZAR"],
  ["土耳其里拉", "TRY"], ["新谢克尔", "ILS"], ["谢克尔", "ILS"], ["沙特里亚尔", "SAR"], ["卡塔尔里亚尔", "QAR"],
  ["兹罗提", "PLN"], ["福林", "HUF"], ["列伊", "RON"], ["卢布", "RUB"], ["埃及镑", "EGP"], ["奈拉", "NGN"], ["塔卡", "BDT"],
  ["文莱元", "BND"], ["柬埔寨瑞尔", "KHR"], ["瑞尔", "KHR"], ["缅元", "MMK"], ["基普", "LAK"],
  ["日元", "JPY"], ["日圆", "JPY"], ["日币", "JPY"], ["円", "JPY"],
  ["令吉", "MYR"], ["林吉特", "MYR"], ["马币", "MYR"],
  ["新台币", "TWD"], ["台币", "TWD"],
  ["港元", "HKD"], ["港币", "HKD"],
  ["新元", "SGD"], ["新币", "SGD"],
  ["韩元", "KRW"], ["韩币", "KRW"], ["韩圜", "KRW"],
  ["泰铢", "THB"], ["越南盾", "VND"], ["印尼盾", "IDR"],
  ["欧元", "EUR"], ["英镑", "GBP"], ["澳元", "AUD"], ["澳币", "AUD"], ["加元", "CAD"], ["加币", "CAD"],
  ["纽币", "NZD"], ["迪拉姆", "AED"],
  // 好几个国家都叫这个名字的，看同一段说的是哪国（FAMILIES）。
  ["卢比", "?卢比"], ["比索", "?比索"], ["克朗", "?克朗"],
  ["美元", null], ["美金", null], ["美分", null],
  ["元", "?"],
];

// 写在数字前面的币种。
const PREFIX: ReadonlyArray<readonly [string, string | null]> = [
  ["US$", null], ["HK$", "HKD"], ["NT$", "TWD"], ["NZ$", "NZD"], ["S$", "SGD"], ["A$", "AUD"], ["C$", "CAD"],
  ["RM", "MYR"], ["€", "EUR"], ["£", "GBP"], ["₩", "KRW"], ["฿", "THB"],
  ["人民币", "CNY"], ["新台币", "TWD"], ["港币", "HKD"], ["日币", "JPY"],
];

const MULT: Readonly<Record<string, number>> = { 万亿: 1e12, 千万: 1e7, 百万: 1e6, 十万: 1e5, 万: 1e4, 亿: 1e8, 千: 1e3, 百: 100, k: 1e3, K: 1e3 };

const esc = (s: string) => s.replace(/[$.*+?^()[\]{}|\\]/g, "\\$&");
const NUM = String.raw`\d+(?:[,，]\d{3})*(?:\.\d+)?`;
const M = String.raw`(?:\s?(万亿|千万|百万|十万|万|亿|千|百))?`;
const SEP = String.raw`\s?(?:至|到|-|–|—|~|～)\s?`;
const AMOUNT = `(${NUM})${M}(?:${SEP}(${NUM})${M})?`;
const SUFFIX_RE = SUFFIX.map(([w]) => esc(w)).join("|");
const PREFIX_RE = PREFIX.map(([w]) => esc(w)).join("|");

// 一：数字在前、币种在后（975万日元、400 万至 1,900 万日元）。二：币种在前（RM5,000、人民币500万元、€1.30）。
// 数字前面紧挨着的逗号，只有逗号前面还是数字时才是千位分隔（3,000 的 000）；「登记，1500 万卢比」的逗号是句读，照补。
const AFTER = new RegExp(`(?<![\\d.A-Za-z$])(?<!\\d[,，])${AMOUNT}\\s?(${SUFFIX_RE})(?!店|素|宵|旦|器|件|首|老|气)`, "gu");
const M_PREFIX = String.raw`(?:\s?(万亿|千万|百万|十万|万|亿|千|百|k|K))?`;
const BEFORE = new RegExp(`(?<![A-Za-z])(${PREFIX_RE})\\s?(${NUM})${M_PREFIX}(?:${SEP}(${NUM})${M_PREFIX})?(?:\\s?元)?`, "gu");

// 后面已经有美元（原文写了，或者这里加过一次）就不再加；前面是「…美元（」的，括号里的金额是对美元的说明，也不加。
const HAS_USD_AFTER = /^\s?[（(][^）)]{0,16}(?:US\$|美元|美金|USD)/u;
const USD_BEFORE = /(?:美元|美金|US\$\s?[\d.,]+\s?[万亿]?)\s?[（(]$/u;

// 单写「元」的时候，这一段说的是哪里。来源名写着国家（「红餐网（中国 · 媒体）」），条目的上下文里一定有一处。
const PLACES: ReadonlyArray<readonly [RegExp, string]> = [
  [/中国(?!台湾|香港|澳门)|内地|大陆|大陸|北京|上海|广州|深圳|成都|重庆|杭州|武汉|西安|南京|长沙|郑州|苏州|天津|青岛|厦门|福建|广东|浙江|江苏|四川|湖南|湖北|山东|河南|云南|洛阳|台州|漳州|佛山|东莞|人民币/u, "CNY"],
  [/台湾|台灣|台北|台南|高雄|新北|桃园/u, "TWD"],
  [/香港/u, "HKD"],
  [/澳门|澳門/u, "MOP"],
  [/新加坡|狮城/u, "SGD"],
  [/马来西亚|馬來西亞|大马(?!路|士革)|马国|吉隆坡|雪兰莪|雪州|八打灵|梳邦|莎阿南|巴生|蒲种|加影|安邦|槟城|槟岛|槟榔屿|大山脚|柔佛|新山|麻坡|居銮|峇株|马六甲|甲州|森美兰|芙蓉|霹雳|怡保|金宝|太平市|吉打|亚罗士打|玻璃市|吉兰丹|哥打巴鲁|登嘉楼|彭亨|关丹|文冬|沙巴|亚庇|斗湖|山打根|砂拉越|砂州|古晋|诗巫|美里|民都鲁|纳闽/u, "MYR"],
  // 写日本、韩国的稿子里单写的「元」，多半是日元、韩元的省写。
  [/日本|东京|大阪|京都|福冈|札幌|名古屋|广岛|岐阜/u, "JPY"],
  [/韩国|首尔|釜山/u, "KRW"],
  // 其他国家的钱不叫「元」，提到它们就分不清了。
  [/美国|英国|欧洲|法国|德国|意大利|西班牙|澳大利亚|澳洲|加拿大|泰国|越南|印尼|菲律宾|印度|迪拜|中东/u, ""],
];

// 卢比、比索、克朗：同一段只提到其中一个国家才补；卢比一个都没提时按印度算。
const FAMILIES: Readonly<Record<string, ReadonlyArray<readonly [RegExp, string]>>> = {
  卢比: [[/印度|孟买|新德里|德里|班加罗尔/u, "INR"], [/巴基斯坦/u, "PKR"], [/斯里兰卡/u, "LKR"], [/尼泊尔/u, "NPR"], [/印尼|印度尼西亚/u, "IDR"]],
  比索: [[/墨西哥/u, "MXN"], [/菲律宾|马尼拉/u, "PHP"], [/智利/u, "CLP"], [/阿根廷/u, "ARS"], [/哥伦比亚/u, "COP"]],
  克朗: [[/瑞典/u, "SEK"], [/挪威/u, "NOK"], [/丹麦/u, "DKK"], [/捷克/u, "CZK"], [/冰岛/u, "ISK"]],
};

/** 卢比、比索、克朗是哪国的；分不清是 null。 */
export function familyOf(name: string, context: string, before = ""): string | null {
  const family = FAMILIES[name] ?? [];
  // 「印度尼西亚」「印尼」里都有「印度」或像「印度」：认印度之前先把它们拿掉。
  const test = (re: RegExp, code: string, text: string) => re.test(code === "INR" ? text.replace(/印度尼西亚|印尼/gu, "") : text);
  // 同一句里金额前面提到了哪国，就是哪国的（「墨西哥……；印度一例原估15万卢比」）；这一句提到几国、一国都没提，再看整段。
  const clause = before.split(/[。；;！？!?\n〔]/u).pop() ?? "";
  const near = family.filter(([re, code]) => test(re, code, clause)).map(([, code]) => code);
  if (near.length === 1) return near[0]!;
  const hits = family.filter(([re, code]) => test(re, code, context)).map(([, code]) => code);
  if (hits.length === 1) return hits[0]!;
  // 中文稿里单写「卢比」的，几乎都是印度的：一个用卢比的国家都没提，就按印度算。
  return name === "卢比" && hits.length === 0 ? "INR" : null;
}

/** 单写「元」时按哪种钱算：同一段只提到一个地方就是那里的钱；一处都没提、提到几处，都是 null，不加。 */
export function yuanOf(context: string): string | null {
  const hits = [...new Set(PLACES.filter(([re]) => re.test(context)).map(([, code]) => code))];
  return hits.length === 1 && hits[0] ? hits[0] : null;
}

// 网址（https://…、www.…、/items/…）、XML 的 <link>/<guid>、标签属性、Markdown 链接的目标：这些地方的字不动。
const UNTOUCHED = /(?:https?:\/\/|www\.)[^\s"'<>）)\]]+|(?<![\p{L}\p{N}])\/[\w\-./%?=&#~+]*[A-Za-z][\w\-./%?=&#~+]*|<(link|guid)\b[^>]*>[\s\S]*?<\/\1>|\b[\w-]+="[^"]*"|\]\([^)]*\)/gu;

function untouched(text: string): Array<[number, number]> {
  return [...text.matchAll(UNTOUCHED)].map((m) => [m.index, m.index + m[0].length]);
}

const num = (n: string) => Number(n.replace(/[,，]/g, ""));
const value = (n: string, mult: string | undefined) => num(n) * (mult ? MULT[mult]! : 1);

/** 两位有效数字：61,747 → 6.2万，9,080 → 9,100，4.43 → 4.4，0.754 → 0.75。 */
export function usdText(v: number): string {
  const two = (x: number) => Number(x.toPrecision(2));
  const plain = (x: number) => (x >= 1000 ? x.toLocaleString("en-US", { maximumFractionDigits: 0 }) : String(x));
  if (two(v) >= 1e8) return `${two(v / 1e8)}亿`;
  if (two(v) >= 1e4) return `${two(v / 1e4)}万`;
  return plain(two(v));
}

function note(lo: number, hi: number | null, code: string, perUsd: PerUsd): string | null {
  const rate = perUsd[code];
  // 不到 1 美分的（「0.5日元」）补了也没有用。
  if (!rate || !(rate > 0) || !(lo / rate >= 0.01)) return null;
  const a = usdText(lo / rate);
  if (hi === null || !(hi > lo)) return `（约 US$${a}）`;
  const b = usdText(hi / rate);
  return a === b ? `（约 US$${a}）` : `（约 US$${a}至${b}）`;
}

/** 一段文字里每个写明币种的金额后面补「（约 US$…）」；`context` 是判断单写「元」是哪里的钱用的那一段。 */
export function addUsd(text: string, perUsd: PerUsd, context: string = text): string {
  if (!/\d/.test(text)) return text;
  let yuan: string | null | undefined;
  const add = (src: string, keep: Array<[number, number]>, whole: string, offset: number, code: string | null, n1: string, m1: string | undefined, n2: string | undefined, m2: string | undefined) => {
    if (code === null || keep.some(([a, b]) => offset < b && offset + whole.length > a)) return whole;
    if (code === "?") code = yuan === undefined ? (yuan = yuanOf(context)) : yuan;
    else if (code?.startsWith("?")) code = familyOf(code.slice(1), context, src.slice(Math.max(0, offset - 60), offset));
    if (code === null) return whole;
    const after = src.slice(offset + whole.length);
    if (HAS_USD_AFTER.test(after) || USD_BEFORE.test(src.slice(Math.max(0, offset - 24), offset))) return whole;
    // 「3到6万日元」是 3 万到 6 万；「5000至2.5万澳元」是 5000 到 2.5 万，前面的数本身就比后面的大，不借后面的「万」。
    const borrow = !m1 && n2 && m2 && num(n1) <= num(n2);
    const lo = value(n1, m1 ?? (borrow ? m2 : undefined));
    const hi = n2 ? value(n2, m2) : null;
    // 拼出来前面比后面大，是没读懂这个范围：不补，免得补出离谱的数。
    if (hi !== null && !(hi >= lo)) return whole;
    const n = note(lo, hi, code, perUsd);
    return n ? whole + n : whole;
  };
  // 币种在前的先做：「人民币500万元」照人民币算，不要被后面那一遍当成单写的「元」。
  const k1 = untouched(text);
  const once = text.replace(BEFORE, (whole, sym, n1, m1, n2, m2, offset: number) =>
    add(text, k1, whole, offset, PREFIX.find(([w]) => w === sym)![1], n1, m1, n2, m2));
  const k2 = untouched(once);
  return once.replace(AFTER, (whole, n1, m1, n2, m2, unit, offset: number) =>
    add(once, k2, whole, offset, SUFFIX.find(([w]) => w === unit)![1], n1, m1, n2, m2));
}

const MONEY_HINT = new RegExp(`\\d\\s?(?:[万亿千百]\\s?)?(?:${SUFFIX_RE})|(?:${PREFIX_RE})\\s?\\d`, "u");

/** 有没有可能要补：大多数回应一个金额都没有，先用这个挡掉，不去解析。 */
export const mayHaveMoney = (text: string) => MONEY_HINT.test(text);

// 一个对象的字符串和它下一层对象（例如条目的 source）的字符串，拼起来当这个对象里每段文字的上下文。
function ownText(node: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const v of Object.values(node)) {
    if (typeof v === "string") parts.push(v);
    else if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const w of Object.values(v as Record<string, unknown>)) if (typeof w === "string") parts.push(w);
    }
  }
  return parts.join("\n");
}

/** JSON 里每个字符串都补一遍，上下文是它所在的对象。 */
export function addUsdToJson(node: unknown, perUsd: PerUsd, context = ""): unknown {
  if (typeof node === "string") return mayHaveMoney(node) ? addUsd(node, perUsd, `${context}\n${node}`) : node;
  if (Array.isArray(node)) return node.map((x) => addUsdToJson(x, perUsd, context));
  if (node && typeof node === "object") {
    const own = ownText(node as Record<string, unknown>);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) out[k] = addUsdToJson(v, perUsd, own);
    return out;
  }
  return node;
}

/** RSS、Markdown 这类文字：按 <item>/<entry> 或空行分段，每段自己当上下文。 */
export function addUsdToText(text: string, perUsd: PerUsd): string {
  const parts = /<(?:item|entry)[\s>]/.test(text) ? text.split(/(?=<(?:item|entry)[\s>])/) : text.split(/(?<=\n\s*\n)/);
  return parts.map((p) => (mayHaveMoney(p) ? addUsd(p, perUsd) : p)).join("");
}
