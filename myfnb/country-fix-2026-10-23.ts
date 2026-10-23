// 2026-10-23：上线后新入选的美团 AI 店长那条（ngo6），核对员把标题、导读里的「中国」改成了「全国」（PR #44 之后代码会挡住）。
// 本站读者在各国，国家名要写明（check-item.md 第 6 条）：用后台人工更正把「全国」改回「中国」，其余照核对员的改法（「将」字保留）。
// 十一 10-23 20:36 定。不带参数只打出改前改后；--apply 写回。
//   sudo docker compose run --rm -T -v <检出>/myfnb:/app/myfnb:ro worker node myfnb/country-fix-2026-10-23.ts [--apply]
import { overrideFields } from "@aihot/backend/admin/content";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";

const apply = process.argv.includes("--apply");
const IDS = ["ngo6o0ug3s10qnnpi6heq09rd"];

for (const id of IDS) {
  const [now] = await sql<{ title: string; summary: string | null }[]>`SELECT title, summary FROM publications WHERE article_id = ${id}`;
  const [ov] = await sql<{ version: number }[]>`SELECT version FROM editorial_overrides WHERE article_id = ${id}`;
  if (!now) { console.log(`${id} 找不到`); continue; }
  const fields: Record<string, string> = {};
  for (const [k, a] of [["title", now.title], ["summary", now.summary ?? ""]] as const) {
    const b = a.replaceAll("全国", "中国");
    if (b === a) continue;
    fields[k] = b;
    console.log(`## ${id} ${k}\n  改前：${a}\n  改后：${b}`);
  }
  if (apply && Object.keys(fields).length) await overrideFields(id, { fields, reason: "国家名写明：核对员把「中国」改成了「全国」，改回（十一 10-23）", version: ov?.version ?? 0 }, "讨论串 MYFNB 读者为什么想点开");
}
console.log(apply ? "已写回。" : "只预览；写回用 --apply。");
await stopBoss();
await closeDb();
