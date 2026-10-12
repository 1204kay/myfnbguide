// 2026-10-13：公开条目里模型改了三轮仍改不掉的不用词，剩 7 条（myfnb/HANDOFF.md 10/12 晚），其中“食品安全国家标准”里的“安全国家”被
// “全国”误判，已在词表里修；其余 6 条的摘要、标题、收录理由按下面的对照手改，只换这几处文字。改之前整行备份到
// backup_publications_20261013；原文对不上的（说明已被重写）不改。
// 不带参数只预览；--apply 执行。
//   sudo docker compose exec -T worker node myfnb/fix-wording-2026-10-13.ts [--apply]
import { closeDb, sql } from "@aihot/backend/db";
import { wordingProblems } from "@aihot/backend/editorial/wording";

type Field = "title" | "summary" | "reason";
const FIXES: ReadonlyArray<readonly [id: string, field: Field, from: string, to: string]> = [
  ["wlew7kj6oi00fvet1huv7jk7e", "summary", "节目还提到华盛顿特区相关 ballot initiatives", "内容也涉及华盛顿特区相关 ballot initiatives"],
  ["ud5lunhg3pe3ttdemd5rz7bkn", "summary", "节目还谈到困在运营中的老板", "内容还包括困在运营中的老板"],
  ["qtf2p43z4t5gvnxippti8n8b7", "summary", "节目还提到，不少人选择先享乐后付出", "内容中也有一种情形：不少人选择先享乐后付出"],
  ["evdcphs0fbwgusd6rak68axlv", "title", "每坪单价与工期", "每坪费用与工期"],
  ["evdcphs0fbwgusd6rak68axlv", "summary", "列出餐饮店装修的每坪单价行情：", "列出餐饮店装修的每坪（1 坪约 3.3 平方米）费用行情："],
  ["evdcphs0fbwgusd6rak68axlv", "reason", "每坪单价比价", "每坪装修费用比价"],
  // 第二步（10/13 Kay：只有题目的句子改成直接写内容）：上面三条的“内容也涉及”等说法还是只报题目，去掉。
  ["wlew7kj6oi00fvet1huv7jk7e", "summary", "内容也涉及华盛顿特区相关 ballot initiatives，以及市议会叫停该提案。", "华盛顿特区也有相关的 ballot initiatives，市议会叫停了该提案。"],
  ["ud5lunhg3pe3ttdemd5rz7bkn", "summary", "内容还包括困在运营中的老板会走上滑坡、另一些老板即使该回去也回不去，以及这些对团队投入度的影响，并解释", "困在运营中的老板会走上滑坡，另一些老板即使该回去也回不去，这些都影响团队投入度，并解释"],
  ["qtf2p43z4t5gvnxippti8n8b7", "summary", "内容中也有一种情形：不少人选择", "不少人选择"],
  ["avll1boijmvkfiqhbxc60gn9a", "summary", "推广至全国更多", "推广至菲律宾更多"],
  ["mvi9nmrzsi3atd40okf64i9pc", "summary", "接手原店装修（居抜き，保留前一家店的装修、设备和器具）的每坪单价约为", "接手原店装修（保留前一家店的装修、设备和器具）的每坪（1 坪约 3.3 平方米）费用约为"],
  ["mvi9nmrzsi3atd40okf64i9pc", "summary", "没有任何内装和备品", "没有任何内装和器具"],
];

const apply = process.argv.includes("--apply");
const ids = [...new Set(FIXES.map((f) => f[0]))];
const rows = await sql<{ article_id: string; title: string; summary: string | null; reason: string | null }[]>`
  SELECT article_id, title, summary, reason FROM publications WHERE article_id IN ${sql(ids)}`;
const next = new Map(rows.map((r) => [r.article_id, { title: r.title, summary: r.summary ?? "", reason: r.reason }]));
let changed = 0;
for (const [id, field, from, to] of FIXES) {
  const row = next.get(id);
  const text = row?.[field];
  if (!row || !text?.includes(from)) { console.log(`不改 ${id} ${field}：找不到「${from}」`); continue; }
  row[field] = text.replace(from, to);
  changed++;
}
for (const [id, row] of next) {
  const left = wordingProblems({ titleZh: row.title, summaryZh: row.summary, reasonZh: row.reason });
  console.log(`${id} 改后仍有的问题 ${left.length}${left.length ? "：" + left.join("；").slice(0, 120) : ""}`);
}
console.log(`要换的 ${changed} / ${FIXES.length} 处${apply ? "" : "（预览）"}`);
if (apply) {
  await sql`CREATE TABLE IF NOT EXISTS backup_publications_20261013 AS SELECT * FROM publications WHERE article_id IN ${sql(ids)}`;
  for (const [id, row] of next) {
    await sql`UPDATE publications SET title = ${row.title}, summary = ${row.summary}, reason = ${row.reason}, updated_at = now() WHERE article_id = ${id}`;
  }
  console.log("已改");
}
await closeDb();
