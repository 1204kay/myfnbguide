// Why did the score model put items the user labelled 必看 low? Sends the production score prompt (SCORE_SYSTEM,
// the same input as the score step in editorial/analyze.ts) with a debugging note at the end that asks for the item
// type, the five axes, the noise rule it applied and one reason instead of the bare score. One line per case, short
// enough to copy out of a web terminal; Claude reads them against the labels in myfnb/gold-labels.tsv.
// Without case ids it takes the 必看 cases of the newest SelectBench run (scripts/eval-selection.ts imports every run)
// that scored below --below. Needs .data/gold.jsonl, so build it in the same container first:
//   sudo docker compose exec -T -u root worker sh -c "node myfnb/build-gold.ts > /dev/null && node myfnb/debug-score.ts"
//   node myfnb/debug-score.ts [--below 40] [--max 20] [case ids...]
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { REPO_ROOT } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { buildScoreInput, SCORE_SYSTEM, type AnalyzeInputArticle } from "@aihot/backend/editorial/analyze";
import { modelFor } from "@aihot/backend/editorial/models";
import { chatJson, markReceiptsCompleted } from "@aihot/backend/providers/llm";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { below: { type: "string", default: "40" }, max: { type: "string", default: "20" }, gold: { type: "string", default: ".data/gold.jsonl" } },
});

interface GoldRow {
  caseId: string;
  material: { title: string; originalTitle: string | null; publishedAt: string | null; sourceName: string; bodyZh: string | null; bodyOriginal: string | null };
  sourceFacts: { sourceKind: string; sourceTier?: string; firstParty?: boolean };
}
const gold = new Map(readFileSync(path.resolve(REPO_ROOT, values.gold!), "utf8").split("\n").filter((l) => l.trim())
  .map((l) => JSON.parse(l) as GoldRow).map((r) => [r.caseId, r]));

// The eval's own score for each case, to set beside the debugging answer.
const [run] = await sql<{ id: string; label: string }[]>`SELECT id, label FROM selectbench_runs ORDER BY created_at DESC LIMIT 1`;
const scored = run ? await sql<{ case_id: string; score: number | null }[]>`
  SELECT case_id, score FROM selectbench_results WHERE run_id = ${run.id}` : [];
const evalScore = new Map(scored.map((r) => [r.case_id, r.score]));
const ids = positionals.length ? positionals : run ? (await sql<{ case_id: string }[]>`
  SELECT case_id FROM selectbench_results
  WHERE run_id = ${run.id} AND gold = 'select' AND relevance IN ('pass', 'unknown') AND score < ${Number(values.below)}
  ORDER BY score, case_id LIMIT ${Number(values.max)}`).map((r) => r.case_id) : [];
console.log(`# ${run ? `${run.id} ${run.label}` : "no SelectBench run"} · ${ids.length} cases`);

// The same input the eval gives the score step (scripts/eval-selection.ts toInput).
function toInput(r: GoldRow): AnalyzeInputArticle {
  const m = r.material;
  return {
    id: `gold-${r.caseId}`, revision: 1, bodyStatus: "ok", title: m.originalTitle || m.title, url: "https://example.invalid/" + r.caseId,
    author: null, publishedAt: m.publishedAt ? new Date(m.publishedAt) : null, bodyText: m.bodyOriginal || m.bodyZh || null, excerpt: null,
    xPost: null, media: [],
    source: { name: m.sourceName, kind: r.sourceFacts.sourceKind, tier: r.sourceFacts.sourceTier ?? "T2", firstParty: r.sourceFacts.firstParty ?? false },
  };
}

const DEBUG = `

## 调试输出（只用于这一次检查标准，取代上面的输出格式）

这一次不是正式评分，是在检查评分标准哪里把内容压低了。照上面的全部规则在心里算完以后，不要只输出分数，改为只返回下面这个 JSON（不要 Markdown）：
{"itemType": "七类之一", "sig": 0, "nov": 0, "cred": 0, "reson": 0, "act": 0, "attentionScore": 0, "rule": "用到的压分规则或上限，引原话的前十几个字；没有就写空字符串", "why": "一句中文，60 字以内：分数主要被哪一轴拉低、为什么"}
五轴是 0–10 的整数，attentionScore 按上面的类型权重表算出。`;
const DebugSchema = z.object({
  itemType: z.string(), sig: z.coerce.number(), nov: z.coerce.number(), cred: z.coerce.number(), reson: z.coerce.number(), act: z.coerce.number(),
  attentionScore: z.coerce.number(), rule: z.string().default(""), why: z.string().default(""),
});

const model = await modelFor("score");
for (const id of ids) {
  const r = gold.get(id);
  if (!r) { console.log(`${id} 不在 gold 里（先跑 build-gold.ts）`); continue; }
  const input = toInput(r);
  try {
    const res = await chatJson({
      model, purpose: "debug_score", subject: `gold:${id}`, promptVersion: "debug-score-1", system: SCORE_SYSTEM + DEBUG,
      user: buildScoreInput(input), schema: DebugSchema, temperature: 0.2, maxTokens: 1500,
    });
    await markReceiptsCompleted([res.receiptId]);
    const d = res.data;
    const one = (s: string) => s.replace(/\s+/g, " ").trim();
    console.log(`${id} 评测${evalScore.get(id) ?? "-"} → ${d.itemType} s${d.sig} n${d.nov} c${d.cred} r${d.reson} a${d.act} =${d.attentionScore}`
      + ` | 正文${(input.bodyText ?? "").length}字 | ${one(d.rule).slice(0, 40) || "无压分"} | ${one(d.why).slice(0, 80)}`);
  } catch (error) {
    console.log(`${id} 失败：${String(error).slice(0, 120)}`);
  }
}
await closeDb();
