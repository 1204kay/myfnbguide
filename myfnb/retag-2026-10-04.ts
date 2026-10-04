// 2026-10-04：业态标签「小吃/档口」改名「小吃/摊位」（「档口」是粤语说法，myfnb/HANDOFF.md §3 第 5 条）。
// 已入库条目的分析结果和人工修改里还是旧名字：这里分批改掉，再用框架自己的发布函数重新生成这些条目的
// 公开记录，主题页和筛选随之更新。大批更新不放进发布迁移（AGENTS.md），所以单独跑；可以重复跑，第二次打印 0。
//   sudo docker compose exec -T -u root worker node myfnb/retag-2026-10-04.ts
import { closeDb, sql } from "@aihot/backend/db";
import { publishArticle } from "@aihot/backend/publication/publish";

const OLD = "小吃/档口";
const NEW = "小吃/摊位";

let analyses = 0;
for (;;) {
  const rows = await sql<{ id: string }[]>`
    UPDATE analyses SET tags = array_replace(tags, ${OLD}, ${NEW})
    WHERE id IN (SELECT id FROM analyses WHERE ${OLD} = ANY(tags) LIMIT 500) RETURNING id`;
  if (!rows.length) break;
  analyses += rows.length;
}

const overrides = await sql`
  UPDATE editorial_overrides SET fields = jsonb_set(fields, '{tags}', (
    SELECT jsonb_agg(CASE WHEN t = ${OLD} THEN ${NEW} ELSE t END) FROM jsonb_array_elements_text(fields->'tags') AS t))
  WHERE fields->'tags' ? ${OLD} RETURNING article_id`;

const stale = await sql<{ article_id: string }[]>`SELECT article_id FROM publications WHERE ${OLD} = ANY(tags)`;
let republished = 0;
for (const { article_id } of stale) if ((await publishArticle(article_id))?.changed) republished += 1;
const [left] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM publications WHERE ${OLD} = ANY(tags)`;

console.log(`analyses ${analyses}, overrides ${overrides.length}, publications ${stale.length} → republished ${republished}, still old ${left!.n}`);
await closeDb();
