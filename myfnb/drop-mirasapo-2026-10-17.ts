// 2026-10-17：ミラサポplus 对服务器 IP 返回 403（规则 6），一次性导入撤下。seed 那天建的空来源 import-mirasapo 删掉；
// 它没有任何条目，有条目就只停用、不删。可以重复跑。
//   sudo docker compose exec -T worker node myfnb/drop-mirasapo-2026-10-17.ts
import { closeDb, sql } from "@aihot/backend/db";

const deleted = await sql`DELETE FROM sources s WHERE s.id = 'import-mirasapo' AND NOT EXISTS (SELECT 1 FROM articles a WHERE a.source_id = s.id) RETURNING s.id`;
const paused = deleted.length ? [] : await sql`UPDATE sources SET enabled = false, health = 'paused', updated_at = now() WHERE id = 'import-mirasapo' AND enabled RETURNING id`;
console.log(`删掉 ${deleted.length} 个，停用 ${paused.length} 个`);
await closeDb();
