// 2026-10-23：要点上线前已经入选的条目（约 1,340 条），用同一个核对员（packages/backend/src/editorial/check.ts）拿原文核一遍现有的
// 标题、摘要、收录理由：严重和误导照核对员的改法改，改过的再核一遍；标题或摘要还错的撤下（withdrawn，不删）；只有理由改不好的，去掉理由、条目留着
// （10-23 第 1 批：刘帅那条标题摘要都对，只因理由被删空就整条撤下，太严）。
// 只核对、不重写（十一 10-23；Kay 10-23「你和十一讨论决定」「今天做不到？」）。从新到旧，每批 20 条，每批抽样盲核过了再下一批。
// 分两步，花钱和改线上分开：
//   不带 --apply：挑下一批（没核过的里最新的 LIMIT 条），调核对员，结果只写进 old_check_20261023，不动线上，打出改前改后。
//   --apply：把已核、还没写回的结果写回线上（后台人工更正 overrideFields / 撤下 setVisibility，有审计记录），写之前整行备份。
// 日报、周报里的旧句不跟着换（那是当天的快照）；参考库故事另算。
//   sudo docker compose run --rm -T -v <检出>/myfnb:/app/myfnb:ro worker node myfnb/check-old-items-2026-10-23.ts [--limit 20] [--apply]
import { overrideFields, setVisibility } from "@aihot/backend/admin/content";
import { closeDb, sql } from "@aihot/backend/db";
import { checkCopy } from "@aihot/backend/editorial/check";
import { loadAnalyzeInput } from "@aihot/backend/editorial/input";
import { stopBoss } from "@aihot/backend/jobs/queue";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const limit = Number(args[args.indexOf("--limit") + 1]) || 20;
const ACTOR = "核对员（讨论串 MYFNB 读者为什么想点开，旧条目核对 10-23）";
const TAG = "old-1023";

await sql`CREATE TABLE IF NOT EXISTS old_check_20261023 (
  article_id text PRIMARY KEY, batch int NOT NULL, title text, summary text, reason text,
  new_title text, new_summary text, new_reason text, held boolean, receipt_ids bigint[], error text,
  checked_at timestamptz NOT NULL DEFAULT now(), applied_at timestamptz)`;

type Row = { article_id: string; title: string; summary: string | null; reason: string | null; new_title: string | null; new_summary: string | null; new_reason: string | null; held: boolean | null };
const show = (r: Row) => {
  const changed = (a: string | null, b: string | null) => (a ?? "") !== (b ?? "");
  console.log(`\n## ${r.article_id}  ${r.held ? "撤下" : changed(r.title, r.new_title) || changed(r.summary, r.new_summary) || changed(r.reason, r.new_reason) ? "要改" : "没问题"}`);
  for (const [k, a, b] of [["标题", r.title, r.new_title], ["摘要", r.summary, r.new_summary], ["理由", r.reason, r.new_reason]] as const) {
    if (changed(a, b)) console.log(`${k}\n  改前：${a}\n  改后：${b}`);
  }
};

// REDO=id,id：先删掉这几条的核对结果（只删本表，不碰线上），这一批重新核它们。
const redo = (process.env.REDO ?? "").split(",").map((x) => x.trim()).filter(Boolean);
if (redo.length) console.log(`重核 ${(await sql`DELETE FROM old_check_20261023 WHERE applied_at IS NULL AND article_id IN ${sql(redo)} RETURNING 1`).length} 条`);

if (!apply) {
  const [{ batch }] = await sql<{ batch: number }[]>`SELECT coalesce(max(batch), 0) + 1 AS batch FROM old_check_20261023`;
  const picked = await sql<{ article_id: string; title: string; summary: string | null; reason: string | null }[]>`
    SELECT p.article_id, p.title, p.summary, p.reason FROM publications p
    WHERE p.selected AND p.visibility = 'public' AND p.channel = 'news'
      AND NOT EXISTS (SELECT 1 FROM old_check_20261023 o WHERE o.article_id = p.article_id)
      AND NOT EXISTS (SELECT 1 FROM analyses a WHERE a.id = p.analysis_id AND a.created_at > '2026-10-23T08:38:11Z') -- 上线后的已由核对员核过
    ORDER BY p.timeline_at DESC LIMIT ${limit}`;
  console.log(`第 ${batch} 批：${picked.length} 条`);
  for (const p of picked) {
    const a = await loadAnalyzeInput(p.article_id);
    try {
      if (!a) throw new Error("读不到原文");
      const c = await checkCopy(a, { titleZh: p.title, summaryZh: p.summary ?? "", reasonZh: p.reason }, `article:${a.id}@${a.revision}`, TAG);
      await sql`INSERT INTO old_check_20261023 (article_id, batch, title, summary, reason, new_title, new_summary, new_reason, held, receipt_ids)
        VALUES (${p.article_id}, ${batch}, ${p.title}, ${p.summary}, ${p.reason}, ${c.draft.title}, ${c.draft.lead}, ${c.draft.points.join("\n") || null}, ${c.copyWrong}, ${c.receiptIds})`;
    } catch (e) {
      // 记下失败，下一批不再挑它；要重试就删掉这一行。
      await sql`INSERT INTO old_check_20261023 (article_id, batch, title, summary, reason, error) VALUES (${p.article_id}, ${batch}, ${p.title}, ${p.summary}, ${p.reason}, ${String(e)})`;
      console.log(`\n## ${p.article_id}  失败：${String(e)}`);
      continue;
    }
    show((await sql<Row[]>`SELECT * FROM old_check_20261023 WHERE article_id = ${p.article_id}`)[0]!);
  }
  const [s] = await sql<{ n: number; held: number; changed: number; failed: number }[]>`
    SELECT count(*)::int AS n, count(*) FILTER (WHERE held)::int AS held, count(*) FILTER (WHERE error IS NULL AND NOT held AND (title, summary, reason) IS DISTINCT FROM (new_title, new_summary, new_reason))::int AS changed,
      count(*) FILTER (WHERE error IS NOT NULL)::int AS failed FROM old_check_20261023 WHERE batch = ${batch}`;
  console.log(`\n第 ${batch} 批 ${s!.n} 条：要改 ${s!.changed}，撤下 ${s!.held}，失败 ${s!.failed}，其余没问题。没有动线上；写回用 --apply。`);
} else {
  const todo = await sql<Row[]>`SELECT * FROM old_check_20261023 WHERE applied_at IS NULL AND error IS NULL ORDER BY batch, checked_at`;
  const ids = todo.map((r) => r.article_id);
  if (ids.length) {
    await sql`CREATE TABLE IF NOT EXISTS backup_old_check_20261023_pub AS SELECT * FROM publications WITH NO DATA`;
    await sql`CREATE TABLE IF NOT EXISTS backup_old_check_20261023_override AS SELECT * FROM editorial_overrides WITH NO DATA`;
    await sql`INSERT INTO backup_old_check_20261023_pub SELECT * FROM publications WHERE article_id IN ${sql(ids)}`;
    await sql`INSERT INTO backup_old_check_20261023_override SELECT * FROM editorial_overrides WHERE article_id IN ${sql(ids)}`;
  }
  let changed = 0, held = 0;
  for (const r of todo) {
    // 核过以后线上又被改过（人工更正、重新分析），就不拿旧结果去盖。
    const [now] = await sql<{ title: string; summary: string | null; reason: string | null }[]>`SELECT title, summary, reason FROM publications WHERE article_id = ${r.article_id}`;
    if (!now || now.title !== r.title || (now.summary ?? "") !== (r.summary ?? "") || (now.reason ?? "") !== (r.reason ?? "")) { console.log(`${r.article_id} 线上已变，跳过`); continue; }
    const [ov] = await sql<{ version: number }[]>`SELECT version FROM editorial_overrides WHERE article_id = ${r.article_id}`;
    if (r.held) {
      await setVisibility(r.article_id, { visibility: "withdrawn", reason: "核对员：标题或摘要和原文不符，改不好（旧条目核对 10-23）", version: ov?.version ?? 0 }, ACTOR);
      held++;
    } else {
      const fields: Record<string, string> = {};
      if (r.new_title && r.new_title !== r.title) fields.title = r.new_title;
      if ((r.new_summary ?? "") !== (r.summary ?? "")) fields.summary = r.new_summary ?? "";
      if ((r.new_reason ?? "") !== (r.reason ?? "")) fields.reason = r.new_reason ?? "";
      if (Object.keys(fields).length) {
        await overrideFields(r.article_id, { fields, reason: "核对员拿原文核过，严重和误导照改（旧条目核对 10-23）", version: ov?.version ?? 0 }, ACTOR);
        changed++;
      }
    }
    await sql`UPDATE old_check_20261023 SET applied_at = now() WHERE article_id = ${r.article_id}`;
  }
  console.log(`写回 ${todo.length} 条：改了 ${changed}，撤下 ${held}，其余没问题。备份在 backup_old_check_20261023_pub / _override。`);
}
// 人工更正会往 digest 队列加任务，打开了队列连接；不关掉进程就不退出。
await stopBoss();
await closeDb();
