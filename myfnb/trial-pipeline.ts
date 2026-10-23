// 「要点 + 核对」整条流程的试跑（决定记录 2026-10-23）：挑几条新近的精选，用这个分支的提示词写标题、导读和要点，
// 核对员拿原文核；有严重或误导的问题就把它给的改法放进去再核，最多改两轮，还不过就记「不过」。只写到文件，站上什么都不变。
// 每条和现在站上的写法放在一起，给两名没看过稿的核对员盲核最后的稿。
//   --limit 3                      挑几条（默认 3），按来源轮流挑；只挑有正文的文章（不挑播客），不挑 10-23 考卷里的条目
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
const listed = (ps: Problem[]) => ps.length ? ps.map((p) => `- **${p.severity}** ${p.field}${p.point ? ` 第 ${p.point} 条` : ""} 第 ${p.kind} 类：「${p.quote}」 ${p.why}`) : ["没有问题"];

const out: string[] = [`# 要点 + 核对 试跑 ${run}`, "", `${picked.length} 条，核对：${model}。原文只在服务器的「原文/」里。`, ""];
const json: unknown[] = [];
const stats = { items: 0, passed: 0, held: 0, failed: 0, returns: 0, firstSerious: 0, firstToFix: 0, receipts: [] as number[] };
for (const [k, r] of picked.entries()) {
  const no = String(k + 1).padStart(2, "0");
  const a = await loadAnalyzeInput(r.id);
  if (!a) { out.push(`## ${no} ${r.title}`, "", "（读不到原文，跳过）", ""); continue; }
  writeFileSync(join(dir, "原文", `${no}.txt`), [`来源：${r.source_name}`, `原题：${a.title}`, `链接：${a.url}`, "", a.bodyText ?? a.excerpt ?? ""].join("\n"));
  stats.items++;
  out.push(`## ${no} ${a.title}`, "", `来源：${r.source_name} · ${r.url}`, "");
  try {
    const first = await runUnderstand(a);
    const w = first ? await mendWording(a, first, {}) : null;
    if (!w) { out.push("（模型拒写）", ""); stats.failed++; continue; }
    stats.receipts.push(...w.receiptIds);
    const drafts: Draft[] = [{ title: w.titleZh, lead: w.summaryZh, points: reasonLines(w.reasonZh ?? "") }];
    const checks: Problem[][] = [];
    // Check, put the serious problems' fixes in, check again: at most two rounds of fixes.
    for (let round = 1; round <= 3; round++) {
      const c = await checkDraft(model, a, drafts.at(-1)!, `pipeline-${round}`);
      stats.receipts.push(c.receiptId);
      checks.push(c.problems);
      if (!toFix(c.problems).length || round === 3) break;
      drafts.push(applyFixes(drafts.at(-1)!, c.problems));
      stats.returns++;
    }
    if (serious(checks[0]!).length) stats.firstSerious++;
    if (toFix(checks[0]!).length) stats.firstToFix++;
    const ok = !toFix(checks.at(-1)!).length;
    ok ? stats.passed++ : stats.held++;
    out.push(`**结果：${ok ? "过" : "不过（两轮改完还有严重或误导，不上线）"}**；退回改写 ${drafts.length - 1} 次`, "");
    for (const [i, d] of drafts.entries()) {
      out.push(`### ${i === 0 ? "第一稿" : `改第 ${i} 轮后`}`, "", ...show(d), "核对：", ...listed(checks[i]!), "");
    }
    out.push("<details><summary>现在站上的写法</summary>", "", `**${r.title}**`, "", r.summary ?? "", "", `收录理由：${r.reason ?? "（无）"}`, "", "</details>", "");
    json.push({ no, id: r.id, url: r.url, site: { title: r.title, summary: r.summary, reason: r.reason }, drafts, checks, ok });
    console.log(`${no} ${ok ? "过" : "不过"}，退回 ${drafts.length - 1} 次：${drafts.at(-1)!.title}`);
  } catch (error) {
    stats.failed++;
    out.push(`（失败：${error instanceof Error ? error.message : String(error)}）`, "");
    console.log(`${no} 失败：${error instanceof Error ? error.message : String(error)}`);
  }
}
const summary = `${stats.items} 条：过 ${stats.passed}，不过 ${stats.held}，失败 ${stats.failed}；第一稿有严重问题 ${stats.firstSerious} 条、有严重或误导 ${stats.firstToFix} 条；退回改写共 ${stats.returns} 次；用量 ${await spent(stats.receipts)}`;
out.splice(3, 0, `**${summary}**`, "");
writeFileSync(join(dir, "试跑.md"), out.join("\n"));
writeFileSync(join(dir, "试跑.json"), JSON.stringify(json, null, 1));
console.log(summary);
console.log(`写到 ${dir}`);
await stopBoss();
await closeDb();
