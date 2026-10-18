// 2026-10-18：补图批量（add 图那一轮退回重写整篇，备份 backup_ref_cases_pic_batch_1018）换掉了 710 篇的正文。
// 新旧稿盲对原文抽 20 篇，新稿更准 8、旧稿更准 4、差不多 8，所以不整批换回，只把旧稿更准的这 4 篇整行换回原稿
// （对照：项目文件 myfnb/新旧稿对照-2026-10-18.md）。换之前把现在的 4 行备份到 backup_ref_cases_restore4_1018。可以重复跑。
//   sudo docker compose exec -T worker node myfnb/restore-originals-2026-10-18.ts
import { closeDb, sql } from "@aihot/backend/db";

const ids = ["vg3nbaiy1ju360byg0jfmdqfy", "si9g4kbp29qs6utcrjjiuumeu", "e6lkk13ftfvtouurge4wu2ol8", "mnwwhfk5d6nhf7euzhlv3lckd"];
await sql`CREATE TABLE IF NOT EXISTS backup_ref_cases_restore4_1018 AS SELECT * FROM reference_cases WHERE article_id IN ${sql(ids)}`;
const restored = await sql`
  UPDATE reference_cases c SET revision = b.revision, status = b.status, story = b.story, situations = b.situations, shop_key = b.shop_key,
    problems = b.problems, receipt_ids = b.receipt_ids, prompt_version = b.prompt_version, updated_at = now()
  FROM backup_ref_cases_pic_batch_1018 b WHERE b.article_id = c.article_id AND c.article_id IN ${sql(ids)}
    AND c.story::text <> b.story::text
  RETURNING c.article_id, c.story->>'title' AS title`;
for (const r of restored) console.log(`换回 ${r.article_id}：${r.title}`);
console.log(`换回 ${restored.length} 篇`);
await closeDb();
