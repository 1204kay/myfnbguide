// 2026-10-10：公开列出的条目里，标题、导读、收录理由还带本站不用的词（industry/wording.ts）的，按框架自己的处理流程
// 重新处理一遍再发布：多数写于 10/1–10/5，那时写作之后还没有改用词这一步（packages/backend/src/editorial/analyze.ts 的
// mendWording），10/5 的补改只处理了入选的条目（rewrite-copy-2026-10-05.ts，已由本脚本取代）。评分和写作会按现在的提示词
// 重新调用，入选和分类可能随之变化；10/9 以后写的条目输入没变，回执复用，不重复收费。
// 不带参数只数条数；--apply 执行，可以重复跑（模型改不掉的会留下）。
//   sudo docker compose exec -T -u root worker node myfnb/rewrite-copy-2026-10-10.ts [--apply]
import { closeDb, sql } from "@aihot/backend/db";
import { wordingProblems } from "@aihot/backend/editorial/wording";
import { processArticle } from "@aihot/backend/jobs/content";
import { stopBoss } from "@aihot/backend/jobs/queue";

const pending = async () => (await sql<{ article_id: string; title: string; summary: string | null; reason: string | null }[]>`
  SELECT article_id, title, summary, reason FROM publications WHERE visibility = 'public' AND eligible`)
  .filter((r) => wordingProblems({ titleZh: r.title, summaryZh: r.summary ?? "", reasonZh: r.reason }).length > 0);

const todo = await pending();
console.log(`公开列出的条目里文字带本站不用的词的：${todo.length}`);
if (process.argv.includes("--apply")) {
  const states: Record<string, number> = {};
  for (const [i, r] of todo.entries()) {
    const state = await processArticle(r.article_id).then((p) => p.state, (error) => `failed ${String(error).slice(0, 60)}`);
    states[state] = (states[state] ?? 0) + 1;
    if ((i + 1) % 20 === 0) console.log(`已处理 ${i + 1}/${todo.length}`);
  }
  console.log("处理结果：", JSON.stringify(states));
  console.log(`处理后仍带这些词的：${(await pending()).length}（模型改不掉的会留下）`);
}
await stopBoss();
await closeDb();
