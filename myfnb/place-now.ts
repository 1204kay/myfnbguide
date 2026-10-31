// 没有故事的入选条目放进参考库的情况（待决 #19，modules/reference/backend/place.ts）：每条一次很短的模型调用，只选情况和组。
// 每天 03:20 的任务只在 settings 有 reference.placing 一行时跑；这个脚本先小量试、看过再补完、再打开每天的任务。
// 不带参数：只看还有多少条等着放，不调模型、不写库。
//   sudo docker compose exec -T worker node myfnb/place-now.ts
//   sudo docker compose exec -T worker node myfnb/place-now.ts --try 20     最新的 20 条试放，打印结果和花费，不写库
//   sudo docker compose exec -T worker node myfnb/place-now.ts --run 300    放最多 300 条并存库（试过的那几条用回执里的答案，不再付钱）
//   sudo docker compose exec -T worker node myfnb/place-now.ts --on         打开每天 03:20 的任务
//   sudo docker compose exec -T worker node myfnb/place-now.ts --off        关掉：删掉那一行，已放好的照旧显示
import { closeDb, sql } from "@aihot/backend/db";
import { installModules } from "@aihot/backend/modules";
import { SERVER_MODULES } from "@aihot/site/modules/server";
import { articlesToPlace, composePlacing, storePlacing, type PlaceResult } from "../modules/reference/backend/place.ts";

// modelFor knows a module's steps (referencePlace) only once the modules are installed, as the worker installs them.
installModules(SERVER_MODULES);

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const count = (name: string) => {
  const v = arg(name);
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error(`${name} 要一个正整数，例如 ${name} 20`);
  return n;
};

/**
 * What the calls of these results cost: DeepSeek gives no price in its answer, so the receipts' cost is empty and the
 * cost is estimated from the tokens at the price table's rate, as the admin's 模型与评测 page does (admin/models.ts):
 * cached prompt tokens at the cache price, the rest at the input price. A reused answer is the receipt it reuses, counted once.
 */
async function costOf(results: PlaceResult[]): Promise<{ calls: number; tokensIn: number; cached: number; tokensOut: number; usd: number | null }> {
  const ids = [...new Set(results.flatMap((r) => r.receiptIds))];
  if (!ids.length) return { calls: 0, tokensIn: 0, cached: 0, tokensOut: 0, usd: 0 };
  const [row] = await sql<{ tokens_in: string | null; cached: string | null; tokens_out: string | null; usd: string | null; unpriced: number }[]>`
    WITH t AS (
      SELECT a.model, (a.usage->>'prompt_tokens')::bigint AS tin, (a.usage->>'completion_tokens')::bigint AS tout,
             coalesce((a.usage->'prompt_tokens_details'->>'cached_tokens')::bigint, (a.usage->>'prompt_cache_hit_tokens')::bigint, 0) AS tc
      FROM receipt_attempts a WHERE a.receipt_id IN ${sql(ids)} AND a.usage IS NOT NULL)
    SELECT sum(tin) AS tokens_in, sum(tc) AS cached, sum(tout) AS tokens_out,
           sum(((tin - tc) * p.input_per_mtok + tc * coalesce(p.cached_per_mtok, p.input_per_mtok) + tout * p.output_per_mtok) / 1e6) AS usd,
           count(*) FILTER (WHERE p.model IS NULL)::int AS unpriced
    FROM t LEFT JOIN service_prices p ON p.service = 'deepseek' AND p.model = t.model`;
  return {
    calls: ids.length, tokensIn: Number(row?.tokens_in ?? 0), cached: Number(row?.cached ?? 0), tokensOut: Number(row?.tokens_out ?? 0),
    usd: row && row.unpriced === 0 && row.usd !== null ? Number(row.usd) : null,
  };
}

function print(r: PlaceResult) {
  const p = r.placing.placements[0];
  const where = p ? `${p.situation} / ${p.group ?? "（其他）"}｜${p.fit}` : "（不放）";
  console.log(`${r.id}\t${r.placing.speaker}\t${r.title}\n    main：${r.placing.main}\n    → ${where}${r.problems.length ? `　问题：${r.problems.join("；")}` : ""}`);
}

if (process.argv.includes("--on")) {
  await sql`INSERT INTO settings (key, value, updated_by) VALUES ('reference.placing', ${sql.json({ on: true })}, 'myfnb/place-now.ts')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`;
  console.log("已打开：每天 03:20 放前一天入选的条目");
} else if (process.argv.includes("--off")) {
  await sql`DELETE FROM settings WHERE key = 'reference.placing'`;
  console.log("已关掉：每天的任务不再放；已放好的照旧显示");
} else if (process.argv.includes("--try") || process.argv.includes("--run")) {
  const store = process.argv.includes("--run");
  const items = await articlesToPlace(count(store ? "--run" : "--try"));
  const results: PlaceResult[] = [];
  for (const item of items) {
    const result = await composePlacing(item);
    if (store) await storePlacing(item, result);
    results.push(result);
    print(result);
  }
  const { calls, tokensIn, cached, tokensOut, usd } = await costOf(results);
  const placed = results.filter((r) => r.placing.placements.length).length;
  console.log(`\n${store ? "放好并存库" : "试放（没写库）"} ${results.length} 条：放进情况 ${placed}，不放 ${results.length - placed}；回执 ${calls} 张，`
    + `输入 ${tokensIn} token（缓存命中 ${cached}），输出 ${tokensOut}；按价格表估 ${usd === null ? "（有模型不在价格表里，算不出）" : `US$${usd.toFixed(4)}（非高峰价，高峰两倍）`}`);
} else {
  const [row] = await sql<{ value: unknown }[]>`SELECT value FROM settings WHERE key = 'reference.placing'`;
  const [stored] = await sql<{ placed: number; none: number }[]>`
    SELECT count(*) FILTER (WHERE cardinality(situations) > 0)::int AS placed, count(*) FILTER (WHERE cardinality(situations) = 0)::int AS none
    FROM reference_placements`;
  console.log(`每天的任务：${row ? "开" : "关"}；已放 ${stored!.placed}，不放 ${stored!.none}；还等着放 ${(await articlesToPlace(5000)).length}`);
}
await closeDb();
