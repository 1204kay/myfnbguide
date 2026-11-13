// Two things that went wrong with nobody told (11-13 audit): a module's queue job that used up its retries stays in
// pgboss.job as failed, and the engine's alerts read only jobs that wait (operations/alerts.ts waitingQueues) and the
// schedules' own runs (job_runs: the run that queued the job is "ok"). 11-09 the weekly trends failed eight times
// and 11-07 the 05:00 十一说 once; both were found four days later, by reading the queue. And a day whose 十一说 is not
// written by the time it should be read aloud leaves the daily to lead by rule, silently.
// The alerts go where the site's own do (gate.sh `alerts`, read by css-cloud's site-watch).
import { sql } from "@aihot/backend/db";
import { serverModules } from "@aihot/backend/modules";
import type { Finding } from "@aihot/backend/notify/feishu";
import { beijingAt, beijingDate } from "@aihot/contracts/time";

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
