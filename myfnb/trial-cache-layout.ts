// 十一说核稿的两种排法对比（11-02，十一定：「质量没退步再上」）。backend/issue.ts 的 Layout：
//   split（现在用的）：每一步的提示词是系统提示，只有核稿的几轮共用缓存；
//   shared（候选）：不用系统提示，点名原文放最前面，每一步的提示词放在原文后面，修稿和复核也读核稿的缓存。
// 拿一期已出的十一说里写稿人原样交的那一稿（没修过、核出问题最多的一稿），两种排法各跑：核稿两次（同一排法跑两次，
// 先看同一种排法自己会差多少，经验 C9）、复核一次、修稿一次（修稿用这一稿存下的问题，两种排法读到的一样）。
// 只写文件，不改线上任何东西；原文全文不写进文件（工作约定 §12），文件里只有我们自己的稿子和核出的问题。
//   --issue 8（必填）　--apply 才调模型，不加只算要花多少　--cap-usd 4　--out /out
// 在服务器上（一次性的容器，挂上这个分支的模块，正在跑的 worker 不动；和 trial-issues.ts 一样）：
//   sudo docker compose run --rm -v /opt/myfnbguide-trial/modules/reference:/app/modules/reference:ro \
//     -v /opt/myfnbguide-trial/myfnb:/app/myfnb:ro -v /tmp/myfnb-trial:/out worker node myfnb/trial-cache-layout.ts --issue 8 --apply
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { monthSpend } from "../modules/reference/backend/credit.ts";
import { type Ask, checkIssue, type DayItem, type Draft, edit, type IssueText, type Layout, modelAsk, type Problem, reviewIssue } from "../modules/reference/backend/issue.ts";

const args = process.argv.slice(2);
const one = (flag: string) => args.flatMap((a, i) => (a === flag && args[i + 1] ? [args[i + 1]!] : [])).at(-1);
const no = Number(one("--issue"));
if (!Number.isInteger(no) || no < 1) throw new Error("写 --issue 8");
const apply = args.includes("--apply");
const cap = Number(one("--cap-usd") ?? 4);
const MODEL = "claude-opus-5-5";

type Stored = { drafts: Array<{ issue: IssueText; problems: Problem[]; edited: boolean }>; items: Array<Omit<DayItem, "text">> };
const [row] = await sql<{ date: string; content: Stored }[]>`SELECT to_char(date, 'YYYY-MM-DD') AS date, content FROM reference_issues WHERE no = ${no}`;
if (!row) throw new Error(`没有第 ${no} 期`);
const texts = await sql<{ id: string; text: string }[]>`
  SELECT id, coalesce(nullif(body_text, ''), excerpt, '') AS text FROM articles WHERE id IN ${sql(row.content.items.map((i) => i.id))}`;
const byId = new Map(texts.map((t) => [t.id, t.text]));
const items: DayItem[] = row.content.items.map((i) => ({ ...i, text: byId.get(i.id) ?? "" }));
const written = row.content.drafts.filter((d) => !d.edited).sort((a, b) => b.problems.length - a.problems.length)[0];
if (!written) throw new Error(`第 ${no} 期没有写稿人原样交的稿`);
const draft: Draft = { issue: written.issue, lively: 0, problems: written.problems, edited: false };

// 每次最多：点名原文和稿子按一字一 token 算，加 2 万 token 输出（Opus 5.5 $4 / $20 每百万）。
const callMax = (JSON.stringify(draft.issue).length + items.reduce((s, i) => s + i.text.length, 0)) * 4 / 1e6 + 20_000 * 20 / 1e6;
const calls = 2 * 4;
console.log(`第 ${no} 期（${row.date}）《${draft.issue.title}》，这一稿存下的问题 ${draft.problems.length} 处；${calls} 次调用，最多约 US$${(calls * callMax).toFixed(2)}，上限 US$${cap}`);
if (calls * callMax > cap) throw new Error(`最多可能花到 US$${(calls * callMax).toFixed(2)}，超过 --cap-usd ${cap}`);
if (!apply) { await closeDb(); process.exit(0); }

const run = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, "");
const receiptIds: number[] = [];
const base = modelAsk(MODEL, `cache-layout:${no}`, receiptIds);
/** 每次调用一个新的 attemptTag：同一份请求不会被回执当成上一次的、直接拿旧答案。 */
const tagged = (tag: string): Ask => (purpose, system, user, schema, attempt) => base(purpose, system, user, schema, `${attempt ?? ""}${run}-${tag}`);
const usageOf = async (from: number) => {
  const ids = receiptIds.slice(from);
  const rows = await sql<{ usage: Record<string, unknown> | null }[]>`SELECT usage FROM receipt_attempts WHERE receipt_id IN ${sql(ids)} ORDER BY id`;
  return rows.map((r) => r.usage ?? {});
};

const out: Record<string, unknown> = { no, date: row.date, title: draft.issue.title, storedProblems: draft.problems };
for (const layout of ["split", "shared"] as Layout[]) {
  const from = receiptIds.length;
  const started = Date.now();
  const checks = [];
  for (const k of [1, 2]) checks.push(await checkIssue(draft.issue, items, tagged(`${layout}-check${k}`), layout));
  const review = await reviewIssue(draft.issue, items, tagged(`${layout}-review`), layout);
  const mended = await edit(draft, items, tagged(`${layout}-edit`), "e", layout);
  const usage = await usageOf(from);
  const n = (u: Record<string, unknown>, k: string) => Number(u[k] ?? 0) || 0;
  const usd = monthSpend(usage.map((u) => ({
    model: MODEL, input: n(u, "prompt_tokens"), output: n(u, "completion_tokens"), cacheRead: n(u, "cache_read_input_tokens"),
    write5m: Number((u.cache_creation as Record<string, unknown> | undefined)?.ephemeral_5m_input_tokens ?? 0),
    write1h: Number((u.cache_creation as Record<string, unknown> | undefined)?.ephemeral_1h_input_tokens ?? 0),
  })));
  out[layout] = { minutes: Math.round((Date.now() - started) / 6000) / 10, usd, usage, checks, review, edit: mended };
  console.log(`${layout}：核稿两次各 ${checks.map((c) => c.problems.length).join("、")} 处问题（精彩 ${checks.map((c) => c.lively).join("、")}），复核 ${review.length} 处，花 US$${usd.toFixed(2)}，缓存读 ${usage.map((u) => n(u, "cache_read_input_tokens")).join("/")}`);
}
const dir = one("--out") ?? "/out";
mkdirSync(dir, { recursive: true });
const file = join(dir, `cache-layout-${no}-${run}.json`);
writeFileSync(file, JSON.stringify(out, null, 2));
for (const id of receiptIds) await completeReceipt(sql, id);
console.log(`写在 ${file}`);
await stopBoss();
await closeDb();
