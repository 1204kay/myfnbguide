// 2026-10-23：note.com 的付费文章我们只拿到免费的开头（这 2 条 203、301 字，没有一个数字），要点写不出读者能用的东西。
// 新入选的已经由核对员拦下（modules/checker/backend/check.ts）；上线前已经入选、正文不足 400 字（和核对员的门槛一样）的这 2 条走后台的「撤下」（withdrawn），
// 不删数据，有审计记录，随时可以在后台改回公开。十一 10-23 定，Kay 10-23 16:51「你和十一讨论决定」。
// 不带参数只预览；--apply 执行。可以重复跑：已经撤下的跳过。
//   sudo docker compose run --rm -T -v <检出>/myfnb:/app/myfnb:ro worker node myfnb/hide-paywall-2026-10-23.ts [--apply]
import { setVisibility } from "@aihot/backend/admin/content";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";

const URLS = [
  "https://note.com/quiet_record_01/n/n90a755f7d4b7",
  "https://note.com/gifukissa_lover/n/nf88e200350d8",
];
const REASON = "付费文章只拿到免费开头，要点写不出读者能用的内容（十一 10-23）";
const apply = process.argv.includes("--apply");

const rows = await sql<{ id: string; url: string; title_zh: string | null; selected: boolean | null; visibility: string | null; version: number | null; body: number | null }[]>`
  SELECT a.id, a.url, p.title AS title_zh, p.selected, o.visibility, o.version, length(a.body_text) AS body
  FROM articles a LEFT JOIN publications p ON p.article_id = a.id LEFT JOIN editorial_overrides o ON o.article_id = a.id
  WHERE a.url IN ${sql(URLS)}`;
console.log(`找到 ${rows.length} 条（应为 ${URLS.length}）`);
for (const r of rows) {
  const done = r.visibility === "withdrawn";
  console.log(`${done ? "已撤下，跳过" : apply ? "撤下" : "将撤下"}  ${r.id}  正文 ${r.body} 字  精选 ${r.selected}  可见 ${r.visibility ?? "public"}  ${r.title_zh}  ${r.url}`);
  if (apply && !done) await setVisibility(r.id, { visibility: "withdrawn", reason: REASON, version: r.version ?? 0 }, "thread:myfnb-points");
}
await stopBoss();
await closeDb();
