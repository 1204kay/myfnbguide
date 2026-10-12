// 2026-10-12：故事标题写了数目（“十条”“七个”），正文却没有写到那么多。公开的故事页逐篇读过（线上 603 篇，标题带 3–20 的数目、
// 正文的列表和小标题数不到的 65 个，再逐篇读正文），确认不符的 13 篇：标题里的数目去掉，改成不带数目的说法（e09y7 的正文写了
// 八段，标题写五个，同样去掉数目）。只改标题这一个字段，不调模型，不动正文；改之前整行备份到 backup_ref_titles_20261012，
// 旧标题和现在存的对不上的不改（说明已被重写过）。
// 不带参数只数条数；--apply 执行。
//   sudo docker compose exec -T worker node myfnb/fix-titles-2026-10-12.ts [--apply]
import { closeDb, sql } from "@aihot/backend/db";

const FIXES: ReadonlyArray<readonly [id: string, from: string, to: string]> = [
  ["tsyx35ebkfwu5knnexus3afee", "两位顾问列出控制食材成本的五个做法", "两位顾问列出控制食材成本的做法"],
  ["uf0i8ycsh1qoswfdzlyodtclh", "一位咖啡店店主把餐饮类视频里提到的倒闭原因汇总成十项", "一位咖啡店店主把餐饮类视频里提到的倒闭原因汇总排名"],
  ["x1d6n1qw44l5vpr9f72pt1ba5", "客人还是在外卖平台下单，这家收银系统商给出十个做法", "客人还是在外卖平台下单，这家收银系统商给出让客人直接下单的做法"],
  ["ezrknctdr6u5e8syu1u61r8nd", "离职面谈问 10 个问题，从要走的人嘴里找出店里的问题", "离职面谈问一组问题，从要走的人嘴里找出店里的问题"],
  ["ugjkalpsp8tt3pw8j10df6jx2", "把接待客人拆成十步，每步都卡时间", "把接待客人拆成几步，每步都卡时间"],
  ["jm59uw91tzcp4ordzkgzi80bs", "意大利小酒馆店主把七件事写下来，也写下忙时和闲时的风险", "意大利小酒馆店主把几件事写下来，也写下忙时和闲时的风险"],
  ["ywe5v4sviv16rsqqcupsmmpa3", "一位家庭餐馆老板向员工讲述十条服务规矩", "一位家庭餐馆老板向员工讲述服务规矩"],
  ["zchd0sbh9z3t3ih9powo5xy30", "客人喝多了还要酒，这位酒吧顾问给出五步做法", "客人喝多了还要酒，这位酒吧顾问给出分步做法"],
  ["oft67ph3y0sxr5i3ztb2f0li5", "把自家改成咖啡店前，他先确认了五件事", "把自家改成咖啡店前，他先确认了几件事"],
  ["asbu59va3i5jssag4yo7pjerz", "开了 12 年店的店主列出只想着赚钱就开店的十个理由", "开了 12 年店的店主列出只想着赚钱就开店的理由"],
  ["pnvsmqwlyliznwjwa1ml9fl2s", "买下一家酒吧或餐馆前，这位顾问列出二十项要查的事", "买下一家酒吧或餐馆前，这位顾问列出要查的事"],
  ["orzpemsaopaqcpi6uy24sacad", "自宅开咖啡店十二年，店主列出七个失败要素", "自宅开咖啡店十二年，店主列出失败的要素"],
  ["e09y7zfxp5mpvc5hbhprfp2ox", "两位前餐厅老板列出新老板最常犯的五个财务错误", "两位前餐厅老板列出新老板最常犯的财务错误"],
];

const apply = process.argv.includes("--apply");
const rows = await sql<{ article_id: string; title: string }[]>`
  SELECT article_id, story->>'title' AS title FROM reference_cases WHERE article_id IN ${sql(FIXES.map((f) => f[0]))}`;
const current = new Map(rows.map((r) => [r.article_id, r.title]));
const todo = FIXES.filter(([id, from]) => current.get(id) === from);
console.log(`标题要改的 ${todo.length} / ${FIXES.length} 篇${apply ? "" : "（预览）"}`);
for (const [id, from] of FIXES) if (current.get(id) !== from) console.log(`  不改 ${id}：存着的标题是「${current.get(id) ?? "（没有这一篇）"}」`);
if (apply) {
  await sql`CREATE TABLE IF NOT EXISTS backup_ref_titles_20261012 AS SELECT * FROM reference_cases WHERE article_id IN ${sql(FIXES.map((f) => f[0]))}`;
  for (const [id, , to] of todo) {
    await sql`UPDATE reference_cases SET story = jsonb_set(story, '{title}', to_jsonb(${to}::text)), updated_at = now() WHERE article_id = ${id}`;
  }
  console.log(`已改 ${todo.length} 篇`);
}
await closeDb();
