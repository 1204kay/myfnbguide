// 十一说核稿的两种排法对比（11-02，十一定：「质量没退步再上」）。backend/issue.ts 的 Layout：
//   split（现在用的）：每一步的提示词是系统提示，只有核稿的几轮共用缓存；
//   shared（候选）：不用系统提示，点名原文放最前面，每一步的提示词放在原文后面，修稿和复核也读核稿的缓存。
// 拿一期已出的十一说里写稿人原样交的那一稿（没修过、核出问题最多的一稿），两种排法各跑：核稿一次、复核一次、修稿一次
// （修稿用这一稿存下的问题，两种排法读到的一样），钱还够再各核一次（同一排法跑两次，看它自己会差多少，经验 C9）。
// 两种排法交替跑，钱不够时先保住对比本身。
// 只写文件，不改线上任何东西；原文全文不写进文件（工作约定 §12），文件里只有我们自己的稿子和核出的问题。
//   --issue 10（必填）　--apply 才调模型，不加只算要花多少　--cap-usd 4　--out /out
// 花费上限是硬的：每次调用前，已花的（从回执读实数）加上这一次最坏的花费超过上限，就不调，停下写文件。
// 一次最坏 = 输入全按一小时缓存写入价（最贵的一档）+ 输出用满 max_tokens。输入 token 数用 Anthropic 的数 token 接口量
// （/v1/messages/count_tokens，官方说不收钱）。11-04 以前按一字一 token、8 次全按最坏估，第 10 期估出 US$15.98，
// 而第 10 期正式出稿时 Opus 11 次实际一共约 US$3.29，估法本身离实数太远，所以改了。
// 在服务器上（线上镜像里就有，正在跑的 worker 不动）：
//   cd /opt/myfnbguide && sudo docker compose run --rm -v /tmp/myfnb-trial:/out worker node myfnb/trial-cache-layout.ts --issue 10
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config, credential } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { MODELS } from "@aihot/backend/providers/llm";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { joined } from "../modules/reference/backend/claude.ts";
import { monthSpend } from "../modules/reference/backend/credit.ts";
import { type Ask, checkIssue, type DayItem, type Draft, edit, type IssueText, type Layout, modelAsk, type Problem, reviewIssue } from "../modules/reference/backend/issue.ts";

const args = process.argv.slice(2);
const one = (flag: string) => args.flatMap((a, i) => (a === flag && args[i + 1] ? [args[i + 1]!] : [])).at(-1);
const no = Number(one("--issue"));
if (!Number.isInteger(no) || no < 1) throw new Error("写 --issue 10");
const apply = args.includes("--apply");
const cap = Number(one("--cap-usd") ?? 4);
const MODEL = "claude-opus-5-5";
const spec = MODELS[MODEL]!;

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

/** 最长的一次输入：点名原文 + 稿子 + 当天清单，再留 5,000 给提示词和问题清单。 */
async function longestInput(): Promise<number> {
  const baseUrl = credential("models", spec.baseUrlEnv);
  const apiKey = credential("models", spec.apiKeyEnv);
  if (!baseUrl || !apiKey) throw new Error(`没配 ${spec.baseUrlEnv}、${spec.apiKeyEnv}`);
  const text = joined({ cached: items.map((i) => i.text).join("\n\n"), rest: `${JSON.stringify(draft.issue)}\n\n${JSON.stringify(row!.content.items)}` });
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/messages/count_tokens`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2026-10-21" },
    body: JSON.stringify({ model: spec.model, messages: [{ role: "user", content: text }] }),
  });
  const body = await res.json() as { input_tokens?: number };
  if (!res.ok || !body.input_tokens) throw new Error(`数 token 失败：${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return body.input_tokens + 5000;
}
const inputTokens = await longestInput();
const OUTPUT_MAX = 8000 + (spec.reasoningTokens ?? 0);
// Opus 5.5 每百万 token：输入 US$4，一小时缓存写入 US$8，缓存读 US$0.20，输出 US$20（credit.ts）。
const worstCall = (inputTokens * 8 + OUTPUT_MAX * 20) / 1e6;
// 大约会花多少，只给人看，不拿来拦：两种排法第一次核稿各写一次缓存；split 的复核、修稿不读缓存，第二次核稿读；
// shared 的复核、修稿、第二次核稿都读。输出按每次 1 万 token。
const likely = (inputTokens * (8 + 4 + 4 + 0.2 + 8 + 0.2 * 3) + 8 * 10_000 * 20) / 1e6;
console.log(`第 ${no} 期（${row.date}）《${draft.issue.title}》，这一稿存下的问题 ${draft.problems.length} 处；最长一次输入约 ${inputTokens} token`);
console.log(`一次最坏 US$${worstCall.toFixed(2)}，8 次大约 US$${likely.toFixed(2)}；上限 US$${cap}：每次调用前看已花的实数，加上这一次最坏会超过就停`);
if (worstCall * 2 > cap) throw new Error(`连两种排法各核一次都保证不了（最坏 US$${(worstCall * 2).toFixed(2)}），不跑`);
if (!apply) { await closeDb(); process.exit(0); }
if (!config.modelCallsEnabled) throw new Error("MODEL_CALLS_ENABLED 没开");

const run = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, "");
const receiptIds: number[] = [];
const base = modelAsk(MODEL, `cache-layout:${no}`, receiptIds);
/** 每次调用一个新的 attemptTag：同一份请求不会被回执当成上一次的、直接拿旧答案。 */
const tagged = (tag: string): Ask => (purpose, system, user, schema, attempt) => base(purpose, system, user, schema, `${attempt ?? ""}${run}-${tag}`);
const usageOf = async (from: number) => {
  const ids = receiptIds.slice(from);
  if (!ids.length) return [];
  const rows = await sql<{ usage: Record<string, unknown> | null }[]>`SELECT usage FROM receipt_attempts WHERE receipt_id IN ${sql(ids)} ORDER BY id`;
  return rows.map((r) => r.usage ?? {});
};
const n = (u: Record<string, unknown>, k: string) => Number(u[k] ?? 0) || 0;
const written1h = (u: Record<string, unknown>, k: string) => Number((u.cache_creation as Record<string, unknown> | undefined)?.[k] ?? 0) || 0;
const priced = (usage: Record<string, unknown>[]) => monthSpend(usage.map((u) => ({
  model: MODEL, input: n(u, "prompt_tokens"), output: n(u, "completion_tokens"), cacheRead: n(u, "cache_read_input_tokens"),
  write5m: written1h(u, "ephemeral_5m_input_tokens"), write1h: written1h(u, "ephemeral_1h_input_tokens"),
})));

type Result = { checks: Array<{ problems: unknown[]; lively: number }>; review?: unknown[]; edit?: unknown; usage: Record<string, unknown>[]; usd: number; seconds: number };
const results: Record<Layout, Result> = { split: { checks: [], usage: [], usd: 0, seconds: 0 }, shared: { checks: [], usage: [], usd: 0, seconds: 0 } };
const steps: Array<[Layout, "check" | "review" | "edit", string]> = [
  ["split", "check", "check1"], ["shared", "check", "check1"], ["split", "review", "review"], ["shared", "review", "review"],
  ["split", "edit", "edit"], ["shared", "edit", "edit"], ["split", "check", "check2"], ["shared", "check", "check2"],
];
let spent = 0;
let stopped: string | null = null;
for (const [layout, step, tag] of steps) {
  if (spent + worstCall > cap) { stopped = `${layout} ${tag} 之前停下：已花 US$${spent.toFixed(2)}，再一次最坏 US$${worstCall.toFixed(2)}，会超过上限 US$${cap}`; break; }
  const from = receiptIds.length;
  const started = Date.now();
  const ask = tagged(`${layout}-${tag}`);
  const r = results[layout];
  if (step === "check") r.checks.push(await checkIssue(draft.issue, items, ask, layout));
  else if (step === "review") r.review = await reviewIssue(draft.issue, items, ask, layout);
  else r.edit = await edit(draft, items, ask, "e", layout);
  r.seconds += Math.round((Date.now() - started) / 1000);
  const usage = await usageOf(from);
  // 回执里读不到用量的那几次，按一次最坏算进已花的，宁可早停。
  const unread = receiptIds.length - from - usage.filter((u) => n(u, "prompt_tokens") > 0).length;
  const usd = priced(usage) + Math.max(unread, 0) * worstCall;
  r.usage.push(...usage);
  r.usd += usd;
  spent += usd;
  console.log(`${layout} ${tag}：US$${usd.toFixed(2)}（缓存读 ${usage.map((u) => n(u, "cache_read_input_tokens")).join("/")}），累计 US$${spent.toFixed(2)}`);
}
if (stopped) console.log(stopped);
for (const layout of ["split", "shared"] as Layout[]) {
  const r = results[layout];
  console.log(`${layout}：核稿 ${r.checks.length} 次，各 ${r.checks.map((c) => c.problems.length).join("、")} 处问题（精彩 ${r.checks.map((c) => c.lively).join("、")}）；复核 ${r.review ? `${r.review.length} 处` : "没跑"}；修稿${r.edit ? "跑了" : "没跑"}；花 US$${r.usd.toFixed(2)}`);
}
const out = { no, date: row.date, title: draft.issue.title, storedProblems: draft.problems, inputTokens, worstCall, cap, spent, stopped, ...results };
const dir = one("--out") ?? "/out";
mkdirSync(dir, { recursive: true });
const file = join(dir, `cache-layout-${no}-${run}.json`);
writeFileSync(file, JSON.stringify(out, null, 2));
for (const id of receiptIds) await completeReceipt(sql, id);
console.log(`写在 ${file}`);
await stopBoss();
await closeDb();
