// 2026-10-05（第二份）：已入库条目的文字按新词表和空格规则统一一遍（全站布局方案 D7、D9）。两步：
// ① 空格（程序，不调模型）：每条资料最新的分析结果里，模型写的标题、摘要、收录理由在汉字与英文字母、数字之间加空格
//    （packages/backend/src/editorial/wording.ts 的 spaced，与新写入的文字同一个函数），人工修改过的标题、摘要、理由也一样；
//    改过的条目用框架自己的发布函数重新发布。
// ② 用词（调模型）：入选的条目里文字带新词表里的词（澳洲、台湾、香港、过得去、厉害、物件、节目还谈到……）的，按框架自己的
//    处理流程重新处理一遍，再重新发布（照 rewrite-copy-2026-10-05.ts）：改过的提示词会重新调用，入选和分类可能随之变化。
// 参考库的故事由参考库模块按提示词版本重写，不在这里。先不带参数跑一次，只数要改的条数、列几条例子；看过以后加 --apply 执行。
// 可以重复跑：执行后再跑，① 打印 0，② 只剩模型改不掉的。新版本部署以后再跑。
//   sudo docker compose exec -T -u root worker node myfnb/rewrite-copy-2026-10-05b.ts
//   sudo docker compose exec -T -u root worker node myfnb/rewrite-copy-2026-10-05b.ts --apply
import { closeDb, sql } from "@aihot/backend/db";
import { spaced, wordingProblems } from "@aihot/backend/editorial/wording";
import { processArticle } from "@aihot/backend/jobs/content";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { publishArticle } from "@aihot/backend/publication/publish";

const apply = process.argv.includes("--apply");
const space = (text: string | null) => (text === null ? null : spaced(text));
const changed = new Set<string>();
const examples: string[] = [];
const note = (before: string | null, after: string | null) => {
  if (examples.length < 8 && before !== after) examples.push(`  ${before} → ${after}`);
};

// ① 空格：分析结果（只动模型写的：understand、summarize）。
let analyses = 0;
for (let after = ""; ;) {
  const rows = await sql<{ id: string; article_id: string; title_zh: string | null; summary_zh: string | null; reason_zh: string | null; writer: string | null }[]>`
    SELECT DISTINCT ON (article_id) id, article_id, title_zh, summary_zh, reason_zh, output->>'writer' AS writer FROM analyses
    WHERE article_id > ${after} ORDER BY article_id, input_revision DESC, id DESC LIMIT 500`;
  if (!rows.length) break;
  after = rows.at(-1)!.article_id;
  for (const r of rows) {
    if (r.writer !== "understand" && r.writer !== "summarize") continue;
    const next = { title_zh: space(r.title_zh), summary_zh: space(r.summary_zh), reason_zh: space(r.reason_zh) };
    if (next.title_zh === r.title_zh && next.summary_zh === r.summary_zh && next.reason_zh === r.reason_zh) continue;
    analyses += 1;
    changed.add(r.article_id);
    note(r.title_zh, next.title_zh);
    if (apply) await sql`UPDATE analyses SET title_zh = ${next.title_zh}, summary_zh = ${next.summary_zh}, reason_zh = ${next.reason_zh} WHERE id = ${r.id}`;
  }
}

// ① 空格：人工修改过的标题、摘要、理由。
let overrides = 0;
for (const o of await sql<{ article_id: string; fields: Record<string, unknown> }[]>`
  SELECT article_id, fields FROM editorial_overrides WHERE fields ?| array['title', 'summary', 'reason']`) {
  const next = { ...o.fields };
  for (const k of ["title", "summary", "reason"]) if (typeof next[k] === "string") next[k] = spaced(next[k] as string);
  if (JSON.stringify(next) === JSON.stringify(o.fields)) continue;
  overrides += 1;
  changed.add(o.article_id);
  if (apply) await sql`UPDATE editorial_overrides SET fields = ${sql.json(next as never)}, version = version + 1, updated_by = 'myfnb/rewrite-copy-2026-10-05b', updated_at = now() WHERE article_id = ${o.article_id}`;
}

console.log(`① 空格：分析结果 ${analyses} 条、人工修改 ${overrides} 条，涉及条目 ${changed.size} 条${apply ? "" : "（预览）"}`);
if (examples.length) console.log(`例子：\n${examples.join("\n")}`);
if (apply) {
  let republished = 0;
  for (const [i, id] of [...changed].entries()) {
    if ((await publishArticle(id))?.changed) republished += 1;
    if ((i + 1) % 200 === 0) console.log(`已发布 ${i + 1}/${changed.size}`);
  }
  console.log(`① 重新发布：${republished} 条有变化`);
}

// ② 用词：入选的条目里文字带词表里的词的。
const pending = async () => (await sql<{ article_id: string; title: string; summary: string | null; reason: string | null }[]>`
  SELECT article_id, title, summary, reason FROM publications WHERE selected AND visibility <> 'withdrawn'`)
  .map((r) => ({ id: r.article_id, problems: wordingProblems({ titleZh: r.title, summaryZh: r.summary ?? "", reasonZh: r.reason }) }))
  .filter((r) => r.problems.length > 0);

const todo = await pending();
console.log(`② 用词：入选条目里文字带本站不用的词的 ${todo.length} 条${apply ? "" : "（预览）"}`);
for (const r of todo.slice(0, 8)) console.log(`  ${r.id}：${r.problems[0]}`);
if (apply) {
  const states: Record<string, number> = {};
  for (const [i, r] of todo.entries()) {
    const { state } = await processArticle(r.id);
    states[state] = (states[state] ?? 0) + 1;
    if ((i + 1) % 20 === 0) console.log(`已处理 ${i + 1}/${todo.length}`);
  }
  console.log("处理结果：", JSON.stringify(states));
  console.log(`处理后仍带这些词的：${(await pending()).length}（模型改不掉的会留下，下一轮再看）`);
}
await stopBoss();
await closeDb();
