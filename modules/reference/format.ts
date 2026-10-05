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
 * What a situation counts in a list (layout J3-5): its shops once its stories are grouped by practice, its 条原文
 * before (or where no shop tells it). No practices, insiders or countries.
 */
export const listCount = (c: Count): [number, string] => (c.grouped && c.shops ? [c.shops, "家店"] : [c.cases, "条原文"]);

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
