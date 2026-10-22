// 「要点」的试写（决定记录 2026-10-23）：拿最近的精选条目，用这个分支的提示词重写标题、导读和要点，只写到文件。
// 站上什么都不变，库里只多模型回执。每条和原文全文、现在站上的写法放在一起，给两名没看过稿的核对员盲核。
//   --days 7      从最近几天的精选里挑（默认 7）；--limit 20 挑几条（默认 20），按来源轮流挑，免得一家占满
//   --id <id>     指定条目（可以写多个，写了就不按天挑）
//   --out /out    这一趟的文件夹放在哪
//   不写 --apply 只列出会挑哪些条目，不调模型。
// 在服务器上（一次性容器，挂上这个分支的提示词和代码；正在跑的 worker 不动），见 myfnb/trial-understand-run.sh。
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { mendWording, runUnderstand } from "@aihot/backend/editorial/analyze";
import { loadAnalyzeInput } from "@aihot/backend/editorial/input";
import { reasonLines } from "@aihot/site";

const args = process.argv.slice(2);
const all = (flag: string) => args.flatMap((a, i) => (a === flag && args[i + 1] ? [args[i + 1]!] : []));
const one = (flag: string) => all(flag).at(-1);
const apply = args.includes("--apply");
const days = Number(one("--days") ?? 7);
const limit = Number(one("--limit") ?? 20);
const ids = all("--id");

type Row = { id: string; source_name: string; title: string; summary: string | null; reason: string | null; url: string; discovered_at: Date };
const rows: Row[] = ids.length
  ? await sql<Row[]>`SELECT p.article_id AS id, s.name AS source_name, p.title, p.summary, p.reason, p.url, p.discovered_at
      FROM publications p JOIN sources s ON s.id = p.source_id WHERE p.article_id IN ${sql(ids)}`
  : await sql<Row[]>`SELECT p.article_id AS id, s.name AS source_name, p.title, p.summary, p.reason, p.url, p.discovered_at
      FROM publications p JOIN sources s ON s.id = p.source_id
      WHERE p.selected AND p.seat AND p.visibility = 'public' AND p.discovered_at > now() - make_interval(days => ${days})
      ORDER BY p.discovered_at DESC`;

// Round-robin over sources, newest first in each, so one prolific source does not fill the sample.
const bySource = new Map<string, Row[]>();
for (const r of rows) bySource.set(r.source_name, [...(bySource.get(r.source_name) ?? []), r]);
const picked: Row[] = [];
while (picked.length < Math.min(limit, rows.length)) for (const list of bySource.values()) { const r = list.shift(); if (r && picked.length < limit) picked.push(r); }

console.log(`挑了 ${picked.length} 条（候选 ${rows.length} 条，${bySource.size} 家来源）${apply ? "" : "（预览，不调模型）"}`);
for (const r of picked) console.log(`  ${r.id}  ${r.source_name}  ${r.title}`);

if (apply) {
  const run = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, "");
  const dir = join(one("--out") ?? "/out", `understand-${run}`);
  mkdirSync(join(dir, "原文"), { recursive: true });
  const out: string[] = [`# 要点试写 ${run}`, "", `${picked.length} 条。每条：现在站上的写法、新写法；原文全文在「原文/」里，按编号对应。`, ""];
  const json: unknown[] = [];
  for (const [k, r] of picked.entries()) {
    const no = String(k + 1).padStart(2, "0");
    const a = await loadAnalyzeInput(r.id);
    if (!a) { out.push(`## ${no} ${r.title}`, "", "（读不到这条的原文，跳过）", ""); continue; }
    writeFileSync(join(dir, "原文", `${no}.txt`), [`来源：${r.source_name}`, `原题：${a.title}`, `链接：${a.url}`, "", a.bodyText ?? a.excerpt ?? ""].join("\n"));
    try {
      const first = await runUnderstand(a);
      const w = first ? await mendWording(a, first, {}) : null;
      json.push({ no, id: r.id, source: r.source_name, url: r.url, old: { title: r.title, summary: r.summary, reason: r.reason }, new: w && { title: w.titleZh, lead: w.summaryZh, points: reasonLines(w.reasonZh ?? "") } });
      out.push(`## ${no} ${w?.titleZh ?? "（模型拒写）"}`, "", `来源：${r.source_name} · ${r.url}`, "");
      if (w) out.push(`导读：${w.summaryZh}`, "", ...reasonLines(w.reasonZh ?? "").map((l) => `- ${l}`), "");
      out.push("<details><summary>现在站上的写法</summary>", "", `**${r.title}**`, "", r.summary ?? "", "", `收录理由：${r.reason ?? "（无）"}`, "", "</details>", "");
      console.log(`${no} 写好：${w?.titleZh ?? "（拒写）"}`);
    } catch (error) {
      out.push(`## ${no} ${r.title}`, "", `（失败：${error instanceof Error ? error.message : String(error)}）`, "");
      console.log(`${no} 失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }
  writeFileSync(join(dir, "试写.md"), out.join("\n"));
  writeFileSync(join(dir, "试写.json"), JSON.stringify(json, null, 2));
  console.log(`写到 ${dir}`);
}

await stopBoss();
await closeDb();
