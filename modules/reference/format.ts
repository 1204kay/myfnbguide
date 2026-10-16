// Numbers, counts, dates and spacing as the reference pages write them, on the server and in the browser alike.
import { beijingDate } from "@aihot/contracts/time";
import type { Count } from "./types.ts";

/** "18,000", "10.5", "−3,810": thousands separated, at most one decimal place. */
export function num(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  const [int, dec] = Math.abs(rounded).toFixed(1).split(".") as [string, string];
  const body = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (dec === "0" ? "" : `.${dec}`);
  return rounded < 0 ? `−${body}` : body;
}

/** Who stands behind a practice or a situation: its shops, then its insiders; nothing that is zero (layout J4-2). */
export function tellers(c: Count): Array<[number, string]> {
  const out: Array<[number, string]> = [];
  if (c.shops) out.push([c.shops, "家店"]);
  if (c.insiders) out.push([c.insiders, "位业内人士"]);
  return out;
}

/** A practice card's count: "3 家店", "2 家店 · 1 位业内人士". */
export const tellersText = (c: Count) => tellers(c).map(([n, unit]) => `${num(n)} ${unit}`).join(" · ");

/**
 * What a situation counts in its big number in a list: its shops, which rank it, or its 条原文 where no shop tells
 * it. The rest of its count stands beside (restCountText): every count shows (the owner, 10/6: "要展示所有").
 */
export const listCount = (c: Count): [number, string] => (c.shops ? [c.shops, "家店"] : [c.cases, "条原文"]);

/** What a list shows beside its big number (listCount): "1 位业内人士 · 26 条原文". */
export const restCountText = (c: Count) =>
  [...(c.insiders ? [`${num(c.insiders)} 位业内人士`] : []), ...(c.shops ? [`${num(c.cases)} 条原文`] : [])].join(" · ");

/** A situation's whole count on a line: "16 家店 · 1 位业内人士 · 26 条原文". */
export const fullCountText = (c: Count) => [...tellers(c).map(([n, unit]) => `${num(n)} ${unit}`), `${num(c.cases)} 条原文`].join(" · ");

/** "16 家店", "13 条原文". */
export const listCountText = (c: Count) => {
  const [n, unit] = listCount(c);
  return `${num(n)} ${unit}`;
};

/**
 * A half-width space between a Chinese character and a digit or Latin letter, either way round ("31 席",
 * "用 AI 改菜单", "1.1% 的店"); a percent or currency sign stays on its number. Applied to what the models wrote
 * before it is stored (layout A8, D9): a prompt alone does not make every answer the same.
 */
export function spaced(text: string): string {
  return text.replace(/(\p{Script=Han})(?=[A-Za-z0-9$])/gu, "$1 ").replace(/([A-Za-z0-9%])(?=\p{Script=Han})/gu, "$1 ");
}

/** "10 月 5 日" this year (Beijing time), "2019 年 2 月 19 日" another (layout A8). */
export function day(at: string | Date, now: Date = new Date()): string {
  const [year, m, d] = beijingDate(at).split("-");
  const date = `${Number(m)} 月 ${Number(d)} 日`;
  return year === beijingDate(now).slice(0, 4) ? date : `${year} 年 ${date}`;
}

/** "2025 年 7 月": a month always has its year. */
export function month(at: string | Date): string {
  const [year, m] = beijingDate(at).split("-");
  return `${year} 年 ${Number(m)} 月`;
}

/** Where a story's share image is served (server.ts, backend/share.ts): its page's og:image (web/case.tsx). */
export const shareImagePath = (id: string) => `/og/reference/cases/${encodeURIComponent(id)}.png`;

/** A number of the original exactly as it writes it: up to two decimals ("15.95 澳元" is not 16), thousands grouped. */
export const exact = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 }).replace("-", "−");

/**
 * What a figure counts in: "近 170 项" and "超过 3200 项" both 项, "9%" and "30.6%" both %, "80 到 100 元" 元. Big numbers
 * side by side only for figures in one unit: three facts in three units (a 翻台率, a 增长率, a 人次) set as equals
 * read as one comparison they are not (用户 10/11: 数据都是千篇一律的展示方式，根本不清晰).
 */
export function figureUnit(value: string): string | null {
  const m = /^(?:约|近|将近|超过|超|逾|至少|不到|不足)?\s*[-+]?[\d.,]+%?(?:\s*(?:到|至|-|–|~)\s*[\d.,]+%?)?\s*(.*)$/u.exec(value.trim());
  if (!m) return null;
  const pct = /%/.test(value.split(/\s/)[0] ?? "") || /^[^\d]*[\d.,]+%/.test(value.trim());
  return (pct ? "%" : "") + m[1]!.replace(/^(?:多|余)/u, "").replace(/(?:以上|左右|多)$/u, "").trim();
}

export const comparable = (values: string[]) => {
  const units = values.map(figureUnit);
  return units.every((u) => u !== null && u === units[0]);
};

/** A number written in Chinese numerals: 一万, 两三万, 三成, 十几. It starts with a digit word, so 万达 is not one. */
const HANZI_NUMBER = "[零〇一二两三四五六七八九十几半][零〇一二两三四五六七八九十百千万亿几半]*成?";
const RANGE = "\\s*(?:到|至|-|–|—|~|〜)\\s*";
const DIGIT_FIGURE = /^(\D*?)\s*([-+]?\d[\d.,]*%?(?:\s*[万亿千]?\s*(?:到|至|-|–|—|~|〜)\s*\d[\d.,]*%?)?)\s*(.*)$/u;
const HANZI_FIGURE = new RegExp(`^(接近|将近|大约|超过|突破|高达|多达|至少|不到|不足|近|约|超|逾|达|仅)?\\s*(${HANZI_NUMBER}(?:${RANGE}${HANZI_NUMBER})?)\\s*(.*)$`, "u");

/**
 * A figure of the original as it writes it, its number big and the words around it small: "近 70 家" is 近, 70 and
 * 家, "80 到 100 元" 80 到 100 and 元, "30 万—40 万元" 30 万—40 and 万元. Chinese numerals the same way: "接近一万家" is
 * 接近, 一万 and 家 (用户 10/16: a figure in words was all big beside "1.9 亿元" split big and small). A figure with no
 * number stays as it is.
 */
export function figureSplit(value: string): [string, string, string] {
  const v = value.trim();
  const m = DIGIT_FIGURE.exec(v) ?? HANZI_FIGURE.exec(v);
  return m ? [m[1] ?? "", m[2]!, m[3]!] : ["", value, ""];
}

/** Whether a figure has a number in it, in digits or in Chinese numerals ("接近一万家" has, "很多" has not). */
export const isFigure = (value: string) => DIGIT_FIGURE.test(value.trim()) || HANZI_FIGURE.test(value.trim());
