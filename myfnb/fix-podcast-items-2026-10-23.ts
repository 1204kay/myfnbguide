// 2026-10-23：播客转写稿放回后（PR #41）重新入选的 3 条，对照原转写抽查（讨论串「MYFNB 精选卡在去重确认」）。十一 10-23 定：
// - 加州禁收附加费那条撤下（withdrawn，不删，后台可改回）：节目录在 2024-07 SB 478 生效前，全文没有年份；
//   加州 2024-06-29 又签了 SB 1524，餐厅在菜单上清楚标示就能继续收强制附加费，「要把费用并入标价」对现在的餐厅不成立。
//   要改写就得加原文没有的事实，宁缺毋滥。
// - 另两条的误导按「只补不删」补回原文的限定，其他文字不动。做法照 fix-items-2026-10-23.ts：后台人工更正（overrideFields，
//   有审计记录，重跑模型不会盖掉），日报、周报和参考库故事里同一句一起换，改前整行备份到 backup_podcast_20261023_*；
//   整句对上才改，已是新句的算改过，都对不上的只列出。
// 不带参数只预览；--apply 执行。可以重复跑。
//   sudo docker compose run --rm -T -v <检出>/myfnb:/app/myfnb:ro worker node myfnb/fix-podcast-items-2026-10-23.ts [--apply]
import { overrideFields, setVisibility } from "@aihot/backend/admin/content";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";

const WITHDRAW = { id: "nrzl9djbeyrk6d9hvktc3mnoa", reason: "节目录在 2024 年加州 SB 478 生效前，后来 SB 1524 允许餐厅标示后继续收附加费，原文已过期（十一 10-23）" };
const FIXES: Array<{ id: string; field: "reason"; from: string; to: string; why: string }> = [
  {
    id: "yvkhe7uzjifgd95qczr2w76ro", field: "reason",
    from: "他的建议是留 3 到 6 个月周转资金。",
    to: "他的建议是至少留 3 到 6 个月周转资金。",
    why: "原文 at least three to six months of working capital",
  },
  {
    id: "yvkhe7uzjifgd95qczr2w76ro", field: "reason",
    from: "隔油池和改水管（自己施工）很容易到五位数",
    to: "隔油池和改水管如果要店家自己出钱，很容易到五位数",
    why: "原文 if you've got to do it yourself 指这笔工程要店家自己承担，不是亲手施工",
  },
  {
    id: "t480limtgzfg1s8srg2em6ztz", field: "reason",
    from: "而多数咖啡从业者在 2 万至 4 万美元",
    to: "而他估计多数咖啡从业者在 2 万至 4 万美元",
    why: "原文 I think the majority ... probably：是说话人的估计",
  },
  {
    id: "t480limtgzfg1s8srg2em6ztz", field: "reason",
    from: "单店日营业额至少 2000 美元（客单价 7 至 8 美元，约合每天 300 人）",
    to: "单店日营业额至少 2000 美元（客单价 7 至 8 美元，约合每天 300 人；他说这是想扩张、让员工持股时的标准，不到这个数不等于做得不好，夫妻店一天 1700 美元也能养家）",
    why: "原文紧接着说 we're not saying that if you don't make $2,000 a day, you suck，并举夫妻店一天 1700 美元为例",
  },
];
const ACTOR = "十一（讨论串 MYFNB 精选卡在去重确认）";

const apply = process.argv.includes("--apply");
const ids = [...new Set([WITHDRAW.id, ...FIXES.map((f) => f.id)])];
const pubs = new Map((await sql<{ article_id: string; title: string; reason: string | null; visibility: string | null; version: number | null }[]>`
  SELECT p.article_id, p.title, p.reason, o.visibility, o.version FROM publications p LEFT JOIN editorial_overrides o ON o.article_id = p.article_id
  WHERE p.article_id IN ${sql(ids)}`).map((p) => [p.article_id, p]));

const w = pubs.get(WITHDRAW.id);
const withdrawn = w?.visibility === "withdrawn";
console.log(`撤下 ${WITHDRAW.id}（${w?.title}）：${withdrawn ? "已撤下" : "要撤"}`);
const plan = FIXES.map((f) => {
  const now = pubs.get(f.id)?.[f.field] ?? "";
  return { ...f, now, state: now.includes(f.from) ? "要改" : now.includes(f.to) ? "改过" : "对不上" };
});
for (const p of plan) console.log(`${p.id} ${p.field}：${p.state}  「${p.from}」`);

const reports = await sql<{ id: number; kind: string; key: string; text: string }[]>`SELECT id, kind, key, content::text AS text FROM reports`;
const stories = await sql<{ article_id: string; text: string }[]>`SELECT article_id, story::text AS text FROM reference_cases WHERE story IS NOT NULL`;
for (const p of plan) {
  for (const r of reports.filter((r) => r.text.includes(p.from))) console.log(`  报告 ${r.kind} ${r.key} 有旧句`);
  for (const s of stories.filter((s) => s.text.includes(p.from))) console.log(`  故事 ${s.article_id} 有旧句`);
}
const todo = plan.filter((p) => p.state === "要改");
if (!apply) {
  console.log(`预览：撤下 ${withdrawn ? 0 : 1} 条；要改 ${todo.length} 处，改过 ${plan.filter((p) => p.state === "改过").length} 处，对不上 ${plan.filter((p) => p.state === "对不上").length} 处`);
  await closeDb();
  process.exit(0);
}

const fromList = FIXES.map((f) => f.from);
await sql`CREATE TABLE IF NOT EXISTS backup_podcast_20261023_pub AS SELECT * FROM publications WHERE article_id IN ${sql(ids)}`;
await sql`CREATE TABLE IF NOT EXISTS backup_podcast_20261023_override AS SELECT * FROM editorial_overrides WHERE article_id IN ${sql(ids)}`;
const touchedReports = reports.filter((r) => fromList.some((s) => r.text.includes(s))).map((r) => r.id);
const touchedStories = stories.filter((r) => fromList.some((s) => r.text.includes(s))).map((r) => r.article_id);
await sql`CREATE TABLE IF NOT EXISTS backup_podcast_20261023_reports AS SELECT * FROM reports WHERE id IN ${sql(touchedReports.length ? touchedReports : [-1])}`;
await sql`CREATE TABLE IF NOT EXISTS backup_podcast_20261023_stories AS SELECT * FROM reference_cases WHERE article_id IN ${sql(touchedStories.length ? touchedStories : [""])}`;

if (w && !withdrawn) {
  await setVisibility(WITHDRAW.id, { visibility: "withdrawn", reason: WITHDRAW.reason, version: w.version ?? 0 }, ACTOR);
  console.log(`${WITHDRAW.id} 已撤下`);
}
for (const id of new Set(todo.map((p) => p.id))) {
  const mine = todo.filter((p) => p.id === id);
  let reason = mine[0]!.now;
  for (const p of mine) reason = reason.replace(p.from, p.to);
  const [ov] = await sql<{ version: number }[]>`SELECT version FROM editorial_overrides WHERE article_id = ${id}`;
  await overrideFields(id, { fields: { reason }, reason: mine.map((p) => p.why).join("；"), version: ov?.version ?? 0 }, ACTOR);
  console.log(`${id} 已改理由 ${mine.length} 处`);
}
for (const f of FIXES) {
  const r = await sql`UPDATE reports SET content = replace(content::text, ${f.from}, ${f.to})::jsonb WHERE content::text LIKE ${"%" + f.from + "%"}`;
  const s = await sql`UPDATE reference_cases SET story = replace(story::text, ${f.from}, ${f.to})::jsonb WHERE story::text LIKE ${"%" + f.from + "%"}`;
  if (r.count || s.count) console.log(`${f.id}：报告 ${r.count} 份、故事 ${s.count} 篇已换`);
}
for (const p of await sql<{ article_id: string; reason: string | null }[]>`SELECT article_id, reason FROM publications WHERE article_id IN ${sql(FIXES.map((f) => f.id))}`) {
  console.log(`改后 ${p.article_id}\n${p.reason}`);
}
// 人工更正会往 digest 队列加任务，打开了队列连接；不关掉进程就不退出（见 fix-item-title-2026-10-23.ts）。
await stopBoss();
await closeDb();
