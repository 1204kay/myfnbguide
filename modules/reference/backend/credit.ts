// The Claude API credit (planned at US$100 a month, renewing on the 4th; settings 'reference.claude-credit'), runs 十一说's check and the module's other Claude steps.
// The server has no budget row for it, and when it runs out Anthropic refuses: that morning's issue then fails whole,
// no text and no audio (Kay 11-01 22:43 asked for a warning before that day comes). The receipts carry no cost for
// Claude, so the month's spend is counted from their tokens at list price; a cached read, if one is ever sent, counts
// at full price, so this errs high.
import { sql } from "@aihot/backend/db";
import type { Finding } from "@aihot/backend/notify/feishu";

/**
 * The credit and the day of the month it renews, unless settings 'reference.claude-credit' says otherwise
 * ({"monthly": 100, "renewsOn": 4}): a plan change is then one row, not a deploy. Not the 1st: on 11-02 the credit ran
 * out while the receipts counted from 11-01 showed about US$2.7, so the warning never went off; Kay's bill (11-02 19:28)
 * renews on the 4th (next 12-04). Ultra gives US$200, but Kay 11-02 19:31 set US$100 a month as the standard to plan by.
 */
export type CreditPlan = { monthly: number; renewsOn: number };
export const DEFAULT_PLAN: CreditPlan = { monthly: 100, renewsOn: 4 };
/** US$ per million tokens, input and output (platform.claude.com pricing, 11-01). */
const PRICES: Record<string, [number, number]> = {
  "claude-opus-5-5": [4, 20], "claude-sonnet-5-5": [2, 10], "claude-haiku-5-5": [0.1, 0.5],
};
/** Warn at this share spent, or when the month at its pace so far would go over. */
const WARN_SHARE = 0.8;
/** Days into the month before the pace counts: the first days say too little. */
const PACE_AFTER_DAYS = 3;

export function monthSpend(rows: Array<{ model: string | null; input: number; output: number }>): number {
  return rows.reduce((sum, r) => {
    const [i, o] = PRICES[r.model ?? ""] ?? PRICES["claude-opus-5-5"]!;
    return sum + (r.input * i + r.output * o) / 1e6;
  }, 0);
}

/** The credit's current period, renewal to renewal (UTC days). */
export function creditPeriod(now: Date, renewsOn = DEFAULT_PLAN.renewsOn): { start: number; end: number } {
  const back = now.getUTCDate() < renewsOn ? 1 : 0;
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, renewsOn);
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back + 1, renewsOn);
  return { start, end };
}

export function creditFinding(spent: number, now: Date, plan: CreditPlan = DEFAULT_PLAN): Finding | null {
  const MONTHLY_CREDIT = plan.monthly;
  const { start, end } = creditPeriod(now, plan.renewsOn);
  const days = (end - start) / 86_400_000;
  const elapsed = (now.getTime() - start) / 86_400_000;
  const pace = elapsed >= PACE_AFTER_DAYS ? (spent / elapsed) * days : null;
  const over = spent >= MONTHLY_CREDIT * WARN_SHARE;
  if (!over && !(pace !== null && pace > MONTHLY_CREDIT)) return null;
  const left = Math.max(0, MONTHLY_CREDIT - spent);
  const perDay = elapsed > 0 ? spent / elapsed : 0;
  return {
    key: "reference.claude-credit",
    level: spent >= MONTHLY_CREDIT * 0.95 ? "now" : "today",
    title: "Claude API 额度快用完，十一说可能断刊",
    impact: `这个月已用约 US$${spent.toFixed(0)}（额度 US$${MONTHLY_CREDIT}），剩约 US$${left.toFixed(0)}${perDay > 0 ? `，照现在每天约 US$${perDay.toFixed(1)}，约 ${Math.floor(left / perDay)} 天后用完` : ""}${pace !== null ? `；照这个速度整月约 US$${pace.toFixed(0)}` : ""}；用完那天的十一说整期出不来（没有文字也没有声音）`,
    heals: `每月 ${plan.renewsOn} 号额度重置`,
    action: "告诉 Kay：加额度，或者这个月剩下的日子少用 Claude",
    detail: "按回执 token × 标价估算（Opus 5.5 $4/$20 每百万），回执里没有 Claude 的费用；不含这台服务器以外用同一把钥匙的花费",
  };
}

export async function creditAlerts(now: number): Promise<Finding[]> {
  const at = new Date(now);
  const [row] = await sql<{ value: Partial<CreditPlan> }[]>`SELECT value FROM settings WHERE key = 'reference.claude-credit'`;
  const plan = { ...DEFAULT_PLAN, ...row?.value };
  const start = new Date(creditPeriod(at, plan.renewsOn).start);
  const rows = await sql<{ model: string | null; input: number; output: number }[]>`
    SELECT model, coalesce(sum((usage->>'prompt_tokens')::bigint), 0)::float8 AS input,
      coalesce(sum((usage->>'completion_tokens')::bigint), 0)::float8 AS output
    FROM receipt_attempts WHERE service = 'anthropic' AND origin = 'live' AND started_at >= ${start} AND started_at <= ${at}
    GROUP BY model`;
  const f = creditFinding(monthSpend(rows), at, plan);
  return f ? [f] : [];
}
