// 十一说的试写 (myfnb/HANDOFF.md §9.0「门槛和上限」): 20 issues from live originals, written by backend/issue.ts with
// one named model, to files only. Nothing on the site changes and nothing is stored but the engine's receipts. The
// same picks are then written by the other model (--from), so DeepSeek and Claude are compared on the same material,
// and blind-checked against the numbered originals written beside each issue.
//   Material: --day 2026-10-16 (the daily's window that day; repeat it), --shelf <situation slug> (originals of the
//   library's stories on that shelf; repeat it), --ids a,b (one issue from these originals; repeat it), or
//   --from <an earlier run's folder> (its picks again). A day or a shelf is picked by the model (prompts/issue-pick.md).
//   --model <a preset of site/models.ts> is required; --out is where the run's folder goes (default /out).
//   Without --apply it lists the material and counts the most calls; a run stops before going over --max-calls.
//   --count-sources prints stories, selected and listed items by source, and stops.
// On the server (a throwaway container with this branch's module mounted; the running worker is not touched):
//   sudo docker compose run --rm -v /opt/myfnbguide-trial/modules/reference:/app/modules/reference:ro \
//     -v /opt/myfnbguide-trial/myfnb:/app/myfnb:ro -v /tmp/myfnb-trial:/out worker node myfnb/trial-issues.ts …
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { addDays, beijingAt } from "@aihot/contracts/time";
import { closeDb, sql } from "@aihot/backend/db";
import { loadAnalyzeInput } from "@aihot/backend/editorial/analyze";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { MODELS } from "@aihot/backend/providers/llm";
import { listedCondition } from "@aihot/backend/publication/scope";
import { EDITION_TIMES } from "@aihot/site";
import { type Ask, type Candidate, type ComposedIssue, composeIssue, issueArticle, issueMarkdown, ISSUE_VERSION, modelAsk, type Pick, pickMaterial } from "../modules/reference/backend/issue.ts";
import { findSituation } from "../modules/reference/situations.ts";

const args = process.argv.slice(2);
const all = (flag: string) => args.flatMap((a, i) => (a === flag && args[i + 1] ? [args[i + 1]!] : []));
const one = (flag: string) => all(flag).at(-1);
const apply = args.includes("--apply");
const maxCalls = Number(one("--max-calls") ?? 250);
/** The most calls one issue can make: the pick, two per original (three originals), three drafts, the check and a retry. */
const PER_ISSUE = 12;
/** An original shorter than this does not carry an issue's share of facts (backend/issue.ts reads 600 and up). */
const MIN_BODY = 1500;

if (args.includes("--count-sources")) {
  const rows = await sql<{ id: string; name: string; stories: number; selected: number; listed: number }[]>`
    SELECT s.id, s.name, count(*) FILTER (WHERE c.status = 'story')::int AS stories, count(*) FILTER (WHERE p.selected)::int AS selected, count(*)::int AS listed
    FROM publications p JOIN sources s ON s.id = p.source_id LEFT JOIN reference_cases c ON c.article_id = p.article_id
    WHERE p.visibility = 'public' GROUP BY s.id, s.name ORDER BY stories DESC, selected DESC LIMIT 20`;
  for (const r of rows) console.log(`${String(r.stories).padStart(5)} 故事 ${String(r.selected).padStart(5)} 入选 ${String(r.listed).padStart(6)} 公开  ${r.id}  ${r.name}`);
  await closeDb();
  process.exit(0);
}

const model = one("--model");
if (!model || !MODELS[model]) throw new Error(`--model 要写 site/models.ts 里的一个：${Object.keys(MODELS).join("、")}`);
if (!Number.isInteger(maxCalls) || maxCalls < PER_ISSUE) throw new Error(`--max-calls 至少 ${PER_ISSUE}`);
for (const slug of all("--shelf")) if (!findSituation(slug)) throw new Error(`没有这个情况：${slug}`);
const from = one("--from");

const run = `${new Date().toISOString().slice(0, 19).replace(/[-T:]/g, "")}-${model}`;
const dir = join(one("--out") ?? "/out", run);
let calls = 0;
const receiptIds: number[] = [];
const counted = (subject: string): Ask => {
  const ask = modelAsk(model, subject, receiptIds);
  return (purpose, system, user, schema) => { calls += 1; return ask(purpose, system, user, schema); };
};

/** Originals listed in the daily's window of `date`, long enough, best scored first. */
async function dayCandidates(date: string, used: Set<string>): Promise<Candidate[]> {
  const end = beijingAt(date, EDITION_TIMES.daily);
  const start = beijingAt(addDays(date, -1), EDITION_TIMES.daily);
  return sql<Candidate[]>`
    SELECT p.article_id AS id, p.title, coalesce(p.summary, '') AS summary, s.name AS "sourceName"
    FROM publications p JOIN articles a ON a.id = p.article_id JOIN sources s ON s.id = p.source_id
    WHERE ${listedCondition(new Date())} AND coalesce(p.published_at, p.discovered_at) >= ${start} AND coalesce(p.published_at, p.discovered_at) < ${end}
      AND length(coalesce(a.body_text, '')) >= ${MIN_BODY} AND NOT p.article_id = ANY(${[...used]})
    ORDER BY p.score DESC NULLS LAST LIMIT 40`;
}

/** Originals of the library's stories on a shelf (the originals, not the stories: those had errors), in a fixed shuffled order. */
async function shelfCandidates(slug: string, used: Set<string>): Promise<Candidate[]> {
  return sql<Candidate[]>`
    SELECT p.article_id AS id, p.title, coalesce(p.summary, '') AS summary, s.name AS "sourceName"
    FROM reference_cases c JOIN publications p ON p.article_id = c.article_id JOIN articles a ON a.id = p.article_id JOIN sources s ON s.id = p.source_id
    WHERE c.status = 'story' AND ${slug} = ANY(c.situations) AND ${listedCondition(new Date())}
      AND length(coalesce(a.body_text, '')) >= ${MIN_BODY} AND NOT p.article_id = ANY(${[...used]})
    ORDER BY md5(p.article_id || 'shiyi-trial') LIMIT 30`;
}

type Planned = { label: string } & ({ pick: Pick } | { day: string } | { shelf: string });
const plan: Planned[] = from
  ? (JSON.parse(readFileSync(join(from, "picks.json"), "utf8")) as Array<{ label: string; pick: Pick }>)
  : [
    ...all("--ids").map((ids) => ({ label: `指定 ${ids}`, pick: { topic: "（指定的原文）", ids: ids.split(",").map((x) => x.trim()).filter(Boolean), shelf: "", why: "" } })),
    ...all("--day").map((day) => ({ label: `日报 ${day}`, day })),
    ...all("--shelf").map((shelf) => ({ label: `书架 ${findSituation(shelf)!.title}`, shelf })),
  ];
if (!plan.length) throw new Error("没有材料：写 --day、--shelf、--ids 或 --from");
console.log(`${plan.length} 期 × ${model}，最多 ${plan.length * PER_ISSUE} 次调用，上限 ${maxCalls}${apply ? "" : "（预览，不调模型）"}`);

const used = new Set<string>();
const picks: Array<{ label: string; pick: Pick }> = [];
const results: Array<{ no: number; label: string; c: ComposedIssue | null; note: string }> = [];
if (apply) mkdirSync(dir, { recursive: true });

for (const [n, p] of plan.entries()) {
  const no = n + 1;
  if ("pick" in p) p.pick.ids.forEach((id) => used.add(id));
  const candidates = "day" in p ? await dayCandidates(p.day, used) : "shelf" in p ? await shelfCandidates(p.shelf, used) : [];
  if (!apply) { console.log(`${String(no).padStart(2)}  ${p.label}  ${"pick" in p ? `${p.pick.ids.length} 篇` : `${candidates.length} 篇候选`}`); continue; }
  if (calls + PER_ISSUE > maxCalls) { results.push({ no, label: p.label, c: null, note: `没写：再写会超过 --max-calls ${maxCalls}` }); continue; }
  try {
    let pick = "pick" in p ? p.pick : null;
    if (!pick) {
      const r = await pickMaterial(candidates, counted(`issue-pick:${p.label}`));
      if (!r.pick) { results.push({ no, label: p.label, c: null, note: `没选出：${r.reason}` }); console.log(`${String(no).padStart(2, "0")}  没选出：${r.reason}`); continue; }
      pick = { ...r.pick, shelf: r.pick.shelf || ("shelf" in p ? p.shelf : "") };
    }
    pick.ids.forEach((id) => used.add(id));
    picks.push({ label: p.label, pick });
    const articles = [];
    for (const [i, id] of pick.ids.entries()) {
      const a = await loadAnalyzeInput(id);
      const [row] = await sql<{ source_id: string }[]>`SELECT source_id FROM articles WHERE id = ${id}`;
      if (!a || !row) throw new Error(`原文已删除：${id}`);
      articles.push(issueArticle("ABC"[i]!, { ...a, sourceId: row.source_id }));
    }
    const c = await composeIssue(articles, pick, counted(`issue:${pick.ids.join(",")}`));
    const name = String(no).padStart(2, "0");
    writeFileSync(join(dir, `${name}.md`), issueMarkdown(c, no));
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(c, null, 2));
    // The originals as numbered sentences, for the blind check (and nothing else: they stay off the site).
    writeFileSync(join(dir, `${name}-原文.md`), articles.map((a) => [`# 第 ${a.letter} 篇：${a.sourceName}《${a.title}》`, a.url, "", ...a.lines.map((l, k) => `[${k}] ${l}`)].join("\n")).join("\n\n"));
    results.push({ no, label: p.label, c, note: "" });
    console.log(`${name}  ${c.status.padEnd(5)}  ${pick.topic}  ${c.problems.join("；").slice(0, 120)}`);
  } catch (error) {
    // One garbled answer stops that issue, not the run.
    results.push({ no, label: p.label, c: null, note: `出错：${(error as Error).message.slice(0, 200)}` });
    console.log(`${String(no).padStart(2, "0")}  出错：${(error as Error).message.slice(0, 120)}`);
  }
}

if (apply) {
  writeFileSync(join(dir, "picks.json"), JSON.stringify(picks, null, 2));
  const status = (c: ComposedIssue | null) => (c ? { issue: "过了核对", thin: "材料不够", held: "没过核对" }[c.status] : "没写");
  const index = [
    `# 十一说试写 ${run}`, "", `模型 ${model}；提示词与检查 ${ISSUE_VERSION}；调用 ${calls} 次。`, "",
    "| 期 | 材料 | 结果 | 话题 | 书架 | 原文 | 问题 |", "|---|---|---|---|---|---|---|",
    ...results.map(({ no, label, c, note }) => `| ${no} | ${label} | ${status(c)} | ${c?.topic ?? ""} | ${findSituation(c?.shelf ?? "")?.title ?? ""} | ${c?.articles.map((a) => a.sourceName).join("、") ?? ""} | ${(c?.problems.join("；") ?? note).replace(/\|/g, "／")} |`),
  ].join("\n");
  writeFileSync(join(dir, "index.md"), index);
  for (const id of receiptIds) await completeReceipt(sql, id);
  console.log(`写在 ${dir}；下一个模型用同样的材料：--from ${dir}`);
}
await stopBoss();
await closeDb();
