// 十一说的开、停和补写一期（modules/reference/server.ts 的 issuesFrom；Kay 10-23：今天就上，一句话能停）。
// 每天 05:00 的任务只看 settings 的 reference.issues 一行；这个脚本改那一行，放进会话里核好的一期，盲核过了再让它当那天日报的头条。
// 不带参数：只看现在的状态，不写库。
//   sudo docker compose exec -T worker node myfnb/issue-now.ts
//   sudo docker compose exec -T worker node myfnb/issue-now.ts --from 2026-10-24     从这天起每天 05:00 写
//   sudo docker compose exec -T worker node myfnb/issue-now.ts --stop                停：删掉那一行，已写好的各期照旧
//   sudo docker compose exec -T worker node myfnb/issue-now.ts --dump 2026-10-23     这一期和它点名原文的全文，JSON，给盲核用
//                                                                                    （原文只放在临时目录，核完删，不进任何仓库）
//   sudo docker compose exec -T worker node myfnb/issue-now.ts --lead 2026-10-23     重排这一天的日报，让这一期当头条
// 11-01 以前 Claude API 额度用完了，核对、改稿、挑稿在会话里照同一套提示词做（Kay 10-23），每天：
//   ... --drafts 2026-10-24 > 临时目录/drafts.json    DeepSeek 写两稿并为念出来改过（几分钱），连同当天收录的全文，JSON
//   ... --items 2026-10-24 > 临时目录/items.json      只要当天收录（编号、来源、标题、全文），不调模型；〔n〕照这里的编号标
//   ... --put 2026-10-24 < 定稿.json                  放进会话里核好的一期（{"issue": {...}}），日报不动；再 --dump 盲核、--lead 上头条
import { closeDb, sql } from "@aihot/backend/db";
import { installModules } from "@aihot/backend/modules";
import { composeDaily } from "@aihot/backend/reports/compose";
import { SERVER_MODULES } from "@aihot/site/modules/server";
import { beijingAt } from "@aihot/contracts/time";
import { EDITION_TIMES } from "@aihot/site";
import { DEFAULTS } from "@aihot/site/models";
import { ISSUE_STEP, type IssueText, modelAsk, writeDrafts } from "../modules/reference/backend/issue.ts";
import { dayItems } from "../modules/reference/backend/issues.ts";

// composeDaily asks the installed modules for the daily's lead (moduleDailyLead): without them --lead leads by rule.
installModules(SERVER_MODULES);

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const DATE = /^\d{4}-\d{2}-\d{2}$/u;

const from = arg("--from");
const dump = arg("--dump");
const lead = arg("--lead");
const drafts = arg("--drafts");
const put = arg("--put");
const listed = arg("--items");
for (const d of [dump, lead, drafts, put, listed]) if (d !== undefined && !DATE.test(d)) throw new Error(`要一个日期，例如 2026-10-23`);
if (from !== undefined && !DATE.test(from)) throw new Error(`--from 要一个日期，例如 2026-10-24`);

if (from) {
  await sql`INSERT INTO settings (key, value, updated_by) VALUES ('reference.issues', ${sql.json({ from })}, 'myfnb/issue-now.ts')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`;
  console.log(`十一说从 ${from} 起每天 05:00 写。`);
} else if (process.argv.includes("--stop")) {
  const n = (await sql`DELETE FROM settings WHERE key = 'reference.issues'`).count;
  console.log(n ? "十一说停了：明天起不再写；已写好的各期照旧。" : "本来就没开。");
}

if (listed) {
  const edition = beijingAt(listed, EDITION_TIMES.daily);
  const now = new Date();
  console.log(JSON.stringify({ date: listed, items: await dayItems(now < edition ? now : edition) }, null, 1));
  await closeDb();
  process.exit(0);
}

if (drafts) {
  // Stdout only: the day's originals go to a temporary folder for the check, never into a repository (工作约定 §12).
  const edition = beijingAt(drafts, EDITION_TIMES.daily);
  const now = new Date();
  const items = await dayItems(now < edition ? now : edition);
  // The writer's preset (site/models.ts DEFAULTS); a script installs no module, so modelFor knows no step of theirs.
  const writer = arg("--model") ?? DEFAULTS[ISSUE_STEP]!;
  const two = await writeDrafts(items, drafts, modelAsk(writer, `issue:${drafts}`, []));
  console.log(JSON.stringify({ date: drafts, writer, items, drafts: two }, null, 1));
  await closeDb();
  process.exit(0);
}

if (put) {
  // What the session checked, in the shape the writer answers in; numbered as the next issue, its items kept without text.
  const given = JSON.parse(await new Response(process.stdin as unknown as ReadableStream).text()) as { issue: IssueText; items?: Array<Record<string, unknown>> };
  const i = given.issue;
  if (!i?.title || !i.brief?.length || !i.preview || !i.news?.length || !i.deep || !i.close) throw new Error("定稿要有 title、brief、preview、news、deep、close");
  const edition = beijingAt(put, EDITION_TIMES.daily);
  const now = new Date();
  const items = (await dayItems(now < edition ? now : edition)).map(({ text: _text, ...item }) => item);
  const no = await sql.begin(async (tx) => {
    const [{ next }] = await tx<{ next: number }[]>`SELECT coalesce(max(no), 0) + 1 AS next FROM reference_issues`;
    const [row] = await tx<{ no: number }[]>`
      INSERT INTO reference_issues (date, no, status, content, version, models)
      VALUES (${put}, ${next}, 'issue', ${tx.json({ issue: i, lively: 0, edited: true, cut: [], problems: [], note: "核对在会话里做（11-01 前）", drafts: [], items } as never)},
        'session', ${tx.json({ writer: arg("--writer") ?? DEFAULTS[ISSUE_STEP]!, checker: "session" })})
      ON CONFLICT (date) DO NOTHING RETURNING no`;
    return row?.no ?? null;
  });
  console.log(no ? `${put}：放进第 ${no} 期，日报还没动` : `${put} 已经有一期，没有放`);
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
