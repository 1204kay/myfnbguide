// 2026-10-10：规矩改了，按旧规矩存下的状态没跟着改（全项目检查）。这里按今天的规矩补一次，各步都走框架和模块自己的流程：
// ① 参考库 10/9 起只有硬伤（原文里找不到的数字、坏掉的输出、不存在的情况）挡下故事和正文，之前挡下、写好了文字的照今天的规矩
//    改成显示（只改状态，不调模型）；② 之前挡下时连文字都没存下的（某一块超长就丢掉整份回答），按现行写法再写一次；
// ③ 交回处理（处理状态改回 new，worker 每 5 分钟一次的补漏重新排队，和 rejudge-2026-10-03.sql 同一条路）：今天改预筛之前被
//    旧预筛挡下的、10/3 降门槛之前按旧门槛判的（来源开着的），以及 10/9 以前判过、只有简介、仍公开列出的（这类重新处理后导读
//    留空，从列表下来）；④ 下架已停用的 Substack 来源（规则 3：整个平台不接）仍公开的条目；⑤ 存档状态里删掉已撤出存档的
//    未来食堂日記；⑥ 做法归并从今天起只有硬伤才整组不存（methods.ts），之前因为长度、用词没通过的情况再归并一次，
//    故事有变动的情况也马上重新归并。
// 不带参数只数条数；看过以后加 --apply 执行。第 ② 步每篇最多调用四次模型，第 ③ 步每条约三四次（由 worker 慢慢处理）。
//   sudo docker compose exec -T -u root worker node myfnb/catch-up-2026-10-10.ts
//   sudo docker compose exec -T -u root worker node myfnb/catch-up-2026-10-10.ts --apply
import { setVisibility } from "@aihot/backend/admin/content";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { SERVER_MODULES } from "@aihot/site/modules/server";
import { selectedCondition } from "@aihot/backend/publication/scope";
import { blocking } from "../modules/reference/backend/checks.ts";
import { writeBody } from "../modules/reference/backend/body.ts";
import { groupSituation, situationsToGroup } from "../modules/reference/backend/methods.ts";
import { membersBySituation } from "../modules/reference/backend/read.ts";
import { writeCase } from "../modules/reference/backend/write.ts";
import { SITUATIONS } from "../modules/reference/situations.ts";

installModules(SERVER_MODULES);
const apply = process.argv.includes("--apply");
const known = new Set(SITUATIONS.map((s) => s.slug));
const now = new Date();

// ① Held with text and no blocking problem.
const held = await sql<{ article_id: string; story: { placements: Array<{ situation: string }> } | null; problems: string[] }[]>`
  SELECT article_id, story, problems FROM reference_cases WHERE status = 'held'`;
const release = held.filter((c) => c.story && !c.problems.some(blocking) && c.story.placements.length > 0
  && c.story.placements.every((p) => known.has(p.situation)));
const heldBodies = await sql<{ article_id: string; body: unknown; problems: string[] }[]>`
  SELECT article_id, body, problems FROM reference_bodies WHERE status = 'held'`;
const releaseBodies = heldBodies.filter((b) => b.body && !b.problems.some(blocking));
console.log(`① 显示：故事 ${release.length} / ${held.length}，正文 ${releaseBodies.length} / ${heldBodies.length}`);

// ② Held with no text kept: the selected items' cases, the listed items' write-ups.
const casesToWrite = (await sql<{ id: string }[]>`
  SELECT c.article_id AS id FROM reference_cases c JOIN publications p ON p.article_id = c.article_id
  WHERE c.status = 'held' AND c.story IS NULL AND ${selectedCondition(now)}`).map((r) => r.id);
const bodiesToWrite = (await sql<{ id: string }[]>`
  SELECT b.article_id AS id FROM reference_bodies b JOIN publications p ON p.article_id = b.article_id
  WHERE b.status = 'held' AND b.body IS NULL AND p.visibility = 'public' AND p.eligible`).map((r) => r.id);
console.log(`② 重写：故事 ${casesToWrite.length}，正文 ${bodiesToWrite.length}`);

// ③ Back to processing, by the latest analysis of each article.
const requeue = await sql<{ why: string; n: number }[]>`
  WITH latest AS (
    SELECT DISTINCT ON (n.article_id) n.article_id, n.relevance, n.created_at FROM analyses n ORDER BY n.article_id, n.id DESC
  ), open AS (SELECT id FROM sources WHERE enabled AND participation_mode = 'editorial'),
  picked AS (
    SELECT a.id,
      CASE WHEN l.relevance = 'block' AND l.created_at < '2026-10-10 06:47+08' AND a.source_id IN (SELECT id FROM open) THEN '旧预筛挡下'
           WHEN l.created_at < '2026-10-03 06:18+08' AND a.source_id IN (SELECT id FROM open) THEN '按旧门槛判的'
           WHEN p.visibility = 'public' AND p.eligible AND l.created_at < '2026-10-09 16:30+08'
             AND (length(coalesce(nullif(a.body_text, ''), a.excerpt, '')) < 800
               OR EXISTS (SELECT 1 FROM archive_episodes e WHERE e.article_id = a.id AND e.audio_url IS NOT NULL AND e.status IN ('imported', 'failed')))
             THEN '只有简介仍列出'
      END AS why
    FROM articles a JOIN latest l ON l.article_id = a.id LEFT JOIN publications p ON p.article_id = a.id
    WHERE a.processing_state = 'analyzed'
  )
  SELECT why, count(*)::int AS n FROM picked WHERE why IS NOT NULL GROUP BY why ORDER BY why`;
console.log(`③ 交回处理：${requeue.map((r) => `${r.why} ${r.n}`).join("，") || "0"}`);

// ④ The Substack source's public items (rule 3: the platform's terms forbid it; the source was paused 10/5).
const substack = await sql<{ article_id: string; title: string }[]>`
  SELECT article_id, title FROM publications WHERE source_id = 'pod-restaurant-technology-podcast' AND visibility = 'public'`;
console.log(`④ 下架：${substack.length} 条${substack.map((s) => `「${s.title}」`).join("")}`);

// ⑤ An archive source taken out of the archive plan (8e8e538) that still shows on /api/archive/status.
const [stale] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM archive_sources WHERE source_id = 'rss-miraishokudo'`;
console.log(`⑤ 删掉存档状态：${stale!.n} 行`);

// ⑥ Situations whose grouping failed under the rule before today (any problem held the whole grouping back).
const [failed] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM reference_situations WHERE jsonb_array_length(problems) > 0`;
console.log(`⑥ 重新归并：之前没通过的 ${failed!.n} 种情况，加上故事有变动的`);

if (apply) {
  await sql.begin(async (tx) => {
    for (const c of release) await tx`
      UPDATE reference_cases SET status = 'story', situations = ${c.story!.placements.map((p) => p.situation)}, updated_at = now()
      WHERE article_id = ${c.article_id} AND status = 'held'`;
    for (const b of releaseBodies) await tx`
      UPDATE reference_bodies SET status = 'body', updated_at = now() WHERE article_id = ${b.article_id} AND status = 'held'`;
  });
  console.log("① 已显示");
  const tried = async (run: () => Promise<{ status: string } | null>) => {
    try { return (await run())?.status ?? "gone"; } catch (error) { return `failed ${String(error).slice(0, 80)}`; }
  };
  const tally: Record<string, number> = {};
  for (const id of casesToWrite) { const s = `故事 ${await tried(() => writeCase(id))}`; tally[s] = (tally[s] ?? 0) + 1; }
  for (const id of bodiesToWrite) { const s = `正文 ${await tried(() => writeBody(id))}`; tally[s] = (tally[s] ?? 0) + 1; }
  console.log(`② ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join("，") || "无"}`);
  const [r] = await sql<{ n: number }[]>`
    WITH latest AS (
      SELECT DISTINCT ON (n.article_id) n.article_id, n.relevance, n.created_at FROM analyses n ORDER BY n.article_id, n.id DESC
    ), open AS (SELECT id FROM sources WHERE enabled AND participation_mode = 'editorial'),
    u AS (
      UPDATE articles a SET processing_state = 'new', processing_attempts = 0, processing_retry_at = NULL, processing_queued_at = NULL, processing_error = NULL
      FROM latest l LEFT JOIN publications p ON p.article_id = l.article_id
      WHERE l.article_id = a.id AND a.processing_state = 'analyzed' AND (
        (l.relevance = 'block' AND l.created_at < '2026-10-10 06:47+08' AND a.source_id IN (SELECT id FROM open))
        OR (l.created_at < '2026-10-03 06:18+08' AND a.source_id IN (SELECT id FROM open))
        OR (p.visibility = 'public' AND p.eligible AND l.created_at < '2026-10-09 16:30+08'
          AND (length(coalesce(nullif(a.body_text, ''), a.excerpt, '')) < 800
            OR EXISTS (SELECT 1 FROM archive_episodes e WHERE e.article_id = a.id AND e.audio_url IS NOT NULL AND e.status IN ('imported', 'failed')))))
      RETURNING a.id
    ) SELECT count(*)::int AS n FROM u`;
  console.log(`③ 已交回处理 ${r!.n} 条（worker 每 5 分钟排 500 条）`);
  for (const s of substack) {
    const [o] = await sql<{ version: number }[]>`SELECT version FROM editorial_overrides WHERE article_id = ${s.article_id}`;
    await setVisibility(s.article_id, { visibility: "withdrawn", reason: "来源在 Substack，平台条款不允许（规则 3），10/5 已停用", version: o?.version ?? 0 }, "catch-up-2026-10-10");
  }
  console.log(`④ 已下架 ${substack.length} 条`);
  await sql`DELETE FROM archive_sources WHERE source_id = 'rss-miraishokudo'`;
  console.log("⑤ 已删");
  await sql`UPDATE reference_situations SET tried = '' WHERE jsonb_array_length(problems) > 0`;
  for (const [slug, members] of await situationsToGroup(await membersBySituation(), SITUATIONS.length)) {
    const result = await groupSituation(slug, members);
    console.log(`⑥ ${slug}: ${members.length} 篇，${result?.stored ? "已归并" : `未通过：${result?.problems.slice(0, 2).join("；")}`}`);
  }
}
await stopBoss();
await closeDb();
