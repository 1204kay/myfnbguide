// 2026-10-23：印度 Petpooja 博客那条（vvx9s8…，快餐店和休闲餐厅怎么选），摘要把建店成本的 lakh 换算错了 10 倍：
// 原文「₹15 lakh to ₹30 lakh」「₹45 lakh to ₹1 crore」，1 lakh = 10 万，应是 150 万至 300 万卢比、450 万至 1000 万卢比，
// 摘要写成了 15 万至 30 万、45 万至 100 万。要点试写的盲核（两名核对员）查出来的，是线上原有的错。
// 做法照 fix-item-title-2026-10-23.ts：走后台人工更正（overrideFields，有审计记录，重跑模型不会盖掉），日报、周报和参考库故事里
// 同一句话一起换掉；改之前把条目、人工更正、受影响的报告和故事整行备份到 backup_item_summary_20261023_*。
// 讨论串「MYFNB 读者为什么想点开」，十一 10-23 定，只改这一句。
// 不带参数只预览（列出每处出现了几次，包括写法不同、没法自动换的）；--apply 执行。可以重复跑。
//   sudo docker compose exec -T worker node myfnb/fix-item-summary-2026-10-23.ts [--apply]
import { overrideFields } from "@aihot/backend/admin/content";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";

const ID = "vvx9s8z2a0rmcl1pj3477cvt4";
const FROM = "小型快餐店建店成本为 15 万至 30 万卢比，休闲餐厅为 45 万至 100 万卢比";
const TO = "小型快餐店建店成本为 150 万至 300 万卢比，休闲餐厅为 450 万至 1000 万卢比";
/** 换算错的数字本身：写法和 FROM 不同的地方也靠它找出来，只列出、不自动改。 */
const MARK = "15 万至 30 万卢比";
const REASON = "建店成本的 lakh 换算错了 10 倍：原文 ₹15–30 lakh、₹45 lakh–₹1 crore，即 150 万至 300 万、450 万至 1000 万卢比";

const apply = process.argv.includes("--apply");
const times = (text: string, s: string) => text.split(s).length - 1;
const [pub] = await sql<{ summary: string | null }[]>`SELECT summary FROM publications WHERE article_id = ${ID}`;
const [ov] = await sql<{ version: number; fields: Record<string, unknown> }[]>`SELECT version, fields FROM editorial_overrides WHERE article_id = ${ID}`;
const reports = (await sql<{ kind: string; key: string; text: string }[]>`
  SELECT kind, key, content::text AS text FROM reports WHERE content::text LIKE ${"%" + MARK + "%"} ORDER BY kind, key`)
  .map((r) => ({ kind: r.kind, key: r.key, exact: times(r.text, FROM), mark: times(r.text, MARK) }));
const stories = (await sql<{ article_id: string; text: string }[]>`
  SELECT article_id, story::text AS text FROM reference_cases WHERE story::text LIKE ${"%" + MARK + "%"}`)
  .map((r) => ({ article_id: r.article_id, exact: times(r.text, FROM), mark: times(r.text, MARK) }));

console.log(`条目现在的摘要：${pub?.summary ?? "（没有这一条）"}`);
console.log(`已有的人工更正：${ov ? JSON.stringify(ov.fields) + `（version ${ov.version}）` : "无"}`);
for (const r of reports) console.log(`报告 ${r.kind} ${r.key}：整句 ${r.exact} 处，错的数字 ${r.mark} 处`);
for (const s of stories) console.log(`参考库故事 ${s.article_id}：整句 ${s.exact} 处，错的数字 ${s.mark} 处`);
const itemTodo = !!pub?.summary?.includes(FROM);
// 只换整句能对上的地方；数字出现的次数比整句多，说明有别的写法，留给人看。
const reportTodo = reports.filter((r) => r.exact > 0 && r.exact === r.mark);
const storyTodo = stories.filter((s) => s.exact > 0 && s.exact === s.mark);
const leftover = [...reports.filter((r) => !reportTodo.includes(r)).map((r) => `报告 ${r.kind} ${r.key}`), ...stories.filter((s) => !storyTodo.includes(s)).map((s) => `故事 ${s.article_id}`)];
if (leftover.length) console.log(`写法不同、不自动改：${leftover.join("、")}`);
if (!apply) {
  console.log(`预览：条目${itemTodo ? "要改" : "不改"}，报告 ${reportTodo.length} 份，故事 ${storyTodo.length} 篇`);
  await closeDb();
  process.exit(0);
}

await sql`CREATE TABLE IF NOT EXISTS backup_item_summary_20261023_pub AS SELECT * FROM publications WHERE article_id = ${ID}`;
await sql`CREATE TABLE IF NOT EXISTS backup_item_summary_20261023_override AS SELECT * FROM editorial_overrides WHERE article_id = ${ID}`;
await sql`CREATE TABLE IF NOT EXISTS backup_item_summary_20261023_reports AS SELECT * FROM reports WHERE content::text LIKE ${"%" + MARK + "%"}`;
await sql`CREATE TABLE IF NOT EXISTS backup_item_summary_20261023_stories AS SELECT * FROM reference_cases WHERE story::text LIKE ${"%" + MARK + "%"}`;
if (itemTodo) {
  await overrideFields(ID, { fields: { summary: pub!.summary!.replace(FROM, TO) }, reason: REASON, version: ov?.version ?? 0 }, "十一（讨论串 MYFNB 读者为什么想点开）");
  console.log("条目摘要已改");
}
for (const r of reportTodo) {
  await sql`UPDATE reports SET content = replace(content::text, ${FROM}, ${TO})::jsonb WHERE kind = ${r.kind} AND key = ${r.key}`;
  console.log(`报告 ${r.kind} ${r.key} 已改`);
}
for (const s of storyTodo) {
  await sql`UPDATE reference_cases SET story = replace(story::text, ${FROM}, ${TO})::jsonb WHERE article_id = ${s.article_id}`;
  console.log(`故事 ${s.article_id} 已改`);
}
const [after] = await sql<{ summary: string | null }[]>`SELECT summary FROM publications WHERE article_id = ${ID}`;
console.log(`改后条目摘要：${after?.summary}`);
// 人工更正会往 digest 队列加任务，打开了队列连接；不关掉进程就不退出（见 fix-item-title-2026-10-23.ts）。
await stopBoss();
await closeDb();
