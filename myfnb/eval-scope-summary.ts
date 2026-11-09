// 收录范围放宽试跑的结果（PR #267）：候选预筛在「站上挡掉的条目」里放进多少、能选进精选的有多少，逐条列出，
// 并按站上最近 24 小时的回执推算每天多花多少。
//   node myfnb/eval-scope-summary.ts <candidate.json> <试跑开始时刻 ISO> [小时数，默认 24]
import { readFileSync } from "node:fs";
import { closeDb, sql } from "@aihot/backend/db";

type Case = { caseId: string; title: string; decision: string | null; score: number | null; relevance: string | null; error?: string | null };
const [file, since, h] = process.argv.slice(2);
if (!file || !since) throw new Error("usage: node myfnb/eval-scope-summary.ts <candidate.json> <since ISO> [hours]");
const hours = Number(h ?? 24);
const cases = Object.values(JSON.parse(readFileSync(file, "utf8")).models as Record<string, { cases: Case[] }>)[0]!.cases;
const passed = cases.filter((c) => c.decision !== null && c.relevance !== "block");
const selected = passed.filter((c) => c.decision === "select");
const failed = cases.filter((c) => c.decision === null);
console.log(`# 站上挡掉 ${cases.length} 条：候选放进 ${passed.length}，仍挡 ${cases.length - passed.length - failed.length}，没跑成 ${failed.length}；放进的里面选进精选 ${selected.length}`);
// 没跑成的按报错归类（11-09 第一次试跑 194 条里 179 条没跑成，报告随临时目录删掉，只剩条数）。
const errs = new Map<string, number>();
for (const c of failed) { const k = String(c.error ?? "（没有报错原文）").slice(0, 160); errs.set(k, (errs.get(k) ?? 0) + 1); }
for (const [k, n] of [...errs].sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`# 没跑成 ${n} 条：${k}`);
console.log("\n# 放进的（分数 判定 | 标题），分数高的在前");
// 给 Kay 标注用：每条带来源名和原文链接（caseId 是 blocked-<条目 id>，只读）。
const ids = passed.map((c) => c.caseId.replace(/^blocked-/, ""));
const meta = new Map((ids.length ? await sql<{ id: string; url: string; source: string }[]>`
  SELECT a.id, a.url, s.name AS source FROM articles a JOIN sources s ON s.id = a.source_id WHERE a.id IN ${sql(ids)}` : []).map((r) => [r.id, r]));
for (const c of passed.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))) {
  const m = meta.get(c.caseId.replace(/^blocked-/, ""));
  console.log(`${c.score ?? "-"} ${c.decision === "select" ? "选" : "不选"} | ${c.title.slice(0, 70).replace(/\s+/g, " ")} | ${m?.source ?? "-"} | ${m?.url ?? "-"}`);
}
const [run] = await sql<{ n: number; cost: string | null }[]>`
  SELECT count(*)::int AS n, sum(cost) AS cost FROM receipts WHERE origin = 'live' AND created_at >= ${since}::timestamptz`;
console.log(`\n# 这次试跑：${run!.n} 次调用，${Number(run!.cost ?? 0).toFixed(4)} 美元（此刻起站上同时在跑的也算在内）`);
// 站上一条放进的条目，打分以后还要写标题、导读等。用最近 hours 小时站上的平均推算每多一条的花费。
const [day] = await sql<{ items: number; cost: string | null }[]>`
  SELECT (SELECT count(DISTINCT article_id)::int FROM analyses WHERE relevance = 'pass' AND created_at > now() - make_interval(hours => ${hours})) AS items,
         (SELECT sum(cost) FROM receipts WHERE purpose IN ('score_article','structure_article','understand_article','summarize_article','mend_wording')
            AND created_at > now() - make_interval(hours => ${hours})) AS cost`;
const per = day!.items ? Number(day!.cost ?? 0) / day!.items : 0;
console.log(`# 推算：站上最近 ${hours} 小时放进 ${day!.items} 条，打分和写作共 ${Number(day!.cost ?? 0).toFixed(3)} 美元，每条约 ${per.toFixed(4)}；`
  + `每天多放进 ${passed.length} 条约多 ${(per * passed.length).toFixed(3)} 美元（每天多 ${passed.length * 4}–${passed.length * 5} 次模型调用）`);
await closeDb();
