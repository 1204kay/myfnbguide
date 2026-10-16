// 按现在的写作要求，重写参考库已有的故事和条目正文，并补写较早的、还没有正文的条目。
// 平时只自动写新进来的条目；改了写作要求以后，先看新条目写得好不好，确定写法以后才用这个脚本全面重写，
// 不会一改要求就把全部重写一遍（用户 10/9：先确定一种方式，才来全面重写）。
// 不带参数只数条数；--apply 执行，从新到旧；--limit 10 故事和正文各只写最新的 10 篇，用来先抽查；--bodies 只重写条目正文，不动故事；
// --with numbers 只重写含某种图块的故事和正文（例如改了数字卡的写法以后）；--ids a,b 只重写这几篇。每篇最多调用三次模型。
//   sudo docker compose exec -T -u root worker node myfnb/rewrite-reference.ts
//   sudo docker compose exec -T -u root worker node myfnb/rewrite-reference.ts --apply --limit 10
//   sudo docker compose exec -T -u root worker node myfnb/rewrite-reference.ts --apply
import { closeDb } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { SERVER_MODULES } from "@aihot/site/modules/server";
import { sql } from "@aihot/backend/db";
import { articlesToBody, writeBody } from "../modules/reference/backend/body.ts";
import { articlesToWrite, writeCase } from "../modules/reference/backend/write.ts";

// The modules' model steps (referenceCase, referenceBody) are known once the modules are installed, as in the worker.
installModules(SERVER_MODULES);

const apply = process.argv.includes("--apply");
const onlyBodies = process.argv.includes("--bodies");
const at = process.argv.indexOf("--limit");
const limit = at > 0 ? Number(process.argv[at + 1]) : 100_000;
if (!Number.isInteger(limit) || limit < 1) throw new Error("--limit 要写正整数");
const w = process.argv.indexOf("--with");
const block = w > 0 ? process.argv[w + 1]! : null;
// The stories and write-ups that hold a block of this type now: only these are written again.
const holding = block ? new Set((await sql<{ id: string }[]>`
  SELECT article_id AS id FROM reference_cases WHERE status = 'story' AND jsonb_path_exists(story, '$.parts[*].blocks[*] ? (@.type == $t)', ${sql.json({ t: block })})
  UNION SELECT article_id FROM reference_bodies WHERE status = 'body' AND jsonb_path_exists(body, '$.parts[*].blocks[*] ? (@.type == $t)', ${sql.json({ t: block })})`).map((r) => r.id)) : null;
const at2 = process.argv.indexOf("--ids");
const named = at2 > 0 ? new Set(process.argv[at2 + 1]!.split(",").map((id) => id.trim()).filter(Boolean)) : null;
const only = (ids: string[]) => ids.filter((id) => (!holding || holding.has(id)) && (!named || named.has(id)));

// Cases first: a case that comes out thin or held makes its item one to write up.
const cases = only(await articlesToWrite(limit, new Date(), { all: true }));
console.log(`要写的故事 ${cases.length} 篇${apply ? "" : "（预览）"}${onlyBodies ? "（--bodies：这次不写）" : ""}`);
const results: Record<string, number> = {};
const count = (status: string) => { results[status] = (results[status] ?? 0) + 1; };
// One answer the model garbles stops that item, not the run (the worker's queue would try it again later).
const tried = async (write: () => Promise<{ status: string } | null>, id: string) => {
  try { return (await write())?.status ?? "原文已删除"; } catch (error) { console.log(`${id} 出错：${(error as Error).message.slice(0, 120)}`); return "出错"; }
};
if (apply && !onlyBodies) for (const [i, id] of cases.entries()) {
  count(`故事 ${await tried(() => writeCase(id), id)}`);
  if ((i + 1) % 20 === 0) console.log(`故事已写 ${i + 1}/${cases.length}`);
}
const bodies = only(await articlesToBody(limit, new Date(), { all: true }));
console.log(`要写的条目正文 ${bodies.length} 篇${apply ? "" : "（预览，写完故事以后可能再多几篇）"}`);
if (apply) for (const [i, id] of bodies.entries()) {
  count(`正文 ${await tried(() => writeBody(id), id)}`);
  if ((i + 1) % 20 === 0) console.log(`正文已写 ${i + 1}/${bodies.length}`);
}
if (apply) console.log("结果：", JSON.stringify(results));
await stopBoss();
await closeDb();
