// 2026-10-13：核对 10/13 手改的 7 篇（fix-wording-2026-10-13.ts）已是改后句、没有残留旧词。
// 不带参数只读核对；--apply 才把这 7 行复制进新表 backup_check_20261013（只新建表，不改 publications 任何内容）。
//   sudo docker compose exec -T worker node myfnb/verify-wording-2026-10-13.ts [--apply]
import { closeDb, sql } from "@aihot/backend/db";
import { wordingProblems } from "@aihot/backend/editorial/wording";

type Field = "title" | "summary" | "reason";
const EXPECT: ReadonlyArray<readonly [prefix: string, field: Field, phrase: string]> = [
  ["wlew7kj6", "summary", "华盛顿特区也有相关的 ballot initiatives，市议会叫停了该提案。"],
  ["ud5lunhg", "summary", "困在运营中的老板会走上滑坡，另一些老板即使该回去也回不去，这些都影响团队投入度"],
  ["qtf2p43z", "summary", "不少人选择先享乐后付出"],
  ["evdcphs0", "title", "每坪费用与工期"],
  ["evdcphs0", "summary", "每坪（1 坪约 3.3 平方米）费用行情："],
  ["evdcphs0", "reason", "每坪装修费用比价"],
  ["mvi9nmrz", "summary", "每坪（1 坪约 3.3 平方米）费用约为"],
  ["mvi9nmrz", "summary", "没有任何内装和器具"],
  ["avll1boi", "summary", "推广至菲律宾更多"],
];
const OLD = /节目还提到|节目还谈到|内容中也有一种情形|坪单价|居抜き|备品|(?<!安)全国/;
const prefixes = ["wlew7kj6", "ud5lunhg", "qtf2p43z", "evdcphs0", "mvi9nmrz", "avll1boi", "ijieq5mf"];

const apply = process.argv.includes("--apply");
const rows = await sql<{ article_id: string; title: string; summary: string | null; reason: string | null }[]>`
  SELECT * FROM publications WHERE ${sql.unsafe(prefixes.map((p) => `article_id LIKE '${p}%'`).join(" OR "))}`;
let bad = 0;
for (const p of prefixes) {
  const r = rows.find((x) => x.article_id.startsWith(p));
  if (!r) { console.log(`${p} 库里没有这一行`); bad++; continue; }
  const problems: string[] = [];
  for (const [pre, field, phrase] of EXPECT) if (pre === p && !r[field]?.includes(phrase)) problems.push(`${field} 缺改后句「${phrase}」`);
  for (const field of ["title", "summary", "reason"] as const) {
    const m = r[field]?.match(OLD);
    if (m) problems.push(`${field} 残留旧词「${m[0]}」`);
  }
  const w = wordingProblems({ titleZh: r.title, summaryZh: r.summary, reasonZh: r.reason });
  if (w.length) problems.push(`词表仍报 ${w.length} 项：${w.join("；").slice(0, 100)}`);
  console.log(`${p} ${problems.length ? "有问题：" + problems.join(" | ") : "通过"}`);
  bad += problems.length;
}
console.log(`共 ${rows.length}/${prefixes.length} 行，问题 ${bad} 个${apply ? "" : "（只读）"}`);
if (apply) {
  await sql`CREATE TABLE IF NOT EXISTS backup_check_20261013 AS SELECT * FROM publications WHERE false`;
  const ids = rows.map((r) => r.article_id);
  const n = await sql`INSERT INTO backup_check_20261013 SELECT * FROM publications WHERE article_id IN ${sql(ids)} AND article_id NOT IN (SELECT article_id FROM backup_check_20261013)`;
  console.log(`已复制 ${n.count} 行进 backup_check_20261013`);
}
await closeDb();
