// A candidate score prompt (myfnb/selection-score-candidate.md, written when a new one is tried; 10/16's went live) beside the site's (industry/prompts/selection-score.md),
// on the items the user labelled, each scored twice like the score step of editorial/analyze.ts on its current material.
// Nothing on the site changes and nothing is written under .data, so it runs without -u root through the ops gate.
// The site's half reuses the receipts of the live scoring wherever the material is unchanged, so it is mostly free.
//   Labels: myfnb/labels-2026-10-16.tsv (this round, the user's current taste) and myfnb/gold-labels.tsv (earlier rounds;
//   a case relabelled this round is taken from this round). Feed-labelled rows are found by url if collected since.
//   myfnb/labels-2026-10-23.tsv (round "five"): items the 10-23 standard (五个理由, 决定记录 2026-10-23) takes in (可看)
//   or still keeps out (不看), each checked against its original.
//   node myfnb/eval-score-candidate.ts [--rounds five,new,old] [--max-calls 1200] [--concurrency 6]
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { REPO_ROOT } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { buildScoreInput, loadAnalyzeInput, PROMPT_VERSIONS, SCORE_SYSTEM, ScoreSchema, type AnalyzeInputArticle } from "@aihot/backend/editorial/analyze";
import { modelFor } from "@aihot/backend/editorial/models";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { chatJson } from "@aihot/backend/providers/llm";
import { completeReceipt } from "@aihot/backend/providers/receipts";

const { values } = parseArgs({ options: { rounds: { type: "string", default: "five,new,old" }, "max-calls": { type: "string", default: "1200" }, concurrency: { type: "string", default: "6" } } });
const ROUNDS = ["five", "new", "old"] as const;
const rounds = new Set(values.rounds.split(","));

type Row = { id: string; label: string; round: (typeof ROUNDS)[number]; url: string };
function readLabels(file: string, round: Row["round"]): Row[] {
  return readFileSync(path.resolve(REPO_ROOT, file), "utf8").split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("article_id\t"))
    .map((l) => { const c = l.split("\t"); return { id: c[0]!, label: c[1]!, round, url: c[4] ? c[5] ?? "" : "" }; });
}
const five = readLabels("myfnb/labels-2026-10-23.tsv", "five");
const fresh = readLabels("myfnb/labels-2026-10-16.tsv", "new");
const seen = new Set(fresh.map((r) => r.id));
const rows = [...five, ...fresh, ...readLabels("myfnb/gold-labels.tsv", "old").filter((r) => !seen.has(r.id))].filter((r) => rounds.has(r.round));

// Feed-labelled cases (r2-…, r3-…) are articles only if the source has collected that url since.
const urls = rows.filter((r) => r.url).map((r) => r.url);
const byUrl = new Map((urls.length ? await sql<{ id: string; url: string }[]>`SELECT id, url FROM articles WHERE url IN ${sql(urls)}` : [])
  .map((a) => [a.url, a.id]));
const cases: Array<Row & { a: AnalyzeInputArticle }> = [];
let missing = 0;
for (const r of rows) {
  const id = r.url ? byUrl.get(r.url) : r.id;
  const a = id ? await loadAnalyzeInput(id) : null;
  if (a) cases.push({ ...r, a }); else missing++;
}
const most = cases.length * 4;
console.log(`# ${cases.length} cases (${ROUNDS.map((r) => `${r} ${cases.filter((c) => c.round === r).length}`).join(", ")}), ${missing} not in the database · at most ${most} calls`);
if (most > Number(values["max-calls"])) throw new Error(`at most ${most} calls, over --max-calls ${values["max-calls"]}: none sent`);

const CANDIDATE_TEXT = readFileSync(path.join(REPO_ROOT, "myfnb/selection-score-candidate.md"), "utf8");
const CANDIDATE = promptFromText("selection-score-candidate", CANDIDATE_TEXT);
const CANDIDATE_VERSION = `selection-score-candidate@${createHash("sha256").update(CANDIDATE_TEXT).digest("hex").slice(0, 10)}`;
const model = await modelFor("score");

// Two calls in a row, as the score step makes them (analyze.ts runScores); the site's prompt with the step's own
// request identity, so an unchanged material reuses the live receipts.
async function score(a: AnalyzeInputArticle, system: string, version: string, tag: string): Promise<number | null> {
  let sum = 0;
  for (let i = 1; i <= 2; i++) {
    const res = await chatJson({
      model, purpose: "score_article", subject: `article:${a.id}@${a.revision}`, promptVersion: version, system, user: buildScoreInput(a),
      schema: ScoreSchema, temperature: 0.2, maxTokens: 1024, timeoutMs: 120_000, attemptTag: `${tag}score-${i}`,
    });
    await completeReceipt(sql, res.receiptId);
    sum += res.data.attentionScore;
  }
  return sum / 2;
}

const out: Array<{ c: (typeof cases)[number]; cur: number | null; cand: number | null }> = new Array(cases.length);
let next = 0;
await Promise.all(Array.from({ length: Number(values.concurrency) }, async () => {
  while (next < cases.length) {
    const i = next++;
    const c = cases[i]!;
    const safe = (p: Promise<number | null>) => p.catch((e) => { console.log(`! ${c.id} ${String(e).slice(0, 100)}`); return null; });
    out[i] = { c, cur: await safe(score(c.a, SCORE_SYSTEM, PROMPT_VERSIONS.score, "")), cand: await safe(score(c.a, CANDIDATE, CANDIDATE_VERSION, "candidate:")) };
  }
}));

const auc = (hi: number[], lo: number[]) => hi.length && lo.length
  ? (hi.reduce((n, x) => n + lo.reduce((m, y) => m + (x > y ? 1 : x === y ? 0.5 : 0), 0), 0) / (hi.length * lo.length)).toFixed(3) : "-";
for (const round of ROUNDS) {
  const set = out.filter((x) => x.c.round === round);
  for (const which of ["cur", "cand"] as const) {
    const s = (label: string) => set.filter((x) => x.c.label === label && x[which] !== null).map((x) => x[which]!);
    console.log(`== ${round} ${which}: 必看 ${s("必看").length} 可看 ${s("可看").length} 不看 ${s("不看").length} · AUC 必看>可看 ${auc(s("必看"), s("可看"))} 必看>不看 ${auc(s("必看"), s("不看"))} 可看>不看 ${auc(s("可看"), s("不看"))}`);
    const line = [];
    for (let t = 30; t <= 70; t += 4) line.push(`${t}:${["必看", "可看", "不看"].map((l) => s(l).filter((v) => v >= t).length).join("/")}`);
    console.log(`   入选 必看/可看/不看 ${line.join("  ")}`);
  }
}
console.log("# label | site | candidate | title");
for (const x of out.filter((x) => x.c.round !== "old").sort((p, q) => (q.cand ?? -1) - (p.cand ?? -1))) {
  console.log(`${x.c.round} ${x.c.label} | ${x.cur ?? "-"} | ${x.cand ?? "-"} | ${x.c.a.title.slice(0, 50).replace(/\s+/g, " ")}`);
}
await closeDb();
