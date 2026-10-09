// 2026-10-09：没有内容的条目不收录（用户 10/9：「没有内容的不要收录……包括之前的，如果有这种条目，全部删除，宁缺毋滥」）。
// 导读的写作要求已经改成：材料只说要谈什么、没说谈了什么时导读留空，按原版的机制先等着不上线。这里把已经公开列出、
// 可能没有内容的条目按框架自己的处理流程重新处理一遍：模型判断确实没有内容的，导读留空，从列表、日报候选里下来；
// 有内容的照常保留（标题和导读按现在的写作规则重写）。以后拿到内容（播客转写、文章正文）会自动重新上线。
// 可能没有内容的：原文（正文，没有就用摘录）不到 800 字，或者条目正文判断过“材料不够”的。
// 先不带参数跑一次，只数条数、看来源和例子；看过以后加 --apply 执行。每条约五六次模型调用。
//   sudo docker compose exec -T -u root worker node myfnb/drop-empty-2026-10-09.ts
//   sudo docker compose exec -T -u root worker node myfnb/drop-empty-2026-10-09.ts --apply
import { closeDb, sql } from "@aihot/backend/db";
import { processArticle } from "@aihot/backend/jobs/content";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { listedCondition } from "@aihot/backend/publication/scope";
import { SERVER_MODULES } from "@aihot/site/modules/server";

// The modules' hooks on publishing run as in the worker.
installModules(SERVER_MODULES);

const apply = process.argv.includes("--apply");
const SHORT = 800;

const rows = await sql<{ id: string; title: string; source: string; chars: number; thin: boolean }[]>`
  SELECT p.article_id AS id, p.title, s.name AS source,
         length(coalesce(nullif(a.body_text, ''), a.excerpt, '')) AS chars,
         coalesce(b.status = 'thin' AND b.problems::text LIKE '%材料不够%', false) AS thin
  FROM publications p
  JOIN articles a ON a.id = p.article_id
  JOIN sources s ON s.id = a.source_id
  LEFT JOIN reference_bodies b ON b.article_id = p.article_id
  WHERE ${listedCondition(new Date())}
    AND (length(coalesce(nullif(a.body_text, ''), a.excerpt, '')) < ${SHORT} OR (b.status = 'thin' AND b.problems::text LIKE '%材料不够%'))
  ORDER BY p.sort_at DESC`;
const bySource = new Map<string, number>();
for (const r of rows) bySource.set(r.source, (bySource.get(r.source) ?? 0) + 1);
console.log(`公开列出、可能没有内容的条目 ${rows.length} 条${apply ? "" : "（预览）"}：原文不到 ${SHORT} 字的 ${rows.filter((r) => r.chars < SHORT).length} 条，正文判断过材料不够的 ${rows.filter((r) => r.thin).length} 条`);
for (const [source, n] of [...bySource].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(n).padStart(4)}  ${source}`);
for (const r of rows.slice(0, 12)) console.log(`  例：${String(r.chars).padStart(5)} 字  ${r.title.slice(0, 50)}`);

if (apply) {
  const states: Record<string, number> = {};
  for (const [i, r] of rows.entries()) {
    try {
      const { state } = await processArticle(r.id);
      states[state] = (states[state] ?? 0) + 1;
    } catch (error) {
      // One answer the model garbles stops that item, not the run.
      console.log(`${r.id} 出错：${(error as Error).message.slice(0, 120)}`);
      states["出错"] = (states["出错"] ?? 0) + 1;
    }
    if ((i + 1) % 20 === 0) console.log(`已处理 ${i + 1}/${rows.length}`);
  }
  const [{ n }] = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM publications p WHERE p.article_id = ANY(${rows.map((r) => r.id)}) AND NOT (${listedCondition(new Date())})`;
  console.log("处理结果：", JSON.stringify(states));
  console.log(`没有内容、已经不再列出的 ${n} 条；其余 ${rows.length - n} 条有内容，照常列出`);
}
await stopBoss();
await closeDb();
