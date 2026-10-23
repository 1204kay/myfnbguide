// 「要点 + 核对」整条流程的试跑（决定记录 2026-10-23）：挑几条新近的精选，用这个分支的提示词写标题、导读和要点，
// 核对员拿原文核一次，把它给的改法放进去，再只复查改过的句子：复查出误导直接用它的改法；出严重，要点删掉，标题或导读记「不过」。只写到文件，站上什么都不变。
// 每条和现在站上的写法放在一起，给两名没看过稿的核对员盲核最后的稿。
//   --limit 3                      挑几条（默认 3），按来源轮流挑；只挑有正文的文章（不挑播客），不挑核对员核过的条目（考卷和之前几趟）
//   --days 2                       从最近几天的精选里挑（默认 2）
//   --id <id>                      指定条目（可以写多个）
//   --skip <id>                    不挑这些条目（可以写多个，比如上一趟试过的）
//   --check deepseek-v4-pro-llm    核对用的模型
//   --out /out                     这一趟的文件夹放在哪
//   不写 --apply 只列出会挑哪些条目，不调模型。
// 在服务器上见 myfnb/trial-understand-run.sh 的 pipeline。
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { mendWording, runUnderstand } from "@aihot/backend/editorial/analyze";
import { loadAnalyzeInput } from "@aihot/backend/editorial/input";
import { reasonLines } from "@aihot/site";
import { applyFixes, checkDraft, serious, spent, toFix, type Problem } from "./check.ts";

const args = process.argv.slice(2);
const all = (flag: string) => args.flatMap((a, i) => (a === flag && args[i + 1] ? [args[i + 1]!] : []));
const one = (flag: string) => all(flag).at(-1);
const apply = args.includes("--apply");
const limit = Number(one("--limit") ?? 3);
const days = Number(one("--days") ?? 2);
const model = one("--check") ?? "deepseek-v4-pro-llm";
const ids = all("--id");
const skip = new Set(all("--skip"));
const exam = new Set((JSON.parse(readFileSync(new URL("./check-exam-2026-10-23.json", import.meta.url), "utf8")) as { items: Array<{ id: string }> }).items.map((i) => i.id));

type Row = { id: string; source_name: string; title: string; summary: string | null; reason: string | null; url: string };
const rows: Row[] = ids.length
  ? await sql<Row[]>`SELECT p.article_id AS id, s.name AS source_name, p.title, p.summary, p.reason, p.url
      FROM publications p JOIN sources s ON s.id = p.source_id WHERE p.article_id IN ${sql(ids)}`
  : (await sql<Row[]>`SELECT p.article_id AS id, s.name AS source_name, p.title, p.summary, p.reason, p.url
      FROM publications p JOIN sources s ON s.id = p.source_id JOIN articles a ON a.id = p.article_id
      WHERE p.selected AND p.seat AND p.visibility = 'public' AND p.discovered_at > now() - make_interval(days => ${days})
        AND a.body_status = 'ok' AND p.url NOT LIKE '%.mp3'
        -- Not one the checker has seen already (the exam, earlier pipeline runs): each run is on items not tried before.
        AND NOT EXISTS (SELECT 1 FROM receipts r WHERE r.purpose = 'trial_check_item' AND r.subject = 'article:' || p.article_id)
      ORDER BY p.discovered_at DESC`).filter((r) => !exam.has(r.id) && !skip.has(r.id));

const bySource = new Map<string, Row[]>();
for (const r of rows) bySource.set(r.source_name, [...(bySource.get(r.source_name) ?? []), r]);
const picked: Row[] = [];
while (picked.length < Math.min(limit, rows.length)) for (const list of bySource.values()) { const r = list.shift(); if (r && picked.length < limit) picked.push(r); }

console.log(`挑了 ${picked.length} 条（候选 ${rows.length} 条），核对用 ${model}${apply ? "" : "（预览，不调模型）"}`);
for (const r of picked) console.log(`  ${r.id}  ${r.source_name}  ${r.title}  ${r.url}`);
if (!apply) { await stopBoss(); await closeDb(); process.exit(0); }

const run = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, "");
const dir = join(one("--out") ?? "/out", `pipeline-${run}`);
mkdirSync(join(dir, "原文"), { recursive: true });
type Draft = { title: string; lead: string; points: string[] };
const show = (d: Draft) => [`**${d.title}**`, "", `导读：${d.lead}`, "", ...d.points.map((p) => `- ${p}`), ""];
const listed = (ps: Problem[]) => ps.length ? ps.map((p) => `- **${p.severity}** ${p.field}${p.point ? ` 第 ${p.point} 条` : ""} 第 ${p.kind} 类：「${p.quote}」 ${p.why}${p.fix ? ` → 改成：${p.fix}` : ""}`) : ["没有问题"];

const out: string[] = [`# 要点 + 核对 试跑 ${run}`, "", `${picked.length} 条，核对：${model}。原文只在服务器的「原文/」里。`, ""];
const json: unknown[] = [];
const stats = { items: 0, passed: 0, held: 0, failed: 0, fixes: 0, secondFixes: 0, dropped: 0, firstSerious: 0, firstToFix: 0, receipts: [] as number[] };
async function runItem(k: number, r: Row): Promise<string[]> {
  const out: string[] = [];
  const no = String(k + 1).padStart(2, "0");
  const a = await loadAnalyzeInput(r.id);
  if (!a) { out.push(`## ${no} ${r.title}`, "", "（读不到原文，跳过）", ""); return out; }
  writeFileSync(join(dir, "原文", `${no}.txt`), [`来源：${r.source_name}`, `原题：${a.title}`, `链接：${a.url}`, "", a.bodyText ?? a.excerpt ?? ""].join("\n"));
  stats.items++;
  out.push(`## ${no} ${a.title}`, "", `来源：${r.source_name} · ${r.url}`, "");
  try {
    const first = await runUnderstand(a);
    const w = first ? await mendWording(a, first, {}) : null;
    if (!w) { out.push("（模型拒写）", ""); stats.failed++; return out; }
    stats.receipts.push(...w.receiptIds);
    const drafts: Draft[] = [{ title: w.titleZh, lead: w.summaryZh, points: reasonLines(w.reasonZh ?? "") }];
    // 十一 10-23 (Kay: 不要一直重核): check the whole draft once and put the checker's fixes in; then re-check only the
    // sentences it changed. A changed point with a serious error is dropped; a title or lead with one holds the item.
    const c = await checkDraft(model, a, drafts[0]!, "pipeline-1");
    stats.receipts.push(c.receiptId);
    const checks: Problem[][] = [c.problems];
    const fixes = toFix(c.problems);
    if (serious(c.problems).length) stats.firstSerious++;
    if (fixes.length) stats.firstToFix++;
    // No points means the reader still has to click (10-23 3-item run: one draft came back with title and lead only).
    let ok = drafts[0]!.points.length > 0;
    const dropped: string[] = [];
    if (fixes.length) {
      const fixed = applyFixes(drafts[0]!, c.problems);
      stats.fixes += fixes.length;
      // Only what changed goes back: the title or lead if rewritten, and each point that is new.
      const before = new Set(drafts[0]!.points);
      const changed = fixed.points.filter((p) => !before.has(p));
      // A title or lead the checker could not fix (empty fix) stays wrong: the item is held.
      if (fixes.some((p) => (p.field === "title" || p.field === "lead") && !p.fix)) ok = false;
      const partial: Record<string, unknown> = {};
      if (fixed.title !== drafts[0]!.title) partial.title = fixed.title;
      if (fixed.lead !== drafts[0]!.lead) partial.lead = fixed.lead;
      if (changed.length) partial.points = changed;
      let again: Problem[] = [];
      if (Object.keys(partial).length) {
        const r2 = await checkDraft(model, a, partial as Draft, "pipeline-recheck");
        stats.receipts.push(r2.receiptId);
        checks.push(r2.problems);
        again = r2.problems;
      } else checks.push([]);
      // 十一 10-23 (second 3-item run: re-checks found new "misleading" in the changed sentences and held all three):
      // the re-check only stops serious errors. A misleading one takes the checker's fix as it is, with no third check.
      const isPoint = (p: Problem) => p.field === "point" || p.field === "points";
      const grave = serious(again);
      if (grave.some((p) => (p.field === "title" && partial.title) || (p.field === "lead" && partial.lead))) ok = false;
      const bad = new Set(grave.filter(isPoint).map((p) => changed[p.point - 1]).filter((x): x is string => !!x));
      const last = { ...fixed, points: [...fixed.points] };
      for (const p of again.filter((p) => p.severity === "misleading" && p.fix)) {
        if (p.field === "title" && partial.title) last.title = p.fix;
        else if (p.field === "lead" && partial.lead) last.lead = p.fix;
        else if (isPoint(p) && changed[p.point - 1] && !bad.has(changed[p.point - 1]!)) last.points[last.points.indexOf(changed[p.point - 1]!)] = p.fix;
        else continue;
        stats.secondFixes++;
      }
      dropped.push(...bad);
      drafts.push({ ...last, points: last.points.filter((p) => !bad.has(p)) });
      if (drafts.at(-1)!.points.length === 0) ok = false;
    }
    stats.dropped += dropped.length;
    ok ? stats.passed++ : stats.held++;
    out.push(`**结果：${ok ? "过" : "不过（没有要点，或改过的标题、导读复查有严重错，不上线）"}**；核对员改了 ${fixes.length} 处${dropped.length ? `，复查有严重错删掉 ${dropped.length} 条要点` : ""}`, "");
    out.push("### 第一稿", "", ...show(drafts[0]!), "核对：", ...listed(checks[0]!), "");
    if (drafts[1]) out.push("### 核对员改过以后", "", ...show(drafts[1]), "复查改过的句子（误导直接用改法，严重才删或不上线）：", ...listed(checks[1]!), ...dropped.map((p) => `- 删掉：${p}`), "");
    out.push("<details><summary>现在站上的写法</summary>", "", `**${r.title}**`, "", r.summary ?? "", "", `收录理由：${r.reason ?? "（无）"}`, "", "</details>", "");
    json.push({ no, id: r.id, url: r.url, site: { title: r.title, summary: r.summary, reason: r.reason }, drafts, checks, ok });
    writeFileSync(join(dir, `条目-${no}.json`), JSON.stringify(json.at(-1), null, 1));
    console.log(`${no} ${ok ? "过" : "不过"}，改了 ${fixes.length} 处，删 ${dropped.length} 条：${drafts.at(-1)!.title}`);
  } catch (error) {
    stats.failed++;
    out.push(`（失败：${error instanceof Error ? error.message : String(error)}）`, "");
    console.log(`${no} 失败：${error instanceof Error ? error.message : String(error)}`);
  }
  return out;
}
// Four items at a time: each is a write, a check and a re-check, a few minutes with DeepSeek thinking.
const parts: string[][] = [];
// Each item is written as soon as it is done: the 10-23 20-item run died mid-way (container gone) and left nothing on disk.
const done = (k: number, o: string[]) => { writeFileSync(join(dir, `条目-${String(k + 1).padStart(2, "0")}.md`), o.join("\n")); return o; };
for (let i = 0; i < picked.length; i += 4) parts.push(...await Promise.all(picked.slice(i, i + 4).map((r, j) => runItem(i + j, r).then((o) => done(i + j, o)))));
out.push(...parts.flat());
json.sort((x, y) => String((x as { no: string }).no).localeCompare(String((y as { no: string }).no)));
const summary = `${stats.items} 条：过 ${stats.passed}，不过 ${stats.held}，失败 ${stats.failed}；第一稿有严重问题 ${stats.firstSerious} 条、有严重或误导 ${stats.firstToFix} 条；核对员共改 ${stats.fixes} 处、复查时又直接改 ${stats.secondFixes} 处、复查有严重错删掉 ${stats.dropped} 条要点；用量 ${await spent(stats.receipts)}`;
out.splice(3, 0, `**${summary}**`, "");
writeFileSync(join(dir, "试跑.md"), out.join("\n"));
writeFileSync(join(dir, "试跑.json"), JSON.stringify(json, null, 1));
console.log(summary);
console.log(`写到 ${dir}`);
await stopBoss();
await closeDb();
