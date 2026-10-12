// 2026-10-12：还挡着的故事和正文。挡下的原因是硬伤（数字在原文里找不到、输出格式坏掉），不是长度或用词（那些现在不挡）。
// 做法：① 先把这些行整行备份到 backup_ref_*_20261012 两张表；② 按今天的检查重判存着文字的，已经没有硬伤的改成显示；
// ③ 其余按现行写法再写（writeCase / writeBody，每篇最多三次、带上问题退回），最多两轮；仍挡着的留着，不删内容。
// 不带参数只数条数；--apply 执行。
//   sudo docker compose exec -T worker node myfnb/fix-held-2026-10-12.ts [--apply]
import { closeDb, sql } from "@aihot/backend/db";
import { loadAnalyzeInput } from "@aihot/backend/editorial/analyze";
import { renderContext } from "@aihot/backend/editorial/writing";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { SERVER_MODULES } from "@aihot/site/modules/server";
import { writeBody } from "../modules/reference/backend/body.ts";
import { blocking, checkStory } from "../modules/reference/backend/checks.ts";
import { writeCase } from "../modules/reference/backend/write.ts";

installModules(SERVER_MODULES);
const apply = process.argv.includes("--apply");
const heldCases = async () => (await sql<{ id: string }[]>`SELECT article_id AS id FROM reference_cases WHERE status = 'held'`).map((r) => r.id);
const heldBodies = async () => (await sql<{ id: string }[]>`SELECT article_id AS id FROM reference_bodies WHERE status = 'held'`).map((r) => r.id);
const spendSince = async (since: Date) => Number((await sql<{ c: string }[]>`SELECT coalesce(sum(cost), 0) AS c FROM receipts WHERE created_at >= ${since}`)[0]!.c);
const startedAt = new Date();

console.log(`挡着的故事 ${(await heldCases()).length} 篇，正文 ${(await heldBodies()).length} 篇`);
if (apply) {
  await sql`CREATE TABLE IF NOT EXISTS backup_ref_cases_20261012 AS SELECT * FROM reference_cases WHERE status = 'held'`;
  await sql`CREATE TABLE IF NOT EXISTS backup_ref_bodies_20261012 AS SELECT * FROM reference_bodies WHERE status = 'held'`;

  // ② Held, text kept, nothing blocking by today's checks: shown.
  for (const kind of ["case", "body"] as const) {
    const rows = kind === "case"
      ? await sql<any[]>`SELECT article_id id, story x FROM reference_cases WHERE status = 'held' AND story IS NOT NULL`
      : await sql<any[]>`SELECT article_id id, body x FROM reference_bodies WHERE status = 'held' AND body IS NOT NULL`;
    for (const r of rows) {
      const a = await loadAnalyzeInput(r.id);
      if (!a) continue;
      const story = kind === "case" ? r.x : { title: "", lead: r.x.lead ?? "", who: "", parts: r.x.parts, open: r.x.open, placements: [], shop: { name: null, label: "", country: "", city: null, kind: null, size: null, speaker: "media" } };
      if (checkStory(story, renderContext(a, { annotateQuoted: true })).some(blocking)) continue;
      if (kind === "case") await sql`UPDATE reference_cases SET status = 'story', situations = ${r.x.placements.map((p: { situation: string }) => p.situation)}, updated_at = now() WHERE article_id = ${r.id}`;
      else await sql`UPDATE reference_bodies SET status = 'body', updated_at = now() WHERE article_id = ${r.id}`;
      console.log(`${kind} ${r.id} 已无硬伤，改成显示`);
    }
  }

  // ③ The rest: written again, two rounds at most (each answer is a fresh draw; the checks are the same).
  for (let round = 1; round <= 2; round++) {
    const cases = await heldCases();
    const bodies = await heldBodies();
    console.log(`第 ${round} 轮：故事 ${cases.length}，正文 ${bodies.length}`);
    const results: Record<string, number> = {};
    const count = (key: string) => { results[key] = (results[key] ?? 0) + 1; };
    for (const id of cases) {
      try { count(`故事 ${(await writeCase(id))?.status ?? "原文已删除"}`); } catch (error) { count("故事 出错"); console.log(`${id} 出错：${(error as Error).message.slice(0, 120)}`); }
    }
    for (const id of bodies) {
      try { count(`正文 ${(await writeBody(id))?.status ?? "原文已删除"}`); } catch (error) { count("正文 出错"); console.log(`${id} 出错：${(error as Error).message.slice(0, 120)}`); }
    }
    console.log(`第 ${round} 轮结果：`, JSON.stringify(results), `累计花费 ${(await spendSince(startedAt)).toFixed(3)}`);
  }
  console.log(`剩下挡着的：故事 ${(await heldCases()).length}，正文 ${(await heldBodies()).length}`);
}
await stopBoss();
await closeDb();
