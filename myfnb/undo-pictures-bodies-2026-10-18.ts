// 2026-10-18：撤下条目正文（reference_bodies）里的全部图。抽 20 篇逐张对原文：3 篇有错（一张图混了两项研究的数、
// 把两种做法的比较画成以前和现在、把改期前的期限写错），9 篇小错；错率超过一成，按十一定的标准全部撤下，核过再放回。
// 只拿掉图块；一段只有图的，连那段的小标题一起拿掉，其余一个字不动。撤之前整行备份到 backup_ref_bodies_pic_drawn。可以重复跑。
//   sudo docker compose exec -T worker node myfnb/undo-pictures-bodies-2026-10-18.ts
import { closeDb, sql } from "@aihot/backend/db";
import { DRAWN } from "../modules/reference/backend/checks.ts";
import type { ItemBody } from "../modules/reference/types.ts";

await sql`CREATE TABLE IF NOT EXISTS backup_ref_bodies_pic_drawn AS
  SELECT * FROM reference_bodies b WHERE b.status = 'body'
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(b.body->'parts') p, jsonb_array_elements(p->'blocks') x WHERE x->>'type' IN ${sql([...DRAWN])})`;
const rows = await sql<{ id: string; body: ItemBody }[]>`SELECT article_id AS id, body FROM backup_ref_bodies_pic_drawn`;
let undone = 0;
let headings = 0;
const left: string[] = [];
for (const row of rows) {
  const parts = row.body.parts.map((p) => ({ ...p, blocks: p.blocks.filter((b) => !DRAWN.has(b.type)) })).filter((p) => p.blocks.length);
  if (!parts.length) { left.push(row.id); continue; }
  const body = { ...row.body, parts };
  // Only where the write-up is still what was backed up: one written again since keeps what it has now.
  const done = await sql`UPDATE reference_bodies SET body = ${JSON.stringify(body)}::text::jsonb, updated_at = now()
    WHERE article_id = ${row.id} AND status = 'body' AND body = ${JSON.stringify(row.body)}::text::jsonb`;
  undone += done.count;
  if (done.count) headings += row.body.parts.length - parts.length;
}
console.log(`备份 ${rows.length} 篇，撤下图 ${undone} 篇，连图拿掉的小标题 ${headings} 个；只有图、没有撤的 ${left.length} 篇：${left.join(" ")}`);
await closeDb();
