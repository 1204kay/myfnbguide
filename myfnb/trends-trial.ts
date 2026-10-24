// The weekly trends' trial before it goes live (十一 10-24: one run, at most US$0.1, compared with the sample in the
// handbook's 每周趋势-设计和样稿.md): the week's topics as modules/trends would write them, printed and not kept, so the
// weekly shows nothing from it. Its calls keep their receipts; the last line is what they cost.
//   sudo docker compose exec -T worker node myfnb/trends-trial.ts [--start 2026-10-18] [--end 2026-10-24]
// The days as a weekly names them: the reports listed from the daily's edition the day before the first to the last's
// (10-17 08:00 to 10-24 08:00 for these defaults), the sample's week.
import { parseArgs } from "node:util";
import { closeDb, sql } from "@aihot/backend/db";
import { installModules } from "@aihot/backend/modules";
import { SERVER_MODULES } from "@aihot/site/modules/server";
import { writeWeek } from "@aihot/trends/backend/compose";

installModules(SERVER_MODULES);
const { values } = parseArgs({ options: { start: { type: "string", default: "2026-10-18" }, end: { type: "string", default: "2026-10-24" } } });
try {
  const { topics, dropped, receipts, pool } = await writeWeek(`trial:${values.start}`, values.start!, values.end!);
  const byId = new Map(pool.map((p) => [p.id, p]));
  console.log(`${values.start} – ${values.end}：一周 ${pool.length} 条，发 ${topics.length} 题，不发 ${dropped.length} 题`);
  for (const t of topics) {
    console.log(`\n## ${t.heading}`);
    for (const l of t.lines) console.log(`- ${byId.get(l.id)?.sourceName}：${l.text}（${l.id}）`);
  }
  for (const d of dropped) console.log(`\n不发：${d.name}（${d.why}）${d.ids.map((id) => byId.get(id)?.sourceName).join("、")}`);
  const [cost] = await sql<{ n: number; usd: string | null }[]>`SELECT count(*)::int AS n, sum(cost)::text AS usd FROM receipts WHERE id = ANY(${receipts})`;
  console.log(`\n调用 ${cost?.n ?? 0} 次，US$${cost?.usd ?? "?"}`);
} finally {
  await closeDb();
}
