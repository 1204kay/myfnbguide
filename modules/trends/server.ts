// The weekly trends' backend (Kay 10-24): after each weekly report, one job finds what 3 or more sources told that
// week and writes it up (backend/compose.ts); the api answers its page and the line under the weekly (backend/read.ts).
import { config } from "@aihot/backend/config";
import { sql } from "@aihot/backend/db";
import { defineQueue, defineServerModule } from "@aihot/backend/modules";
import { enqueueOn } from "@aihot/backend/jobs/queue";
import { composeWeek, TRENDS_STEP, weekToCompose } from "./backend/compose.ts";
import { readIssue, readWeekLine } from "./backend/read.ts";

const WEEKS = defineQueue<{ key: string; start: string; end: string }>({
  name: "trends.week",
  // One retry for a model that failed; the checks on every sentence take a while.
  options: { policy: "short", retryLimit: 1, retryDelay: 600, expireInSeconds: 2 * 3600 },
  worker: { localConcurrency: 1, pollingIntervalSeconds: 30 },
  run: async (jobs) => { for (const { key, start, end } of jobs) await composeWeek(key, start, end); },
});

// On only while the settings row `trends.on` is there (十一 10-24: it goes live once a trial matched the handbook's
// sample, myfnb/trends-trial.ts), so a merge does not start it and stopping needs no deploy.
// Start: INSERT INTO settings (key, value) VALUES ('trends.on', '{}'). Stop: DELETE FROM settings WHERE key = 'trends.on'.
async function on(): Promise<boolean> {
  return (await sql`SELECT 1 FROM settings WHERE key = 'trends.on'`).length > 0;
}

/** Shared caches keep a page as long as the engine keeps its topic pages: a minute. */
const CACHE = "public, max-age=60, stale-while-revalidate=60";
const WEEK = /^\d{4}-W\d{2}$/;

export default defineServerModule({
  name: "trends",
  models: {
    [TRENDS_STEP]: { label: "每周趋势（读一周的全部条目，找出 3 家以上来源讲到的同一个东西、再逐条补齐讲到它的条目，每条写一句；每句再交核对员）", env: "TRENDS_MODEL", purposes: ["trends_find", "trends_gather", "trends_write"] },
  },
  queues: [WEEKS],
  schedules: [{
    // The weekly comes out on Monday at EDITION_TIMES.weekly (10:00); every half hour after that until it is done.
    name: "trends.week",
    cron: "*/30 10-23 * * 1",
    run: async () => {
      if (!config.modelCallsEnabled) return { queued: 0, reason: "model calls are off" };
      if (!(await on())) return { queued: 0, reason: "trends are not on (settings trends.on)" };
      const week = await weekToCompose();
      if (!week) return { queued: 0 };
      await enqueueOn(WEEKS, week, { singletonKey: week.key });
      return { queued: 1, key: week.key };
    },
  }],
  http: (app) => {
    app.get("/api/trends/:key", async (req, reply) => {
      const key = (req.params as { key: string }).key;
      const page = WEEK.test(key) ? await readIssue(key) : null;
      return page ? reply.header("Cache-Control", CACHE).send(page) : reply.code(404).send({ error: "not found" });
    });
    // The line under a weekly (web/report-part.tsx): 404 for a week with nothing.
    app.get("/api/trends/:key/line", async (req, reply) => {
      const key = (req.params as { key: string }).key;
      const line = WEEK.test(key) ? await readWeekLine(key) : null;
      return line ? reply.header("Cache-Control", CACHE).send(line) : reply.code(404).send({ error: "not found" });
    });
  },
});
