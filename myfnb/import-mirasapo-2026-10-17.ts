// 2026-10-17：ミラサポplus（中小企業庁的支援事例库，政府标准利用规约 PDL1.0，robots 写 ai-input=yes）里的餐饮案例一次性导入。
// 案例页是浏览器里才填内容的模板，框架抽不到正文，所以由这里从它公开的 JSON 接口读正文，走框架自己的入口（upsertMaterial，
// 和 archive 模块同一条路）：按原文日期归为历史（不进「今天」、不推送），照常评分（故事优先，门槛 46）。
// 2,286 个案例里业种写着飲食的 38 个，去掉内容相同的重复登记 7 个和不是开店的 5 个（化妆品、零售、精酿批发、支援团体），剩 26 个。
// 来源 import-mirasapo 由 seed 建（kind external，采集不碰它）。每个请求间隔 1.5 秒。不带参数只数条数，--apply 才写入。
//   sudo docker compose exec -T worker node myfnb/import-mirasapo-2026-10-17.ts --apply
import { closeDb, sql } from "@aihot/backend/db";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { queueProcessing } from "@aihot/backend/jobs/content";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { guardedFetch } from "@aihot/backend/lib/http-fetch";

const IDS = [1621, 1618, 1608, 1546, 1559, 1468, 1475, 696, 647, 614, 1465, 1455, 1575, 1471, 1474, 1473, 1510, 1995, 1837, 1775, 1556, 284, 285, 1564, 1992, 1650];
const SOURCE = "import-mirasapo";
const apply = process.argv.includes("--apply");

const [source] = await sql<{ id: string }[]>`SELECT id FROM sources WHERE id = ${SOURCE}`;
if (!source) throw new Error(`${SOURCE} 还没建：先部署（seed 会建）`);

// 正文各段是 Markdown，「ー」是空栏。
const part = (v: unknown) => (typeof v === "string" && v.trim() && v.trim() !== "ー" ? v.trim() : null);
let created = 0;
for (const [i, id] of IDS.entries()) {
  if (i) await new Promise((resolve) => setTimeout(resolve, 1500));
  const res = await guardedFetch(`https://mirasapo-plus.go.jp/jirei-api/case_studies/${id}`, { timeoutMs: 30_000, maxBytes: 2 * 1024 * 1024, maxRedirects: 2 });
  if (res.status !== 200) { console.log(`${id}：HTTP ${res.status}，跳过`); continue; }
  const c = JSON.parse(res.text()) as Record<string, any>;
  const body = [part(c.summary), part(c.background), part(c.challenges), part(c.results), part(c.prospect)].filter(Boolean).join("\n\n");
  const org = [c.organization?.name, c.location?.name, c.organization?.industry].filter(Boolean).join(" · ");
  const material = {
    sourceId: SOURCE,
    url: `https://mirasapo-plus.go.jp/jirei-navi/case_studies/${id}`,
    title: String(c.title),
    author: c.organization?.name ?? null,
    language: "ja",
    publishedAt: c.published_date ? new Date(`${c.published_date}T00:00:00+09:00`) : null,
    bodyText: `${org ? `${org}\n\n` : ""}${body}`,
    raw: { externalId: String(id), year: c.year ?? null },
    via: "import",
    backfill: "import",
  };
  console.log(`${id} ${c.published_date} ${material.bodyText.length} 字 ${c.title}`);
  if (!apply) continue;
  const r = await upsertMaterial(material);
  if (r.created || r.revised || r.processingNeeded) await queueProcessing(r.articleId);
  if (r.created) created += 1;
}
console.log(apply ? `新建 ${created} 条，已交给 worker 评分` : "只数了条数；加 --apply 写入");
await stopBoss();
await closeDb();
