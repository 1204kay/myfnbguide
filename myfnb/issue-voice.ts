// 十一说念出来的开、停和试念一期（modules/reference/backend/voice.ts；声音用阿里云，Kay 11-01 18:36）。
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
//   sudo docker compose exec -T worker node myfnb/issue-voice.ts --write 5           照现在的写法写一份第 5 期的听稿，照每天那样核对，不念、不放上网站，
//                                                                                    写到 /data/reference/audio/writes/5/write.txt，核对记录 check.json，旁边放线上的 5.txt 为 up.txt（DeepSeek 几分钱加一次核对）
//   --try 和 --put 后面可加：--script <听稿 txt>：念已经核过、上过线的听稿（例如这一期自己的 N.txt），不再写、不再核、不查字数上限（不花 Claude API；11-01 第 1–7 期照线上原稿重念、不重写，Kay 22:37「原稿超过上限的照原长念」）；
//   --voice <声音>、--model <模型> 换一个声音或模型（默认 voice.ts 的 VOICE 一行）、--style "……" 加一句语气。
//   新加坡区能用的普通话女声：longanhuan_v3.1、longanlingxin_v3.1、longanfengyue_v3.1
//   sudo docker compose exec -T worker node myfnb/issue-voice.ts --times 7           给已放上的第 7 期补上每行的开始时间（文字稿跟着声音走），
//                                                                                    只听一遍 mp3（Groq 免费档），不念，只改 7.json
//   sudo docker compose exec -T worker node myfnb/issue-voice.ts --pauses 7          给已放上的第 7 期补上停顿（文字稿只在说话时走字，每行从声音进来处开始），
//                                                                                    只读 mp3，不转写、不念、不花钱，只改 7.json；--pauses all 补全部有音频的期
//   sudo docker compose exec -T worker node myfnb/issue-voice.ts --put-try 8         把 --try 8 留下、机器核对通过的那份放上网站（mp3、听稿、每行开始时间、停顿），
//                                                                                    不再念、不花钱；要这次改动部署之后试念的才有核对记录
// 花钱的：听稿用 DeepSeek 写（几分钱）、用核对模型核（Claude API 免费额度）；声音用阿里云（免费额度用完后每念一次约 US$0.07–0.1），一期最多念 6 次。
import { readFile } from "node:fs/promises";
import path from "node:path";
import { closeDb, sql } from "@aihot/backend/db";
import { config } from "@aihot/backend/config";
import { modelFor } from "@aihot/backend/editorial/models";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { installModules } from "@aihot/backend/modules";
import { SERVER_MODULES } from "@aihot/site/modules/server";
import { ISSUE_CHECK_STEP, ISSUE_STEP, modelAsk } from "../modules/reference/backend/issue.ts";
import { issueAudio } from "../modules/reference/backend/audio.ts";
import { hearIssue, pauseIssue, putTry, timeIssue, voiceIssue, writeOnly, voiceMissing, voiceReport } from "../modules/reference/backend/voice.ts";

// modelFor knows a module's steps only once the modules are installed.
installModules(SERVER_MODULES);

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const from = arg("--from");
const tryNo = arg("--try");
const putNo = arg("--put");
const hearNo = arg("--hear");
const writeNo = arg("--write");
const timesNo = arg("--times");
const pausesNo = arg("--pauses");
const putTryNo = arg("--put-try");
if (pausesNo !== undefined && pausesNo !== "all" && !/^[1-9]\d*$/u.test(pausesNo)) throw new Error("--pauses 要一个期号或 all");
const voice = arg("--voice");
if (voice !== undefined && !/^[A-Za-z0-9_.]+$/u.test(voice)) throw new Error("--voice 要一个声音名，例如 longanhuan_v3.1");
const model = arg("--model");
if (model !== undefined && !/^[a-z0-9.-]+$/u.test(model)) throw new Error("--model 要一个模型名，例如 qwen-audio-3.1-tts-plus");
const style = arg("--style");
const scriptFile = arg("--script");
if (from !== undefined && !/^\d{4}-\d{2}-\d{2}$/u.test(from)) throw new Error("--from 要一个日期，例如 2026-11-01");
for (const n of [tryNo, putNo, hearNo, timesNo, putTryNo]) if (n !== undefined && !/^[1-9]\d*$/u.test(n)) throw new Error("要一个期号，例如 8");

// One real-time task an issue (readStream), about 14 requests when it falls back to a few lines each (readGroups), six readings at most: the breaker stops a runaway loop.
// Only this module's own row; Groq's `transcribe` row is archive's, and an operator adds it in the admin.
if (from || tryNo || putNo) {
  await sql`INSERT INTO budgets (service, per_minute, per_hour, per_day, note)
    VALUES ('speech-qwen', 60, 200, 400, '十一说念稿（阿里云 Qwen，一行一次，一期约 30 行）') ON CONFLICT (service) DO NOTHING`;
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
  const script = scriptFile ? await readFile(scriptFile, "utf8") : undefined;
  const report = await voiceIssue(no, ask, { dryRun: Boolean(tryNo), out, voice, style, model, script });
  if (receipts.length) await sql.begin(async (tx) => { for (const id of receipts) await completeReceipt(tx, id); });
  console.log(JSON.stringify(report, null, 1));
  if (out) console.log(`听稿和 mp3：${out}`);
}

if (writeNo) {
  const [writer, checker] = await Promise.all([modelFor(ISSUE_STEP), modelFor(ISSUE_CHECK_STEP)]);
  const receipts: number[] = [];
  const done = await writeOnly(Number(writeNo), modelAsk(writer, `voice-write:${writeNo}`, receipts), modelAsk(checker, `voice-write:${writeNo}`, receipts));
  if (receipts.length) await sql.begin(async (tx) => { for (const id of receipts) await completeReceipt(tx, id); });
  console.log(`第 ${writeNo} 期试写 ${done.chars} 字、${done.lines} 行，核对 ${done.rounds} 轮${done.passed ? "，过了" : "，没过，write.txt 没动（问题在 check.json）"}：${done.out}`);
}

const missing = await voiceMissing();
if (missing.length) console.log(`还缺：${missing.join("；")}（缺了不会念，也不花钱）`);
if (hearNo) console.log(JSON.stringify(await hearIssue(Number(hearNo)), null, 1));
if (pausesNo) {
  const nos = pausesNo === "all"
    ? (await sql<{ no: number }[]>`SELECT no FROM reference_issues WHERE status = 'issue' ORDER BY no`).map((r) => r.no)
    : [Number(pausesNo)];
  for (const n of nos) {
    const times = await pauseIssue(n).catch(() => null);
    console.log(times ? `第 ${n} 期补上了 ${times.pauses.length} 处停顿，${times.starts.length} 行的开始时间对到声音进来处。` : `第 ${n} 期没有音频或没有每行时间，没有改。`);
  }
}
if (putTryNo) {
  const put = await putTry(Number(putTryNo), path.join(config.dataDir, "reference", "audio", "tries", putTryNo));
  console.log("refused" in put ? `第 ${putTryNo} 期没有放上：${put.refused}` : `第 ${putTryNo} 期的试念放上了：${put.seconds} 秒，${put.lines} 行，文字稿跟着声音走。`);
}
if (timesNo) {
  const starts = await timeIssue(Number(timesNo));
  console.log(starts ? `第 ${timesNo} 期补上了 ${starts.length} 行的开始时间，最后一行 ${starts.at(-1)} 秒。` : `第 ${timesNo} 期对不上一半，没有写。`);
}

const [setting] = await sql<{ value: { from?: string } }[]>`SELECT value FROM settings WHERE key = 'reference.voice'`;
console.log(`自动念：${setting?.value.from ? `从 ${setting.value.from} 起` : "关着"}`);
for (const { no: n, date } of await sql<{ no: number; date: string }[]>`
  SELECT no, to_char(date, 'YYYY-MM-DD') AS date FROM reference_issues WHERE status = 'issue' ORDER BY no DESC LIMIT 5`) {
  const audio = await issueAudio(n);
  const report = await voiceReport(n);
  console.log(`第 ${n} 期（${date}）：${audio ? `有音频 ${audio.seconds} 秒${audio.transcript ? `，文字稿 ${audio.transcript.length} 行` : "，没有文字稿"}` : "没有音频"}${report ? `；上次自动念：${report.status}，念了 ${report.reads?.length ?? 0} 次` : ""}`);
}
await closeDb();
