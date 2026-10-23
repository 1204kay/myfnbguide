// 2026-10-23：旧条目核对里，复核又判 serious、但同时给了改好的句子的 3 条（jpda3、q8lnh、qd6h4），规则把它们撤下或暂缓了。
// 新条目照旧（复核 serious 不进精选）；旧条目已经公开，撤下等于把读者看到的拿掉，所以这 3 条人工看过复核的改法后照它写回、恢复公开
// （jpda3 只补「若业主将全部金额用于建筑和设备」这个前提，不加免责声明）。nguot 是 note.com 付费文章（正文 399 字），照付费墙规则撤下。
// 十一 10-23 20:30 同意；Kay 10-23 19:04「你和十一决定」。改前留在 backup_old_check_20261023_*（old-apply 写回前备份过的）和审计记录里。
// 不带参数只打出改前改后；--apply 写回。
//   sudo docker compose run --rm -T -v <检出>/myfnb:/app/myfnb:ro worker node myfnb/old-items-recheck-fix-2026-10-23.ts [--apply]
import { overrideFields, setVisibility } from "@aihot/backend/admin/content";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";

const apply = process.argv.includes("--apply");
const ACTOR = "核对员（讨论串 MYFNB 读者为什么想点开，旧条目核对 10-23）";
const WHY = "旧条目核对 10-23：复核判 serious 但给了改法，人工看过照改法写回（十一 10-23）";

// 每条：标题、导读整句换掉的，写在这里；point1 换掉要点第一条（其余要点用核对表里第一遍改好的）。
const FIX: Record<string, { title?: string; summary?: string; point1?: string; reason?: string; withdraw?: true }> = {
  jpda3ptzjph38d9rt6x89idpj: {
    summary: "美国餐饮媒体FSR的文章指出，餐厅装修的预算不能只算工程和设备，许可、设计、检查、技术升级以及老店可能需要的电气、管道、通风改造都可能大幅推高总投入。文章以一项40万美元的装修为例，若业主将全部金额用于建筑和设备，成本意外上涨15%就会多出6万美元；另一家月均营业额10万美元的餐厅若在两个月装修期只做到正常营业额的60%，收入约减少8万美元，但这并不等于等额利润损失，因为部分变动费用也可能下降，而租金、保险等固定支出可能仍在。",
  },
  q8lnhuzhbkenjfbbwxuijrahi: {
    title: "大量火锅店上新地域风味锅底，为何多数门店三个月左右点单率就下滑",
    point1: "大量火锅店上新地域锅底，其中多数门店三个月左右点单率下滑；原文拆出蘸料、涮菜、口味改良和备货四个环节的失败原因。",
  },
  qd6h4xm6ahlsj0kyi1g06krt6: {
    summary: "中国烹饪协会调研显示，2026年国庆假期受访餐饮企业营业收入同比上升或持平的占53.6%。美团数据显示，今年中秋、国庆假期堂食餐饮日均消费额同比增长3.4%、客单价小幅下降3.4%，外卖餐饮日均消费额增长9.7%、客单价同比增长12.0%。分析指出，增长模型从提客单转向提翻台、提复购、提连带；煲仔皇做会员充值、四季椰林做储值，以提前锁定节后复购。",
    // 核对员给的理由和摘要第二句几乎逐字一样，读者看到两遍；只核对不重写，所以去掉理由，条目留着。
    reason: "",
  },
  nguotwlb9wncow84779a01jmo: { withdraw: true },
};

for (const [id, f] of Object.entries(FIX)) {
  const [r] = await sql<{ new_title: string | null; new_summary: string | null; new_reason: string | null }[]>`SELECT new_title, new_summary, new_reason FROM old_check_20261023 WHERE article_id = ${id}`;
  const [now] = await sql<{ title: string; summary: string | null; reason: string | null }[]>`SELECT title, summary, reason FROM publications WHERE article_id = ${id}`;
  const [ov] = await sql<{ visibility: string | null; version: number }[]>`SELECT visibility, version FROM editorial_overrides WHERE article_id = ${id}`;
  if (!r || !now) { console.log(`${id} 找不到，跳过`); continue; }
  console.log(`\n## ${id}  现在：${ov?.visibility ?? "public"}  →  ${f.withdraw ? "撤下" : "公开"}`);
  if (f.withdraw) {
    if (apply && ov?.visibility !== "withdrawn") await setVisibility(id, { visibility: "withdrawn", reason: "付费文章只拿到免费开头（正文 399 字），要点写不出读者能用的内容（十一 10-23）", version: ov?.version ?? 0 }, ACTOR);
  } else {
    const points = (r.new_reason ?? "").split("\n").filter(Boolean);
    if (f.point1) points[0] = f.point1;
    const next = { title: f.title ?? r.new_title ?? now.title, summary: f.summary ?? r.new_summary ?? now.summary ?? "", reason: f.reason ?? points.join("\n") };
    const fields: Record<string, string> = {};
    for (const [k, a, b] of [["title", now.title, next.title], ["summary", now.summary, next.summary], ["reason", now.reason, next.reason]] as const) {
      if ((a ?? "") === b) continue;
      fields[k] = b;
      console.log(`${k}\n  改前：${a}\n  改后：${b}`);
    }
    if (apply) {
      let version = ov?.version ?? 0;
      if (Object.keys(fields).length) { await overrideFields(id, { fields, reason: WHY, version }, ACTOR); version++; }
      if (ov?.visibility === "withdrawn") await setVisibility(id, { visibility: "public", reason: WHY, version }, ACTOR);
    }
  }
  if (apply) await sql`UPDATE old_check_20261023 SET applied_at = coalesce(applied_at, now()), error = NULL WHERE article_id = ${id}`;
}
console.log(apply ? "\n已写回。" : "\n只预览，没有动线上；写回用 --apply。");
await stopBoss();
await closeDb();
