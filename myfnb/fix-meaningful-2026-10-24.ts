// 2026-10-24：Meaningful Vision 鸡肉产品线那条（iu1fjlbg…，没入选）的标题和导读写了「英国非鸡肉快餐连锁」，
// 原文那句是「Chicken assortments in non-chicken fast-food chains grew by 40% between 2022 and 2026, according to Meaningful Vision data」，
// 没有写英国。十一定只改这一条（工作约定 §15 的例外：单条事实错误），拿掉标题和导读里的「英国」，标签不动。
// 走后台人工更正同一个函数（overrideFields，有审计记录，以后重跑模型也不会被盖掉）；每处只换掉那几个字，找不到或不止一处就不改。
// 提到这一条的报告只打出来，不改。不带参数只打出改前改后；--apply 写回。
//   sudo docker compose run --rm -T -v <检出>/myfnb:/app/myfnb:ro worker node myfnb/fix-meaningful-2026-10-24.ts [--apply]
import { overrideFields } from "@aihot/backend/admin/content";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";

const apply = process.argv.includes("--apply");
const ID = "iu1fjlbg7o2ghdldafn8018b3";
const ACTOR = "核对员（讨论串 定 MYFNB 食客向内容怎么挑，Meaningful Vision 10-24）";
const WHY = "原文没有写英国：拿掉标题和导读里的「英国」";
type Field = "title" | "summary";
const FIX: Array<{ field: Field; from: string; to: string }> = [
  { field: "title", from: "英国非鸡肉快餐连锁", to: "非鸡肉快餐连锁" },
  { field: "summary", from: "英国非鸡肉快餐连锁", to: "非鸡肉快餐连锁" },
];

const [now] = await sql<{ title: string; summary: string | null }[]>`SELECT title, summary FROM publications WHERE article_id = ${ID}`;
if (!now) throw new Error(`没有 ${ID}`);
const fields: Partial<Record<Field, string>> = {};
for (const f of FIX) {
  const text = now[f.field] ?? "";
  const n = text.split(f.from).length - 1;
  if (n !== 1) { console.log(`${f.field} 里「${f.from}」出现 ${n} 次，不改。现在是：\n  ${text}`); continue; }
  fields[f.field] = text.replace(f.from, f.to);
  console.log(`${f.field}\n  改前：${text}\n  改后：${fields[f.field]}`);
}
const reports = await sql<{ kind: string; key: string; old: boolean }[]>`
  SELECT kind, key, content::text LIKE ${"%" + now.title + "%"} AS old FROM reports WHERE content::text LIKE ${"%" + ID + "%"}`;
for (const r of reports) console.log(`提到它的报告：${r.kind} ${r.key}${r.old ? "（里面是旧标题，没改）" : ""}`);
if (apply && Object.keys(fields).length) {
  const [ov] = await sql<{ version: number }[]>`SELECT version FROM editorial_overrides WHERE article_id = ${ID}`;
  await overrideFields(ID, { fields, reason: WHY, version: ov?.version ?? 0 }, ACTOR);
}
console.log(apply ? "\n已写回。" : "\n只预览，没有动线上；写回用 --apply。");
await stopBoss();
await closeDb();
