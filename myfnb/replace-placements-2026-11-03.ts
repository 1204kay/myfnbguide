// 2026-11-03 全面整理块 A：参考库按逐条审读重排。只改条目放在哪个情况、哪一组，或移出参考库（条目还在精选和全部里），
// 三段文字一个字不动（工作约定 §15）。不调模型。逐条去向在同名 .json：from 是审读时（11-03 07:30）的位置，
// to 是新位置，null 是移出参考库；why 是理由。审读表和结构表在项目共享文件 myfnb/全面整理-2026-11-03/。
//
//   node myfnb/replace-placements-2026-11-03.ts [--only busy-no-profit,…]            只数，不写
//   node myfnb/replace-placements-2026-11-03.ts --apply --expect N [--only …]       先整表备份，再写；N 要等于要写的条数
//   node myfnb/replace-placements-2026-11-03.ts --restore [--only …]                照备份把还停在这次位置上的条目放回原处
//
// 备份：backup_ref_cases_20261103、backup_ref_placements_20261103、backup_settings_20261103，整表，
// IF NOT EXISTS 留住第一次的（第一次 --apply 之前的原样）。--only 按 from 或 to 的情况挑条目，先做一个情况看网站再放开全部。
// 一条现在的位置和 from 不一样（审读以后被别的改过），就不动它，列出来。
// --file 换一份去向表（同目录，默认 replace-placements-2026-11-03.json）：第一遍写完以后的复核用另一份，from 是第一遍写好的位置；
// 放回仍照第一遍之前的整表备份，只放回还停在这份表 to 上的条目。
import { readFileSync } from "node:fs";
import { closeDb, sql } from "@aihot/backend/db";
import { SITUATIONS } from "../modules/reference/situations.ts";

type Spot = [string, string | null];
const arg = (name: string) => { const i = process.argv.indexOf(name); return i < 0 ? undefined : process.argv[i + 1]; };
const file = arg("--file") ?? "replace-placements-2026-11-03.json";
if (!/^replace-placements-2026-11-03\w*\.json$/.test(file)) throw new Error(`--file 只能是同目录的 replace-placements-2026-11-03*.json：${file}`);
const plan: Record<string, { from: Spot; to: Spot | null; why: string }> = JSON.parse(readFileSync(new URL(`./${file}`, import.meta.url), "utf8"));
const only = arg("--only")?.split(",");
const apply = process.argv.includes("--apply");
const restore = process.argv.includes("--restore");
const MARK = "manual@2026-11-03";

for (const [id, p] of Object.entries(plan)) {
  if (!p.to) continue;
  const s = SITUATIONS.find((x) => x.slug === p.to![0]);
  if (!s || !s.groups.some((g) => g.key === p.to![1])) throw new Error(`${id}: ${p.to.join("/")} 不在 situations.ts 里`);
}
const ids = Object.keys(plan).filter((id) => !only || only.includes(plan[id]!.from[0]) || (plan[id]!.to && only.includes(plan[id]!.to![0])));

interface Now { id: string; kind: "case" | "placed"; situations: string[]; placements: Array<Record<string, unknown>> }
const rows = await sql<Now[]>`
  SELECT article_id AS id, 'case' AS kind, situations, story->'placements' AS placements FROM reference_cases WHERE status = 'story' AND article_id IN ${sql(ids)}
  UNION ALL
  SELECT r.article_id, 'placed', r.situations, r.placements FROM reference_placements r
  WHERE r.article_id IN ${sql(ids)} AND NOT EXISTS (SELECT 1 FROM reference_cases k WHERE k.article_id = r.article_id AND k.status = 'story')`;
const byId = new Map(rows.map((r) => [r.id, r]));
// 只放回还停在这次写的位置上的条目：写库以后别人又改过的（模型重新放、手动再调），留着不动，列出来。
if (restore) {
  const back: string[] = [];
  const moved: string[] = [];
  for (const id of ids) {
    const r = byId.get(id);
    const to = plan[id]!.to;
    const at = r?.placements[0] as { situation?: string; group?: string } | undefined;
    const still = r && (to ? r.situations.length === 1 && at?.situation === to[0] && (at?.group ?? null) === to[1] : r.situations.length === 0 && r.placements.length === 0);
    (still ? back : moved).push(id);
  }
  const [a, b] = back.length ? await sql.begin(async (tx) => [
    await tx`UPDATE reference_cases c SET situations = b.situations, story = jsonb_set(c.story, '{placements}', b.story->'placements'), updated_at = now()
      FROM backup_ref_cases_20261103 b WHERE b.article_id = c.article_id AND c.article_id IN ${tx(back)}`,
    await tx`UPDATE reference_placements r SET situations = b.situations, placements = b.placements, prompt_version = b.prompt_version, updated_at = now()
      FROM backup_ref_placements_20261103 b WHERE b.article_id = r.article_id AND r.article_id IN ${tx(back)}`,
  ]) : [{ count: 0 }, { count: 0 }];
  console.log(`放回 ${a!.count + b!.count} 条（故事 ${a!.count}，放置 ${b!.count}）；写库以后又被改过、不动的 ${moved.length} 条`);
  for (const id of moved) console.log(`  不动：${id}（现在 ${JSON.stringify(byId.get(id)?.placements ?? "不在页面上")}）`);
  await closeDb();
  process.exit(0);
}

const todo: Now[] = [];
const drift: string[] = [];
for (const id of ids) {
  const r = byId.get(id);
  const p = plan[id]!;
  const at = r?.placements[0] as { situation?: string; group?: string } | undefined;
  if (!r || r.situations.length !== 1 || at?.situation !== p.from[0] || (at?.group ?? null) !== p.from[1]) drift.push(`${id}（现在 ${r ? JSON.stringify(r.placements) : "不在页面上"}）`);
  else todo.push(r);
}
const out = todo.filter((r) => !plan[r.id]!.to).length;
console.log(`挑出 ${ids.length} 条；要写 ${todo.length} 条：换位置 ${todo.length - out}，移出参考库 ${out}；和审读时不一样、不动的 ${drift.length} 条`);
for (const d of drift) console.log(`  不动：${d}`);

if (apply) {
  const expect = Number(arg("--expect"));
  if (expect !== todo.length) throw new Error(`--expect ${arg("--expect")} 和要写的 ${todo.length} 条不一样，没有写`);
  await sql`CREATE TABLE IF NOT EXISTS backup_ref_cases_20261103 AS SELECT * FROM reference_cases`;
  await sql`CREATE TABLE IF NOT EXISTS backup_ref_placements_20261103 AS SELECT * FROM reference_placements`;
  await sql`CREATE TABLE IF NOT EXISTS backup_settings_20261103 AS SELECT * FROM settings`;
  await sql.begin(async (tx) => {
    for (const r of todo) {
      const to = plan[r.id]!.to;
      // The old placement's own fields (a story's card, a placing's fit) stay with it: only where it sits changes.
      const placements = to ? [{ ...r.placements[0], situation: to[0], group: to[1] }] : [];
      const situations = to ? [to[0]] : [];
      if (r.kind === "case") await tx`UPDATE reference_cases SET situations = ${situations}, story = jsonb_set(story, '{placements}', ${sql.json(placements as never)}), updated_at = now() WHERE article_id = ${r.id}`;
      else await tx`UPDATE reference_placements SET situations = ${situations}, placements = ${sql.json(placements as never)}, prompt_version = ${MARK}, updated_at = now() WHERE article_id = ${r.id}`;
    }
  });
  console.log(`写好 ${todo.length} 条。放回：node myfnb/replace-placements-2026-11-03.ts --restore${file === "replace-placements-2026-11-03.json" ? "" : ` --file ${file}`}${only ? ` --only ${only.join(",")}` : ""}`);
}
await closeDb();
