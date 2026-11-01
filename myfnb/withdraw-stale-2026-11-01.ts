// 2026-11-01：两条把当年的规定当成现在的做法教给读者的旧精选撤下（withdrawn，不删，能改回）。
// 依据：手册 业务线/myfnbguide/记录/2026-11-01/原文过期和参考库小问题.md 第一节；Kay 11-01 12:35「你和十一讨论吧」，十一定撤下、先备份。
// 和 10-23 撤加州附加费那条同一类（手册决定记录 L884）：错在内容本身，补一句年份改不对，要改对就得写进原文没有的事实。
// 不带 --apply：只打印这两条现在的标题和可见性。--apply：先整行备份到 backup_stale_20261101_*，再撤下（后台 setVisibility，有审计记录）。
// RESTORE=1：按备份把可见性改回去。
//   sudo docker compose run --rm -T -v <检出>/myfnb:/app/myfnb:ro worker node myfnb/withdraw-stale-2026-11-01.ts [--apply]
import { setVisibility } from "@aihot/backend/admin/content";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";

const ACTOR = "讨论串 修好 MYFNB 挑稿评分（原文过期 11-01）";
const ITEMS: Record<string, string> = {
  lc8nwdmzahzkj4td28l8nc8q6: "原文过期：2021 年的信用卡附加费合规做法，美国此后改过（加州 SB 478、SB 1524；Visa 2023-04 上限降到 3%）",
  eeywvxzrsxg4208n5ppm62vmc: "原文过期：2019 年的日本营业许可流程，2021-06 起喫茶店营业许可已并入饮食店营业许可",
};
const ids = Object.keys(ITEMS);
const apply = process.argv.includes("--apply");
const restore = process.env.RESTORE === "1";

const rows = await sql<{ article_id: string; title: string }[]>`SELECT article_id, title FROM publications WHERE article_id IN ${sql(ids)}`;
const overrides = async (id: string) =>
  (await sql<{ version: number; visibility: string | null }[]>`SELECT version, visibility FROM editorial_overrides WHERE article_id = ${id}`)[0];
for (const id of ids) {
  const r = rows.find((x) => x.article_id === id);
  const ov = await overrides(id);
  console.log(`${id}  ${r ? r.title : "（找不到这条，停）"}  可见性 ${ov?.visibility ?? "public"}`);
}
if (rows.length !== ids.length) throw new Error("有条目找不到，什么都没改");

if (restore) {
  for (const id of ids) {
    const [b] = await sql<{ visibility: string | null }[]>`SELECT visibility FROM backup_stale_20261101_override WHERE article_id = ${id} LIMIT 1`;
    const ov = await overrides(id);
    await setVisibility(id, { visibility: (b?.visibility ?? "public") as "public", reason: "按 11-01 的备份改回", version: ov?.version ?? 0 }, ACTOR);
    console.log(`${id} 已改回 ${b?.visibility ?? "public"}`);
  }
} else if (apply) {
  await sql`CREATE TABLE IF NOT EXISTS backup_stale_20261101_pub AS SELECT * FROM publications WITH NO DATA`;
  await sql`CREATE TABLE IF NOT EXISTS backup_stale_20261101_override AS SELECT * FROM editorial_overrides WITH NO DATA`;
  await sql`INSERT INTO backup_stale_20261101_pub SELECT * FROM publications WHERE article_id IN ${sql(ids)}`;
  await sql`INSERT INTO backup_stale_20261101_override SELECT * FROM editorial_overrides WHERE article_id IN ${sql(ids)}`;
  for (const id of ids) {
    const ov = await overrides(id);
    if (ov?.visibility === "withdrawn") { console.log(`${id} 已经撤下，跳过`); continue; }
    await setVisibility(id, { visibility: "withdrawn", reason: ITEMS[id]!, version: ov?.version ?? 0 }, ACTOR);
    console.log(`${id} 已撤下`);
  }
} else {
  console.log("只看了，没有动线上；撤下用 --apply。");
}
await stopBoss();
await closeDb();
