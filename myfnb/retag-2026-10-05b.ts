// 2026-10-05（第二份）：地区标签按 HANDOFF §3 第 4 条改名（全站布局方案 D10）：澳洲 → 澳大利亚，香港 → 中国香港，台湾 → 中国台湾。
// 新西兰原来也归「澳洲」，改名以后不再并进来（taxonomy.ts 去掉了这个近义词）；已入库的新西兰条目在 10/5 线上是 0 条。
// 已入库条目的分析结果和人工修改里还是旧名字：这里分批改掉，再用框架自己的发布函数重新生成这些条目的公开记录，主题页和
// 筛选随之更新。大批更新不放进发布迁移（AGENTS.md），所以单独跑；新版本部署以后再跑，否则旧版本还会给新条目打上旧标签。
// 先不带参数跑一次，只数要改的条数；看过以后加 --apply 执行。可以重复跑，执行后再跑每组打印 0。
//   sudo docker compose exec -T -u root worker node myfnb/retag-2026-10-05b.ts
//   sudo docker compose exec -T -u root worker node myfnb/retag-2026-10-05b.ts --apply
import { closeDb, sql } from "@aihot/backend/db";
import { publishArticle } from "@aihot/backend/publication/publish";

/** [旧标签, 新标签]，按顺序改，一组一行结果。 */
const PAIRS: Array<[string, string]> = [
  ["澳洲", "澳大利亚"],
  ["香港", "中国香港"],
  ["台湾", "中国台湾"],
];
const apply = process.argv.includes("--apply");

for (const [OLD, NEW] of PAIRS) {
  if (!apply) {
    const [n] = await sql<{ analyses: number; overrides: number; publications: number }[]>`SELECT
      (SELECT count(*)::int FROM analyses WHERE ${OLD} = ANY(tags)) AS analyses,
      (SELECT count(*)::int FROM editorial_overrides WHERE fields->'tags' ? ${OLD}) AS overrides,
      (SELECT count(*)::int FROM publications WHERE ${OLD} = ANY(tags)) AS publications`;
    console.log(`${OLD} → ${NEW}（预览）: analyses ${n!.analyses}, overrides ${n!.overrides}, publications ${n!.publications}`);
    continue;
  }
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
