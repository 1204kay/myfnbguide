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

/**
 * What a situation or a practice counts (layout A7-3): practices (or, before the stories are grouped, 条原文),
 * then shops and insiders, then the countries, a country by its name when it is the only one; nothing that is zero.
 */
export function countItems(c: Count, of: "situation" | "practice" = "situation"): Array<[number, string] | string> {
  const out: Array<[number, string] | string> = [];
  if (of === "situation") out.push(c.practices === null ? [c.cases, "条原文"] : [c.practices, "种做法"]);
  if (of === "practice" || c.practices !== null) {
    if (c.shops) out.push([c.shops, "家店"]);
    if (c.insiders) out.push([c.insiders, "位业内人士"]);
  }
  if (c.countries.length === 1) out.push(c.countries[0]!);
  else if (c.countries.length > 1) out.push([c.countries.length, "个国家"]);
  return out;
}

/** "3 种做法 · 8 家店 · 1 位业内人士 · 4 个国家", "1 家店 · 日本". */
export const countText = (c: Count, of: "situation" | "practice" = "situation") =>
  countItems(c, of).map((i) => (typeof i === "string" ? i : `${num(i[0])} ${i[1]}`)).join(" · ");

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
