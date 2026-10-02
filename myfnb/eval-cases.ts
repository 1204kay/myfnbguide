// Prints the newest selection eval report (scripts/eval-selection.ts) compactly enough to copy out of a web
// terminal: every case's average score in the order of myfnb/gold-labels.tsv, 20 to a line, which Claude
// decodes against the labels kept in the repo. B = blocked by the prefilter, U<score> = no usable Chinese
// copy, E = the case failed (often the llm budget: run the same command again later), - = no score.
// --long prints one line per case and what every threshold would select instead.
// Run in the same container right after the eval (.data is not in the image):
//   sudo docker compose exec -T worker sh -c "node myfnb/build-gold.ts && node scripts/eval-selection.ts --gold .data/gold.jsonl --n 500 > /dev/null && node myfnb/eval-cases.ts"
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "@aihot/backend/config";

interface Case { caseId: string; gold: "select" | "reject" | "either"; score: number | null; relevance: string | null; error: string | null }

const dir = path.join(REPO_ROOT, ".data/eval");
const newest = readdirSync(dir).filter((f) => f.startsWith("selection-") && f.endsWith(".json"))
  .map((f) => path.join(dir, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
if (!newest) throw new Error(`no eval report in ${dir}`);
const report = JSON.parse(readFileSync(newest, "utf8"));
const order = readFileSync(path.join(REPO_ROOT, "myfnb/gold-labels.tsv"), "utf8").split(/\r?\n/)
  .filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("article_id\t")).map((l) => l.split("\t")[0]!);
const LABEL = { select: "必看", either: "可看", reject: "不看" } as const;

for (const [model, r] of Object.entries<any>(report.models)) {
  const cases: Case[] = r.cases;
  const byId = new Map(cases.map((c) => [c.caseId, c]));
  const code = (c: Case | undefined) => !c ? "?" : c.error ? "E" : c.relevance === "block" ? "B"
    : c.score === null ? "-" : c.relevance === "unknown" ? `U${c.score}` : String(c.score);
  const errors = cases.filter((c) => c.error);
  console.log(`# ${path.basename(newest)} · ${model} · ${report.meta.promptVersion} · ${cases.length} cases · errors ${errors.length}${errors[0] ? ` (${errors[0].error!.slice(0, 60)})` : ""}`);
  if (process.argv.includes("--long")) {
    for (const c of [...cases].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))) console.log(`${code(c)} ${LABEL[c.gold]} ${c.caseId}`);
    for (let t = 40; t <= 80; t += 2) {
      const n = { select: 0, either: 0, reject: 0 };
      for (const c of cases) if (c.relevance === "pass" && c.score !== null && c.score >= t) n[c.gold]++;
      console.log(`t=${t} 必看 ${n.select} 可看 ${n.either} 不看 ${n.reject}`);
    }
    continue;
  }
  for (let i = 0; i < order.length; i += 20) {
    console.log(`${String(i / 20 + 1).padStart(2, "0")}| ${order.slice(i, i + 20).map((id) => code(byId.get(id))).join(" ")}`);
  }
}
