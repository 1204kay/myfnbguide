import { beijingDate, beijingTime, beijingWeekday } from "@aihot/contracts/time";
import { DATES } from "@aihot/site";

/**
 * A calendar date (YYYY-MM-DD) for readers: "9月28日", or "9 月 28 日" on a site that spaces its dates (site.ts
 * DATES.spaced). A day of another year than `now` (Beijing) carries its year, so an old item is not read as this year's:
 * "2019年2月19日".
 */
export function monthDay(date: string, now: number = Date.now()): string {
  const [y, m, d] = [date.slice(0, 4), Number(date.slice(5, 7)), Number(date.slice(8, 10))];
  const year = y === beijingDate(now).slice(0, 4) ? "" : `${y}年`;
  const text = `${year}${m}月${d}日`;
  return DATES.spaced ? text.replace(/(\d)(?=\D)|(\D)(?=\d)/g, "$1$2 ") : text;
}

/** "周六" of a calendar date (YYYY-MM-DD). */
export function weekdayShort(date: string): string {
  return beijingWeekday(date).replace("星期", "周");
}

export function relativeTime(iso: string, now = Date.now()): string {
  const t = Date.parse(iso);
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return "刚刚";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} 分钟前`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} 天前`;
  return beijingDate(iso);
}

export function fullDateTime(iso: string): string {
  return `${beijingDate(iso)} ${beijingTime(iso)}`;
}

/** "9月24日 10:51" (Beijing), for lists that span days; charts split it at the space, so it keeps this form. */
export function monthDayTime(iso: string): string {
  const date = beijingDate(iso);
  return `${Number(date.slice(5, 7))}月${Number(date.slice(8, 10))}日 ${beijingTime(iso)}`;
}

export function sourceInitial(name: string): string {
  const s = name.replace(/^[^\p{L}\p{N}]+/u, "");
  return (s[0] ?? "A").toUpperCase();
}
