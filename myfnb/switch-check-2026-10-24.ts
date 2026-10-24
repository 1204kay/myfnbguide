// 2026-10-24：核对员换成 deepseek-flash（十一 10-24 定：3 条新条目试跑过了就换；flash 拿不出结果时同一份稿由
// site/models.ts 的 CHECK_BACKUP 再核，PR #57）。和后台「模型与评测」页的切换是同一个函数，留审计记录；
// 换回去在那一页点「恢复默认」，或者这里带 --back。
// 不带参数只打出现在用的是哪个；--apply 换成 flash；--back 换回默认（Pro）。
//   sudo docker compose run --rm -T -v <检出>/myfnb:/app/myfnb:ro worker node myfnb/switch-check-2026-10-24.ts [--apply | --back]
import { switchModel } from "@aihot/backend/admin/models";
import { closeDb } from "@aihot/backend/db";
import { modelSources } from "@aihot/backend/editorial/models";
import { stopBoss } from "@aihot/backend/jobs/queue";

const ACTOR = "讨论串 MYFNB 读者为什么想点开（十一 10-24 定）";
const args = process.argv.slice(2);
console.log("现在：", (await modelSources()).check);
if (args.includes("--apply")) console.log("换成：", (await switchModel("check", "deepseek-flash-think-llm", "3 条新条目试跑过了，核对员换 flash，拿不出结果时由 Pro 再核（十一 10-24）", ACTOR)).after);
else if (args.includes("--back")) console.log("换回：", (await switchModel("check", null, "换回默认核对员", ACTOR)).after);
else console.log("只打出，没有换；换用 --apply，换回用 --back。");
await stopBoss();
await closeDb();
