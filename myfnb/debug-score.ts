// Why did the score model put items the user labelled 必看 low? For each case: the production score twice (the
// score step of editorial/analyze.ts on the current material), then the same prompt with its single-field output
// contract swapped for a debugging format that asks for the item type, the five axes, the noise rule it applied and
// one reason. One line per case, short enough to copy out of a web terminal; Claude reads them against the labels
// in myfnb/gold-labels.tsv.
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
import { buildScoreInput, runSelectionScores, SCORE_SYSTEM, type AnalyzeInputArticle } from "@aihot/backend/editorial/analyze";
import { modelFor } from "@aihot/backend/editorial/models";
import { chatJson } from "@aihot/backend/providers/llm";
import { completeReceipt } from "@aihot/backend/providers/receipts";

// The engine dropped markReceiptsCompleted: each answer used here is completed like the engine does.
const markReceiptsCompleted = async (ids: number[]) => { for (const id of ids) await completeReceipt(sql, id); };

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

// The production prompt allows nothing but attentionScore (three times over, and the input's first line says it
// again): on 10/3 a note appended at the end got bare scores back. The debugging prompt swaps those sentences for
// the debugging format; each must be found, so a reworded prompt stops the script instead of silently failing.
const FORMAT = `这一次是检查评分标准，不是正式评分。照上面的全部规则在心里算完以后，只返回下面这个 JSON（不要 Markdown，不要解释），每个键都要有：
{"itemType": "七类之一", "sig": 0, "nov": 0, "cred": 0, "reson": 0, "act": 0, "attentionScore": 0, "rule": "用到的压分规则或分数上限，引原话的前十几个字；没有就写空字符串", "why": "一句中文，60 字以内：分数主要被哪一轴拉低、为什么"}
五轴是 0–10 的整数，attentionScore 按类型权重表算出。`;
const SWAPS: Array<[string, string]> = [
  ["- 不输出理由、分类、五轴、置信度或精选结论。最终只有一个分数。\n", ""],
  ["## 内部计算步骤（只在心里完成，不要输出）", "## 计算步骤"],
  ["3. 确认你没有输出精选门槛、精选结论或任何额外字段。", "3. 确认你按最后的调试格式写出了类型、五轴和理由。"],
  ["只返回合法 JSON，不要 Markdown，不要解释。顶层必须且只能包含 `attentionScore`：\n\n{\"attentionScore\": 0}", FORMAT],
  ["五轴定义、类型权重和单字段输出契约不变", "五轴定义和类型权重不变"],
  ["不要额外加奖励分，也不要输出任何额外字段。", "不要额外加奖励分，输出仍按调试格式。"],
];
let DEBUG_SYSTEM = SCORE_SYSTEM.replace(/\r\n/g, "\n");
for (const [from, to] of SWAPS) {
  if (!DEBUG_SYSTEM.includes(from)) throw new Error(`selection-score.md no longer contains: ${from.slice(0, 40)}`);
  DEBUG_SYSTEM = DEBUG_SYSTEM.replace(from, to);
}
const SCORE_ONLY = "请按系统规则评估以下单篇材料所代表的事件。只输出 attentionScore。";
const debugUser = (input: AnalyzeInputArticle) => {
  const user = buildScoreInput(input);
  if (!user.startsWith(SCORE_ONLY)) throw new Error("the score input no longer starts with its usual line");
  return "请按系统规则评估以下单篇材料所代表的事件，按系统消息最后的调试格式输出。" + user.slice(SCORE_ONLY.length);
};
// Any JSON object is taken: the first run (10/3) lost every answer to a strict schema (a field came back null).
// Fields are read leniently below, and an answer missing the axes is printed raw instead.
const DebugSchema = z.record(z.string(), z.unknown());
const text = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v));
const one = (s: string) => s.replace(/\s+/g, " ").trim();

const model = await modelFor("score");
for (const id of ids) {
  const r = gold.get(id);
  if (!r) { console.log(`${id} 不在 gold 里（先跑 build-gold.ts）`); continue; }
  const input = toInput(r);
  try {
    // The production score on the material as it is built now (podcasts read from their feed's own text).
    const prod = await runSelectionScores(input, {});
    if (prod) await markReceiptsCompleted(prod.receiptIds);
    const res = await chatJson({
      model, purpose: "debug_score", subject: `gold:${id}`, promptVersion: "debug-score-2", system: DEBUG_SYSTEM,
      user: debugUser(input), schema: DebugSchema, temperature: 0.2, maxTokens: 1500,
    });
    await markReceiptsCompleted([res.receiptId]);
    const d = res.data;
    const axes = ["sig", "nov", "cred", "reson", "act", "attentionScore"].map((k) => Number(d[k]));
    const head = `${id} 评测${evalScore.get(id) ?? "-"} 现评${prod?.values.join("/") ?? "-"} | 正文${(input.bodyText ?? "").length}字`;
    if (axes.some((n) => !Number.isFinite(n))) { console.log(`${head} | 原样：${one(JSON.stringify(d)).slice(0, 300)}`); continue; }
    const [sig, nov, cred, reson, act, score] = axes;
    console.log(`${head} → ${text(d.itemType)} s${sig} n${nov} c${cred} r${reson} a${act} =${score}`
      + ` | ${one(text(d.rule)).slice(0, 40) || "无压分"} | ${one(text(d.why)).slice(0, 80)}`);
  } catch (error) {
    console.log(`${id} 失败：${one(String(error)).slice(0, 300)}`);
  }
}
await closeDb();
