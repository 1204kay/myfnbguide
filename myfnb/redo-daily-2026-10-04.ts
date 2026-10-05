// 2026-10-05：10/4 那一期日报（第 1 期）有三个问题（全站布局方案 D12、C 节 2.2.0–2.3.2）：节名是改名以前的「同行经验」「老板说」
// 「省人省钱」「生意风向」；头条是中国国家统计局的单一国家统计，写着「全国」「限额以上单位」（HANDOFF §2.2：单一国家的统计
// 不当头条）；4544 亿、55%、33% 这几组数字在头条和正文两节里重复出现。这一期编在改节名和加词表以前，标题、摘要和节名都存在
// 这一期里，后来改了条目也不会跟着变。2026-W40 周报是用这一期编的。
// 两种处理都会替换或删除已经发布的一期，要用户同意以后才跑：
//   --recompose 按现在的规则和条目文字重新编排这一期（框架的 composeDaily；旧版本存进 report_revisions，不公开），再用重编后的
//               日报重新编 2026-W40 周报（调用一次写周报总述的模型）。先跑 rewrite-copy-2026-10-05b.ts，条目的用词改好了再重编。
//   --withdraw  撤下这一期和 2026-W40 周报（删除这两行和它们的修订记录）。删了以后定时任务不会再补这一期日报；周报在 10/12
//               下一期到期以前，每半小时会试编一次 2026-W40 并记一条「no daily entries」失败，到期后自动停止。
// 不带参数：只预览，不写库：列出这一期现在的问题，以及按现在的规则重编会得到什么。
//   sudo docker compose exec -T -u root worker node myfnb/redo-daily-2026-10-04.ts
//   sudo docker compose exec -T -u root worker node myfnb/redo-daily-2026-10-04.ts --recompose
import { EDITION_TIMES } from "@aihot/site";
import { beijingAt } from "@aihot/contracts/time";
import { closeDb, sql } from "@aihot/backend/db";
import { wordingProblems } from "@aihot/backend/editorial/wording";
import { emit } from "@aihot/backend/modules";
import { composeDaily, composeWeekly } from "@aihot/backend/reports/compose";
import { arrangeDaily, dailyEdition, SECTION_ORDER, sectionOf } from "@aihot/backend/reports/edition";

const DATE = "2026-10-04";
const WEEK = "2026-W40";
const REASON = "2026-10-05 按现在的节名、用词和头条规则重新编排（全站布局方案 D12）";
const mode = process.argv.includes("--recompose") ? "recompose" : process.argv.includes("--withdraw") ? "withdraw" : "preview";

type Entry = { itemId?: string; title: string; summary?: string };
interface Issue { lead: { title: string; leadParagraph: string } | null; leadItemId: string | null; sections: Array<{ label: string; items: Entry[] }> }

/** What a reader would object to in an issue: old section names, wording, and one set of numbers printed for two items. */
function problems(issue: Issue): string[] {
  const out: string[] = [];
  for (const s of issue.sections) if (!SECTION_ORDER.includes(s.label)) out.push(`节名「${s.label}」不是现在的节名`);
  const places: Array<{ id: string; text: string }> = [
    ...(issue.lead ? [{ id: issue.leadItemId ?? "头条", text: `${issue.lead.title} ${issue.lead.leadParagraph}` }] : []),
    ...issue.sections.flatMap((s) => s.items.map((it) => ({ id: it.itemId ?? it.title, text: `${it.title} ${it.summary ?? ""}` }))),
  ];
  if (issue.lead) for (const p of wordingProblems({ titleZh: issue.lead.title, summaryZh: issue.lead.leadParagraph, reasonZh: null })) out.push(`头条：${p}`);
  for (const s of issue.sections) for (const it of s.items) for (const p of wordingProblems({ titleZh: it.title, summaryZh: it.summary ?? "", reasonZh: null })) out.push(`${s.label}「${it.title}」：${p}`);
  // A number of two or more digits, or with a decimal or a percent sign, in the copy of two different items.
  const seen = new Map<string, Set<string>>();
  for (const p of places) for (const n of new Set(p.text.match(/\d+(?:[.,]\d+)*%?/g) ?? [])) {
    if (!/\d\d|[.%]/.test(n)) continue;
    seen.set(n, (seen.get(n) ?? new Set()).add(p.id));
  }
  for (const [n, ids] of seen) if (ids.size > 1) out.push(`数字「${n}」出现在 ${ids.size} 条里`);
  return out;
}

function print(title: string, issue: Issue) {
  console.log(`\n== ${title}`);
  console.log(`头条：${issue.lead?.title ?? "（无）"}`);
  for (const s of issue.sections) {
    console.log(`  ${s.label}`);
    for (const it of s.items) console.log(`    - ${it.title}`);
  }
  const found = problems(issue);
  console.log(found.length ? `问题 ${found.length} 处：\n${found.map((p) => `  · ${p}`).join("\n")}` : "问题 0 处");
}

const [stored] = await sql<{ id: number; revision: number; content: Issue }[]>`SELECT id, revision, content FROM reports WHERE kind = 'daily' AND key = ${DATE}`;
const [weekly] = await sql<{ id: number }[]>`SELECT id FROM reports WHERE kind = 'weekly' AND key = ${WEEK}`;
if (!stored) console.log(`没有 ${DATE} 这一期日报（已经撤下了？）`);
else print(`现在的 ${DATE} 日报（第 ${stored.revision} 版）`, stored.content);

if (mode === "preview") {
  // What composeDaily would write now, without writing it.
  const end = beijingAt(DATE, EDITION_TIMES.daily);
  const edition = await dailyEdition(DATE, new Date(end.getTime() - 86400000), end);
  if (!edition.entries.length) console.log(`\n按现在的规则重编：窗口里没有入选条目，编不出这一期，只能撤下（--withdraw）。`);
  else {
    const { main } = arrangeDaily(edition.entries);
    const lead = main[0]!;
    print("按现在的规则重编会得到（预览，不写库）", {
      lead: { title: lead.entry.title, leadParagraph: lead.entry.summary }, leadItemId: lead.entry.itemId,
      sections: SECTION_ORDER.map((label) => ({ label, items: main.filter((e) => sectionOf(e.category) === label).map((e) => e.entry) })).filter((s) => s.items.length > 0),
    });
    console.log(`头条的标签：${lead.tags.join("、")}（只带一个国家的“市场/数据”就是单一国家的统计，重编前先处理这一条）`);
  }
  console.log(`\n${WEEK} 周报：${weekly ? "有，用这一期日报编的" : "没有"}。要执行，加 --recompose（重编）或 --withdraw（撤下）。`);
} else if (mode === "recompose") {
  const daily = await composeDaily(DATE, REASON);
  const [now] = await sql<{ content: Issue }[]>`SELECT content FROM reports WHERE kind = 'daily' AND key = ${DATE}`;
  print(`重编后的 ${DATE} 日报（${daily.entries} 条）`, now!.content);
  if (weekly) console.log(`\n${WEEK} 周报已重编：${(await composeWeekly(WEEK, REASON)).entries} 条`);
} else {
  const removed = await sql.begin(async (tx) => {
    const rows = await tx<{ kind: string; key: string }[]>`
      DELETE FROM reports WHERE (kind = 'daily' AND key = ${DATE}) OR (kind = 'weekly' AND key = ${WEEK}) RETURNING kind, key`;
    if (rows.length) await emit("reportsChanged", { reason: `${DATE} daily and ${WEEK} weekly withdrawn` }, tx);
    return rows;
  });
  console.log(`\n已撤下：${removed.map((r) => `${r.kind} ${r.key}`).join("、") || "（没有可撤的）"}；修订记录随之删除。`);
}
await closeDb();
