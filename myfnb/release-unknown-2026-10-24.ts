// 2026-10-24：后台「运行」页一直挂着 18 张结果未知的回执，全是 prefilter_article（deepseek-flash），10-02 两张、10-15 十六张，
// 都是 DeepSeek 忙时 120 秒超时，自动放行过一次又超时，就一直等人工。放行后各自的条目（14 条停在 failed）回到处理队列再跑一次。
// 是否计费没法逐张核（DeepSeek 后台不按请求列账）；超时没拿到回复，按未计费记，备注写明没核过。十一 10-24 定放行。
// 不带参数只列出来；--apply 放行。
//   sudo docker compose run --rm -T -v <检出>/myfnb:/app/myfnb:ro worker node myfnb/release-unknown-2026-10-24.ts [--apply]
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { releaseReceipt } from "@aihot/backend/operations/recover";

const apply = process.argv.includes("--apply");
const ACTOR = "讨论串 MYFNB 读者为什么想点开（十一 10-24 定）";
const NOTE = "10-02/10-15 DeepSeek 忙时 120 秒超时，没拿到回复，按未计费记；DeepSeek 后台不按请求列账，没有逐张核";

const rows = await sql<{ id: number; purpose: string; subject: string | null; created_at: Date }[]>`
  SELECT id, purpose, subject, created_at FROM receipts WHERE status = 'unknown' ORDER BY id`;
console.log(`结果未知的回执 ${rows.length} 张`);
let requeued = 0;
for (const r of rows) {
  if (r.purpose !== "prefilter_article") { console.log(`${r.id} ${r.purpose} 不是 prefilter，跳过`); continue; }
  if (!apply) { console.log(`${r.id} ${r.purpose} ${r.subject} ${r.created_at.toISOString()}`); continue; }
  const done = await releaseReceipt(r.id, { billed: false, note: NOTE }, ACTOR);
  if (done?.requeued) requeued += 1;
  console.log(`${r.id} 放行${done?.requeued ? "，条目回到队列" : ""}`);
}
console.log(apply ? `\n已放行；${requeued} 条条目回到处理队列。` : "\n只列出，没有放行；放行用 --apply。");
await stopBoss();
await closeDb();
