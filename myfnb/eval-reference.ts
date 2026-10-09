// Write-ups and stories on fixed cases: the site's prompts and, beside them, candidate prompts, on the same input with
// the same model, the way docs/story-digest-evaluation.md compares digest prompts before one changes. Nothing on the
// site changes: the results go to reference_evals, and /api/reference/eval shows the last run for reading side by side.
// Each case as on the site: a selected item gets a story, and a write-up when its story comes out thin or held; any
// other listed item gets a write-up.
//   Cases: myfnb/reference-eval-cases.txt, one article id a line (# for notes).
//   Candidates: modules/reference/prompts/case-candidate.md and body-candidate.md (without one, only the site's runs).
// Without --apply it only counts; the most calls a run may make is --max-calls (default 200). Receipts make an
// identical re-run free, so the site's half costs nothing when only a candidate changed.
//   sudo docker compose exec -T -u root worker node myfnb/eval-reference.ts
//   sudo docker compose exec -T -u root worker node myfnb/eval-reference.ts --apply
import { existsSync, readFileSync } from "node:fs";
import { closeDb, sql } from "@aihot/backend/db";
import { loadAnalyzeInput } from "@aihot/backend/editorial/analyze";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { SERVER_MODULES } from "@aihot/site/modules/server";
import { BODY_PROMPT, bodyPrompt, composeBody } from "../modules/reference/backend/body.ts";
import { problemKind } from "../modules/reference/backend/checks.ts";
import { CASE_PROMPT, casePrompt, composeCase, type Prompt } from "../modules/reference/backend/write.ts";

// The modules' model steps (referenceCase, referenceBody) are known once the modules are installed, as in the worker.
installModules(SERVER_MODULES);

const apply = process.argv.includes("--apply");
const at = process.argv.indexOf("--max-calls");
const maxCalls = at > 0 ? Number(process.argv[at + 1]) : 200;
if (!Number.isInteger(maxCalls) || maxCalls < 1) throw new Error("--max-calls 要写正整数");

const here = (file: string) => new URL(file, import.meta.url);
const ids = [...new Set(readFileSync(here("./reference-eval-cases.txt"), "utf8").split("\n").map((l) => l.replace(/#.*/, "").trim()).filter(Boolean))];
const candidate = (file: string) => existsSync(here(`../modules/reference/prompts/${file}`)) ? readFileSync(here(`../modules/reference/prompts/${file}`), "utf8") : null;
const caseText = candidate("case-candidate.md");
const bodyText = candidate("body-candidate.md");
const variants: Array<{ name: "live" | "candidate"; case: Prompt; body: Prompt }> = [{ name: "live", case: CASE_PROMPT, body: BODY_PROMPT }];
if (caseText || bodyText) variants.push({ name: "candidate", case: caseText ? casePrompt(caseText) : CASE_PROMPT, body: bodyText ? bodyPrompt(bodyText) : BODY_PROMPT });

const rows = await sql<{ id: string; selected: boolean; title: string }[]>`
  SELECT article_id AS id, selected, title FROM publications WHERE article_id = ANY(${ids}) AND visibility = 'public'`;
const found = new Map(rows.map((r) => [r.id, r]));
const missing = ids.filter((id) => !found.has(id));
if (missing.length) throw new Error(`不是公开的条目：${missing.join("、")}`);
// At most: a story three answers and the wording pass, then a write-up three answers.
const most = ids.reduce((n, id) => n + (found.get(id)!.selected ? 7 : 3), 0) * variants.length;
console.log(`${ids.length} 个案例 × ${variants.map((v) => v.name).join("、")}，最多 ${most} 次调用${apply ? "" : "（预览）"}`);
if (apply && most > maxCalls) throw new Error(`最多 ${most} 次调用，超过 --max-calls ${maxCalls}：一次都不发`);

if (apply) {
  const run = new Date().toISOString().slice(0, 16).replace("T", " ");
  const store = async (id: string, variant: string, kind: "story" | "body", r: { status: string; output: unknown; reason: string | null; problems: string[]; receiptIds: number[] }) => {
    await sql.begin(async (tx) => {
      await tx`INSERT INTO reference_evals (run, article_id, variant, kind, status, output, problems)
        VALUES (${run}, ${id}, ${variant}, ${kind}, ${r.status}, ${r.output ? sql.json(r.output as never) : null},
                ${sql.json((r.reason ? [r.reason] : r.problems) as never)})`;
      for (const receipt of r.receiptIds) await completeReceipt(tx, receipt);
    });
    console.log(`${id}  ${variant.padEnd(9)} ${kind.padEnd(5)} ${r.status.padEnd(5)} ${[...new Set(r.problems.map(problemKind))].join("、")}`);
  };
  for (const id of ids) {
    const a = await loadAnalyzeInput(id);
    if (!a) { console.log(`${id}  原文已删除`); continue; }
    for (const v of variants) {
      try {
        let body = !found.get(id)!.selected;
        if (!body) {
          const c = await composeCase(a, v.case);
          await store(id, v.name, "story", { ...c, output: c.story });
          body = c.status !== "story";
        }
        if (body) {
          const b = await composeBody(a, v.body);
          await store(id, v.name, "body", { ...b, output: b.body });
        }
      } catch (error) {
        // One answer the model garbles stops that case and variant, not the run.
        console.log(`${id}  ${v.name} 出错：${(error as Error).message.slice(0, 120)}`);
      }
    }
  }
  console.log(`这一轮：${run}；结果在 /api/reference/eval`);
}
await stopBoss();
await closeDb();
