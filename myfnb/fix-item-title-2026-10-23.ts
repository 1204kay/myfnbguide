// 2026-10-23：10-22 日报里四川火锅协会那条（bhkomm…），标题写「社区小店复购率做到50%」，像是社区小店普遍的数字；原文的 50% 只是
// 成都笨小孩菜市火锅直营社区门店的复购率（导读写对了）。只改这一条的标题：走后台人工更正同一个函数（overrideFields，有审计记录，
// 以后重跑模型也不会被盖掉），再把 10-22 日报里冻结的这一处标题换掉。改之前把条目和那期日报整行备份到 backup_item_title_20261023_*。
// 讨论串「MYFNB 读者为什么想点开」，十一 10-23 定，只改这一条。
// 不带参数只预览；--apply 执行。可以重复跑。
//   sudo docker compose exec -T worker node myfnb/fix-item-title-2026-10-23.ts [--apply]
import { overrideFields } from "@aihot/backend/admin/content";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";

const ID = "bhkomm8vio2hu0iqharc82fja";
const FROM = "四川火锅协会谈火锅店转向日常经营：社区小店复购率做到50%";
const TO = "四川火锅协会谈火锅店转向日常经营：成都一家社区火锅的直营店复购率做到50%";
const DAILY = "2026-10-22";
const REASON = "标题把一家店的复购率写成社区小店普遍的数字；原文的 50% 是成都笨小孩菜市火锅直营社区门店的";

const apply = process.argv.includes("--apply");
const [pub] = await sql<{ title: string }[]>`SELECT title FROM publications WHERE article_id = ${ID}`;
const [ov] = await sql<{ version: number; fields: Record<string, unknown> }[]>`SELECT version, fields FROM editorial_overrides WHERE article_id = ${ID}`;
const [daily] = await sql<{ n: number }[]>`
  SELECT (length(content::text) - length(replace(content::text, ${JSON.stringify(FROM)}, ''))) / length(${JSON.stringify(FROM)}) AS n
  FROM reports WHERE kind = 'daily' AND key = ${DAILY}`;
const stories = await sql<{ article_id: string; title: string }[]>`SELECT article_id, story->>'title' AS title FROM reference_cases WHERE article_id = ${ID}`;
console.log(`条目现在的标题：${pub?.title ?? "（没有这一条）"}`);
console.log(`已有的人工更正：${ov ? JSON.stringify(ov.fields) + `（version ${ov.version}）` : "无"}`);
console.log(`${DAILY} 日报里旧标题出现 ${daily?.n ?? "（没有这期）"} 次；参考库故事 ${stories.length} 篇`);
const itemTodo = pub?.title === FROM;
const dailyTodo = Number(daily?.n) === 1;
if (pub && !itemTodo && pub.title !== TO) console.log("  条目标题和预期的旧标题对不上，不改条目");
if (daily && !dailyTodo && Number(daily.n) !== 0) console.log("  日报里旧标题不是正好一处，不改日报");
if (!apply) { console.log(`预览：条目${itemTodo ? "要改" : "不改"}，日报${dailyTodo ? "要改" : "不改"}`); await closeDb(); process.exit(0); }

await sql`CREATE TABLE IF NOT EXISTS backup_item_title_20261023_pub AS SELECT * FROM publications WHERE article_id = ${ID}`;
await sql`CREATE TABLE IF NOT EXISTS backup_item_title_20261023_override AS SELECT * FROM editorial_overrides WHERE article_id = ${ID}`;
await sql`CREATE TABLE IF NOT EXISTS backup_item_title_20261023_daily AS SELECT * FROM reports WHERE kind = 'daily' AND key = ${DAILY}`;
if (itemTodo) {
  await overrideFields(ID, { fields: { title: TO }, reason: REASON, version: ov?.version ?? 0 }, "十一（讨论串 MYFNB 读者为什么想点开）");
  console.log("条目标题已改");
}
if (dailyTodo) {
  await sql`UPDATE reports SET content = replace(content::text, ${JSON.stringify(FROM)}, ${JSON.stringify(TO)})::jsonb
    WHERE kind = 'daily' AND key = ${DAILY}`;
  console.log("日报里的标题已改");
}
const [after] = await sql<{ title: string }[]>`SELECT title FROM publications WHERE article_id = ${ID}`;
console.log(`改后条目标题：${after?.title}`);
// 人工更正会往 digest 队列加任务，打开了队列连接；不关掉进程就不退出（10-23 第一次执行就挂住了）。
await stopBoss();
await closeDb();
