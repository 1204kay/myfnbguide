// Two reports of scripts/eval-selection.ts on the same gold set (myfnb/build-gold-rounds.ts), the site's score prompt and a
// candidate, side by side: per stratum how many of each gold decision each prompt selects, then every case the two
// decide differently or either decides wrong, with both scores. The holdout stratum is the last check, not for tuning.
//   node myfnb/eval-selection-compare.ts <site.json> <candidate.json>
import { readFileSync } from "node:fs";

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
