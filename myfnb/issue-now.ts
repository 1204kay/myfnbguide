// 十一说的开、停和补写一期（modules/reference/server.ts 的 issuesFrom；Kay 10-23：今天就上，一句话能停）。
// 每天 05:00 的任务只看 settings 的 reference.issues 一行；这个脚本改那一行，补写某一天的一期，盲核过了再让它当那天日报的头条。
// 不带参数：只看现在的状态，不写库。
//   sudo docker compose exec -T worker node myfnb/issue-now.ts
//   sudo docker compose exec -T worker node myfnb/issue-now.ts --from 2026-10-24     从这天起每天 05:00 写
//   sudo docker compose exec -T worker node myfnb/issue-now.ts --stop                停：删掉那一行，已写好的各期照旧
//   sudo docker compose exec -T worker node myfnb/issue-now.ts --write 2026-10-23    马上写这一天的一期（花模型钱，约 US$2）；
//                                                                                    日报不动，先盲核（十一 10-23：过了才上头条）
//   sudo docker compose exec -T worker node myfnb/issue-now.ts --dump 2026-10-23     这一期和它点名原文的全文，JSON，给盲核用
//                                                                                    （原文只放在临时目录，核完删，不进任何仓库）
//   sudo docker compose exec -T worker node myfnb/issue-now.ts --lead 2026-10-23     重排这一天的日报，让这一期当头条
import { closeDb, sql } from "@aihot/backend/db";
import { composeDaily } from "@aihot/backend/reports/compose";
import { writeIssue } from "../modules/reference/backend/issues.ts";

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const DATE = /^\d{4}-\d{2}-\d{2}$/u;

const from = arg("--from");
const write = arg("--write");
const dump = arg("--dump");
const lead = arg("--lead");
for (const d of [dump, lead]) if (d !== undefined && !DATE.test(d)) throw new Error(`要一个日期，例如 2026-10-23`);
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
  console.log(`${write}：${r.status === "issue" ? `第 ${r.no} 期，日报还没动` : "这天收录太少，没有写"}`);
}

if (dump) {
  // The issue as it went in, and the full text of every original it names; stdout only.
  const [one] = await sql<{ no: number | null; content: { issue: { [k: string]: unknown } | null; items: Array<{ n: number; id: string; sourceName: string; title: string; url: string }> } }[]>`
    SELECT no, content FROM reference_issues WHERE date = ${dump}`;
  if (!one?.content.issue) throw new Error(`${dump} 没有写成的一期`);
  const named = new Set([...JSON.stringify(one.content.issue).matchAll(/〔([\d、,，\s]+)〕/gu)].flatMap((m) => m[1]!.split(/[、,，\s]+/u).filter(Boolean).map(Number)));
  const cited = one.content.items.filter((i) => named.has(i.n));
  const texts = cited.length ? await sql<{ id: string; text: string }[]>`
    SELECT id::text, coalesce(nullif(body_text, ''), excerpt, '') AS text FROM articles WHERE id::text IN ${sql(cited.map((i) => String(i.id)))}` : [];
  const byId = new Map(texts.map((t) => [t.id, t.text]));
  console.log(JSON.stringify({ date: dump, no: one.no, issue: one.content.issue, sources: cited.map((i) => ({ ...i, text: byId.get(String(i.id)) ?? "" })) }, null, 1));
  await closeDb();
  process.exit(0);
}

if (lead) {
  const [one] = await sql<{ no: number | null }[]>`SELECT no FROM reference_issues WHERE date = ${lead} AND status = 'issue'`;
  if (!one) throw new Error(`${lead} 没有写成的一期，日报不动`);
  const daily = await composeDaily(lead, `${lead} 十一说第 ${one.no} 期放到头条（Kay 10-23：今天就上）`);
  const [now] = await sql<{ content: { lead: { title: string; kicker?: string } | null } }[]>`SELECT content FROM reports WHERE kind = 'daily' AND key = ${lead}`;
  console.log(`${lead} 日报已重排（${daily.entries} 条），头条：${now?.content.lead?.kicker ?? "（原版）"} ${now?.content.lead?.title ?? ""}`);
}

const [row] = await sql<{ value: { from?: string }; updated_at: Date }[]>`SELECT value, updated_at FROM settings WHERE key = 'reference.issues'`;
const issues = await sql<{ date: string; no: number | null; status: string; title: string | null }[]>`
  SELECT to_char(date, 'YYYY-MM-DD') AS date, no, status, content->'issue'->>'title' AS title FROM reference_issues ORDER BY date DESC LIMIT 5`;
console.log(`\n现在：${row?.value.from ? `从 ${row.value.from} 起每天写` : "没开"}`);
for (const i of issues) console.log(`  ${i.date} ${i.no ? `第 ${i.no} 期` : i.status} ${i.title ?? ""}`);
await closeDb();
