// Shows the stories and write-ups held under the checks before f53896a (10/9 06:23): since then only a number not in
// the original, broken output and a situation that does not exist hold one back (checks.ts `blocking`); wording and
// length go back to the model once and are shown anyway. Rows held before that change were never judged again, so
// written text with no blocking problem stayed hidden. This applies today's rule to what is stored: no model call,
// no rewrite. Without --apply it only prints what it would release.
//   sudo docker compose exec -T -u root worker node myfnb/release-held-2026-10-10.ts [--apply]
import { closeDb, sql } from "@aihot/backend/db";
import { blocking } from "../modules/reference/backend/checks.ts";
import { SITUATIONS } from "../modules/reference/situations.ts";

const apply = process.argv.includes("--apply");
const known = new Set(SITUATIONS.map((s) => s.slug));

const cases = await sql<{ article_id: string; story: { title: string; placements: Array<{ situation: string }> } | null; problems: string[] }[]>`
  SELECT article_id, story, problems FROM reference_cases WHERE status = 'held'`;
const releasable = cases.filter((c) => c.story && !c.problems.some(blocking) && c.story.placements.length > 0
  && c.story.placements.every((p) => known.has(p.situation)));
const bodies = await sql<{ article_id: string; body: unknown; problems: string[] }[]>`
  SELECT article_id, body, problems FROM reference_bodies WHERE status = 'held'`;
const releasableBodies = bodies.filter((b) => b.body && !b.problems.some(blocking));

console.log(`stories held ${cases.length}, releasable ${releasable.length}; write-ups held ${bodies.length}, releasable ${releasableBodies.length}`);
for (const c of releasable.slice(0, 10)) console.log(`  ${c.article_id} ${c.story!.title}  [${c.problems.slice(0, 2).join("；")}]`);

if (apply) {
  await sql.begin(async (tx) => {
    for (const c of releasable) await tx`
      UPDATE reference_cases SET status = 'story', situations = ${c.story!.placements.map((p) => p.situation)}, updated_at = now()
      WHERE article_id = ${c.article_id} AND status = 'held'`;
    for (const b of releasableBodies) await tx`
      UPDATE reference_bodies SET status = 'body', updated_at = now() WHERE article_id = ${b.article_id} AND status = 'held'`;
  });
  console.log(`released ${releasable.length} stories and ${releasableBodies.length} write-ups; situations regroup at the next 05:00 (or modules/reference/group-now.ts)`);
}
await closeDb();
