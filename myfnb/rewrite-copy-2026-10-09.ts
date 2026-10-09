// 2026-10-09：写作规则按读者审查改过（industry/prompts：先读懂再讲明白、行话第一次出现时说明、导读不只列节目题目、
// 收录理由不写「可参考」、标题写成陈述句）。新规则只管以后写的；这里把最近几天公开列出的条目按框架自己的处理流程
// 重新处理一遍，标题、导读和收录理由按新规则重写，再重新发布。评分会重新调用，入选和分类可能随之变化。
// 先不带参数跑一次，只数条数；看过以后加 --apply 执行。默认最近 14 天，可以写 --days 7。可以重复跑（每次都会再调用模型）。
//   sudo docker compose exec -T -u root worker node myfnb/rewrite-copy-2026-10-09.ts
//   sudo docker compose exec -T -u root worker node myfnb/rewrite-copy-2026-10-09.ts --apply
import { closeDb, sql } from "@aihot/backend/db";
import { processArticle } from "@aihot/backend/jobs/content";
import { stopBoss } from "@aihot/backend/jobs/queue";

const apply = process.argv.includes("--apply");
const at = process.argv.indexOf("--days");
const days = at > 0 ? Number(process.argv[at + 1]) : 14;
if (!Number.isInteger(days) || days < 1) throw new Error("--days 要写正整数");

const rows = await sql<{ article_id: string; selected: boolean }[]>`
  SELECT article_id, selected FROM publications
  WHERE visibility = 'public' AND eligible AND NOT backfill AND timeline_at > now() - make_interval(days => ${days})
  ORDER BY timeline_at DESC`;
console.log(`最近 ${days} 天公开列出的条目 ${rows.length} 条，其中入选 ${rows.filter((r) => r.selected).length} 条${apply ? "" : "（预览）"}`);
if (apply) {
  const states: Record<string, number> = {};
  for (const [i, r] of rows.entries()) {
    const { state } = await processArticle(r.article_id);
    states[state] = (states[state] ?? 0) + 1;
    if ((i + 1) % 20 === 0) console.log(`已处理 ${i + 1}/${rows.length}`);
  }
  console.log("处理结果：", JSON.stringify(states));
}
await stopBoss();
await closeDb();
