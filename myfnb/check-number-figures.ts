// 2026-10-18：撤下来的数字图（数字卡、对比条）逐张对原文核一次，只核不放回（十一定的做法：数字图由程序画，每个数都要附
// 原文原句，程序在原句里找到这个数才画；前后对比图、流程图先不恢复）。图从三张故事备份表里取（两轮补图和其余的图），
// 原文取故事写成时那一版（article_revisions），不取后来更新过的。
// 每张图问一次模型（check-number-figures.md）：每个数照抄原文那一句、这是谁的事、做了还是打算。然后由程序判：
// 原句一字不差在原文里，图上的数在原句里，数是这家店已经做了的（对比条按组并排的，可以是行业或别家，但不能是建议或假设），
// 图说的是这一节小标题那件事。不写任何内容表，只打印结果：每张图一行 FIG {json}，最后一行是汇总。
// 不带参数只数张数；--apply 才调用模型；--limit 30 只核前 30 张（按故事 id 和位置排序，结果可重跑）。
//   sudo docker compose exec -T worker node myfnb/check-number-figures.ts --apply
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { closeDb, sql } from "@aihot/backend/db";
import { modelFor } from "@aihot/backend/editorial/models";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { installModules } from "@aihot/backend/modules";
import { chatJson } from "@aihot/backend/providers/llm";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { SERVER_MODULES } from "@aihot/site/modules/server";
import { sourceNumbers, unfoundNumbers } from "../modules/reference/backend/checks.ts";
import { MODEL_STEP } from "../modules/reference/backend/write.ts";
import type { CaseStory, CompareBlock, NumbersBlock } from "../modules/reference/types.ts";

installModules(SERVER_MODULES);

const arg = (name: string) => { const at = process.argv.indexOf(name); return at > 0 ? process.argv[at + 1]! : null; };
const apply = process.argv.includes("--apply");
const limit = Number(arg("--limit") ?? 100_000);
if (!Number.isInteger(limit) || limit < 1) throw new Error("--limit 要写正整数");
const SYSTEM = readFileSync(new URL("./check-number-figures.md", import.meta.url), "utf8");
const VERSION = `figure-check@${createHash("sha256").update(SYSTEM).digest("hex").slice(0, 10)}`;
const BACKUPS = ["backup_ref_cases_pic2_drawn", "backup_ref_cases_pic1_drawn", "backup_ref_cases_pic_rest_drawn"];

type Figure = NumbersBlock | CompareBlock;
interface Found { id: string; revision: number; shop: string; heading: string; words: string; figure: Figure; at: string }

const seen = new Set<string>();
const figures: Found[] = [];
for (const table of BACKUPS) {
  const rows = await sql<{ id: string; revision: number; story: CaseStory }[]>`SELECT article_id AS id, revision, story FROM ${sql(table)} ORDER BY article_id`;
  for (const row of rows) row.story.parts.forEach((part, p) => part.blocks.forEach((block, b) => {
    if (block.type !== "numbers" && block.type !== "compare") return;
    const key = `${row.id}|${JSON.stringify(block)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const words = part.blocks.flatMap((x) => x.type === "text" ? [x.text] : x.type === "list" ? x.items.map((i) => i.text) : []).join("\n");
    figures.push({ id: row.id, revision: row.revision, shop: row.story.shop?.name ?? "（没有店名）", heading: part.heading, words, figure: block, at: `${p}.${b}` });
  }));
}
figures.sort((x, y) => x.id.localeCompare(y.id) || x.at.localeCompare(y.at));
const counts = (list: Found[]) => list.reduce<Record<string, number>>((n, f) => ({ ...n, [f.figure.type]: (n[f.figure.type] ?? 0) + 1 }), {});
console.log(`撤下的数字图 ${figures.length} 张（${JSON.stringify(counts(figures))}）${apply ? "" : "（预览，--apply 才核）"}`);

const Answer = z.object({
  items: z.array(z.object({
    value: z.union([z.string(), z.number()]).transform(String),
    quote: z.string().nullable(),
    whose: z.enum(["shop", "other_shop", "trade", "advice", "hypothetical"]),
    when: z.enum(["done", "plan"]),
    same_as_label: z.boolean(),
  })),
  fits_heading: z.boolean(),
  one_quantity: z.boolean().nullable(),
  reason: z.string(),
});
// A number of the figure is in the quote in some form ("120 万" for "1.2 million"); small ones too, which the
// story checks let pass (unfoundNumbers skips them), because a figure's every number is the point of it.
const missing = (value: string, quote: string) => {
  const src = sourceNumbers(quote);
  return unfoundNumbers(value, src).length > 0 || (value.normalize("NFKC").match(/\d+(?:[.,]\d+)*/g) ?? []).some((t) => ![...sourceNumbers(t)].some((x) => src.has(x)) && unfoundNumbers(t, src).length === 0 && !/[万亿]/.test(value));
};
const flat = (s: string) => s.normalize("NFKC").replace(/\s+/g, "");
// What the figure shows of each item, as the reader sees it.
const shown = (f: Figure) => f.type === "numbers"
  ? f.items.map((i) => ({ value: i.value, label: i.label }))
  : f.items.map((i) => ({ value: `${i.value}${i.to != null ? `–${i.to}` : ""} ${f.unit}`, label: i.label }));

const tally: Record<string, number> = {};
if (apply) {
  const model = await modelFor(MODEL_STEP);
  for (const f of figures.slice(0, limit)) {
    const [rev] = await sql<{ body_text: string | null }[]>`SELECT body_text FROM article_revisions WHERE article_id = ${f.id} AND revision = ${f.revision}`;
    const [now] = rev?.body_text ? [] : await sql<{ body_text: string | null; excerpt: string | null }[]>`SELECT body_text, excerpt FROM articles WHERE id = ${f.id}`;
    const original = rev?.body_text ?? now?.body_text ?? now?.excerpt ?? "";
    const items = shown(f.figure);
    const user = [
      `店名：${f.shop}`, `小标题：${f.heading}`, `这一节的文字：\n${f.words || "（没有文字）"}`,
      `这张图：${JSON.stringify(f.figure.type === "numbers" ? { type: "numbers", point: f.figure.point ?? null, items } : { type: "compare", by: f.figure.by ?? "time", unit: f.figure.unit, items })}`,
      `原文：\n${original}`,
    ].join("\n\n");
    const problems: string[] = [];
    let answer: z.infer<typeof Answer> | null = null;
    try {
      const res = await chatJson({
        model, purpose: "reference_figure_check", subject: `article:${f.id}@${f.revision}#${f.at}#${createHash("sha256").update(JSON.stringify(f.figure)).digest("hex").slice(0, 8)}`,
        promptVersion: VERSION, system: SYSTEM, user, schema: Answer, temperature: 0, maxTokens: 2000, timeoutMs: 180_000,
      });
      await sql.begin((tx) => completeReceipt(tx, res.receiptId));
      answer = res.data;
    } catch (error) { problems.push(`没有核成：${(error as Error).message.slice(0, 80)}`); }
    if (answer) {
      if (answer.items.length !== items.length) problems.push(`答了 ${answer.items.length} 个数，图上有 ${items.length} 个`);
      const group = f.figure.type === "compare" && f.figure.by === "group";
      answer.items.slice(0, items.length).forEach((a, i) => {
        const label = items[i]!.label;
        if (!a.quote) { problems.push(`「${label}」原文里没有`); return; }
        if (!flat(original).includes(flat(a.quote))) problems.push(`「${label}」引的原句不在原文里`);
        else if (missing(items[i]!.value, a.quote)) problems.push(`「${label}」的数不在引的原句里`);
        if (group ? a.whose === "advice" || a.whose === "hypothetical" : a.whose !== "shop") problems.push(`「${label}」说的是 ${a.whose}`);
        if (a.when !== "done") problems.push(`「${label}」是打算`);
        if (!a.same_as_label) problems.push(`「${label}」的数说的不是这个标签`);
      });
      if (!answer.fits_heading) problems.push("不是小标题那件事");
      if (f.figure.type === "compare" && answer.one_quantity === false) problems.push("几根条不是同一种量");
    }
    const result = problems.length ? "fail" : "pass";
    tally[`${f.figure.type} ${result}`] = (tally[`${f.figure.type} ${result}`] ?? 0) + 1;
    console.log(`FIG ${JSON.stringify({ id: f.id, at: f.at, type: f.figure.type, heading: f.heading, result, problems, items, answer })}`);
  }
  console.log(`汇总 ${JSON.stringify(tally)}`);
}
await stopBoss();
await closeDb();
