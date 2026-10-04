// 2026-10-05：业态标签按定稿的十种店型改名（myfnb/research-2026-10-05-shop-types.md，HANDOFF §9.2 开头第 2 件）：
// 「小吃/摊位」拆开以后旧标签归「摊位/餐车」（它的近义词几乎都是摊位，谈有门面的小吃店的条目要在后台改标签或重新分析
// 才会分到「小吃」）；「团餐/中央厨房」改为「团餐/宴会承办」；「酒吧/酒饮」改为「酒吧/酒馆」。已入库条目的分析结果和
// 人工修改里还是旧名字：这里分批改掉，再用框架自己的发布函数重新生成这些条目的公开记录，主题页和筛选随之更新。
// 大批更新不放进发布迁移（AGENTS.md），所以单独跑；可以重复跑，第二次每组打印 0。新版本部署以后再跑，否则旧版本
// 还会给新条目打上旧标签。
//   sudo docker compose exec -T -u root worker node myfnb/retag-2026-10-05.ts
import { closeDb, sql } from "@aihot/backend/db";
import { publishArticle } from "@aihot/backend/publication/publish";

/** [旧标签, 新标签]，按顺序改，一组一行结果。 */
const PAIRS: Array<[string, string]> = [
  ["小吃/摊位", "摊位/餐车"],
  ["团餐/中央厨房", "团餐/宴会承办"],
  ["酒吧/酒饮", "酒吧/酒馆"],
];

for (const [OLD, NEW] of PAIRS) {
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

  console.log(`${OLD} → ${NEW}: analyses ${analyses}, overrides ${overrides.length}, publications ${stale.length} → republished ${republished}, still old ${left!.n}`);
}
await closeDb();
