// Two reports of scripts/eval-selection.ts on the same gold set (myfnb/build-gold-rounds.ts), the site's score prompt and a
// candidate, side by side: per stratum how many of each gold decision each prompt selects, then every case the two
// decide differently or either decides wrong, with both scores, and for Kay's whole-day picks the daily each would make. The holdout stratum is the last check, not for tuning.
//   node myfnb/eval-selection-compare.ts <site.json> <candidate.json>
import { readFileSync } from "node:fs";
import { closeDb, sql } from "@aihot/backend/db";

type Case = { caseId: string; title: string; stratum: string | null; gold: string; decision: string | null; score: number | null; relevance: string | null };
const casesOf = (file: string): Case[] => Object.values(JSON.parse(readFileSync(file, "utf8")).models as Record<string, { cases: Case[] }>)[0]!.cases;
const [siteFile, candFile] = process.argv.slice(2);
if (!siteFile || !candFile) throw new Error("usage: node myfnb/eval-selection-compare.ts <site.json> <candidate.json>");
const site = casesOf(siteFile);
const cand = new Map(casesOf(candFile).map((c) => [c.caseId, c]));

const strata = [...new Set(site.map((c) => c.stratum ?? "-"))];
console.log("# 每一轮：金标 该选/不该选 的条数 · 现行选进 该选/不该选 · 候选选进 该选/不该选");
for (const s of strata) {
  const set = site.filter((c) => (c.stratum ?? "-") === s);
  const n = (g: string) => set.filter((c) => c.gold === g).length;
  const picked = (g: string, which: "site" | "cand") => set.filter((c) => c.gold === g && (which === "site" ? c : cand.get(c.caseId))?.decision === "select").length;
  console.log(`${s}: 金标 ${n("select")}/${n("reject")}（拿不准 ${n("either")}）· 现行 ${picked("select", "site")}/${picked("reject", "site")} · 候选 ${picked("select", "cand")}/${picked("reject", "cand")}`);
}
console.log("\n# 两边判得不一样、或者有一边判错的（金标 | 现行 分 判 | 候选 分 判 | 标题）");
const mark = (c: Case | undefined) => (c ? `${c.score ?? "-"} ${c.decision === "select" ? "选" : c.decision === "reject" ? (c.relevance === "block" ? "预筛挡" : "不选") : "失败"}` : "-");
for (const c of site) {
  const k = cand.get(c.caseId);
  const wrong = (x: Case | undefined) => x && x.gold !== "either" && x.decision !== null && x.decision !== x.gold;
  if (c.decision === k?.decision && !wrong(c) && !wrong(k)) continue;
  console.log(`${c.stratum} ${c.gold} | ${mark(c)} | ${mark(k)} | ${c.title.slice(0, 60).replace(/\s+/g, " ")}`);
}

// Kay's whole-day picks (10-25) are the current standard. A day's report is built by rule (reports/edition.ts arrangeDaily,
// dailyScope pool): only selected reports get full entries, one per event, ranked by importance (score, +5 first-hand; the
// count of sources discussing it is taken as one here), at most two per source, twelve in all. What counts is how many of
// those twelve Kay picked. Unlike a real daily the day here is the Malaysian calendar day, and the checker's holds are not seen.
const MAIN = 12, PER_SOURCE = 2;
const dayIds = site.filter((c) => c.stratum?.startsWith("day")).map((c) => c.caseId.slice(c.stratum!.length + 1));
const pubs = new Map((await sql<{ article_id: string; source_id: string; story_id: string | null; first_party: boolean }[]>`
  SELECT article_id, source_id, story_id::text, first_party FROM publications WHERE article_id IN ${sql(dayIds.length ? dayIds : [""])}`)
  .map((p) => [p.article_id, p]));
await closeDb();
const daily = (cs: Case[]) => {
  const ranked = cs.filter((c) => c.decision === "select").map((c) => {
    const id = c.caseId.slice(c.stratum!.length + 1), p = pubs.get(id);
    return { c, source: p?.source_id ?? id, story: p?.story_id ?? id, importance: (c.score ?? 0) + (p?.first_party ? 5 : 0) };
  }).sort((a, b) => b.importance - a.importance || a.c.caseId.localeCompare(b.c.caseId));
  const stories = new Set<string>(), perSource = new Map<string, number>(), main: Case[] = [];
  for (const e of ranked) {
    if (main.length >= MAIN || stories.has(e.story) || (perSource.get(e.source) ?? 0) >= PER_SOURCE) continue;
    stories.add(e.story); perSource.set(e.source, (perSource.get(e.source) ?? 0) + 1); main.push(e.c);
  }
  return main;
};
console.log(`\n# 一天挑 ${MAIN} 条（Kay 10-25 挑的，最新标准）：按日报规则排出的正文里有几条是 Kay 挑的`);
for (const s of strata.filter((x) => x.startsWith("day"))) {
  const set = site.filter((c) => c.stratum === s);
  const hit = (cs: Case[]) => cs.filter((c) => c.gold === "select").length;
  const siteMain = daily(set), candMain = daily(set.map((c) => cand.get(c.caseId)).filter((c): c is Case => !!c));
  // The most a perfect score could reach: Kay's own picks, put through the same one-per-event, two-per-source rule.
  const ceiling = daily(set.filter((c) => c.gold === "select").map((c) => ({ ...c, decision: "select", score: 100 }))).length;
  console.log(`${s}: ${set.length} 条，Kay 挑了 ${hit(set)} 条，按规则最多能进正文 ${ceiling} 条 · 现行正文 ${siteMain.length} 条中 ${hit(siteMain)} · 候选正文 ${candMain.length} 条中 ${hit(candMain)}`);
  for (const [name, cs] of [["现行", siteMain], ["候选", candMain]] as const)
    for (const c of cs) console.log(`  ${name} ${c.score ?? "-"} ${c.gold === "select" ? "挑了" : "没挑"} | ${c.title.slice(0, 50).replace(/\s+/g, " ")}`);
}
