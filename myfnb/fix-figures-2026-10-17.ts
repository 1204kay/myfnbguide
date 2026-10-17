// 2026-10-17：出图规则改版后批量重写，还剩 5 张单位不同的数字卡，加上抽查漏掉的 1 张（共 8 个图块）。十一核过前后图后，逐块手改：
// 一张卡只留一个主数字、其余数字挪进图下说明，或者同一个量的改成对比条。只在线上那一块还是改前那张卡时才换，可以重复跑。
// 先备份到 backup_ref_cases_figfix_20261017 / backup_ref_bodies_figfix_20261017。默认只预览，加 --apply 才写。
//   sudo docker compose exec -T worker node myfnb/fix-figures-2026-10-17.ts --apply
import { closeDb, sql } from "@aihot/backend/db";
import { BlockSchema, computeBlock } from "../modules/reference/backend/write.ts";

const apply = process.argv.includes("--apply");
const fixes: { kind: "case" | "body"; id: string; part: number; block: number; was: string[]; to: unknown }[] = [
  { kind: "body", id: "bfjxsb5i2lober9udr6j0cyy9", part: 0, block: 1, was: ["0.7%","0.6%","2.9%"],
    to: {"type":"numbers","point":"意大利 2026 年经济增长预测只有 0.7%","items":[{"label":"2026 年 GDP 增长","value":"0.7%"}],"caption":"Fipe 研究中心根据 Istat 数据整理；同年家庭支出增长 0.6%，通胀 2.9%"} },
  { kind: "body", id: "bfjxsb5i2lober9udr6j0cyy9", part: 1, block: 2, was: ["28%","2.90 欧元","10%"],
    to: {"type":"numbers","point":"早餐占了全部到店次数的近三成","items":[{"label":"早餐占全部到店","value":"28%"}],"caption":"Istat、TradeLab 的 2024 年外出消费数据；早餐客单价 2.90 欧元，上午小歇占到店 10%"} },
  { kind: "body", id: "bfjxsb5i2lober9udr6j0cyy9", part: 2, block: 2, was: ["59.3 亿欧元","46.6 亿欧元","42.3 亿欧元"],
    to: {"type":"compare","by":"group","unit":"亿欧元","per":null,"items":[{"label":"餐饮业","value":59.3},{"label":"农业","value":46.6},{"label":"食品工业","value":42.3}],"caption":"2025 年餐饮业增加值超过农业和食品工业；Fipe 研究中心根据 Istat 数据整理"} },
  { kind: "case", id: "cztuck9hv6bkvmcg9ykwcvzq5", part: 0, block: 1, was: ["188.3 亿美元","76%"],
    to: {"type":"numbers","point":"独立门店仍占印度咖啡市场的大部分","items":[{"label":"独立门店份额","value":"76%"}],"caption":"Mordor Intelligence 的数据，由 Petpooja 博客引用；2025 年市场规模 188.3 亿美元"} },
  { kind: "case", id: "y73b9t0is1zykaw2yowryklt1", part: 0, block: 2, was: ["37584","2.1%"],
    to: {"type":"numbers","point":"西班牙餐饮业就业继续增加，八月新增一批参保人员","items":[{"label":"新增参保人数","value":"37584 人"}],"caption":"西班牙工业与旅游部的数据，2026 年 8 月，其中住宿服务 13929 人、餐饮服务 23655 人；受雇人数同比增加 2.1%"} },
  { kind: "case", id: "m2jsnq3xz31z3ynemxzytm4cx", part: 1, block: 1, was: ["90 秒","2.5 到 3 分钟","近两小时"],
    to: {"type":"numbers","point":"自助屏 90 秒就能完成一单点餐","items":[{"label":"自助屏完成一单点餐","value":"90 秒"}],"caption":"文章给出的用时：熟练收银员在忙档完成同样流程要 2.5 到 3 分钟，每天 200 单时自助屏省下近两小时收银时间"} },
  { kind: "case", id: "q76u515xsf1q6steoh0fg41yy", part: 1, block: 1, was: ["第 3 位","第 160 位","10 欧元"],
    to: {"type":"numbers","point":"平台付费排名每单要 10 欧元","items":[{"label":"每单买排名的费用","value":"10 欧元"}],"caption":"来自 Gym Cook 创办人在播客里的说法；平台改成付费排名后，这家店从自然排名第 3 位掉到第 160 位"} },
  { kind: "case", id: "zz8bbjk08ntqfpxwwjkx96jh8", part: 4, block: 2, was: ["35 元/人","67 元/人"],
    to: {"type":"compare","by":"time","unit":"元/人","per":null,"items":[{"label":"2024 年","value":35},{"label":"2026 年上半年","value":67}],"caption":"餐饮行业公域获客成本两年间接近翻倍；火锅品类达到 80 到 100 元一人"} },
];

const ids = (kind: string) => [...new Set(fixes.filter((f) => f.kind === kind).map((f) => f.id))];
if (apply) {
  await sql`CREATE TABLE IF NOT EXISTS backup_ref_cases_figfix_20261017 AS SELECT * FROM reference_cases WHERE article_id IN ${sql(ids("case"))}`;
  await sql`CREATE TABLE IF NOT EXISTS backup_ref_bodies_figfix_20261017 AS SELECT * FROM reference_bodies WHERE article_id IN ${sql(ids("body"))}`;
}
let changed = 0;
for (const kind of ["case", "body"] as const) for (const id of ids(kind)) {
  const [row] = kind === "case"
    ? await sql<{ doc: any }[]>`SELECT story AS doc FROM reference_cases WHERE article_id = ${id} AND status = 'story'`
    : await sql<{ doc: any }[]>`SELECT body AS doc FROM reference_bodies WHERE article_id = ${id} AND status = 'body'`;
  if (!row) { console.log(`${id}：不在线上，跳过`); continue; }
  const doc = row.doc;
  let n = 0;
  for (const f of fixes.filter((x) => x.id === id)) {
    const cur = doc.parts?.[f.part]?.blocks?.[f.block];
    if (cur?.type !== "numbers" || JSON.stringify(cur.items.map((i: { value: string }) => i.value)) !== JSON.stringify(f.was)) {
      console.log(`${id} 第 ${f.part + 1} 段第 ${f.block + 1} 块：已不是改前那张卡，跳过`);
      continue;
    }
    doc.parts[f.part].blocks[f.block] = computeBlock(BlockSchema.parse(f.to));
    console.log(`${id} 第 ${f.part + 1} 段第 ${f.block + 1} 块：${f.was.join(" / ")} → ${(f.to as { type: string }).type}`);
    n++;
  }
  if (!n || !apply) continue;
  const json = JSON.stringify(doc);
  if (kind === "case") await sql`UPDATE reference_cases SET story = ${json}::text::jsonb, updated_at = now() WHERE article_id = ${id}`;
  else await sql`UPDATE reference_bodies SET body = ${json}::text::jsonb, updated_at = now() WHERE article_id = ${id}`;
  changed += n;
}
console.log(apply ? `写入 ${changed} 块` : "预览，没有写；加 --apply 才写");
await closeDb();
