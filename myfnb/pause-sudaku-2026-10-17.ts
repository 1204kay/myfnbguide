// 2026-10-17：note-sudaku-wakaba（焼肉すだく）首轮 15 篇一篇没入选（最高 38 分，门槛 46），是每天一篇的营业日记，
// 停用。已收的条目留着（和其他停用的来源一样）。可以重复跑。
//   sudo docker compose exec -T worker node myfnb/pause-sudaku-2026-10-17.ts
import { closeDb, sql } from "@aihot/backend/db";

const paused = await sql`UPDATE sources SET enabled = false, health = 'paused', updated_at = now() WHERE id = 'note-sudaku-wakaba' AND enabled RETURNING id`;
console.log(`停用 ${paused.length} 个`);
await closeDb();
