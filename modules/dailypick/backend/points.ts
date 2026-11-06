// 挑进日报正文的条目补写原文要点（Kay 11-06「你们决定吧」，十一定：只补挑进日报的，手册 经验 D15）。
// 原版只给入选精选的条目写原文要点（editorial/analyze.ts 只给 understandFloor 以上的写，publication/publish.ts 只给精选显示）；
// 10-26 起日报正文由本模块从「全部」里挑（pick.ts），挑出来的多数没入选，读者从日报点进去只有导读。
// 这里在日报出刊后，给正文里没入选、也没有要点的条目各写一次：写法和核对照入选的那条路（runUnderstand → mendWording →
// 核对员 copyCheck），只取要点，标题和导读不动；写好的要点作为编辑改动存进 editorial_overrides.fields.reason，
// 框架对编辑写的要点不看是否入选（publish.ts）。核对员挡下的、写不出的也记一行，不再花钱。
import { sql } from "@aihot/backend/db";
import { audit } from "@aihot/backend/audit";
import { loadAnalyzeInput, mendWording, runUnderstand } from "@aihot/backend/editorial/analyze";
import { emit, moduleCopyCheck } from "@aihot/backend/modules";
import type { Finding } from "@aihot/backend/notify/feishu";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { publishArticleTx } from "@aihot/backend/publication/publish";
import { addDays, beijingAt, beijingDate } from "@aihot/contracts/time";
import { EDITION_TIMES } from "@aihot/site";

/** 第一期由模型从「全部」里挑的日报（Kay 10-26 06:20「照改」）；更早的日报正文都是精选，本来就有要点。 */
export const POINTS_FROM = "2026-10-26";
/** 一次最多写这么多条：每天的日报正文最多 12 条；补旧的那一次约 80 条，分几次跑完，一次的花费有个顶。 */
export const POINTS_LIMIT = 40;
/** 出刊后多久还没有要点算缺：每半小时跑一次，三小时里至少试过六次。 */
const LATE_MS = 3 * 3600_000;
const ACTOR = "module:dailypick";
const NOTE = "日报正文挑进来的条目补写原文要点（modules/dailypick/backend/points.ts）";

/** 某几天日报正文（不含简讯）里的条目编号，按日期排。 */
async function dailyEntries(from: string, to: string): Promise<{ date: string; itemId: string }[]> {
  return sql<{ date: string; itemId: string }[]>`
    SELECT r.key AS date, it->>'itemId' AS "itemId"
    FROM reports r, jsonb_array_elements(coalesce(r.content->'sections', '[]')) s, jsonb_array_elements(coalesce(s->'items', '[]')) it
    WHERE r.kind = 'daily' AND r.key >= ${from} AND r.key <= ${to} AND it->>'itemId' IS NOT NULL
    ORDER BY r.key, it->>'itemId'`;
}

/** 日报正文里还没有要点、也没写过的条目（没入选的；入选的走原版那条路）。 */
export async function waitingPoints(today = beijingDate(new Date()), limit = POINTS_LIMIT): Promise<string[]> {
  const entries = await dailyEntries(POINTS_FROM, today);
  if (!entries.length) return [];
  const rows = await sql<{ article_id: string }[]>`
    SELECT p.article_id FROM publications p
    WHERE p.article_id = ANY(${[...new Set(entries.map((e) => e.itemId))]}) AND NOT p.selected AND p.reason IS NULL AND p.visibility = 'public'
      AND NOT EXISTS (SELECT 1 FROM dailypick_points d WHERE d.article_id = p.article_id)
      AND NOT EXISTS (SELECT 1 FROM editorial_overrides o WHERE o.article_id = p.article_id AND ${edited()})`;
  const waiting = new Set(rows.map((r) => r.article_id));
  // 新的日报先写：补旧的排在后面，每天的不会被它挤掉。
  return [...new Set(entries.filter((e) => waiting.has(e.itemId)).reverse().map((e) => e.itemId))].slice(0, limit);
}

/** 编辑已经写过要点（例如 11-03 对着原文人工核过的那批）：只差重发布就会显示，不再让模型重写。 */
const edited = () => sql`coalesce(btrim(o.fields->>'reason'), '') <> ''`;

/**
 * 没入选、编辑写过要点、页面上还没显示的条目：框架改成编辑写的要点不看是否入选以后，它们要重发布一次才显示。
 * 不花钱，全站都算（不只日报里的）；重发布以后 publications.reason 有值，下次就不再列出。
 */
export async function republishEdited(): Promise<number> {
  const rows = await sql<{ article_id: string }[]>`
    SELECT p.article_id FROM publications p JOIN editorial_overrides o ON o.article_id = p.article_id
    WHERE NOT p.selected AND p.reason IS NULL AND ${edited()}`;
  let shown = 0;
  for (const { article_id: id } of rows) {
    await sql.begin(async (tx) => {
      const published = await publishArticleTx(tx, id);
      if (!published?.changed) return;
      shown++;
      await emit("articleChanged", { id, kind: "content", reduced: published.reduced, reason: "edited points shown" }, tx);
    });
  }
  return shown;
}

type Outcome = "written" | "held" | "none";

/** 给一条写要点、过核对员、存起来。 */
export async function writePoints(articleId: string): Promise<Outcome> {
  const a = await loadAnalyzeInput(articleId);
  const [pub] = await sql<{ title: string; summary: string | null }[]>`SELECT title, summary FROM publications WHERE article_id = ${articleId}`;
  if (!a || !pub) return record(articleId, a?.revision ?? 0, "none", []);
  // 没有入选，原版那一步多半没写过；写过（30 分以上）的同一请求直接用回执里存的那一份，不再付钱。
  const understood = await runUnderstand(a);
  if (!understood?.reasonZh) return record(articleId, a.revision, "none", understood?.receiptIds ?? []);
  const mended = await mendWording(a, understood, {});
  const receipts = [...mended.receiptIds];
  let reason = mended.reasonZh;
  let held = false;
  const check = moduleCopyCheck();
  if (check && reason) {
    // 核对员看的是读者会看到的那一份：站上的标题和导读，加新写的要点。
    const c = await check.run({ article: a, copy: { titleZh: pub.title, summaryZh: pub.summary ?? "", reasonZh: reason }, subject: `article:${a.id}@${a.revision}`, attemptTag: "dailypoints" });
    receipts.push(...c.receiptIds);
    reason = c.reasonZh;
    held = c.held;
  }
  if (held || !reason?.trim()) return record(articleId, a.revision, held ? "held" : "none", receipts);
  return sql.begin(async (tx): Promise<Outcome> => {
    const [before] = await tx<{ fields: Record<string, unknown> }[]>`SELECT fields FROM editorial_overrides WHERE article_id = ${articleId} FOR UPDATE`;
    // 写的这段时间里编辑写了要点：用编辑的，不覆盖。
    if (typeof before?.fields.reason === "string" && before.fields.reason.trim()) {
      await tx`INSERT INTO dailypick_points (article_id, revision, outcome, receipt_ids) VALUES (${articleId}, ${a.revision}, 'none', ${receipts})
               ON CONFLICT (article_id) DO NOTHING`;
      for (const id of receipts) await completeReceipt(tx, id);
      const published = await publishArticleTx(tx, articleId);
      if (published?.changed) await emit("articleChanged", { id: articleId, kind: "content", reduced: published.reduced, reason: "edited points shown" }, tx);
      return "none";
    }
    const fields = { ...(before?.fields ?? {}), reason: reason!.trim() };
    await tx`
      INSERT INTO editorial_overrides (article_id, fields, reason, version, updated_by) VALUES (${articleId}, ${tx.json(fields as never)}, ${NOTE}, 1, ${ACTOR})
      ON CONFLICT (article_id) DO UPDATE SET fields = EXCLUDED.fields, reason = EXCLUDED.reason, version = editorial_overrides.version + 1, updated_by = EXCLUDED.updated_by, updated_at = now()`;
    const published = await publishArticleTx(tx, articleId);
    if (published?.changed) await emit("articleChanged", { id: articleId, kind: "content", reduced: published.reduced, reason: "daily points" }, tx);
    await audit(ACTOR, "content.override", `content:${articleId}`, NOTE, before?.fields ?? null, fields, { db: tx });
    await tx`INSERT INTO dailypick_points (article_id, revision, outcome, receipt_ids) VALUES (${articleId}, ${a.revision}, 'written', ${receipts})
             ON CONFLICT (article_id) DO NOTHING`;
    for (const id of receipts) await completeReceipt(tx, id);
    return "written";
  });
}

async function record(articleId: string, revision: number, outcome: Outcome, receipts: number[]): Promise<Outcome> {
  await sql.begin(async (tx) => {
    await tx`INSERT INTO dailypick_points (article_id, revision, outcome, receipt_ids) VALUES (${articleId}, ${revision}, ${outcome}, ${receipts})
             ON CONFLICT (article_id) DO NOTHING`;
    for (const id of receipts) await completeReceipt(tx, id);
  });
  return outcome;
}

/** 一次跑：等着的逐条写，一条出错不挡后面的。 */
export async function writeWaiting(limit = POINTS_LIMIT, today = beijingDate(new Date())): Promise<Record<Outcome | "failed" | "shown", number>> {
  const counts = { written: 0, held: 0, none: 0, failed: 0, shown: await republishEdited() };
  for (const id of await waitingPoints(today, limit)) {
    try {
      counts[await writePoints(id)]++;
    } catch (error) {
      counts.failed++;
      console.error(JSON.stringify({ level: "warn", msg: "daily points failed", articleId: id, error: String(error) }));
    }
  }
  return counts;
}

/**
 * 日报正文里点进去没有原文要点的条目（入选的、没入选的都算）：出刊三小时后还缺，就是读者正在看到的问题。
 * 核对员挡下或写不出的，另列一条待办，不当成急事反复提醒。
 */
export async function pointsFindings(now: number): Promise<Finding[]> {
  const today = beijingDate(new Date(now));
  const entries = (await dailyEntries(addDays(today, -6), today)).filter((e) => now - beijingAt(e.date, EDITION_TIMES.daily).getTime() >= LATE_MS);
  if (!entries.length) return [];
  const rows = await sql<{ article_id: string; selected: boolean; outcome: string | null }[]>`
    SELECT p.article_id, p.selected, d.outcome FROM publications p LEFT JOIN dailypick_points d ON d.article_id = p.article_id
    WHERE p.article_id = ANY(${entries.map((e) => e.itemId)}) AND p.reason IS NULL AND p.visibility = 'public'`;
  const dateOf = new Map(entries.map((e) => [e.itemId, e.date]));
  type Row = { article_id: string; selected: boolean; outcome: string | null };
  const list = (r: readonly Row[]) => r.map((x) => `${dateOf.get(x.article_id)} ${x.article_id}${x.selected ? "（入选）" : x.outcome ? `（${x.outcome}）` : ""}`).join("；");
  const missing = rows.filter((r) => r.selected || !r.outcome);
  const given = rows.filter((r) => !r.selected && r.outcome);
  const out: Finding[] = [];
  if (missing.length) out.push({
    key: "dailypick.points",
    level: "today",
    title: "日报里有条目没有原文要点",
    impact: `读者从日报点进去，${missing.length} 条只有导读、没有原文要点`,
    heals: "没入选的每半小时自动补写一次；入选的没有要点不会自己好",
    action: "转给 AI 查补写为什么没跑（dailypick.points 的排程和队列、模型额度），入选的查原版那一步",
    detail: list(missing),
  });
  if (given.length) out.push({
    key: "dailypick.points-held",
    level: "later",
    title: "日报里有条目的原文要点被核对员挡下或写不出",
    impact: `${given.length} 条日报正文点进去没有原文要点，自动补写已经试过，不会再试`,
    heals: "不会自己好",
    action: "转给 AI 对照原文看要不要手写要点",
    detail: list(given),
  });
  return out;
}
