// 2026-10-23：两名核对员拿原文盲核同一批 20 条（讨论串「MYFNB 读者为什么想点开」），现在站上的写法里有 6 条两人都判为严重的错。
// 这里只改错的那一句（标题、摘要或收录理由），其他文字不动。做法照 fix-item-title-2026-10-23.ts：走后台人工更正（overrideFields，
// 有审计记录，重跑模型不会盖掉），日报、周报和参考库故事里同一句一起换；改之前把涉及的条目、人工更正、报告和故事整行备份到
// backup_items_20261023_*。十一 10-23 定。每一处都要整句对上才改：已经是新句子的算改过，两样都对不上的只列出、不改。
// 不带参数只预览；--apply 执行。可以重复跑。
//   sudo docker compose run --rm -T -v <检出>/myfnb:/app/myfnb:ro worker node myfnb/fix-items-2026-10-23.ts [--apply]
import { overrideFields } from "@aihot/backend/admin/content";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";

type Field = "title" | "summary" | "reason";
const FIXES: Array<{ id: string; field: Field; from: string; to: string; why: string }> = [
  {
    id: "vvx9s8z2a0rmcl1pj3477cvt4", field: "summary",
    from: "小型快餐店建店成本为 15 万至 30 万卢比，休闲餐厅为 45 万至 100 万卢比",
    to: "小型快餐店建店成本为 150 万至 300 万卢比，休闲餐厅为 450 万至 1000 万卢比",
    why: "lakh 换算错了 10 倍：原文 ₹15–30 lakh、₹45 lakh–₹1 crore",
  },
  {
    id: "vw2y0eei7gpnri4i7rwl1hdzf", field: "reason",
    from: "意大利餐厅把希腊土耳其的小盘拼桌改成意式小食，六道小菜里四道可提前备好，靠组合定价拉高客单。",
    to: "意大利餐饮媒体建议意大利餐厅借用希腊土耳其的小盘拼桌，给出六道小菜的方案，其中四道可提前备好，组合定价拉高客单。",
    why: "原文是杂志给出的方案（Ecco una proposta per novembre），没有哪家餐厅这样做过",
  },
  {
    id: "xrcbzs5wo1ehk5oj74mthoaun", field: "title",
    from: "新西兰 Levain 面包店靠一款获奖咸派把停业后的营业额拉高 20%",
    to: "新西兰 Levain 面包店靠一款获奖咸派，营业额比停业前高 20%",
    why: "原文 up 20% on that pre-closure, 50% up from closure：20% 是和停业前比",
  },
  {
    id: "z6iujzdwyqqu0fqi3po25ygs9", field: "reason",
    from: "一家咖啡烘焙店从疫情中签租约开店到筹备曼哈顿第三家店",
    to: "一家咖啡烘焙店从疫情前签下租约、疫情中开出第一家店，到筹备曼哈顿第三家店",
    why: "原文 signed the lease November 2019, before COVID",
  },
  {
    id: "skuun0auxsapw48tfnousvb9u", field: "summary",
    from: "他的做法是在营业笔记里为每道卖完的菜加一行",
    to: "他建议先只挑一道菜，在营业笔记里为它加一行",
    why: "原文是建议、例子是假设的（仮例），并明说先从一道菜开始（最初は一品だけ）",
  },
  {
    id: "skuun0auxsapw48tfnousvb9u", field: "reason",
    from: "日本小餐馆店主把卖完的时刻和之后被拒的注记在一行里，用来决定下一轮备料量。",
    to: "日本小餐馆店主建议把卖完的时刻和之后被拒的份数记在一行里，再决定下一轮怎么备料。",
    why: "同上：原文是建议，不是店主已有的做法",
  },
  {
    id: "kx2e4k9ergo6dcqys57dgaz86", field: "title",
    from: "巴西餐饮顾问：后厨分份不称重，餐厅成本率会悄悄升高",
    to: "巴西点餐系统公司博客：后厨分份不称重，餐厅成本率会悄悄升高",
    why: "Ricardo Sandes 是在圣保罗经营约 16 家店的经营者，不是顾问；文章是 Goomer 博客",
  },
  {
    id: "kx2e4k9ergo6dcqys57dgaz86", field: "summary",
    from: "在巴西经营约16家门店的Ricardo Sandes认为，控制成本率（CMV，菜品成本占售价的比例）靠的是操作台上一直用到收工的分份秤，而不是纸面上的标准配方。",
    to: "巴西点餐系统公司 Goomer 的博客认为，控制成本率（CMV，菜品成本占售价的比例）靠的是操作台上一直用到收工的分份秤，而不是纸面上的标准配方；在圣保罗经营约16家门店的Ricardo Sandes说，第三份不过秤就会损失约10%的利润率。",
    why: "「秤比配方卡管用」是博客自己的论点（A tese deste texto），Sandes 说的是第三份不称损失 10%",
  },
];
const ACTOR = "十一（讨论串 MYFNB 读者为什么想点开）";

const apply = process.argv.includes("--apply");
const ids = [...new Set(FIXES.map((f) => f.id))];
const times = (text: string, s: string) => text.split(s).length - 1;
const pubs = new Map((await sql<{ article_id: string; title: string; summary: string | null; reason: string | null }[]>`
  SELECT article_id, title, summary, reason FROM publications WHERE article_id IN ${sql(ids)}`).map((p) => [p.article_id, p]));

// 每一处：条目字段里是旧句（要改）、新句（改过）还是都不是（不改，列出来给人看）。
const plan = FIXES.map((f) => {
  const now = pubs.get(f.id)?.[f.field] ?? "";
  const state = now.includes(f.from) ? "要改" : now.includes(f.to) ? "改过" : "对不上";
  return { ...f, now, state };
});
for (const p of plan) console.log(`${p.id} ${p.field}：${p.state}${p.state === "对不上" ? `（现在是「${p.now}」）` : ""}`);

const reports = await sql<{ id: number; kind: string; key: string; text: string }[]>`SELECT id, kind, key, content::text AS text FROM reports`;
const stories = await sql<{ article_id: string; text: string }[]>`SELECT article_id, story::text AS text FROM reference_cases WHERE story IS NOT NULL`;
const hits = (rows: Array<{ text: string }>, s: string) => rows.filter((r) => r.text.includes(s));
for (const p of plan) {
  for (const r of hits(reports, p.from)) console.log(`  报告 ${r.kind} ${r.key} 有旧句 ${times(r.text, p.from)} 处`);
  for (const s of hits(stories, p.from)) console.log(`  故事 ${s.article_id} 有旧句 ${times(s.text, p.from)} 处`);
}
const todo = plan.filter((p) => p.state === "要改");
if (!apply) {
  console.log(`预览：条目要改 ${todo.length} 处，改过 ${plan.filter((p) => p.state === "改过").length} 处，对不上 ${plan.filter((p) => p.state === "对不上").length} 处`);
  await closeDb();
  process.exit(0);
}

const fromList = FIXES.map((f) => f.from);
await sql`CREATE TABLE IF NOT EXISTS backup_items_20261023_pub AS SELECT * FROM publications WHERE article_id IN ${sql(ids)}`;
await sql`CREATE TABLE IF NOT EXISTS backup_items_20261023_override AS SELECT * FROM editorial_overrides WHERE article_id IN ${sql(ids)}`;
const touchedReports = reports.filter((r) => fromList.some((s) => r.text.includes(s))).map((r) => r.id);
const touchedStories = stories.filter((r) => fromList.some((s) => r.text.includes(s))).map((r) => r.article_id);
await sql`CREATE TABLE IF NOT EXISTS backup_items_20261023_reports AS SELECT * FROM reports WHERE id IN ${sql(touchedReports.length ? touchedReports : [-1])}`;
await sql`CREATE TABLE IF NOT EXISTS backup_items_20261023_stories AS SELECT * FROM reference_cases WHERE article_id IN ${sql(touchedStories.length ? touchedStories : [""])}`;

for (const id of new Set(todo.map((p) => p.id))) {
  const mine = todo.filter((p) => p.id === id);
  const fields: Partial<Record<Field, string>> = {};
  for (const p of mine) fields[p.field] = (fields[p.field] ?? p.now).replace(p.from, p.to);
  const [ov] = await sql<{ version: number }[]>`SELECT version FROM editorial_overrides WHERE article_id = ${id}`;
  await overrideFields(id, { fields, reason: mine.map((p) => p.why).join("；"), version: ov?.version ?? 0 }, ACTOR);
  console.log(`${id} 已改：${Object.keys(fields).join("、")}`);
}
for (const f of FIXES) {
  const r = await sql`UPDATE reports SET content = replace(content::text, ${f.from}, ${f.to})::jsonb WHERE content::text LIKE ${"%" + f.from + "%"}`;
  const s = await sql`UPDATE reference_cases SET story = replace(story::text, ${f.from}, ${f.to})::jsonb WHERE story::text LIKE ${"%" + f.from + "%"}`;
  if (r.count || s.count) console.log(`${f.id} ${f.field}：报告 ${r.count} 份、故事 ${s.count} 篇已换`);
}
for (const p of (await sql<{ article_id: string; title: string; summary: string | null; reason: string | null }[]>`
  SELECT article_id, title, summary, reason FROM publications WHERE article_id IN ${sql(ids)}`)) {
  console.log(`改后 ${p.article_id}\n  标题：${p.title}\n  摘要：${p.summary}\n  理由：${p.reason}`);
}
// 人工更正会往 digest 队列加任务，打开了队列连接；不关掉进程就不退出（见 fix-item-title-2026-10-23.ts）。
await stopBoss();
await closeDb();
