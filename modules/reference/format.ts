// Numbers, counts and months as the reference pages write them, on the server and in the browser alike.
import { beijingDate } from "@aihot/contracts/time";
import type { Count } from "./types.ts";

/** "18,000", "10.5", "−3,810": thousands separated, at most one decimal place. */
export function num(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  const [int, dec] = Math.abs(rounded).toFixed(1).split(".") as [string, string];
  const body = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (dec === "0" ? "" : `.${dec}`);
  return rounded < 0 ? `−${body}` : body;
}

/** Who stands behind a situation: its shops, then its insiders; nothing that is zero (layout J4-2). */
export function tellers(c: Count): Array<[number, string]> {
  const out: Array<[number, string]> = [];
  if (c.shops) out.push([c.shops, "家店"]);
  if (c.insiders) out.push([c.insiders, "位业内人士"]);
  return out;
}

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

/** "2025 年 7 月": a month always has its year, as the engine writes a month (features/report/format.ts, routes/changelog.tsx). */
export function month(at: string | Date): string {
  const [year, m] = beijingDate(at).split("-");
  return `${year} 年 ${Number(m)} 月`;
}
