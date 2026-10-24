// Offline replay for grouping one trend as one story (十一 10-24, plan A of 手册 业务线/myfnbguide/记录/2026-10-24/趋势测量-结果.md):
// the site's group-batch prompt beside the same prompt with myfnb/group-definitions-candidate.md, on the cases of
// myfnb/trend-cases-2026-10-24.json. Nothing on the site changes: no membership, story or publication is written.
//   1. Recall, as group.ts runs it (recallFacts, RECALL_MIN_COSINE, RECALL_TOP_FACTS): does each member find the earlier ones?
//   2. Judgement, with the earlier members handed in as candidates whatever recall found, one batch call a member a side,
//      in discovery order like the worker. A tie is SAME_OCCURRENCE or SAME_STORY at TIE_MIN_CONFIDENCE.
//   A trend passes when its tied members span 3 or more publishers; a negative pair passes when it is not tied.
//   A report in no event cannot be recalled or tied, and stays in its trend's count.
//   The bar, written before the run: candidate passes 5 of 7 trends and 0 negatives are tied.
//   node myfnb/eval-trend-group.ts [--max-calls 120]
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { REPO_ROOT } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { modelRoute } from "@aihot/backend/editorial/models";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { chatJson } from "@aihot/backend/providers/llm";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { candidateViews, recallFacts } from "@aihot/backend/events/recall";
import { BATCH_PROMPT_VERSION, BATCH_SYSTEM, BatchSchema, batchUser, completeDecisions, firmlyTied, reportText, type ReportView } from "@aihot/backend/events/relate";

const { values } = parseArgs({ options: { "max-calls": { type: "string", default: "120" } } });
const CASES = JSON.parse(readFileSync(path.join(REPO_ROOT, "myfnb/trend-cases-2026-10-24.json"), "utf8")) as {
  publisher: Record<string, string>; trends: Array<{ name: string; titles: string[] }>; negatives: Array<{ name: string; titles: string[] }>;
};
const DEFINITIONS = readFileSync(path.join(REPO_ROOT, "myfnb/group-definitions-candidate.md"), "utf8");
const CANDIDATE = promptFromText("group-batch-candidate",
  readFileSync(path.join(REPO_ROOT, "industry/prompts/group-batch.md"), "utf8").replace("{{> group-definitions}}", DEFINITIONS));
const RECALL_MIN_COSINE = 0.6, RECALL_TOP_FACTS = 10; // group.ts

type Member = { id: string; title: string; summary: string | null; publisher: string; factId: number | null; storyId: number; factTitle: string; at: Date; view: ReportView; why: string };
// A title that does not find exactly one public report is skipped and listed, not fatal (十一 10-24); more than 3 skipped
// makes the run invalid. A report found but in no event stays in its trend and counts as not recalled and never tied:
// it may be the gap itself, so it does not leave the denominator.
const skipped = new Map<string, string>(); // by title: a title in two groups counts once
async function member(t: string): Promise<Member | null> {
  const rows = await sql<{ id: string; title: string; summary: string | null; source_id: string; source_name: string; first_party: boolean;
    published_at: Date | null; publication_time: string | null; discovered_at: Date; body_text: string | null; fact_id: number | null; story_id: number | null; fact_title: string | null;
    grouping_status: string; verdict: string | null }[]>`
    SELECT a.id, p.title, p.summary, s.id AS source_id, s.name AS source_name, (s.tier = 'T1') AS first_party, a.published_at, a.publication_time,
           a.discovered_at, a.body_text, f.id AS fact_id, f.story_id, f.title AS fact_title, a.grouping_status,
           (SELECT d.verdict FROM grouping_decisions d WHERE d.article_id = a.id ORDER BY d.id DESC LIMIT 1) AS verdict
    FROM publications p JOIN articles a ON a.id = p.article_id JOIN sources s ON s.id = a.source_id
    LEFT JOIN fact_articles fa ON fa.article_id = a.id AND fa.role IN ('primary', 'report') LEFT JOIN facts f ON f.id = fa.fact_id
    WHERE p.visibility = 'public' AND p.eligible AND p.discovered_at > now() - interval '21 days' AND p.title LIKE ${"%" + t + "%"}`;
  const ids = new Set(rows.map((r) => r.id));
  if (ids.size !== 1) {
    skipped.set(t, ids.size === 0 ? "没找到" : `找到 ${ids.size} 条`);
    return null;
  }
  const r = rows[0]!;
  return {
    id: r.id, title: r.title, summary: r.summary, publisher: CASES.publisher[r.source_id] ?? r.source_id,
    factId: r.fact_id === null ? null : Number(r.fact_id), storyId: Number(r.story_id), factTitle: r.fact_title ?? "", at: r.discovered_at,
    why: r.fact_id === null ? `不在任何事件里（归组 ${r.grouping_status}，最后一次判定 ${r.verdict ?? "无"}）` : "",
    view: { title: r.title, source: r.source_name, firstParty: r.first_party, at: r.published_at, publicationTime: r.publication_time, summary: r.summary, sourceText: r.body_text },
  };
}

const groups = [...CASES.trends.map((g) => ({ ...g, kind: "trend" as const })), ...CASES.negatives.map((g) => ({ ...g, kind: "negative" as const }))];
const loaded = [];
for (const g of groups) {
  const found = [];
  for (const t of g.titles) { const m = await member(t); if (m) found.push(m); }
  loaded.push({ ...g, members: found.sort((a, b) => a.at.getTime() - b.at.getTime()) });
}
if (skipped.size) console.log(`# 跳过 ${skipped.size} 条：\n  ${[...skipped].map(([t, why]) => `「${t}」：${why}`).join("\n  ")}`);
if (skipped.size > 3) {
  console.log("# 跳过超过 3 条，这次无效（没有调用模型）");
  await closeDb();
  process.exit(0);
}
const grouped = (ms: Member[]) => ms.filter((m) => m.factId !== null);
const most = loaded.reduce((n, g) => n + Math.max(0, grouped(g.members).length - 1) * 2, 0);
const loose = loaded.flatMap((g) => g.members.filter((m) => m.factId === null).map((m) => `${g.name} | ${m.title.slice(0, 30)}：${m.why}`));
console.log(`# ${loaded.length} groups, ${loaded.reduce((n, g) => n + g.members.length, 0)} reports · at most ${most} calls`);
if (loose.length) console.log(`# 不在事件里、算没召回也不会被连上的 ${loose.length} 条：\n  ${[...new Set(loose)].join("\n  ")}`);
if (most > Number(values["max-calls"])) throw new Error(`at most ${most} calls, over --max-calls ${values["max-calls"]}: none sent`);
const route = await modelRoute("group");

async function judge(q: Member, earlier: Member[], system: string, version: string) {
  const cands = await candidateViews(earlier.map((m) => ({ factId: m.factId!, storyId: m.storyId, factTitle: m.factTitle, score: 1 })));
  const res = await chatJson({
    ...route, purpose: "group_article", subject: `article:${q.id}`, promptVersion: version, system, user: batchUser(q.view, cands),
    schema: BatchSchema.refine((v) => completeDecisions(v.decisions, cands.length), "Every candidate requires exactly one decision"),
    temperature: 0, maxTokens: 400 + 120 * cands.length, attemptTag: version === BATCH_PROMPT_VERSION ? "trend-replay" : "trend-replay:candidate",
  });
  await completeReceipt(sql, res.receiptId);
  return { cands, data: res.data };
}

// Union-find over the members a side ties together.
function spans(members: Member[], ties: Array<[string, string]>): number {
  const up = new Map(members.map((m) => [m.id, m.id]));
  const root = (x: string): string => (up.get(x) === x ? x : root(up.get(x)!));
  for (const [a, b] of ties) up.set(root(a), root(b));
  const byRoot = new Map<string, Set<string>>();
  for (const m of members) byRoot.set(root(m.id), (byRoot.get(root(m.id)) ?? new Set()).add(m.publisher));
  return Math.max(0, ...[...byRoot.values()].map((s) => s.size));
}

// Recall first, with no model call: if it does not bring 5 trends' members together, judging them is moot (十一 10-24).
let recallPassed = 0;
for (const g of loaded.filter((x) => x.kind === "trend")) {
  console.log(`\n== 召回 ${g.name}`);
  const links: Array<[string, string]> = [];
  for (const m of g.members) {
    if (m.factId === null) { console.log(`  ${m.publisher} | ${m.title.slice(0, 40)} → ${m.why}，算没召回`); continue; }
    const recalled = await recallFacts(m.id, reportText(m.title, m.summary), RECALL_MIN_COSINE, RECALL_TOP_FACTS);
    const found = g.members.filter((o) => o !== m && recalled.some((r) => r.factId === o.factId));
    for (const o of found) links.push([m.id, o.id]);
    console.log(`  ${m.publisher} | ${m.title.slice(0, 40)} → ${found.length ? found.map((o) => o.title.slice(0, 16)).join(" / ") : "（一条都没召回）"}`);
  }
  const n = spans(g.members, links);
  if (n >= 3) recallPassed++;
  console.log(`  召回连到一起的最多 ${n} 家 → ${n >= 3 ? "过" : "不过"}`);
}
console.log(`\n# 召回：趋势 ${recallPassed}/${CASES.trends.length}`);
if (recallPassed < 5) {
  console.log("# 召回不到 5 个，提示词那半不跑（没有调用模型）");
  await closeDb();
  process.exit(0);
}

const tally = { site: { trends: 0, negatives: 0 }, cand: { trends: 0, negatives: 0 } };
for (const g of loaded) {
  console.log(`\n== ${g.kind === "trend" ? "趋势" : "反例"} ${g.name}`);
  const ties = { site: [] as Array<[string, string]>, cand: [] as Array<[string, string]> };
  const judged = grouped(g.members);
  for (let i = 1; i < judged.length; i++) {
    const q = judged[i]!, earlier = judged.slice(0, i);
    for (const [side, system, version] of [["site", BATCH_SYSTEM, BATCH_PROMPT_VERSION], ["cand", CANDIDATE, `group-batch-candidate@${DEFINITIONS.length}`]] as const) {
      const { cands, data } = await judge(q, earlier, system, version);
      const line = cands.map((c, k) => {
        const d = data.decisions.find((x) => x.id === `C${k + 1}`)!;
        const other = earlier.find((m) => m.factId === c.factId)!;
        if (firmlyTied(d.relation, d.confidence)) ties[side].push([q.id, other.id]);
        return `${d.relation}@${d.confidence}`;
      }).join(" ");
      console.log(`  ${side === "site" ? "现行" : "候选"} ${q.title.slice(0, 24)} → ${line} · addsValue ${data.selection.addsValue}`);
    }
  }
  for (const side of ["site", "cand"] as const) {
    const n = spans(g.members, ties[side]);
    const ok = g.kind === "trend" ? n >= 3 : ties[side].length === 0;
    if (ok) tally[side][g.kind === "trend" ? "trends" : "negatives"]++;
    console.log(`  ${side === "site" ? "现行" : "候选"}：连到一起的最多 ${n} 家 → ${ok ? "过" : "不过"}`);
  }
}
const t = CASES.trends.length, n = CASES.negatives.length;
console.log(`\n# 现行：趋势 ${tally.site.trends}/${t}，反例没误合 ${tally.site.negatives}/${n}`);
console.log(`# 候选：趋势 ${tally.cand.trends}/${t}，反例没误合 ${tally.cand.negatives}/${n} → ${tally.cand.trends >= 5 && tally.cand.negatives === n ? "过关" : "不过关"}`);
await closeDb();
