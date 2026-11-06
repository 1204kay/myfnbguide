// 日报正文「整天一起挑」的后端（Kay 10-26）：日报出刊时，正文由模型从当天加前两天还没上过的事件里一起挑（backend/pick.ts），
// 经框架的 dailyPick 插口（packages/backend/src/modules.ts）；简讯和其他照原版。不装这个模块，日报就是原版的规则排法。
// 挑进来的多数没入选，原版不给它们写原文要点；出刊后给这些条目补写（backend/points.ts，Kay 11-06「你们决定吧」）。
import { config } from "@aihot/backend/config";
import { enqueueOn } from "@aihot/backend/jobs/queue";
import { defineQueue, defineServerModule } from "@aihot/backend/modules";
import { beijingDate } from "@aihot/contracts/time";
import { PICK_DAYS, PICK_PURPOSE, PICK_STEP, pickDaily } from "./backend/pick.ts";
import { pointsFindings, waitingPoints, writeWaiting } from "./backend/points.ts";

// 一个任务把等着的逐条写完；同一时间只跑一个，出错整批重试一次。
const POINTS = defineQueue<{ at: string }>({
  name: "dailypick.points",
  options: { policy: "short", retryLimit: 1, retryDelay: 600, expireInSeconds: 3600 },
  worker: { localConcurrency: 1, pollingIntervalSeconds: 10 },
  run: async (jobs) => { for (const _ of jobs) await writeWaiting(); },
});

export default defineServerModule({
  name: "dailypick",
  models: {
    [PICK_STEP]: { label: "日报正文（当天加前两天还没上过的事件一起交给模型，挑出最多 12 条）", env: "DAILY_PICK_MODEL", purposes: [PICK_PURPOSE] },
  },
  dailyPick: { days: PICK_DAYS, run: pickDaily },
  queues: [POINTS],
  schedules: [{
    // 08:00 出刊之后每半小时看一次，到中午；写要点和核对用的是入选那条路的两个模型（understand、check），不另设模型。
    name: "dailypick.points",
    cron: "15,45 8-11 * * *",
    run: async () => {
      if (!config.modelCallsEnabled) return { queued: 0, reason: "model calls are off" };
      const waiting = await waitingPoints(undefined, 1);
      if (!waiting.length) return { queued: 0, reason: "nothing waiting" };
      const at = new Date().toISOString().slice(0, 16);
      await enqueueOn(POINTS, { at }, { singletonKey: beijingDate(new Date()) });
      return { queued: 1, at };
    },
  }],
  alerts: async (now) => (await pointsFindings(now)).filter((f) => f.level !== "later"),
  followUps: async (now) => (await pointsFindings(now)).filter((f) => f.level === "later"),
});
