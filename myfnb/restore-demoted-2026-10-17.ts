// 2026-10-17：出图规则改版后批量重写（rewrite-reference.ts --with numbers --backup figs_20261017），跑到第 21 篇已有 5 篇
// 从故事降成 thin，到了十一定的上限，停下。降成 thin 的故事要等正文那一轮才有条目正文，停下以后有的从页面上消失了。
// 把「备份里是故事、现在不是」的那几篇整行恢复成备份（故事和条目正文都回到重写前），其余重写过的不动。可以重复跑。
//   sudo docker compose exec -T worker node myfnb/restore-demoted-2026-10-17.ts
import { closeDb, sql } from "@aihot/backend/db";

const ids = (await sql<{ id: string }[]>`
  SELECT b.article_id AS id FROM backup_ref_cases_figs_20261017 b JOIN reference_cases c USING (article_id)
  WHERE b.status = 'story' AND c.status <> 'story'`).map((r) => r.id);
if (ids.length) await sql.begin(async (tx) => {
  await tx`
    UPDATE reference_cases c SET revision = b.revision, status = b.status, story = b.story, situations = b.situations, shop_key = b.shop_key,
      problems = b.problems, receipt_ids = b.receipt_ids, prompt_version = b.prompt_version, updated_at = now()
    FROM backup_ref_cases_figs_20261017 b WHERE b.article_id = c.article_id AND c.article_id IN ${tx(ids)}`;
  await tx`DELETE FROM reference_bodies WHERE article_id IN ${tx(ids)}
    AND article_id NOT IN (SELECT article_id FROM backup_ref_bodies_figs_20261017)`;
  await tx`
    UPDATE reference_bodies r SET revision = b.revision, status = b.status, body = b.body, problems = b.problems,
      receipt_ids = b.receipt_ids, prompt_version = b.prompt_version, updated_at = now()
    FROM backup_ref_bodies_figs_20261017 b WHERE b.article_id = r.article_id AND r.article_id IN ${tx(ids)}`;
});
console.log(`恢复 ${ids.length} 篇：${ids.join(" ")}`);
await closeDb();
