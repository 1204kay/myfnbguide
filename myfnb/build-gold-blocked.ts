// 收录范围放宽的试跑（11-09，PR #267）：把站上最近 24 小时预筛挡掉的条目写成金标，交 scripts/eval-selection.ts 用候选预筛重跑，
// 看候选多放进多少、其中多少能选进精选。这些条目没人标过，判定一律记 either。文件含原文正文，只写到临时目录，跑完删掉。
//   node myfnb/build-gold-blocked.ts <out.jsonl> [小时数，默认 24]
import { writeFileSync } from "node:fs";
import { closeDb, sql } from "@aihot/backend/db";
import { loadAnalyzeInput } from "@aihot/backend/editorial/analyze";

const out = process.argv[2];
const hours = Number(process.argv[3] ?? 24);
if (!out || !(hours > 0)) throw new Error("usage: node myfnb/build-gold-blocked.ts <out.jsonl> [hours]");
// 每条只看最新一次分析：后来重新分析成 pass 的不算。
const ids = await sql<{ article_id: string }[]>`
  SELECT x.article_id FROM (
    SELECT DISTINCT ON (article_id) article_id, relevance, created_at FROM analyses
    WHERE created_at > now() - make_interval(hours => ${hours}) ORDER BY article_id, id DESC
  ) x WHERE x.relevance = 'block' ORDER BY x.created_at LIMIT 1500`;
const rows: string[] = [];
for (const { article_id } of ids) {
  const a = await loadAnalyzeInput(article_id);
  if (!a) continue;
  rows.push(JSON.stringify({
    caseId: `blocked-${article_id}`,
    material: { title: a.title, originalTitle: null, publishedAt: a.publishedAt?.toISOString() ?? null, sourceName: a.source.name,
      bodyZh: null, bodyOriginal: a.bodyText ?? a.excerpt ?? null },
    sourceFacts: { sourceKind: a.source.kind, sourceTier: a.source.tier, firstParty: a.source.firstParty, language: null },
    samplingContext: { benchmarkSplit: "development", samplingStratum: "blocked" },
    gold: { decision: "either" },
  }));
}
writeFileSync(out, `${rows.join("\n")}\n`);
console.log(`# 最近 ${hours} 小时预筛挡掉 ${ids.length} 条，写进金标 ${rows.length} 条`);
await closeDb();
