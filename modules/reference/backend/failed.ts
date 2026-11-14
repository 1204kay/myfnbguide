// Two things that went wrong with nobody told (11-13 audit): a module's queue job that used up its retries stays in
// pgboss.job as failed, and the engine's alerts read only jobs that wait (operations/alerts.ts waitingQueues) and the
// schedules' own runs (job_runs: the run that queued the job is "ok"). 11-09 the weekly trends failed eight times
// and 11-07 the 05:00 十一说 once; both were found four days later, by reading the queue. And a day whose 十一说 is not
// written by the time it should be read aloud leaves the daily to lead by rule, silently. And a day whose 十一说 is up
// with no audio by the daily (11-14 audit): issue 18's listen script failed, nothing ran again, and nobody knew until
// the 11-13 trial read its report.
// The alerts go where the site's own do (gate.sh `alerts`, read by css-cloud's site-watch).
import { sql } from "@aihot/backend/db";
import { serverModules } from "@aihot/backend/modules";
import type { Finding } from "@aihot/backend/notify/feishu";
import { beijingAt, beijingDate } from "@aihot/contracts/time";
import { EDITION_TIMES } from "@aihot/site";
import { issueAudio } from "./audio.ts";
import { MAX_READS, voiceReport, type VoiceReport } from "./voice.ts";

/** What each queue does, in the words Kay reads; a queue not named here is shown by its name. */
const WORK: Record<string, string> = {
  "reference.issue": "十一说写稿", "reference.voice": "十一说朗读", "reference.place": "参考页放进情况", "reference.topic": "参考页综合整理",
  "trends.week": "每周趋势", "archive.transcribe": "存档转写", "dailypick.points": "原文要点补写",
};
/** A failure is told for a day: by then it was looked at, or the next run failed too and tells it again. */
const TOLD_FOR_HOURS = 24;

export function failedFinding(name: string, n: number, first: Date, error: string | null): Finding {
  return {
    key: `modules.failed.${name}`,
    level: "today",
    title: `后台任务失败：${WORK[name] ?? name}`,
    impact: `过去 ${TOLD_FOR_HOURS} 小时失败 ${n} 次（重试也已用完），这一次的结果没有产出`,
    heals: "下一次定时会再试；同一个原因会再失败",
    action: "看失败原因，改好后等下一次定时或手动补跑",
    detail: `队列 ${name}${error ? `；最近一次：${error.slice(0, 200)}` : ""}`,
    since: first,
  };
}

/** The site's modules' queue jobs that failed for good in the last day, one finding a queue. */
export async function failedJobAlerts(): Promise<Finding[]> {
  const names = serverModules().flatMap((m) => m.queues ?? []).map((q) => q.name);
  if (!names.length) return [];
  const rows = await sql<{ name: string; n: number; first: Date; error: string | null }[]>`
    SELECT name, count(*)::int AS n, min(completed_on) AS first,
      (array_agg(coalesce(output->>'message', output::text) ORDER BY completed_on DESC))[1] AS error
    FROM pgboss.job WHERE state = 'failed' AND name IN ${sql(names)} AND completed_on > now() - make_interval(hours => ${TOLD_FOR_HOURS})
    GROUP BY name ORDER BY name`;
  return rows.map((r) => failedFinding(r.name, r.n, r.first, r.error));
}

/** From when a day without an issue is told. A run still going then (a slow first try, its retry) is waited for: see below. */
export const ISSUE_DUE = "06:30";

/** The day's 十一说 is on (settings reference.issues) and has no row by ISSUE_DUE: nothing was written, not even a thin day's row. */
export async function missingIssueAlerts(now: number): Promise<Finding[]> {
  const date = beijingDate(new Date(now));
  if (now < beijingAt(date, ISSUE_DUE).getTime()) return [];
  const [on] = await sql<{ from: string | null }[]>`SELECT value->>'from' AS from FROM settings WHERE key = 'reference.issues'`;
  if (!on?.from || date < on.from) return [];
  if ((await sql`SELECT 1 FROM reference_issues WHERE date = ${date}`).length) return [];
  // The day's job may still be writing (it has three hours, and a second try): told only once none is waiting or running.
  if ((await sql`SELECT 1 FROM pgboss.job WHERE name = 'reference.issue' AND state IN ('created', 'retry', 'active') AND data->>'date' = ${date}`).length) return [];
  return [{
    key: `reference.issue-missing.${date}`,
    level: "now",
    title: `今天（${date}）的十一说没有写出来`,
    impact: "08:00 的日报没有十一说，头条照规则排；当天的十一说页面和音频都没有",
    heals: "不会自动恢复：每天只在 05:00 写一次",
    action: `补写：node myfnb/issue-now.ts；08:00 以后补的再跑 node myfnb/issue-now.ts --lead ${date} 放上日报头条`,
    detail: "reference_issues 没有这一天的行；失败原因看「后台任务失败：十一说写稿」那一条或 worker 日志",
  }];
}

/**
 * What became of the day's reading, in the words Kay reads. "not ready" is not written to the report (voice.ts
 * readIssue), so a day without the key shows as none; it is here for a report that says so all the same.
 */
const NO_AUDIO: Record<VoiceReport["status"] | "none", string> = {
  none: "还没有开始念",
  "not ready": "念稿缺钥匙或预算行",
  error: "念的时候出错",
  "check failed": "念了，没过机器核对",
  "script failed": "听稿没写成",
  "too long": "听稿太长，没有念",
  "no reads left": `念了 ${MAX_READS} 次都没过机器核对`,
  tried: "只试念过，没有放上",
  up: "报告说放上了，但网站上没有音频文件",
};

/**
 * Whether a later run this morning reads it again: as server.ts queueVoice decides, no report or one that ended in
 * error or a failed check, with readings left.
 */
const readsAgain = (report: VoiceReport | null) =>
  (!report || report.status === "error" || report.status === "check failed") && (report?.tries ?? 0) < MAX_READS;

/**
 * The day's 十一说 is up and read aloud is on (settings reference.voice), and by the daily (08:00) it has no audio: Kay
 * 11-11 08:13 「八点两个都要同时」. Told, not read again: what to do depends on why (the report's status), and only
 * the runs left this morning read again by themselves.
 */
export async function noAudioAlerts(now: number): Promise<Finding[]> {
  const date = beijingDate(new Date(now));
  if (now < beijingAt(date, EDITION_TIMES.daily).getTime()) return [];
  const [on] = await sql<{ from: string | null }[]>`SELECT value->>'from' AS from FROM settings WHERE key = 'reference.voice'`;
  if (!on?.from || date < on.from) return [];
  const [row] = await sql<{ no: number }[]>`SELECT no FROM reference_issues WHERE date = ${date} AND status = 'issue'`;
  if (!row || await issueAudio(row.no)) return [];
  const report = await voiceReport(row.no);
  return [{
    key: `reference.audio-missing.${date}`,
    level: "today",
    title: `今天（${date}）的十一说第 ${row.no} 期没有音频：${NO_AUDIO[report?.status ?? "none"]}`,
    impact: "网页、日报头条照常有十一说，但没有「听」，播客订阅源里也没有这一期",
    heals: readsAgain(report) ? "上午每到 :20、:50 还会再念一次（最后一次 09:50），过了核对就自动放上" : "不会自动恢复：今天不会再念",
    action: `看 ${row.no}.voice.json 里的原因；补念：node myfnb/issue-voice.ts --put ${row.no}（念、核、过了就放上）`,
    detail: `报告状态：${report?.status ?? "没有报告"}；念了 ${report?.tries ?? 0} 次${report?.error ? `；${report.error.slice(0, 200)}` : ""}`,
  }];
}
