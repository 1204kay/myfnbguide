// 没有故事的入选条目放进参考库的情况（待决 #19，modules/reference/backend/place.ts）：每条一次很短的模型调用，只选情况和组。
// 每天 03:30 的任务只在 settings 有 reference.placing 一行时跑；这个脚本先小量试、看过再补完、再打开每天的任务。
// 不带参数：只看还有多少条等着放，不调模型、不写库。
//   sudo docker compose exec -T worker node myfnb/place-now.ts
//   sudo docker compose exec -T worker node myfnb/place-now.ts --try 20     最新的 20 条试放，打印结果和花费，不写库
//   sudo docker compose exec -T worker node myfnb/place-now.ts --run 300    放最多 300 条并存库（试过的那几条用回执里的答案，不再付钱）
//   sudo docker compose exec -T worker node myfnb/place-now.ts --on         打开每天 03:30 的任务
//   sudo docker compose exec -T worker node myfnb/place-now.ts --off        关掉：删掉那一行，已放好的照旧显示
import { closeDb, sql } from "@aihot/backend/db";
import { articlesToPlace, composePlacing, storePlacing, type PlaceResult } from "../modules/reference/backend/place.ts";

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const count = (name: string) => {
  const v = arg(name);
  const n = Number(v);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error(`${name} 要一个正整数，例如 ${name} 20`);
  return n;
};

/** What the calls of these results cost, from their receipts (a reused answer is the receipt it reuses, counted once). */
async function costOf(results: PlaceResult[]): Promise<{ calls: number; usd: number }> {
  const ids = [...new Set(results.flatMap((r) => r.receiptIds))];
  if (!ids.length) return { calls: 0, usd: 0 };
  const [row] = await sql<{ usd: string | null }[]>`SELECT sum(cost) AS usd FROM receipts WHERE id IN ${sql(ids)}`;
  return { calls: ids.length, usd: Number(row?.usd ?? 0) };
}

function print(r: PlaceResult) {
  const p = r.placing.placements[0];
  const where = p ? `${p.situation} / ${p.group ?? "（其他）"}｜${p.fit}` : "（不放）";
  console.log(`${r.id}\t${r.placing.speaker}\t${r.title}\n    → ${where}${r.problems.length ? `　问题：${r.problems.join("；")}` : ""}`);
}

if (process.argv.includes("--on")) {
  await sql`INSERT INTO settings (key, value, updated_by) VALUES ('reference.placing', ${sql.json({ on: true })}, 'myfnb/place-now.ts')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`;
  console.log("已打开：每天 03:30 放前一天入选的条目");
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
  const { calls, usd } = await costOf(results);
  const placed = results.filter((r) => r.placing.placements.length).length;
  console.log(`\n${store ? "放好并存库" : "试放（没写库）"} ${results.length} 条：放进情况 ${placed}，不放 ${results.length - placed}；回执 ${calls} 张，US$${usd.toFixed(4)}`);
} else {
  const [row] = await sql<{ value: unknown }[]>`SELECT value FROM settings WHERE key = 'reference.placing'`;
  const [stored] = await sql<{ placed: number; none: number }[]>`
    SELECT count(*) FILTER (WHERE cardinality(situations) > 0)::int AS placed, count(*) FILTER (WHERE cardinality(situations) = 0)::int AS none
    FROM reference_placements`;
  console.log(`每天的任务：${row ? "开" : "关"}；已放 ${stored!.placed}，不放 ${stored!.none}；还等着放 ${(await articlesToPlace(5000)).length}`);
}
await closeDb();
