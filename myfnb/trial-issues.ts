// 十一说的试写 (myfnb/HANDOFF.md §9.0, round 3): one issue per day from everything the daily listed in that day's
// window, written and checked by backend/issue.ts with one named model, to files only. Nothing on the site changes and
// nothing is stored but the engine's receipts. Each issue is written beside the full text of every item of its day,
// numbered as the issue cites them, for the blind check.
//   --day 2026-10-16 (repeat it, one issue each); --model <a preset of site/models.ts> is required and writes; --check-model
//   checks (default: the same one), so writers can be compared under one check; --selected takes only the day's 精选
//   instead of everything listed (Kay 10-19: 那如果只挑精选呢); --out is where the
//   run's folder goes (default /out). Without --apply it lists each day's items and calls nothing.
//   --cap-usd 20: no call is made unless what it could cost is left under it, so the run never pays more; a day does not
//   start without enough left for its two drafts and their checks.
// On the server (a throwaway container with this branch's module mounted; the running worker is not touched):
//   sudo docker compose run --rm -v /opt/myfnbguide-trial/modules/reference:/app/modules/reference:ro \
//     -v /opt/myfnbguide-trial/myfnb:/app/myfnb:ro -v /opt/myfnbguide-trial/site/models.ts:/app/site/models.ts:ro \
//     -v /tmp/myfnb-trial:/out worker node myfnb/trial-issues.ts …
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { addDays, beijingAt } from "@aihot/contracts/time";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { MODELS } from "@aihot/backend/providers/llm";
import { listedCondition, selectedCondition } from "@aihot/backend/publication/scope";
import { EDITION_TIMES } from "@aihot/site";
import { type ComposedIssue, composeIssue, type DayItem, issueChars, issueMarkdown, ISSUE_VERSION, modelAsk, type Usage } from "../modules/reference/backend/issue.ts";

const args = process.argv.slice(2);
const all = (flag: string) => args.flatMap((a, i) => (a === flag && args[i + 1] ? [args[i + 1]!] : []));
const one = (flag: string) => all(flag).at(-1);
const apply = args.includes("--apply");
const selectedOnly = args.includes("--selected");

/** US$ per million input / output tokens: Anthropic's price list (10-19); DeepSeek's (10-19, uncached input, peak hours). Only the models a trial uses. */
const PRICES: Record<string, [number, number]> = { "claude-opus-5-5": [4, 20], "claude-sonnet-5-5": [2, 10], "deepseek-flash": [0.3, 1.2], "deepseek-flash-think": [0.3, 1.2],
  "deepseek-flash-think-llm": [0.3, 1.2], "deepseek-v4-pro-llm": [1.32, 3.96] };
/** The most a call can cost: every character counted as an input token (more than any text here takes) and the 20k output limit. */
const callUsd = (price: [number, number], chars: number) => (chars * price[0] + 20_000 * price[1]) / 1e6;
/** What a day needs left before it starts: two drafts, each reading every item in full, and two checks no bigger than a draft. */
const dayUsd = (items: DayItem[]) => 2 * (callUsd(writePrice, dayChars(items)) + callUsd(checkPrice, dayChars(items)));
const dayChars = (items: DayItem[]) => items.reduce((s, i) => s + i.summary.length + i.text.length + 200, 0);

const model = one("--model");
const checkModel = one("--check-model") ?? model;
const priceOf = (m: string | undefined) => {
  if (!m || !MODELS[m]) throw new Error(`--model / --check-model 要写 site/models.ts 里的一个：${Object.keys(MODELS).join("、")}`);
  const price = PRICES[m];
  if (!price) throw new Error(`没有 ${m} 的价钱，写进 PRICES 再跑`);
  return price;
};
const writePrice = priceOf(model);
const checkPrice = priceOf(checkModel);
/** The check and the editor that mends what it found run on the check model. */
const isCheck = (purpose: string) => purpose === "reference_issue_check" || purpose === "reference_issue_edit";
const cap = Number(one("--cap-usd") ?? 20);
if (!(cap > 0)) throw new Error("--cap-usd 要大于 0");
const days = all("--day");
if (!days.length || days.some((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d))) throw new Error("写 --day 2026-10-16（可以写多个）");

const run = `${new Date().toISOString().slice(0, 19).replace(/[-T:]/g, "")}${selectedOnly ? "-selected" : ""}-${model}${checkModel === model ? "" : `-check-${checkModel}`}`;
const dir = join(one("--out") ?? "/out", run);
const receiptIds: number[] = [];
/** Tokens paid for, per model, and what they cost. */
const paid: Record<string, Usage> = {};
const usd = () => Object.entries(paid).reduce((s, [m, u]) => s + (u.input * PRICES[m]![0] + u.output * PRICES[m]![1]) / 1e6, 0);
const count = (m: string) => (u: Usage) => { const p = (paid[m] ??= { input: 0, output: 0 }); p.input += u.input; p.output += u.output; };

/** Everything the daily listed in the window of `date` (or only its 精选), best scored first, numbered as the issue cites it. */
async function dayItems(date: string): Promise<DayItem[]> {
  const end = beijingAt(date, EDITION_TIMES.daily);
  const start = beijingAt(addDays(date, -1), EDITION_TIMES.daily);
  const rows = await sql<Omit<DayItem, "n">[]>`
    SELECT p.article_id AS id, a.source_id AS "sourceId", s.name AS "sourceName", p.title, a.url,
      coalesce(p.summary, '') AS summary, coalesce(nullif(a.body_text, ''), a.excerpt, '') AS text,
      p.selected, p.story_id::text AS "storyId"
    FROM publications p JOIN articles a ON a.id = p.article_id JOIN sources s ON s.id = p.source_id
    WHERE ${selectedOnly ? selectedCondition(new Date()) : listedCondition(new Date())} AND coalesce(p.published_at, p.discovered_at) >= ${start} AND coalesce(p.published_at, p.discovered_at) < ${end}
    ORDER BY p.score DESC NULLS LAST, p.article_id`;
  return rows.map((r, i) => ({ n: i + 1, ...r }));
}

console.log(`${days.length} 天 × ${model}${checkModel === model ? "" : `（核对 ${checkModel}）`}，花费上限 US$${cap}${apply ? "" : "（预览，不调模型）"}`);
const results: Array<{ no: number; date: string; c: ComposedIssue | null; cost: number; note: string }> = [];
if (apply) mkdirSync(dir, { recursive: true });

for (const [k, date] of days.entries()) {
  const no = k + 1;
  const items = await dayItems(date);
  if (!apply) { console.log(`${String(no).padStart(2)}  ${date}  ${items.length} 条，${items.reduce((s, i) => s + i.text.length, 0)} 字，开写要留 US$${dayUsd(items).toFixed(2)}`); continue; }
  if (usd() + dayUsd(items) > cap) { results.push({ no, date, c: null, cost: 0, note: `没写：再写可能超过上限 US$${cap}` }); continue; }
  const before = usd();
  try {
    const write = modelAsk(model!, `issue:${date}`, receiptIds, count(model!));
    const check = modelAsk(checkModel!, `issue:${date}`, receiptIds, count(checkModel!));
    const c = await composeIssue(items, date, (purpose, system, user, schema, attempt) => {
      if (usd() + callUsd(isCheck(purpose) ? checkPrice : writePrice, system.length + user.length) > cap) throw new Error(`停：再调用可能超过上限 US$${cap}`);
      return (isCheck(purpose) ? check : write)(purpose, system, user, schema, attempt);
    });
    const name = String(no).padStart(2, "0");
    writeFileSync(join(dir, `${name}.md`), issueMarkdown(c, no));
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(c, null, 2));
    // Every item of the day in full, for the blind check (and nothing else: they stay off the site).
    writeFileSync(join(dir, `${name}-原文.md`), items.map((i) => [`# 〔${i.n}〕${i.sourceName}《${i.title}》（${i.sourceId}）`, i.url, "", i.text].join("\n")).join("\n\n"));
    results.push({ no, date, c, cost: usd() - before, note: "" });
    console.log(`${name}  ${date}  ${c.status.padEnd(5)}  ${c.chosen?.issue.title ?? ""}  US$${(usd() - before).toFixed(2)}`);
  } catch (error) {
    // One failed day stops that day, not the run.
    results.push({ no, date, c: null, cost: usd() - before, note: `出错：${(error as Error).message.slice(0, 200)}` });
    console.log(`${String(no).padStart(2, "0")}  ${date}  出错：${(error as Error).message.slice(0, 120)}`);
  }
}

if (apply) {
  const status = (c: ComposedIssue | null) => (c ? { issue: "出刊", thin: "收录太少", held: "没过核对" }[c.status] : "没写");
  const index = [
    `# 十一说试写 ${run}`, "",
    `写 ${model}，核对 ${checkModel}；提示词与检查 ${ISSUE_VERSION}；花费 US$${usd().toFixed(2)}（${Object.entries(paid).map(([m, u]) => `${m} 输入 ${u.input}、输出 ${u.output} token，按 US$${PRICES[m]![0]}/${PRICES[m]![1]} 每百万算`).join("；")}）；上限 US$${cap}。`, "",
    "| 期 | 日期 | 收录 | 结果 | 标题 | 稿数 | 精彩 | 字数 | 花费 | 备注 |", "|---|---|---|---|---|---|---|---|---|---|",
    ...results.map(({ no, date, c, cost, note }) => `| ${no} | ${date} | ${c?.items.length ?? ""} | ${status(c)} | ${(c?.chosen?.issue.title ?? "").replace(/\|/g, "／")} | ${c?.drafts.length ?? ""} | ${c?.chosen?.lively ?? ""} | ${c?.chosen ? issueChars(c.chosen.issue) : ""} | US$${cost.toFixed(2)} | ${note.replace(/\|/g, "／")} |`),
  ].join("\n");
  writeFileSync(join(dir, "index.md"), index);
  for (const id of receiptIds) await completeReceipt(sql, id);
  console.log(`写在 ${dir}；共花 US$${usd().toFixed(2)}`);
}
await stopBoss();
await closeDb();
