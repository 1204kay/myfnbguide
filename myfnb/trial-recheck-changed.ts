// 十一说核稿省钱试跑（Kay 11-07 08:05「flash核对一次 opus再来你说的这样」，十一同意）：拿已经出刊的某一期的两份原稿，
// 照两种做法重走一遍「核 → 改 → 再核」，和那天实际花的钱、Opus 跑的轮数、最后剩下的问题对比。
//   B：Opus 改完只重核改过的句子，没有问题了再整份核一次（十一：防止改过的句子和前后文接不上）。
//   AB：先用 flash 整份核一次、照它的改法改，再交给 Opus 照 B 走。
// 原稿的 Opus 第一次核对用那天入库的结果（不再花钱）。只写回执（subject trial-recheck:<日期>），不改那一期，不改网站。
//   sudo docker compose exec -T worker node myfnb/trial-recheck-changed.ts --date 2026-11-07                只列要走的稿，不调模型
//   … --apply --mode B|AB|both      默认 both
//   … --cap 3                         这次最多花多少美元：按已花的加上下一次最坏情况算，超了就停（11-07 第一次跑没有它，超了上限）
//   … --replay                        只重放已有回执、一次也不真调：要发出任何请求就当场停（11-07 B 跑完了结果没留下，用它取回）
//   … --out <文件>                    每走完一份稿就把结果追加一行进去，中途停掉也留得下
// 和正式流程一样：先走听稿排第一的那份，它改完还要删句子或还有问题，再走另一份。
import { appendFileSync } from "node:fs";
import { closeDb, sql } from "@aihot/backend/db";
import { MODELS } from "@aihot/backend/providers/llm";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import {
  amendIssue, CHECK, CheckAnswer, checkIssue, citedItems, cutProblems, type DayItem, edit, EDIT_ROUNDS, type IssueText,
  issueText, modelAsk, ownProblems, type Problem, sentences, sourcesText, type Usage, written,
} from "../modules/reference/backend/issue.ts";

const OPUS = "claude-opus-5-5";
const FLASH = "deepseek-flash-think-llm";
// flash 核一整期要想约 2.5 万 token（11-07 trial-flash-check：12,000 的余量被想满）；DeepSeek 思考模式 max_tokens 默认 64K。
MODELS[FLASH]!.reasoningTokens = 56_000;

const arg = (name: string) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const date = arg("--date");
if (!date || !/^\d{4}-\d{2}-\d{2}$/u.test(date)) throw new Error("--date 要一个日期，例如 2026-11-07");
const mode = arg("--mode") ?? "both";
if (!["B", "AB", "both"].includes(mode)) throw new Error("--mode 只能是 B、AB 或 both");
const apply = process.argv.includes("--apply");
const cap = Number(arg("--cap") ?? 0);
const replay = process.argv.includes("--replay");
const outFile = arg("--out");
if (apply && !replay && !(cap > 0)) throw new Error("真调要给 --cap（美元）");
if (replay) globalThis.fetch = (() => { throw new Error("--replay：这一步没有回执可重放，要真调，停下"); }) as typeof fetch;
const emit = (x: unknown) => { const line = JSON.stringify(x); console.log(line); if (outFile) appendFileSync(outFile, `${line}\n`); };
// 估花费用的单价（美元／百万 token：输入、输出）。Opus 照 credit.ts、不算缓存折扣，宁可估高；flash 照高峰价往上取。
const PRICE: Record<string, [number, number]> = { [OPUS]: [4, 20], [FLASH]: [0.6, 2.4] };
const WORST_OUT: Record<string, number> = { [OPUS]: 32_000, [FLASH]: 64_000 };
let spent = 0;

type Stored = { issue: IssueText; problems: Problem[]; lively: number; edited: boolean; unchecked?: boolean; heard?: number };
const [row] = await sql<{ no: number | null; content: { drafts: Stored[]; items: Omit<DayItem, "text">[]; chosen?: Stored } }[]>`
  SELECT no, content FROM reference_issues WHERE date = ${date}`;
if (!row) throw new Error(`${date} 没有十一说`);
const originals = row.content.drafts.map((d, i) => ({ ...d, i })).filter((d) => !d.edited && !d.unchecked)
  .sort((x, y) => (y.heard ?? 0) - (x.heard ?? 0));
const ids = row.content.items.map((i) => i.id);
const texts = new Map((await sql<{ id: string; text: string }[]>`
  SELECT id::text AS id, coalesce(nullif(body_text, ''), excerpt, '') AS text FROM articles WHERE id::text = ANY(${ids})`).map((r) => [r.id, r.text]));
const items: DayItem[] = row.content.items.map((i) => ({ ...i, text: texts.get(String(i.id)) ?? "" }));
const actual = { drafts: row.content.drafts.length, problems: row.content.drafts.map((d) => d.problems.length) };
console.log(JSON.stringify({ date, no: row.no, order: originals.map((d) => ({ draft: d.i, heard: d.heard, problems: d.problems.length })), actual }, null, 1));
if (!apply) { await closeDb(); process.exit(0); }

const bare = (s: string) => s.replace(/〔[^〕]*〕|\s|[「」“”]/gu, "");
/** Sentences of `after` that `before` did not have, as the check reads them. */
const changedSentences = (before: IssueText, after: IssueText) => {
  const old = new Set(sentences(written(before)).map(bare));
  return sentences(written(after)).filter((s) => bare(s) && !old.has(bare(s))).map((s) => s.trim());
};
const touches = (p: Problem, changed: string[]) => changed.some((s) => bare(s).includes(bare(p.quote)) || bare(p.quote).includes(bare(s)));

type Tally = { calls: Record<string, number>; usage: Record<string, Usage>; receiptIds: number[] };
const asker = (tally: Tally, model: string, tag: string) => {
  tally.usage[model] ??= { input: 0, output: 0 };
  const [pin, pout] = PRICE[model]!;
  const ask = modelAsk(model, `trial-recheck:${date}`, tally.receiptIds, (u) => {
    tally.usage[model]!.input += u.input; tally.usage[model]!.output += u.output;
    spent += (u.input * pin + u.output * pout) / 1e6;
  });
  let n = 0;
  return ((purpose, system, user, schema, attempt) => {
    // 最坏一次：原文和稿子全按输入价、输出写满上限（一字按一 token 算，往高估）。
    const chars = typeof user === "string" ? user.length : user.cached.length + user.rest.length;
    const worst = ((system.length + chars) * pin + WORST_OUT[model]! * pout) / 1e6;
    if (!replay && spent + worst > cap) throw new Error(`已花约 US$${spent.toFixed(2)}，下一次最坏约 US$${worst.toFixed(2)}，会超过 --cap ${cap}，停下`);
    tally.calls[`${model} ${purpose}`] = (tally.calls[`${model} ${purpose}`] ?? 0) + 1;
    return ask(purpose, system, user, schema, `${tag}${n++}${attempt ?? ""}`);
  }) as typeof ask;
};

/** Reads only the sentences a mend changed, with the whole draft and its originals in view. */
async function checkChanged(issue: IssueText, changed: string[], ask: ReturnType<typeof asker>): Promise<Problem[]> {
  const { cited } = citedItems(issue, items);
  const rest = `这一期：\n${issueText(issue)}\n\n这一轮只核下面这些上一轮改过的句子；其余句子上一轮已经核过，不要再挑：\n${changed.map((s) => `- ${s}`).join("\n")}`;
  const answer = await ask("reference_issue_check", CHECK, { cached: sourcesText(cited), rest }, CheckAnswer);
  return [...ownProblems(issue, items), ...answer.problems.filter((p) => touches(p, changed))];
}

/** One mend: the check's fixes put in, or the editor when a problem has no fix. */
async function mendOnce(issue: IssueText, problems: Problem[], ask: ReturnType<typeof asker>, tag: string): Promise<IssueText | null> {
  if (problems.some((p) => p.fix === undefined)) return edit({ issue, problems, lively: 0, edited: true }, items, ask, tag);
  const fixed = amendIssue(issue, problems, (p) => p.fix);
  return fixed.changed.length ? fixed.issue : null;
}

/** B: mends, re-reading only what changed; once nothing is found, the whole draft once more. */
async function mendChanged(start: IssueText, problems: Problem[], ask: ReturnType<typeof asker>, log: unknown[]) {
  let issue = start, last = problems, full = true;
  for (let round = 0; round < EDIT_ROUNDS; round++) {
    if (!last.length) {
      if (full) break;
      last = (await checkIssue(issue, items, ask)).problems; full = true;
      log.push({ round, check: "full", problems: last.length });
      if (!last.length) break;
    }
    const next = await mendOnce(issue, last, ask, `m${round}`);
    if (!next) break;
    const changed = changedSentences(issue, next);
    issue = next;
    last = await checkChanged(issue, changed, ask); full = false;
    log.push({ round, check: "changed", sentences: changed.length, problems: last.length });
  }
  if (!last.length && !full) { last = (await checkIssue(issue, items, ask)).problems; log.push({ check: "full, last", problems: last.length }); }
  const { issue: out, cut, kept } = cutProblems(issue, last);
  return { issue: out, cut, left: kept };
}

async function run(variant: "B" | "AB") {
  const tally: Tally = { calls: {}, usage: {}, receiptIds: [] };
  const opus = asker(tally, OPUS, `${variant}o`), flash = asker(tally, FLASH, `${variant}f`);
  const out = [];
  for (const d of originals) {
    const log: unknown[] = [];
    let issue = d.issue, problems = d.problems;
    if (variant === "AB") {
      const f = await checkIssue(d.issue, items, flash);
      log.push({ flash: "full", problems: f.problems.length });
      const fixed = f.problems.length ? await mendOnce(d.issue, f.problems, flash, "fm") : null;
      if (fixed) {
        issue = fixed;
        problems = (await checkIssue(issue, items, opus)).problems;
        log.push({ opus: "full after flash", problems: problems.length });
      }
    }
    const m = await mendChanged(issue, problems, opus, log);
    const one = { variant, draft: d.i, start: d.problems.length, log, cut: m.cut, left: m.left.map((p) => ({ rule: p.rule, quote: p.quote, why: p.why })), issue: m.issue };
    emit(one);
    out.push(one);
    if (!m.cut.length && !m.left.length) break;
  }
  for (const id of tally.receiptIds) await completeReceipt(sql, id);
  const sum = { variant, calls: tally.calls, usage: tally.usage, spent: Number(spent.toFixed(2)), receiptIds: tally.receiptIds };
  emit(sum);
  return { ...sum, drafts: out };
}

for (const v of mode === "both" ? ["B", "AB"] as const : [mode as "B" | "AB"]) await run(v);
await closeDb();
process.exit(0);
