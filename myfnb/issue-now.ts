// 十一说的开、停和补写一期（modules/reference/server.ts 的 issuesFrom；Kay 10-23：今天就上，一句话能停）。
// 每天 05:00 的任务只看 settings 的 reference.issues 一行；这个脚本改那一行，或者马上写某一天的一期并重排那天的日报。
// 不带参数：只看现在的状态，不写库。
//   sudo docker compose exec -T worker node myfnb/issue-now.ts
//   sudo docker compose exec -T worker node myfnb/issue-now.ts --from 2026-10-24     从这天起每天 05:00 写
//   sudo docker compose exec -T worker node myfnb/issue-now.ts --stop                停：删掉那一行，已写好的各期照旧
//   sudo docker compose exec -T worker node myfnb/issue-now.ts --write 2026-10-23    马上写这一天的一期（花模型钱，约 US$2），
//                                                                                    写成了就重排这一天的日报，让它当头条
import { closeDb, sql } from "@aihot/backend/db";
import { composeDaily } from "@aihot/backend/reports/compose";
import { writeIssue } from "../modules/reference/backend/issues.ts";

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const DATE = /^\d{4}-\d{2}-\d{2}$/u;

const from = arg("--from");
const write = arg("--write");
if (from !== undefined && !DATE.test(from)) throw new Error(`--from 要一个日期，例如 2026-10-24`);
if (write !== undefined && !DATE.test(write)) throw new Error(`--write 要一个日期，例如 2026-10-23`);

if (from) {
  await sql`INSERT INTO settings (key, value, updated_by) VALUES ('reference.issues', ${sql.json({ from })}, 'myfnb/issue-now.ts')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`;
  console.log(`十一说从 ${from} 起每天 05:00 写。`);
} else if (process.argv.includes("--stop")) {
  const n = (await sql`DELETE FROM settings WHERE key = 'reference.issues'`).count;
  console.log(n ? "十一说停了：明天起不再写；已写好的各期照旧。" : "本来就没开。");
}

if (write) {
  const r = await writeIssue(write);
  console.log(`${write}：${r.status === "issue" ? `第 ${r.no} 期` : "这天收录太少，没有写"}`);
  if (r.status === "issue") {
    const daily = await composeDaily(write, `${write} 十一说第 ${r.no} 期放到头条（Kay 10-23：今天就上）`);
    const [now] = await sql<{ content: { lead: { title: string; kicker?: string } | null } }[]>`SELECT content FROM reports WHERE kind = 'daily' AND key = ${write}`;
    console.log(`${write} 日报已重排（${daily.entries} 条），头条：${now?.content.lead?.kicker ?? "（原版）"} ${now?.content.lead?.title ?? ""}`);
  }
}

const [row] = await sql<{ value: { from?: string }; updated_at: Date }[]>`SELECT value, updated_at FROM settings WHERE key = 'reference.issues'`;
const issues = await sql<{ date: string; no: number | null; status: string; title: string | null }[]>`
  SELECT to_char(date, 'YYYY-MM-DD') AS date, no, status, content->'issue'->>'title' AS title FROM reference_issues ORDER BY date DESC LIMIT 5`;
console.log(`\n现在：${row?.value.from ? `从 ${row.value.from} 起每天写` : "没开"}`);
for (const i of issues) console.log(`  ${i.date} ${i.no ? `第 ${i.no} 期` : i.status} ${i.title ?? ""}`);
await closeDb();
