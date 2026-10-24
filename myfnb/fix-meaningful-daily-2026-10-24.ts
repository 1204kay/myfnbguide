// 2026-10-24：Meaningful Vision 鸡肉产品线那条（iu1fjlbg…）的条目已用 fix-meaningful-2026-10-24.ts 拿掉原文没有的「英国」，
// 10-21 日报里冻结的还是旧文字。十一定一起改。全库只读搜过「英国非鸡肉」：还带旧文字的只有这期日报、模型原始输出
// analyses（前台读人工更正，重跑也不会盖回）、10-23 的备份表和调用回执（审计记录），后三类不动。
// 这里把这期日报里的「英国非鸡肉快餐连锁」换成「非鸡肉快餐连锁」，改前整行备份到 backup_meaningful_20261024_daily。
// 不带参数只预览；--apply 执行。可以重复跑。
//   sudo docker compose exec -T worker node myfnb/fix-meaningful-daily-2026-10-24.ts [--apply]
import { closeDb, sql } from "@aihot/backend/db";

const DAILY = "2026-10-21";
const FROM = "英国非鸡肉快餐连锁";
const TO = "非鸡肉快餐连锁";

const apply = process.argv.includes("--apply");
const [row] = await sql<{ text: string }[]>`SELECT content::text AS text FROM reports WHERE kind = 'daily' AND key = ${DAILY}`;
if (!row) throw new Error(`没有 ${DAILY} 日报`);
const hits = row.text.split(FROM);
console.log(`${DAILY} 日报里「${FROM}」出现 ${hits.length - 1} 次`);
for (let i = 1; i < hits.length; i++) console.log(`  …${hits[i - 1]!.slice(-30)}【${FROM}】${hits[i]!.slice(0, 30)}…`);
if (!apply || hits.length === 1) {
  console.log(apply ? "没有要改的。" : "只预览，没有动线上；写回用 --apply。");
  await closeDb();
  process.exit(0);
}

await sql`CREATE TABLE IF NOT EXISTS backup_meaningful_20261024_daily AS SELECT * FROM reports WHERE kind = 'daily' AND key = ${DAILY}`;
await sql`UPDATE reports SET content = replace(content::text, ${FROM}, ${TO})::jsonb WHERE kind = 'daily' AND key = ${DAILY}`;
const [after] = await sql<{ n: number }[]>`
  SELECT (length(content::text) - length(replace(content::text, ${FROM}, ''))) / length(${FROM}) AS n FROM reports WHERE kind = 'daily' AND key = ${DAILY}`;
console.log(`已写回。日报里还剩「${FROM}」${after?.n} 次`);
await closeDb();
