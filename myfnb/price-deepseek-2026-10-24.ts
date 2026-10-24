// 2026-10-24：价格表（service_prices）里没有 deepseek-flash，预筛和核对员用它的回执都算不出花费（DeepSeek 不在回复里给价钱，
// 回执的 cost 一直是空的，后台「模型与评测」页显示「未定价」）。十一 10-24 定补上，好算核对员改用 flash 以后每条实际多少钱。
// 价钱照 DeepSeek 价格页（api-docs.deepseek.com/quick_start/pricing，10-24 读）的非高峰价（每百万 token，美元）；高峰时段（UTC 周一到周五 01–04、06–10 点）是两倍，表里只有一个价，
// 所以按它算出来的是下限。Pro 那行表里已有就不动，没有才补。
// 框架的 default 模型（LLM_* 环境变量）记在 service=llm 下，不是 deepseek（写稿、预筛等走它的步骤），所以近 30 天回执里
// service=llm 用过的 DeepSeek 模型也按同一个价补上（十一 10-24）；不是 DeepSeek 的模型只列出，不补。
// 不带参数只列出表里现有的 DeepSeek 价钱和会写什么；--apply 写入。
//   sudo docker compose run --rm -T -v <检出>/myfnb:/app/myfnb:ro worker node myfnb/price-deepseek-2026-10-24.ts [--apply]
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";

const apply = process.argv.includes("--apply");
const FLASH = { input: 0.15, cached: 0.003, output: 0.6 };
const PRO = { input: 0.66, cached: 0.022, output: 1.98 };
const PRICES: Array<{ service: string; model: string; input: number; cached: number; output: number; replace: boolean }> = [
  { service: "deepseek", model: "deepseek-flash", ...FLASH, replace: true },
  { service: "deepseek", model: "deepseek-v4-pro", ...PRO, replace: false },
];
// DeepSeek 的旧名 deepseek-v4-flash 等也按 flash 计（价格页：旧名仍由 flash 承接、按 flash 收费）。
const llm = await sql<{ model: string }[]>`
  SELECT DISTINCT model FROM receipts WHERE service = 'llm' AND model IS NOT NULL AND created_at > now() - interval '30 days' ORDER BY model`;
for (const { model } of llm) {
  const price = /^deepseek-.*flash/.test(model) ? FLASH : /^deepseek-v4-pro/.test(model) ? PRO : null;
  if (price) PRICES.push({ service: "llm", model, ...price, replace: true });
  else console.log(`service=llm 的 ${model} 不是 DeepSeek，不补`);
}

const now = await sql<{ service: string; model: string; currency: string; input_per_mtok: string | null; cached_per_mtok: string | null; output_per_mtok: string | null }[]>`
  SELECT service, model, currency, input_per_mtok::text, cached_per_mtok::text, output_per_mtok::text FROM service_prices WHERE service IN ('deepseek', 'llm') ORDER BY service, model`;
console.log(`表里现有 deepseek / llm 价钱 ${now.length} 行`);
for (const r of now) console.log(`  ${r.service} ${r.model || "（整个服务）"} ${r.currency} 输入 ${r.input_per_mtok} 缓存 ${r.cached_per_mtok} 输出 ${r.output_per_mtok}`);
for (const p of PRICES) {
  const had = now.some((r) => r.service === p.service && r.model === p.model);
  if (had && !p.replace) { console.log(`${p.service} ${p.model} 已有，不动`); continue; }
  console.log(`${p.service} ${p.model} ${had ? "改成" : "补上"}：USD 输入 ${p.input} 缓存 ${p.cached} 输出 ${p.output}`);
  if (apply) await sql`
    INSERT INTO service_prices (service, model, currency, input_per_mtok, cached_per_mtok, output_per_mtok, updated_at)
    VALUES (${p.service}, ${p.model}, 'USD', ${p.input}, ${p.cached}, ${p.output}, now())
    ON CONFLICT (service, model) DO UPDATE SET currency = 'USD', input_per_mtok = EXCLUDED.input_per_mtok,
      cached_per_mtok = EXCLUDED.cached_per_mtok, output_per_mtok = EXCLUDED.output_per_mtok, updated_at = now()`;
}
console.log(apply ? "\n已写入。" : "\n只列出，没有写；写入用 --apply。");
await stopBoss();
await closeDb();
