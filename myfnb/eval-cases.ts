// Prints the newest selection eval report (scripts/eval-selection.ts) case by case, so the result can be pasted
// back as text: each case's average score next to the user's label, then what every threshold would select.
// Run in the same container right after the eval (.data is not in the image):
//   sudo docker compose exec -T worker sh -c "node myfnb/build-gold.ts && node scripts/eval-selection.ts --gold .data/gold.jsonl --n 500 && node myfnb/eval-cases.ts"
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "@aihot/backend/config";

interface Case { caseId: string; gold: "select" | "reject" | "either"; score: number | null; relevance: string | null; stratum: string | null; error: string | null }

const dir = path.join(REPO_ROOT, ".data/eval");
const newest = readdirSync(dir).filter((f) => f.startsWith("selection-") && f.endsWith(".json"))
  .map((f) => path.join(dir, f)).sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
if (!newest) throw new Error(`no eval report in ${dir}`);
const report = JSON.parse(readFileSync(newest, "utf8"));
const LABEL = { select: "必看", either: "可看", reject: "不看" } as const;

for (const [model, r] of Object.entries<any>(report.models)) {
  const cases: Case[] = r.cases;
  console.log(`# ${path.basename(newest)} · ${model} · 提示词 ${report.meta.promptVersion}`);
  console.log("# 分数 标注 预筛 编号");
  for (const c of [...cases].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))) {
    console.log(`${c.score ?? "-"} ${LABEL[c.gold]} ${c.relevance ?? "-"} ${c.caseId}${c.error ? ` 错误:${c.error.slice(0, 60)}` : ""}`);
  }
  console.log("# 门槛 → 选中的 必看/可看/不看");
  for (let t = 40; t <= 80; t += 2) {
    const n = { select: 0, either: 0, reject: 0 };
    for (const c of cases) if (c.relevance === "pass" && c.score !== null && c.score >= t) n[c.gold]++;
    const total = cases.filter((c) => c.gold === "select").length;
    console.log(`t=${t} 必看 ${n.select}/${total} 可看 ${n.either} 不看 ${n.reject}`);
  }
}
