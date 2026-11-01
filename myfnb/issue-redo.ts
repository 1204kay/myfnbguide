// 旧的十一说照现在的做法重写一期（Kay 11-01 20:46：十一说全部统一到现在的标准，怎么做由我们定）。
// 和每天 05:00 的写法一样（backend/issue.ts composeIssue：DeepSeek 写两稿，Opus 核对、修、补漏，修不好的剪掉），
// 只是用那一天日报窗口里的收录，写好先放在数据卷，不动网站；看过再换上。期号不变，换上之前先备份旧的。
//   sudo docker compose exec -T worker node myfnb/issue-redo.ts --try 2026-10-23   写一份，存 /data/reference/redo/2026-10-23.json，网站不动
//   sudo docker compose exec -T worker node myfnb/issue-redo.ts --show 2026-10-23  打出写好的那份（定稿、核对剩下的问题、剪掉的），不调模型
//   sudo docker compose exec -T worker node myfnb/issue-redo.ts --put 2026-10-23   换上：旧的一期和它的音频先备份到 /data/reference/redo/backup/，
//                                                                                   再换内容、改那天日报头条的标题和三句，撤下旧音频（音频另用 issue-voice.ts --put 念）
//   sudo docker compose exec -T worker node myfnb/issue-redo.ts --back 2026-10-23  还原：把备份的内容和音频放回去
// 花钱的只有 --try：DeepSeek 写稿几分钱，Opus 核对走 Claude API（一期约 US$2–4.5，10-30 第 6 期实测 US$4.51）。
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { closeDb, sql } from "@aihot/backend/db";
import { config } from "@aihot/backend/config";
import { modelFor } from "@aihot/backend/editorial/models";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { installModules } from "@aihot/backend/modules";
import { beijingAt } from "@aihot/contracts/time";
import { EDITION_TIMES } from "@aihot/site";
import { SERVER_MODULES } from "@aihot/site/modules/server";
import { composeIssue, isCheckPurpose, ISSUE_CHECK_STEP, ISSUE_STEP, ISSUE_VERSION, modelAsk } from "../modules/reference/backend/issue.ts";
import { dayItems, issueLead } from "../modules/reference/backend/issues.ts";

// modelFor knows a module's steps only once the modules are installed.
installModules(SERVER_MODULES);

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const tryDate = arg("--try");
const showDate = arg("--show");
const putDate = arg("--put");
const backDate = arg("--back");
const date = tryDate ?? showDate ?? putDate ?? backDate;
if (!date || !/^\d{4}-\d{2}-\d{2}$/u.test(date)) throw new Error("要 --try、--show、--put 或 --back 加一个日期，例如 2026-10-23");

const REDO = path.join(config.dataDir, "reference", "redo");
const AUDIO = path.join(config.dataDir, "reference", "audio");
const redoFile = path.join(REDO, `${date}.json`);
const backupDir = path.join(REDO, "backup", date);

type Row = { no: number; content: Record<string, unknown>; version: string; models: unknown };
const [row] = await sql<Row[]>`SELECT no, content, version, models FROM reference_issues WHERE date = ${date} AND status = 'issue'`;
if (!row) throw new Error(`${date} 没有写成的一期`);

const chars = (issue: { preview?: string; news?: Array<{ head: string; text: string }>; deep?: string; close?: string } | null) =>
  issue ? [issue.preview ?? "", ...(issue.news ?? []).map((n) => n.head + n.text), issue.deep ?? "", issue.close ?? ""].join("").replace(/〔[^〕]*〕/gu, "").length : 0;

type Redone = { issue: { title: string; preview: string; news: Array<{ head: string; text: string }>; deep: string; close: string } | null;
  problems: unknown[]; cut: unknown[]; note: string | null; [k: string]: unknown };
const summary = (c: Redone) => ({
  date, no: row.no, title: c.issue?.title ?? null, chars: chars(c.issue), news: c.issue?.news.length ?? 0,
  problems: c.problems.length, cut: c.cut.length, note: c.note,
  before: { title: (row.content.issue as { title?: string } | null)?.title ?? null, chars: chars(row.content.issue as Redone["issue"]) },
});

if (tryDate) {
  // The daily's own window, as on the day: what was listed up to its 08:00 edition.
  const items = await dayItems(beijingAt(date, EDITION_TIMES.daily));
  const [writer, checker] = await Promise.all([modelFor(ISSUE_STEP), modelFor(ISSUE_CHECK_STEP)]);
  const receiptIds: number[] = [];
  const write = modelAsk(writer, `redo:${date}`, receiptIds);
  const check = modelAsk(checker, `redo:${date}`, receiptIds);
  const c = await composeIssue(items, date, (purpose, system, user, schema, attempt) => (isCheckPurpose(purpose) ? check : write)(purpose, system, user, schema, attempt));
  if (receiptIds.length) await sql.begin(async (tx) => { for (const id of receiptIds) await completeReceipt(tx, id); });
  const kept: Redone = {
    issue: c.chosen?.issue ?? null, lively: c.chosen?.lively ?? 0, edited: c.chosen?.edited ?? false,
    cut: c.chosen?.cut ?? [], problems: c.chosen?.problems ?? [], note: c.note ?? null,
    drafts: c.drafts.map((d) => ({ issue: d.issue, lively: d.lively, problems: d.problems, edited: d.edited })),
    items: c.items.map(({ text: _text, ...item }) => item),
  };
  await mkdir(REDO, { recursive: true });
  await writeFile(redoFile, JSON.stringify({ content: kept, version: ISSUE_VERSION, models: { writer, checker }, receipts: receiptIds }, null, 1));
  console.log(JSON.stringify({ ...summary(kept), status: c.status, receipts: receiptIds.length, file: redoFile }, null, 1));
}

if (showDate) {
  const saved = JSON.parse(await readFile(redoFile, "utf8")) as { content: Redone };
  console.log(JSON.stringify({ ...summary(saved.content), issue: saved.content.issue, problemsLeft: saved.content.problems, cutLines: saved.content.cut }, null, 1));
}

// <no>.voice.json is the reading's report (backend/voice.ts): its count of tries belongs to the old text.
const missingOk = (error: unknown) => { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; };
const audioFiles = (no: number) => [`${no}.mp3`, `${no}.json`, `${no}.txt`, `${no}.voice.json`];

if (putDate) {
  const saved = JSON.parse(await readFile(redoFile, "utf8")) as { content: Redone; version: string; models: unknown };
  // What would go up with a check's problem still in it, or nothing written, stays where it is (宁缺毋滥).
  if (!saved.content.issue) throw new Error(`${date} 重写的那份没有定稿，不换`);
  if (saved.content.problems.length) throw new Error(`${date} 重写的那份核对后还有 ${saved.content.problems.length} 个问题，不换`);
  await mkdir(backupDir, { recursive: true });
  // A backup already there is the original: a second --put must not overwrite it with the redone one.
  const had = await stat(path.join(backupDir, "row.json")).then(() => true, () => false);
  if (!had) {
    await writeFile(path.join(backupDir, "row.json"), JSON.stringify(row, null, 1));
    // A file the issue never had (no audio yet) is fine; any other failure stops here, before the old audio is removed.
    for (const f of audioFiles(row.no)) await copyFile(path.join(AUDIO, f), path.join(backupDir, f)).catch(missingOk);
  }
  await sql`UPDATE reference_issues SET content = ${sql.json(saved.content as never)}, version = ${saved.version}, models = ${sql.json(saved.models as never)}
    WHERE date = ${date} AND no = ${row.no}`;
  // The day's daily keeps its entries; only its lead, which is this issue's title and three sentences, follows it.
  const lead = await issueLead(date);
  const relead = lead ? await sql`UPDATE reports SET content = jsonb_set(content, '{lead}', ${sql.json(lead as never)})
    WHERE kind = 'daily' AND key = ${date} AND content->'lead'->>'kicker' LIKE '十一说%'` : { count: 0 };
  // The old reading tells another text: down until issue-voice.ts --put reads this one.
  for (const f of audioFiles(row.no)) await rm(path.join(AUDIO, f), { force: true });
  console.log(`${date} 第 ${row.no} 期换上了重写的那份（${chars(saved.content.issue as Redone["issue"])} 字）；日报头条${relead.count ? "跟着改了" : "没有改（那天头条不是十一说）"}；旧音频已撤下，备份在 ${backupDir}`);
  console.log(`接着念：sudo docker compose exec -T worker node myfnb/issue-voice.ts --put ${row.no}`);
}

if (backDate) {
  const old = JSON.parse(await readFile(path.join(backupDir, "row.json"), "utf8")) as Row;
  await sql`UPDATE reference_issues SET content = ${sql.json(old.content as never)}, version = ${old.version}, models = ${sql.json(old.models as never)}
    WHERE date = ${date} AND no = ${old.no}`;
  const lead = await issueLead(date);
  if (lead) await sql`UPDATE reports SET content = jsonb_set(content, '{lead}', ${sql.json(lead as never)})
    WHERE kind = 'daily' AND key = ${date} AND content->'lead'->>'kicker' LIKE '十一说%'`;
  // The redone reading's files go first, so no new 文字稿 is left beside the old mp3.
  for (const f of audioFiles(old.no)) await rm(path.join(AUDIO, f), { force: true });
  for (const f of audioFiles(old.no)) await copyFile(path.join(backupDir, f), path.join(AUDIO, f)).catch(missingOk);
  console.log(`${date} 第 ${old.no} 期还原成备份的那份，音频也放回去了`);
}

await closeDb();
