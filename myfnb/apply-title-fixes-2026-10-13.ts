// 2026-10-13：audit-title-numbers-2026-10-13.ts 查出标题数目不对的故事，逐篇读过原文后，把定下的新标题写进
// myfnb/title-fixes-2026-10-13.tsv（三列，制表符分隔：故事编号、现在存着的标题、新标题；# 开头的行是注释），这里照表改。
// 只改标题这一个字段，不调模型，不动正文；改之前整行备份到 backup_ref_titles_20261013；存着的标题和表里“现在的标题”
// 对不上的不改（说明已被重写过）。fix-titles-2026-10-12.ts 同样的做法。
// 不带 --apply 只数条数；表不存在或没有可改的行就什么也不做。
//   sudo docker compose exec -T worker node myfnb/apply-title-fixes-2026-10-13.ts [--apply]
import { existsSync, readFileSync } from "node:fs";
import { closeDb, sql } from "@aihot/backend/db";

const FILE = new URL("./title-fixes-2026-10-13.tsv", import.meta.url);
const apply = process.argv.includes("--apply");
const fixes = existsSync(FILE)
  ? readFileSync(FILE, "utf8").split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.split("\t") as [string, string, string]).filter((f) => f.length === 3 && f[2].trim())
  : [];
if (!fixes.length) { console.log("title-fixes-2026-10-13.tsv 里没有要改的行"); await closeDb(); process.exit(0); }
const rows = await sql<{ article_id: string; title: string }[]>`
  SELECT article_id, story->>'title' AS title FROM reference_cases WHERE article_id IN ${sql(fixes.map((f) => f[0]))}`;
const current = new Map(rows.map((r) => [r.article_id, r.title]));
const todo = fixes.filter(([id, from]) => current.get(id) === from);
console.log(`标题要改的 ${todo.length} / ${fixes.length} 篇${apply ? "" : "（预览）"}`);
for (const [id, from] of fixes) if (current.get(id) !== from) console.log(`  不改 ${id}：存着的标题是「${current.get(id) ?? "（没有这一篇）"}」`);
if (apply) {
  await sql`CREATE TABLE IF NOT EXISTS backup_ref_titles_20261013 AS SELECT * FROM reference_cases WHERE article_id IN ${sql(fixes.map((f) => f[0]))}`;
  for (const [id, , to] of todo) {
    await sql`UPDATE reference_cases SET story = jsonb_set(story, '{title}', to_jsonb(${to}::text)), updated_at = now() WHERE article_id = ${id}`;
  }
  console.log(`已改 ${todo.length} 篇`);
}
// t3tp 这一篇不只标题：原文的 lakh（1 lakh = 10 万）在开头一句和两处合计里也少写了十倍，其余金额换算是对的。
// 只换这三处原句，找不到原句的不动（说明已被重写过）。备份在上面同一张表里。
const TEXT_FIXES: [string, string, string][] = [
  ["t3tp3ob34832iaf04ec5wabya", "有人报 10 万卢比，有人报 40 万卢比，有人花了 75 万卢比", "有人报 100 万卢比，有人报 400 万卢比，有人花了 750 万卢比"],
  ["t3tp3ob34832iaf04ec5wabya", "总计约 13.7 万卢比", "总计约 137 万卢比"],
  ["t3tp3ob34832iaf04ec5wabya", "总计约 52 万卢比", "总计约 520 万卢比"],
];
for (const [id, from, to] of TEXT_FIXES) {
  const [hit] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM reference_cases WHERE article_id = ${id} AND position(${from} in story::text) > 0`;
  console.log(`正文原句「${from}」：${hit!.n ? (apply ? "已改" : "要改") : "找不到，不改"}`);
  if (apply && hit!.n) await sql`UPDATE reference_cases SET story = replace(story::text, ${from}, ${to})::jsonb, updated_at = now() WHERE article_id = ${id}`;
}
await closeDb();
