// 日报正文「整天一起挑」的后端（Kay 10-26）：日报出刊时，正文由模型从当天加前两天还没上过的事件里一起挑（backend/pick.ts），
// 经框架的 dailyPick 插口（packages/backend/src/modules.ts）；简讯和其他照原版。不装这个模块，日报就是原版的规则排法。
import { defineServerModule } from "@aihot/backend/modules";
import { PICK_DAYS, PICK_PURPOSE, PICK_STEP, pickDaily } from "./backend/pick.ts";

export default defineServerModule({
  name: "dailypick",
  models: {
    [PICK_STEP]: { label: "日报正文（当天加前两天还没上过的事件一起交给模型，挑出最多 12 条）", env: "DAILY_PICK_MODEL", purposes: [PICK_PURPOSE] },
  },
  dailyPick: { days: PICK_DAYS, run: pickDaily },
});
