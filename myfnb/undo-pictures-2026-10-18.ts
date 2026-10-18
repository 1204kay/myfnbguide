// 2026-10-18：第二轮补图（add-pictures.ts，备份 backup_ref_cases_pic2_sample、backup_ref_cases_pic2_all）配了 474 张图。
// 标题带数字或改做法的 106 篇逐篇对原文核对：有图 93 篇里 39 篇的图有错，多数是 change 图把建议、比较、打算或
// 过去的事画成这家店的「以前 / 现在」；没图的 13 篇里 9 篇其实撑得起一张图。宁缺毋滥（L652），这一轮的图全部撤下：
// 两张备份表里的故事恢复成备份的样子（正文本来就没动）；ofeldsoshz 的备份里是撤掉的那张不切题的图，只去掉图。可以重复跑。
//   sudo docker compose exec -T worker node myfnb/undo-pictures-2026-10-18.ts
import { closeDb, sql } from "@aihot/backend/db";
import { DRAWN } from "../modules/reference/backend/checks.ts";
import type { CaseStory } from "../modules/reference/types.ts";

const FILLER = "ofeldsoshz9p8o1g4g0npkb8j";
const rows = await sql<{ id: string; story: CaseStory }[]>`
  SELECT article_id AS id, story FROM backup_ref_cases_pic2_all
  UNION ALL SELECT article_id, story FROM backup_ref_cases_pic2_sample WHERE article_id NOT IN (SELECT article_id FROM backup_ref_cases_pic2_all)`;
let undone = 0;
for (const row of rows) {
  const story = row.id === FILLER ? { ...row.story, parts: row.story.parts.map((p) => ({ ...p, blocks: p.blocks.filter((b) => !DRAWN.has(b.type)) })) } : row.story;
  const done = await sql`UPDATE reference_cases SET story = ${JSON.stringify(story)}::text::jsonb, updated_at = now()
    WHERE article_id = ${row.id} AND status = 'story' AND story::text <> ${JSON.stringify(story)}::text::jsonb::text`;
  undone += done.count;
}
console.log(`备份 ${rows.length} 篇，撤下图 ${undone} 篇`);
await closeDb();
