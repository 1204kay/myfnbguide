// 2026-10-05：框架写完标题、摘要和收录理由后，会查本站不用的词（industry/wording.ts）并让模型只改这些词一次
// （packages/backend/src/editorial/analyze.ts 的 mendWording）。之前写好的条目没有经过这一步：入选的 166 条里有 64 条
// 带「讲」这类词。这里找出公开池里文字带这些词的条目，按框架自己的处理流程重新处理一遍（没变的步骤按回执复用，
// 评分按现在的提示词重评），再重新发布。可以重复跑，第二次打印 0 条要改。
//   sudo docker compose exec -T -u root worker node myfnb/rewrite-copy-2026-10-05.ts
import { closeDb, sql } from "@aihot/backend/db";
import { wordingProblems } from "@aihot/backend/editorial/wording";
import { processArticle } from "@aihot/backend/jobs/content";
import { stopBoss } from "@aihot/backend/jobs/queue";

const pending = async () => (await sql<{ article_id: string; title: string; summary: string | null; reason: string | null }[]>`
  SELECT article_id, title, summary, reason FROM publications WHERE eligible AND visibility <> 'withdrawn'`)
  .filter((r) => wordingProblems({ titleZh: r.title, summaryZh: r.summary ?? "", reasonZh: r.reason }).length > 0);

const todo = await pending();
console.log(`公开池里文字带本站不用的词的条目：${todo.length}`);
const states: Record<string, number> = {};
for (const [i, r] of todo.entries()) {
  const { state } = await processArticle(r.article_id);
  states[state] = (states[state] ?? 0) + 1;
  if ((i + 1) % 20 === 0) console.log(`已处理 ${i + 1}/${todo.length}`);
}
console.log("处理结果：", JSON.stringify(states));
console.log(`处理后仍带这些词的：${(await pending()).length}（模型改不掉的会留下，下一轮再看）`);
await stopBoss();
await closeDb();
