// 十一说核稿试 flash（Kay 11-07 06:12「直接这期就试 flash核对」）：拿已经出刊的某一期，把 Opus 当时核过的原稿
// （两稿各自第一次核对前的样子）交给另一个模型照同一份核对提示词再核一遍，把两边挑出的问题并排列出来。
// 只读那一期和它点名的原文；不改那一期，不改网站。花的钱只有这几次核对，各记一张回执（subject trial-check:<日期>）。
//   sudo docker compose exec -T worker node myfnb/trial-flash-check.ts --date 2026-11-07                 只列要核哪几稿，不调模型
//   sudo docker compose exec -T worker node myfnb/trial-flash-check.ts --date 2026-11-07 --apply         flash 每稿核 2 次
//   … --model deepseek-flash-think-llm --reps 2                                                       默认就是这两个
import { closeDb, sql } from "@aihot/backend/db";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { checkIssue, type DayItem, type IssueText, modelAsk, type Problem, type Usage } from "../modules/reference/backend/issue.ts";

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const date = arg("--date");
if (!date || !/^\d{4}-\d{2}-\d{2}$/u.test(date)) throw new Error("--date 要一个日期，例如 2026-11-07");
const model = arg("--model") ?? "deepseek-flash-think-llm";
const reps = Number(arg("--reps") ?? 2);
const apply = process.argv.includes("--apply");

type Stored = { issue: IssueText; problems: Problem[]; edited: boolean; unchecked?: boolean };
const [row] = await sql<{ no: number | null; models: unknown; content: { drafts: Stored[]; items: Omit<DayItem, "text">[]; cut: string[] } }[]>`
  SELECT no, models, content FROM reference_issues WHERE date = ${date}`;
if (!row) throw new Error(`${date} 没有十一说`);
// 原稿：没改过、Opus 核过的那几稿（mend 后的稿 edited 为 true，挑稿后没核的带 unchecked）。
const originals = row.content.drafts.map((d, i) => ({ ...d, i })).filter((d) => !d.edited && !d.unchecked);
const ids = row.content.items.map((i) => i.id);
const texts = new Map((await sql<{ id: string; text: string }[]>`
  SELECT id::text AS id, coalesce(nullif(body_text, ''), excerpt, '') AS text FROM articles WHERE id::text = ANY(${ids})`).map((r) => [r.id, r.text]));
const items: DayItem[] = row.content.items.map((i) => ({ ...i, text: texts.get(String(i.id)) ?? "" }));
const show = (ps: Problem[]) => ps.map((p) => ({ rule: p.rule, quote: p.quote, why: p.why, fix: p.fix ?? null }));
console.log(JSON.stringify({ date, no: row.no, models: row.models, drafts: row.content.drafts.length, originals: originals.map((d) => d.i),
  missingText: items.filter((i) => !i.text).map((i) => i.n), cut: row.content.cut }, null, 1));
if (!apply) { await closeDb(); process.exit(0); }

const receiptIds: number[] = [];
const usage: Usage = { input: 0, output: 0 };
const ask = modelAsk(model, `trial-check:${date}`, receiptIds, (u) => { usage.input += u.input; usage.output += u.output; });
const out = [];
for (const d of originals) {
  const runs = [];
  for (let r = 0; r < reps; r++) runs.push(show((await checkIssue(d.issue, items, (p, s, u, sc, a) => ask(p, s, u, sc, `trial${d.i}${r}${a ?? ""}`))).problems));
  out.push({ draft: d.i, opus: show(d.problems), [model]: runs });
}
for (const id of receiptIds) await completeReceipt(sql, id);
console.log(JSON.stringify({ model, reps, usage, receiptIds, results: out }, null, 1));
await closeDb();
process.exit(0);
