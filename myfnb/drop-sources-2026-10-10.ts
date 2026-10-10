// 2026-10-10：本站从上线第一天起按商业站运营（用户 10/10），同一天补查了全部来源的条款（节目方自己的和托管平台的）。
// myfnb/dropped-sources-2026-10-10.tsv 里的来源停用（后台「信源」里可以恢复），它们已公开的条目下架（走后台同一个下架函数，
// 可以恢复；节目方书面同意后恢复），还没分析的条目不再处理；故事有变动的情况随后重新归并。
// 不带参数只数条数；--apply 执行，可以重复跑。
//   sudo docker compose exec -T -u root worker node myfnb/drop-sources-2026-10-10.ts [--apply]
import { readFileSync } from "node:fs";
import { setVisibility } from "@aihot/backend/admin/content";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { SERVER_MODULES } from "@aihot/site/modules/server";
import { groupSituation, situationsToGroup } from "../modules/reference/backend/methods.ts";
import { membersBySituation } from "../modules/reference/backend/read.ts";
import { SITUATIONS } from "../modules/reference/situations.ts";

installModules(SERVER_MODULES);
const apply = process.argv.includes("--apply");
const rows = readFileSync(new URL("./dropped-sources-2026-10-10.tsv", import.meta.url), "utf8").split(/\r?\n/)
  .filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.split("\t") as [string, string, string]);
const ids = rows.map((r) => r[0]);
const reasonOf = new Map(rows.map((r) => [r[0], `${r[1]}：${r[2]}`.slice(0, 180)]));

const [sources] = await sql<{ known: number; enabled: number }[]>`
  SELECT count(*)::int AS known, count(*) FILTER (WHERE enabled)::int AS enabled FROM sources WHERE id IN ${sql(ids)}`;
const items = await sql<{ article_id: string; source_id: string; selected: boolean }[]>`
  SELECT article_id, source_id, selected FROM publications WHERE source_id IN ${sql(ids)} AND visibility <> 'withdrawn'`;
const [stories] = await sql<{ n: number }[]>`
  SELECT count(*)::int AS n FROM reference_cases c JOIN articles a ON a.id = c.article_id WHERE a.source_id IN ${sql(ids)} AND c.status = 'story'`;
console.log(`清单 ${ids.length} 个来源：数据库里有 ${sources!.known} 个，还开着 ${sources!.enabled} 个；没下架的条目 ${items.length} 条（入选 ${items.filter((i) => i.selected).length}），显示的故事 ${stories!.n} 篇`);

if (apply) {
  const [paused] = await sql<{ n: number }[]>`
    WITH p AS (UPDATE sources SET enabled = false, health = 'paused', updated_at = now() WHERE id IN ${sql(ids)} AND enabled RETURNING id)
    SELECT count(*)::int AS n FROM p`;
  const [skipped] = await sql<{ n: number }[]>`
    WITH s AS (
      UPDATE articles a SET processing_state = 'skipped', processing_queued_at = NULL, processing_retry_at = NULL
      WHERE a.source_id IN ${sql(ids)} AND a.processing_state IN ('new', 'failed')
        AND NOT EXISTS (SELECT 1 FROM analyses n WHERE n.article_id = a.id) RETURNING a.id)
    SELECT count(*)::int AS n FROM s`;
  console.log(`已停用 ${paused!.n} 个来源，${skipped!.n} 条还没分析的条目不再处理`);
  let done = 0;
  for (const item of items) {
    const [o] = await sql<{ version: number }[]>`SELECT version FROM editorial_overrides WHERE article_id = ${item.article_id}`;
    await setVisibility(item.article_id, { visibility: "withdrawn", reason: reasonOf.get(item.source_id) ?? "来源条款不允许", version: o?.version ?? 0 }, "drop-sources-2026-10-10");
    if (++done % 100 === 0) console.log(`已下架 ${done}/${items.length}`);
  }
  console.log(`已下架 ${done} 条`);
  for (const [slug, members] of await situationsToGroup(await membersBySituation(), SITUATIONS.length)) {
    try {
      const result = await groupSituation(slug, members);
      console.log(`${slug}: ${members.length} 篇，${result?.stored ? "已归并" : `未通过：${result?.problems.slice(0, 2).join("；")}`}`);
    } catch (error) {
      console.log(`${slug}: ${members.length} 篇，出错：${String(error).slice(0, 120)}`);
    }
  }
}
await stopBoss();
await closeDb();
