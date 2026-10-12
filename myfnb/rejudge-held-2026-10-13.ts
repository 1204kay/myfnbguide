// 2026-10-13：检查程序补上 lakh/crore、空格千位、日文「万+数字/千」、末尾带零的读法以后，重判还挡着的故事和正文。
// 只重判存着的文字（不调模型）：现在已没有硬伤的改成显示，其余照旧挡着、不重写。
// 不带参数只读：列出每一篇的状态、有没有存着文字、挡下的原因；--apply 先把还挡着的行整行备份到
// backup_ref_cases_20261013、backup_ref_bodies_20261013，再放行。
//   sudo docker compose exec -T worker node myfnb/rejudge-held-2026-10-13.ts [--apply]
import { closeDb, sql } from "@aihot/backend/db";
import { loadAnalyzeInput } from "@aihot/backend/editorial/analyze";
import { renderContext } from "@aihot/backend/editorial/writing";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { SERVER_MODULES } from "@aihot/site/modules/server";
import { blocking, checkStory } from "../modules/reference/backend/checks.ts";

installModules(SERVER_MODULES);
const apply = process.argv.includes("--apply");

if (apply) {
  await sql`CREATE TABLE IF NOT EXISTS backup_ref_cases_20261013 AS SELECT * FROM reference_cases WHERE status = 'held'`;
  await sql`CREATE TABLE IF NOT EXISTS backup_ref_bodies_20261013 AS SELECT * FROM reference_bodies WHERE status = 'held'`;
}

const released = { case: 0, body: 0 };
const kept = { case: 0, body: 0 };
for (const kind of ["case", "body"] as const) {
  const rows = kind === "case"
    ? await sql<any[]>`SELECT article_id id, story x FROM reference_cases WHERE status = 'held'`
    : await sql<any[]>`SELECT article_id id, body x FROM reference_bodies WHERE status = 'held'`;
  for (const r of rows) {
    const tag = `${kind} ${String(r.id).slice(0, 8)}`;
    if (!r.x) { kept[kind]++; console.log(`${tag} 没有存着的文字，仍挡着`); continue; }
    const a = await loadAnalyzeInput(r.id);
    if (!a) { kept[kind]++; console.log(`${tag} 原文已删除，仍挡着`); continue; }
    const story = kind === "case" ? r.x : { title: "", lead: r.x.lead ?? "", who: "", parts: r.x.parts, open: r.x.open, placements: [], shop: { name: null, label: "", country: "", city: null, kind: null, size: null, speaker: "media" } };
    const problems = checkStory(story, renderContext(a, { annotateQuoted: true })).filter(blocking);
    if (problems.length) { kept[kind]++; console.log(`${tag} 仍挡着：${JSON.stringify(problems).slice(0, 200)}`); continue; }
    released[kind]++;
    console.log(`${tag} 已无硬伤${apply ? "，改成显示" : "（--apply 时放行）"}`);
    if (!apply) continue;
    if (kind === "case") await sql`UPDATE reference_cases SET status = 'story', situations = ${r.x.placements.map((p: { situation: string }) => p.situation)}, updated_at = now() WHERE article_id = ${r.id}`;
    else await sql`UPDATE reference_bodies SET status = 'body', updated_at = now() WHERE article_id = ${r.id}`;
  }
}
console.log(`放行：故事 ${released.case}，正文 ${released.body}；仍挡着：故事 ${kept.case}，正文 ${kept.body}`);
await stopBoss();
await closeDb();
