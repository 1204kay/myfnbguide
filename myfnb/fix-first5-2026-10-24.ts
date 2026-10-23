// 2026-10-24：新写法上线（10-23 22:43）后头 5 条入选条目逐条对原文核对，查出 3 条线上还有错句：
// bs9e 核对员判了 serious 的「瓶装果汁美国平均成本」被国家名守卫连问题一起丢掉（PR #51 修了规则），同一条还有原文没有的
// 「2005年转向精调鸡尾酒」「约六个月后」；di5v 把名人堂说成 NRN 评的；zfg1 把 prime cost（食材酒水加人工）写成食材酒水成本。
// 每处只换掉错的那几个字，句子其余照旧；找不到或不止一处就不改，打出来人工看。改前的字段留在审计记录（content.override）里。
// 不带参数只打出改前改后；--apply 写回。
//   sudo docker compose run --rm -T -v <检出>/myfnb:/app/myfnb:ro worker node myfnb/fix-first5-2026-10-24.ts [--apply]
import { overrideFields } from "@aihot/backend/admin/content";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";

const apply = process.argv.includes("--apply");
const ACTOR = "核对员（讨论串 MYFNB 读者为什么想点开，上线后头 5 条核对 10-24）";
const WHY = "上线后头 5 条对原文核对 10-24：只换掉和原文不符的那几个字";

type Field = "title" | "summary" | "reason";
const FIX: Array<{ prefix: string; field: Field; from: string; to: string }> = [
  { prefix: "bs9eyimh", field: "reason", from: "2005年他把社区酒吧转向精调鸡尾酒，同时开掉三分之二的员工、弃用人工糖浆改去农夫市集采购，约六个月后生意好转。", to: "约2005年他发现前两年太看重产品和流程、不够重视人，于是开掉三分之二的员工，同时弃用人工糖浆、改去农夫市集采购，生意由此好转。" },
  { prefix: "bs9eyimh", field: "reason", from: "瓶装果汁美国平均成本每盎司0.28美元", to: "经分销商采购的瓶装果汁，他们在美国的平均采购价是每盎司0.28美元" },
  { prefix: "di5v2wv3", field: "summary", from: "曾获《Nation's Restaurant News》评选的Fine Dining Hall of Fame，2002年入选", to: "常登上《Nation's Restaurant News》，2002年入选Fine Dining Hall of Fame" },
  { prefix: "zfg1owz0", field: "reason", from: "食材酒水成本", to: "主要成本（食材酒水加人工）" },
];

const ids = [...new Set(FIX.map((f) => f.prefix))];
for (const prefix of ids) {
  const rows = await sql<{ article_id: string; title: string; summary: string | null; reason: string | null }[]>`SELECT article_id, title, summary, reason FROM publications WHERE article_id LIKE ${prefix + "%"}`;
  if (rows.length !== 1) { console.log(`\n## ${prefix} 找到 ${rows.length} 条，跳过`); continue; }
  const now = rows[0]!;
  const id = now.article_id;
  console.log(`\n## ${id}`);
  const fields: Partial<Record<Field, string>> = {};
  for (const f of FIX.filter((x) => x.prefix === prefix)) {
    const text = fields[f.field] ?? now[f.field] ?? "";
    const n = text.split(f.from).length - 1;
    if (n !== 1) { console.log(`${f.field} 里「${f.from}」出现 ${n} 次，不改。现在是：\n  ${text}`); continue; }
    fields[f.field] = text.replace(f.from, f.to);
  }
  for (const [k, b] of Object.entries(fields)) console.log(`${k}\n  改前：${now[k as Field]}\n  改后：${b}`);
  if (apply && Object.keys(fields).length) {
    const [ov] = await sql<{ version: number }[]>`SELECT version FROM editorial_overrides WHERE article_id = ${id}`;
    await overrideFields(id, { fields, reason: WHY, version: ov?.version ?? 0 }, ACTOR);
  }
}
console.log(apply ? "\n已写回。" : "\n只预览，没有动线上；写回用 --apply。");
await stopBoss();
await closeDb();
