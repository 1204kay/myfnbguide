// 2026-10-18：第一轮补图（退回重写整篇，备份 backup_ref_cases_pic_batch_1018）给原来没图的故事配了图。抽 30 篇逐篇对原文，
// 18 篇的图有错，11 篇是把建议、打算、两种做法的比较或假设的例子画成这家店的「以前 / 现在」。宁缺毋滥（L652），这一轮的图
// 全部撤下：只拿掉图块，正文和标题保持现在的样子（新旧两版正文盲比过，错得差不多，L696）。第二轮的故事
// （backup_ref_cases_pic2_all、backup_ref_cases_pic2_sample）由 undo-pictures-2026-10-18.ts 撤，这里不碰。
// 撤之前把现在的样子整行备份到 backup_ref_cases_pic1_drawn，撤的就是那张表里的故事。可以重复跑。
//   sudo docker compose exec -T worker node myfnb/undo-pictures-round1-2026-10-18.ts
import { closeDb, sql } from "@aihot/backend/db";
import { DRAWN } from "../modules/reference/backend/checks.ts";
import type { CaseStory } from "../modules/reference/types.ts";

const types = sql([...DRAWN]);
await sql`CREATE TABLE IF NOT EXISTS backup_ref_cases_pic1_drawn AS
  SELECT c.* FROM reference_cases c JOIN backup_ref_cases_pic_batch_1018 b USING (article_id)
  WHERE c.status = 'story'
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(c.story->'parts') p, jsonb_array_elements(p->'blocks') x WHERE x->>'type' IN ${types})
    AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(b.story->'parts') p, jsonb_array_elements(p->'blocks') x WHERE x->>'type' IN ${types})
    AND c.article_id NOT IN (SELECT article_id FROM backup_ref_cases_pic2_all UNION SELECT article_id FROM backup_ref_cases_pic2_sample)`;
const rows = await sql<{ id: string; story: CaseStory }[]>`SELECT article_id AS id, story FROM backup_ref_cases_pic1_drawn`;
let undone = 0;
const left: string[] = [];
for (const row of rows) {
  const parts = row.story.parts.map((p) => ({ ...p, blocks: p.blocks.filter((b) => !DRAWN.has(b.type)) }));
  // Only the picture blocks go: a part that held nothing else would lose its heading too, so it is left and listed.
  if (parts.some((p) => !p.blocks.length)) { left.push(row.id); continue; }
  const story = { ...row.story, parts };
  // Only where the story is still what was backed up: one written again since keeps what it has now.
  const done = await sql`UPDATE reference_cases SET story = ${JSON.stringify(story)}::text::jsonb, updated_at = now()
    WHERE article_id = ${row.id} AND status = 'story' AND story = ${JSON.stringify(row.story)}::text::jsonb`;
  undone += done.count;
}
console.log(`备份 ${rows.length} 篇，撤下图 ${undone} 篇；有一段只有图、没有撤的 ${left.length} 篇：${left.join(" ")}`);
await closeDb();
