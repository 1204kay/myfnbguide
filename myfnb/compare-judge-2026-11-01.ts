// 2026-11-01：比两三个模型判同一批候选的结果（myfnb/aliyun-compare-2026-11-01-run.sh 调用）。只读，不调模型。
//   node myfnb/compare-judge-2026-11-01.ts --since <ISO 时间> 基准.jsonl 对照1.jsonl [对照2.jsonl …]
// 第一份是基准（直连 DeepSeek），后面每份和它逐个候选比：一样的比例、3×3 对照表、基准判 Y 的有几成对照也判 Y。
// 再从回执数这段时间每个模型用了多少 token、平均多久回、失败几次，按 DeepSeek flash 的价钱折成美元（看能省多少）。
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { closeDb, sql } from "@aihot/backend/db";

const { values, positionals } = parseArgs({ allowPositionals: true, options: { since: { type: "string" } } });
if (positionals.length < 2 || !values.since) throw new Error("用法：--since <ISO 时间> 基准.jsonl 对照.jsonl …");
type Row = { id: string; v: string | null };
const load = (f: string) => new Map(readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Row).map((r) => [r.id, r.v ?? "失败"]));
const [baseFile, ...others] = positionals as [string, ...string[]];
const base = load(baseFile);
const V = ["Y", "?", "N", "失败"];
for (const f of others) {
  const other = load(f);
  const ids = [...base.keys()].filter((id) => other.has(id));
  const m = new Map<string, number>();
  for (const id of ids) m.set(`${base.get(id)}>${other.get(id)}`, (m.get(`${base.get(id)}>${other.get(id)}`) ?? 0) + 1);
  const same = ids.filter((id) => base.get(id) === other.get(id)).length;
  const baseY = ids.filter((id) => base.get(id) === "Y");
  console.log(`\n# ${f}\n对上 ${ids.length} 个候选，判得一样 ${same} 个（${(100 * same / Math.max(ids.length, 1)).toFixed(1)}%）；`
    + `基准判 Y 的 ${baseY.length} 个里，对照也判 Y ${baseY.filter((id) => other.get(id) === "Y").length} 个`);
  console.log(`基准＼对照\t${V.join("\t")}`);
  for (const a of V) console.log(`${a}\t\t${V.map((b) => m.get(`${a}>${b}`) ?? 0).join("\t")}`);
}
// DeepSeek flash 每百万 token：输入 0.15、输出 0.6，高峰乘 2（myfnb/price-deepseek-2026-10-24.ts）。
const rows = await sql<{ service: string; model: string; calls: number; failed: number; prompt: string; completion: string; latency: number | null }[]>`
  SELECT ra.service, ra.model, count(*)::int AS calls, count(*) FILTER (WHERE ra.status <> 'received')::int AS failed,
         coalesce(sum((ra.usage->>'prompt_tokens')::numeric), 0)::text AS prompt, coalesce(sum((ra.usage->>'completion_tokens')::numeric), 0)::text AS completion,
         round(avg(ra.latency_ms))::int AS latency
  FROM receipt_attempts ra JOIN receipts r ON r.id = ra.receipt_id
  WHERE r.purpose = 'judge_source_candidate' AND ra.started_at >= ${new Date(values.since)}
  GROUP BY ra.service, ra.model ORDER BY ra.service, ra.model`;
console.log("\n# 这段时间的回执（同一批用已有回执的不算在内）");
for (const r of rows) {
  const usd = (Number(r.prompt) * 0.15 + Number(r.completion) * 0.6) / 1e6;
  console.log(`${r.service} ${r.model}：${r.calls} 次（失败 ${r.failed}），输入 ${r.prompt}、输出 ${r.completion} token，平均 ${r.latency ?? "-"} ms；`
    + `按 DeepSeek flash 价折 US$${usd.toFixed(4)}（高峰 US$${(usd * 2).toFixed(4)}）`);
}
await closeDb();
