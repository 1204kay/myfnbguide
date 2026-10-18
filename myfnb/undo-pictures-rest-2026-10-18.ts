// 2026-10-18：撤下线上故事里剩下的全部图。两轮补图撤完以后（undo-pictures-2026-10-18.ts、undo-pictures-round1-2026-10-18.ts），
// 剩下的图逐张对原文抽查：补图以前就有的 20 篇错 6 篇，10-17 以后写故事时画的 15 篇错 3 篇、小错 3 篇，错率都在 30% 左右。
// 宁缺毋滥（L652），没核过的图先不挂在线上（十一定）：只拿掉图块；一段只有图的，连那段的小标题一起拿掉（那个小标题说的就是那张图），
// 其余一个字不动。第一轮里图单独占一段、上次没撤的 88 篇也在这里。撤之前整行备份到 backup_ref_cases_pic_rest_drawn，
// 等每张图都有了单独对原文的核对，从这张表逐张核过再放回。可以重复跑。
//   sudo docker compose exec -T worker node myfnb/undo-pictures-rest-2026-10-18.ts
import { closeDb, sql } from "@aihot/backend/db";
import { DRAWN } from "../modules/reference/backend/checks.ts";
import type { CaseStory } from "../modules/reference/types.ts";

await sql`CREATE TABLE IF NOT EXISTS backup_ref_cases_pic_rest_drawn AS
  SELECT * FROM reference_cases c WHERE c.status = 'story'
    AND EXISTS (SELECT 1 FROM jsonb_array_elements(c.story->'parts') p, jsonb_array_elements(p->'blocks') x WHERE x->>'type' IN ${sql([...DRAWN])})`;
const rows = await sql<{ id: string; story: CaseStory }[]>`SELECT article_id AS id, story FROM backup_ref_cases_pic_rest_drawn`;
let undone = 0;
let headings = 0;
const left: string[] = [];
for (const row of rows) {
  const parts = row.story.parts.map((p) => ({ ...p, blocks: p.blocks.filter((b) => !DRAWN.has(b.type)) })).filter((p) => p.blocks.length);
  if (!parts.length) { left.push(row.id); continue; }
  const story = { ...row.story, parts };
  // Only where the story is still what was backed up: one written again since keeps what it has now.
  const done = await sql`UPDATE reference_cases SET story = ${JSON.stringify(story)}::text::jsonb, updated_at = now()
    WHERE article_id = ${row.id} AND status = 'story' AND story = ${JSON.stringify(row.story)}::text::jsonb`;
  undone += done.count;
  if (done.count) headings += row.story.parts.length - parts.length;
}
console.log(`备份 ${rows.length} 篇，撤下图 ${undone} 篇，连图拿掉的小标题 ${headings} 个；只有图、没有撤的 ${left.length} 篇：${left.join(" ")}`);
await closeDb();
