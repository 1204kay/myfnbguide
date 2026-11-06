// 汇率：从 fawazahmed0/exchange-api 取「1 美元换多少」，存在 settings 的 `usd.rates` 一行；存的那份满 12 小时才重新取
// （排程每小时看一次，server.ts），官方每天更新一次，所以一天取两次就跟得上。
// 为什么用它（11-06）：开源（CC0）、免费、不用钥匙、不限次数，每天更新，200 多种货币都有；欧洲央行那份（Frankfurter）
// 没有新台币、越南盾、迪拉姆。官方说明 https://github.com/fawazahmed0/exchange-api ：地址
// cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json，jsdelivr 取不到时要改取
// Cloudflare 上的 latest.currency-api.pages.dev（官方要求带这个备用地址）。
// 取不到就沿用上一次存的；一次都没存过，网页照常显示，只是不补美元。
import { sql } from "@aihot/backend/db";
import type { PerUsd } from "./convert.ts";

const SOURCES = [
  "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json",
  "https://latest.currency-api.pages.dev/v1/currencies/usd.min.json",
];

// 只存 convert.ts 会用到的货币。
export const CODES = ["JPY", "MYR", "CNY", "TWD", "HKD", "MOP", "SGD", "KRW", "THB", "VND", "IDR", "PHP", "EUR", "GBP", "AUD", "CAD", "NZD", "INR", "CHF", "AED",
  "PKR", "LKR", "NPR", "MXN", "CLP", "ARS", "COP", "SEK", "NOK", "DKK", "CZK", "ISK", "BRL", "ZAR", "TRY", "ILS", "SAR", "QAR",
  "PLN", "HUF", "RON", "RUB", "EGP", "NGN", "BDT", "BND", "KHR", "MMK", "LAK"];

export interface Rates { date: string; perUsd: PerUsd }

/** 官方文件 `{"date":"2026-11-05","usd":{"jpy":157.9,…}}` 里取出要用的几种；缺了或不是正数的不收。 */
export function parseRates(body: unknown): Rates | null {
  const b = body as { date?: unknown; usd?: Record<string, unknown> } | null;
  if (!b || typeof b.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b.date) || !b.usd || typeof b.usd !== "object") return null;
  const perUsd: Record<string, number> = {};
  for (const code of CODES) {
    const v = b.usd[code.toLowerCase()];
    if (typeof v === "number" && Number.isFinite(v) && v > 0) perUsd[code] = v;
  }
  return Object.keys(perUsd).length ? { date: b.date, perUsd } : null;
}

/** 取当天的汇率，存进 settings；返回存了的日期，或者为什么没存。 */
export async function refreshRates(): Promise<{ date: string } | { skipped: string }> {
  // 存的那份少了 CODES 里新加的货币（加货币后的第一次部署），不等满 12 小时，马上重取。
  const [fresh] = await sql<{ date: string }[]>`SELECT value->>'date' AS date FROM settings WHERE key = 'usd.rates' AND updated_at > now() - interval '12 hours'
    AND value->'perUsd' ?& ${CODES}::text[]`;
  if (fresh) return { skipped: `rates of ${fresh.date} are less than 12 hours old` };
  const failures: string[] = [];
  for (const url of SOURCES) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) { failures.push(`${new URL(url).host} ${res.status}`); continue; }
      const rates = parseRates(await res.json());
      if (!rates) { failures.push(`${new URL(url).host} unreadable`); continue; }
      await sql`INSERT INTO settings (key, value, updated_by) VALUES ('usd.rates', ${sql.json({ ...rates, perUsd: { ...rates.perUsd } })}, 'usd')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`;
      cached = { at: Date.now(), rates };
      return { date: rates.date };
    } catch (err) {
      failures.push(`${new URL(url).host} ${(err as Error).message}`);
    }
  }
  return { skipped: failures.join("; ") };
}

let cached: { at: number; rates: Rates | null } | null = null;
const KEEP_MS = 10 * 60_000;

/** api 读汇率：十分钟读一次库；读不到就用手上的那份。 */
export async function currentRates(): Promise<Rates | null> {
  if (cached && Date.now() - cached.at < KEEP_MS) return cached.rates;
  try {
    const [row] = await sql<{ value: unknown }[]>`SELECT value FROM settings WHERE key = 'usd.rates'`;
    const v = row?.value as { date?: unknown; perUsd?: unknown } | undefined;
    const rates = v && typeof v.date === "string" && v.perUsd && typeof v.perUsd === "object" ? { date: v.date, perUsd: v.perUsd as PerUsd } : null;
    cached = { at: Date.now(), rates };
  } catch {
    cached = { at: Date.now(), rates: cached?.rates ?? null };
  }
  return cached.rates;
}

/** 测试换汇率之后，下一次立刻重读。 */
export function forgetRates(): void {
  cached = null;
}
