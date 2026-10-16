// 2026-10-16：标题数目核对后，意大利差评回复那篇（zjgd）标题已改成「回复拆成四个部分」（title-fixes-2026-10-13.tsv），
// 但情况页上的卡片还写着「把差评回复写成四句话」；原文是四个部分（quattro parti），不是四句话。这里只换卡片里这一处。
// 改之前整行备份到 backup_ref_story_text_20261016；要换的文字在故事里不是正好一处的（说明已被重写）不改。
// 10/16 第一次执行时参数只写了 ::jsonb，postgres.js 把整段文字当成一个 JSON 字符串存了进去（jsonb_typeof = string），
// 故事页读不出标题和卡片。现在先把这样存坏的行解回对象，再按 ::text::jsonb 写。
// 不带参数只预览；--apply 执行。
//   sudo docker compose exec -T worker node myfnb/fix-story-text-2026-10-16.ts [--apply]
import { closeDb, sql } from "@aihot/backend/db";

const FIXES: ReadonlyArray<readonly [id: string, from: string, to: string]> = [
  ["zjgdsj6zvnjqvzjkqw6ge4ovf", "把差评回复写成四句话：", "差评回复分四个部分写："],
];

const apply = process.argv.includes("--apply");
const ids = [...new Set(FIXES.map((f) => f[0]))];
const broken = await sql<{ article_id: string }[]>`
  SELECT article_id FROM reference_cases WHERE article_id IN ${sql(ids)} AND jsonb_typeof(story) = 'string'`;
console.log(`存成字符串的故事 ${broken.length} 篇${apply ? "，解回对象" : "（预览）"}`);
if (apply && broken.length) {
  await sql`UPDATE reference_cases SET story = (story #>> '{}')::jsonb WHERE article_id IN ${sql(broken.map((r) => r.article_id))} AND jsonb_typeof(story) = 'string'`;
}
const rows = await sql<{ article_id: string; story: string }[]>`
  SELECT article_id, story::text AS story FROM reference_cases WHERE article_id IN ${sql(ids)}`;
const next = new Map(rows.map((r) => [r.article_id, r.story]));
let changed = 0;
for (const [id, from, to] of FIXES) {
  const text = next.get(id);
  const count = text ? text.split(from).length - 1 : 0;
  if (count !== 1) { console.log(`  不改 ${id}：「${from}」出现 ${count} 次`); continue; }
  next.set(id, text!.replace(from, to));
  changed++;
}
console.log(`要换的文字 ${changed} / ${FIXES.length} 处${apply ? "" : "（预览）"}`);
if (apply && changed) {
  await sql`CREATE TABLE IF NOT EXISTS backup_ref_story_text_20261016 AS SELECT * FROM reference_cases WHERE article_id IN ${sql(ids)}`;
  for (const r of rows) {
    if (next.get(r.article_id) === r.story) continue;
    await sql`UPDATE reference_cases SET story = ${next.get(r.article_id)!}::text::jsonb, updated_at = now() WHERE article_id = ${r.article_id}`;
  }
  console.log(`已改 ${changed} 处`);
}
await closeDb();
