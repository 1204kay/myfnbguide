// 十一说念出来的开、停和试念一期（modules/reference/backend/voice.ts；Kay 10-31「Gemini 钥匙直接上云」）。
// 每天 05:20 起每半小时的任务只看 settings 的 reference.voice 一行；这个脚本改那一行，或者对某一期念一次。
// 不带参数：只看现在的状态（每期有没有音频、上次念的结果），不写库。
//   sudo docker compose exec -T worker node myfnb/issue-voice.ts
//   sudo docker compose exec -T worker node myfnb/issue-voice.ts --from 2026-11-01   从这天起每天自动念
//   sudo docker compose exec -T worker node myfnb/issue-voice.ts --stop              停：删掉那一行，已放上的音频照旧
//   sudo docker compose exec -T worker node myfnb/issue-voice.ts --try 8             试念第 8 期：写听稿、核、念、机器核对，
//                                                                                    不放上网站；听稿和 mp3 留在 /data/reference/audio/tries/8/
//   sudo docker compose exec -T worker node myfnb/issue-voice.ts --hear 6            拿已放上的第 6 期（mp3 对文字稿）做一遍机器核对（连听出来的字一起打出来），
//                                                                                    不念、不改网站，只花一次 Groq 转写（免费档）
//   sudo docker compose exec -T worker node myfnb/issue-voice.ts --put 8             念第 8 期，机器核对过了就放上网站
// 花钱的：听稿用 DeepSeek 写（几分钱）、用核对模型核（Claude API 免费额度）；声音用 Gemini 免费档（每天 10 次，一期最多用 3 次）。
import path from "node:path";
import { closeDb, sql } from "@aihot/backend/db";
import { config } from "@aihot/backend/config";
import { modelFor } from "@aihot/backend/editorial/models";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { installModules } from "@aihot/backend/modules";
import { SERVER_MODULES } from "@aihot/site/modules/server";
import { ISSUE_CHECK_STEP, ISSUE_STEP, modelAsk } from "../modules/reference/backend/issue.ts";
import { issueAudio } from "../modules/reference/backend/audio.ts";
import { hearIssue, voiceIssue, voiceMissing, voiceReport } from "../modules/reference/backend/voice.ts";

// modelFor knows a module's steps only once the modules are installed.
installModules(SERVER_MODULES);

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const from = arg("--from");
const tryNo = arg("--try");
const putNo = arg("--put");
const hearNo = arg("--hear");
if (from !== undefined && !/^\d{4}-\d{2}-\d{2}$/u.test(from)) throw new Error("--from 要一个日期，例如 2026-11-01");
for (const n of [tryNo, putNo, hearNo]) if (n !== undefined && !/^[1-9]\d*$/u.test(n)) throw new Error("要一个期号，例如 8");

// Gemini's free tier reads 10 a day, at most 3 an issue: the breaker stops a runaway loop before the free tier does.
// Only this module's own row; Groq's `transcribe` row is archive's, and an operator adds it in the admin.
if (from || tryNo || putNo) {
  await sql`INSERT INTO budgets (service, per_minute, per_hour, per_day, note)
    VALUES ('speech', 2, 6, 9, '十一说念稿（Gemini 免费档每天 10 次）') ON CONFLICT (service) DO NOTHING`;
}

if (from) {
  await sql`INSERT INTO settings (key, value, updated_by) VALUES ('reference.voice', ${sql.json({ from })}, 'myfnb/issue-voice.ts')
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`;
  console.log(`十一说从 ${from} 起每天自动念。`);
} else if (process.argv.includes("--stop")) {
  const n = (await sql`DELETE FROM settings WHERE key = 'reference.voice'`).count;
  console.log(n ? "停了：明天起不再自动念；已放上的音频照旧。" : "本来就没开。");
}

const no = Number(tryNo ?? putNo);
if (no) {
  const [writer, checker] = await Promise.all([modelFor(ISSUE_STEP), modelFor(ISSUE_CHECK_STEP)]);
  const receipts: number[] = [];
  const ask = { write: modelAsk(writer, `voice:${no}`, receipts), check: modelAsk(checker, `voice:${no}`, receipts) };
  const out = tryNo ? path.join(config.dataDir, "reference", "audio", "tries", String(no)) : undefined;
  const report = await voiceIssue(no, ask, { dryRun: Boolean(tryNo), out });
  if (receipts.length) await sql.begin(async (tx) => { for (const id of receipts) await completeReceipt(tx, id); });
  console.log(JSON.stringify(report, null, 1));
  if (out) console.log(`听稿和 mp3：${out}`);
}

const missing = await voiceMissing();
if (missing.length) console.log(`还缺：${missing.join("；")}（缺了不会念，也不花钱）`);
if (hearNo) console.log(JSON.stringify(await hearIssue(Number(hearNo)), null, 1));

const [setting] = await sql<{ value: { from?: string } }[]>`SELECT value FROM settings WHERE key = 'reference.voice'`;
console.log(`自动念：${setting?.value.from ? `从 ${setting.value.from} 起` : "关着"}`);
for (const { no: n, date } of await sql<{ no: number; date: string }[]>`
  SELECT no, to_char(date, 'YYYY-MM-DD') AS date FROM reference_issues WHERE status = 'issue' ORDER BY no DESC LIMIT 5`) {
  const audio = await issueAudio(n);
  const report = await voiceReport(n);
  console.log(`第 ${n} 期（${date}）：${audio ? `有音频 ${audio.seconds} 秒${audio.transcript ? `，文字稿 ${audio.transcript.length} 行` : "，没有文字稿"}` : "没有音频"}${report ? `；上次自动念：${report.status}，念了 ${report.reads?.length ?? 0} 次` : ""}`);
}
await closeDb();
