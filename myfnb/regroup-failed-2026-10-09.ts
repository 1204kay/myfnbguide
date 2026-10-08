// 2026-10-09：归组失败的条目重新归组。10/2–10/8 归组用的向量（Google AI Studio 免费层）额度被播客转写用完，返回 429，
// 或者返回的结果缺 index，几乎每条都归组失败（7 天 292 条里 269 条）；入选要先确认是哪件事，这些条目因此一直没进精选、
// 没写收录理由。服务器改成不配向量以后（框架改按文字比对，HANDOFF §4「向量模型」），在这里把失败的条目排进归组队列。
// 先不带参数跑一次，只数条数；看过以后加 --apply 执行。可以重复跑：归组完成的不再列出，排过还没跑的不会重复排。
//   sudo docker compose exec -T -u root worker node myfnb/regroup-failed-2026-10-09.ts
//   sudo docker compose exec -T -u root worker node myfnb/regroup-failed-2026-10-09.ts --apply
import { closeDb, sql } from "@aihot/backend/db";
import { enqueue, QUEUES, stopBoss } from "@aihot/backend/jobs/queue";
import { embeddingsAvailable } from "@aihot/backend/providers/embeddings";

const apply = process.argv.includes("--apply");
if (embeddingsAvailable()) {
  console.log("向量还开着（EMBEDDING_API_KEY 或 DASHSCOPE_API_KEY 仍在 .env 里）：先按说明改 .env、重建 api 和 worker，再跑这个脚本。");
} else {
  const rows = await sql<{ id: string; backfill: boolean; candidate: boolean }[]>`
    SELECT a.id, a.backfill, coalesce(p.selection_candidate, false) AS candidate
    FROM articles a LEFT JOIN publications p ON p.article_id = a.id
    WHERE a.grouping_status = 'failed' ORDER BY a.discovered_at`;
  const candidates = rows.filter((r) => r.candidate).length;
  const backfill = rows.filter((r) => r.backfill).length;
  console.log(`归组失败 ${rows.length} 条：其中够格入选 ${candidates} 条，存档补进来的 ${backfill} 条${apply ? "" : "（预览）"}`);
  if (apply) {
    let queued = 0;
    for (const r of rows) if (await enqueue(QUEUES.group, { articleId: r.id }, { singletonKey: `retry:group:${r.id}` })) queued += 1;
    console.log(`已排进归组队列 ${queued} 条（已在队列里的不重复排）；worker 会逐条处理，几分钟到几十分钟。`);
  }
}
await stopBoss();
await closeDb();
