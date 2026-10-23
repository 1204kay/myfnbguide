// 2026-10-24：两处意大利 Fipe 的线上错（十一转来，Kay「全部都直接处理」）。
// bfjxs：写稿那一步（10-05）给了原文里没有的标签「中国」，拿掉。
// g5fuy：改稿把「全国平均」改成「意大利平均」，意大利餐饮业成了和意大利自己比；写成「意大利全国平均」
// （它所在的事件标题由综述模型按报道写，条目改了会自动重写，写完再核）。
// 每处只换掉错的那几个字；找不到或不止一处就不改，打出来人工看。改前的字段留在审计记录（content.override）里。
// 不带参数只打出改前改后；--apply 写回。
//   sudo docker compose run --rm -T -v <检出>/myfnb:/app/myfnb:ro worker node myfnb/fix-italy-2026-10-24.ts [--apply]
import { overrideFields } from "@aihot/backend/admin/content";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";

const apply = process.argv.includes("--apply");
const ACTOR = "核对员（讨论串 MYFNB 读者为什么想点开，意大利 Fipe 两处 10-24）";
const WHY = "意大利 Fipe 两处 10-24：只换掉和原文不符的那几个字或标签";

type Field = "title" | "summary" | "reason";
const FIX: Array<{ prefix: string; field: Field; from: string; to: string }> = [
  { prefix: "g5fuya83", field: "title", from: "只有意大利一半", to: "只有意大利全国平均的一半" },
  { prefix: "g5fuya83", field: "summary", from: "意大利平均", to: "意大利全国平均" },
  { prefix: "g5fuya83", field: "reason", from: "意大利平均", to: "意大利全国平均" },
];
const DROP_TAGS: Record<string, string[]> = { bfjxsb5i: ["中国"] };

const ids = [...new Set([...FIX.map((f) => f.prefix), ...Object.keys(DROP_TAGS)])];
for (const prefix of ids) {
  const rows = await sql<{ article_id: string; title: string; summary: string | null; reason: string | null; tags: string[] }[]>`SELECT article_id, title, summary, reason, tags FROM publications WHERE article_id LIKE ${prefix + "%"}`;
  if (rows.length !== 1) { console.log(`\n## ${prefix} 找到 ${rows.length} 条，跳过`); continue; }
  const now = rows[0]!;
  const id = now.article_id;
  console.log(`\n## ${id}`);
  const fields: Partial<Record<Field, string>> & { tags?: string[] } = {};
  const drop = DROP_TAGS[prefix] ?? [];
  if (drop.some((t) => now.tags.includes(t))) {
    fields.tags = now.tags.filter((t) => !drop.includes(t));
    console.log(`tags\n  改前：${now.tags.join("、")}\n  改后：${fields.tags.join("、")}`);
  }
  for (const f of FIX.filter((x) => x.prefix === prefix)) {
    const text = fields[f.field] ?? now[f.field] ?? "";
    const n = text.split(f.from).length - 1;
    if (n !== 1) { console.log(`${f.field} 里「${f.from}」出现 ${n} 次，不改。现在是：\n  ${text}`); continue; }
    fields[f.field] = text.replace(f.from, f.to);
  }
  for (const [k, b] of Object.entries(fields)) if (k !== "tags") console.log(`${k}\n  改前：${now[k as Field]}\n  改后：${b}`);
  if (apply && Object.keys(fields).length) {
    const [ov] = await sql<{ version: number }[]>`SELECT version FROM editorial_overrides WHERE article_id = ${id}`;
    await overrideFields(id, { fields, reason: WHY, version: ov?.version ?? 0 }, ACTOR);
  }
}
console.log(apply ? "\n已写回。" : "\n只预览，没有动线上；写回用 --apply。");
await stopBoss();
await closeDb();
