// 给已经上线、没有图的故事单独配一张图（write.ts 的 drawPicture，和写新故事时同一步）。不重写故事，只插进一个图块；
// 原文撑不起就不放（L652 宁缺毋滥）。10-18：退回重写整篇来补图，796 篇里还有 380 篇没图，所以改成单独问。
// 不带参数只数条数；--apply 执行；--limit 10 只配最新的 10 篇，先抽查；--ids a,b 只配这几篇；
// --redo a,b 先拿掉这几篇现有的图（图不切题时），再按标题重新配，配不出就不放图；
// --backup 名字 先把要动的故事整行备份到 backup_ref_cases_名字（已有就不覆盖）。
//   sudo docker compose exec -T -u root worker node myfnb/add-pictures.ts
//   sudo docker compose exec -T -u root worker node myfnb/add-pictures.ts --apply --limit 10 --backup pic2_sample
import { closeDb, sql } from "@aihot/backend/db";
import { loadAnalyzeInput } from "@aihot/backend/editorial/analyze";
import { renderContext } from "@aihot/backend/editorial/writing";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { SERVER_MODULES } from "@aihot/site/modules/server";
import { DRAWN, hasPicture } from "../modules/reference/backend/checks.ts";
import { CASE_PROMPT, drawPicture, spaceStory } from "../modules/reference/backend/write.ts";
import type { CaseStory } from "../modules/reference/types.ts";

// The modules' model steps (referenceCase) are known once the modules are installed, as in the worker.
installModules(SERVER_MODULES);

const arg = (name: string) => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at + 1]! : null; };
const apply = process.argv.includes("--apply");
const limit = Number(arg("--limit") ?? 100_000);
if (!Number.isInteger(limit) || limit < 1) throw new Error("--limit 要写正整数");
const list = (value: string | null) => value ? value.split(",").map((id) => id.trim()).filter(Boolean) : [];
const named = list(arg("--ids"));
const redo = new Set(list(arg("--redo")));
const backup = arg("--backup");
if (backup !== null && !/^[a-z0-9_]{1,40}$/.test(backup)) throw new Error("--backup 只写小写字母、数字和下划线");

const rows = await sql<{ id: string; story: CaseStory }[]>`
  SELECT c.article_id AS id, c.story FROM reference_cases c JOIN publications p ON p.article_id = c.article_id
  WHERE c.status = 'story' ${named.length || redo.size ? sql`AND c.article_id IN ${sql([...named, ...redo])}` : sql``}
  ORDER BY p.sort_at DESC`;
const todo = rows.filter((r) => redo.has(r.id) || !hasPicture(r.story)).slice(0, limit);
console.log(`要配图的故事 ${todo.length} 篇${apply ? "" : "（预览）"}`);
if (apply && backup && todo.length) {
  await sql`CREATE TABLE IF NOT EXISTS ${sql(`backup_ref_cases_${backup}`)} AS SELECT * FROM reference_cases WHERE article_id IN ${sql(todo.map((r) => r.id))}`;
  console.log(`已备份到 backup_ref_cases_${backup}`);
}
const results: Record<string, number> = {};
if (apply) for (const [i, row] of todo.entries()) {
  // A picture that does not say what the title says comes off first; the story is asked for one afresh.
  const story = redo.has(row.id) ? { ...row.story, parts: row.story.parts.map((p) => ({ ...p, blocks: p.blocks.filter((b) => !DRAWN.has(b.type)) })) } : row.story;
  try {
    const a = await loadAnalyzeInput(row.id);
    if (!a) { console.log(`${row.id} 原文已删除`); continue; }
    const drawn = await drawPicture(story, renderContext(a, { annotateQuoted: true }), { subject: `article:${a.id}@${a.revision}`, promptVersion: CASE_PROMPT.version });
    const kept = drawn.reason ? story : spaceStory(drawn.story);
    await sql.begin(async (tx) => {
      if (kept !== row.story) await tx`UPDATE reference_cases SET story = ${JSON.stringify(kept)}::text::jsonb, updated_at = now() WHERE article_id = ${row.id} AND status = 'story'`;
      for (const id of drawn.receiptIds) await completeReceipt(tx, id);
    });
    const block = kept.parts.flatMap((p, n) => p.blocks.filter((b) => DRAWN.has(b.type)).map((b) => `第 ${n + 1} 段 ${JSON.stringify(b)}`))[0];
    console.log(`== ${row.story.title}（${row.id}）\n  ${drawn.reason ? `不放：${drawn.reason}` : block}`);
    results[drawn.reason ? "不放" : "配图"] = (results[drawn.reason ? "不放" : "配图"] ?? 0) + 1;
  } catch (error) {
    console.log(`${row.id} 出错：${(error as Error).message.slice(0, 120)}`);
    results["出错"] = (results["出错"] ?? 0) + 1;
  }
  if ((i + 1) % 20 === 0) console.log(`已处理 ${i + 1}/${todo.length}`);
}
if (apply) console.log("结果：", JSON.stringify(results));
await stopBoss();
await closeDb();
