// 核对员（本站 10-23 决定记录）：入选条目的标题、导读和要点写好后，一个模型拿原文逐句核一遍，列出问题，每个问题带
// 改好后的整个字段。严重和误导直接用它的改法；改过的句子再核一遍，只拦严重错：要点有严重错就删掉那条，标题或导读
// 有严重错、或者一条要点都不剩，这条不进精选。不让写稿模型重写，也不整篇反复重核（Kay 10-23：会一直改出新错）。
import { z } from "zod";
import { reasonLines } from "@aihot/site";
import { chatJson } from "../providers/llm.ts";
import type { AnalyzeInputArticle } from "./input.ts";
import { modelFor } from "./models.ts";
import { promptText, promptVersion } from "./prompts.ts";

export const Problem = z.object({
  field: z.string(), point: z.coerce.number().catch(0), quote: z.string().catch(""), kind: z.coerce.number().catch(0),
  severity: z.string(), why: z.string().catch(""), fix: z.string().catch(""),
});
export type Problem = z.infer<typeof Problem>;
const Answer = z.object({ problems: z.array(Problem) });

export interface Draft { title: string; lead: string; points: string[] }

export const CHECK_SYSTEM = promptText("check-item");
const VERSION = promptVersion("check-item");

/** Hosts whose paid articles we receive cut at the paywall, and below how many characters that leaves too little to select. */
const PAYWALLED_HOSTS = /^https?:\/\/(www\.)?note\.com\//;
const MIN_ORIGINAL = 400;

const isPoint = (p: Problem) => p.field === "point" || p.field === "points";

/**
 * Country names in our copy are ours to keep (check-item.md rule 6: readers are in many countries). 10-23 old items,
 * batch 3: with that rule in the prompt the checker still turned 「中国火锅连锁」 into 「火锅连锁」 and 「在中国」 into
 * 「全国」, so a fix that drops a country the sentence named is not used, and its problem is set aside with it:
 * it was judged on the wrong premise. What else that fix changed in the sentence is lost; the sentence stays as written.
 */
const COUNTRIES = /中国|日本|韩国|美国|英国|法国|德国|意大利|西班牙|葡萄牙|荷兰|比利时|瑞士|瑞典|挪威|丹麦|芬兰|爱尔兰|奥地利|波兰|希腊|土耳其|俄罗斯|澳大利亚|新西兰|加拿大|墨西哥|巴西|阿根廷|智利|秘鲁|哥伦比亚|印度尼西亚|印尼|印度|泰国|越南|新加坡|马来西亚|菲律宾|柬埔寨|缅甸|阿联酋|沙特|以色列|南非|台湾|香港|澳门/g;
export function dropsCountry(before: string, after: string): boolean {
  return [...new Set(before.match(COUNTRIES) ?? [])].some((c) => !after.includes(c));
}
function sentenceOf(d: Partial<Draft>, p: Problem): string | undefined {
  if (p.field === "title") return d.title;
  if (p.field === "lead") return d.lead;
  return isPoint(p) ? d.points?.[p.point - 1] : undefined;
}
const keepingCountries = (d: Partial<Draft>, ps: Problem[]) =>
  ps.filter((p) => !(p.fix && dropsCountry(sentenceOf(d, p) ?? "", p.fix)));
const serious = (ps: Problem[]) => ps.filter((p) => p.severity === "serious");
const toFix = (ps: Problem[]) => ps.filter((p) => p.severity === "serious" || p.severity === "misleading");

/** The draft with each serious or misleading problem's fix put in its field; a point whose problem has no fix is dropped. */
export function applyFixes(d: Draft, ps: Problem[]): Draft {
  const out = { title: d.title, lead: d.lead, points: [...d.points] as Array<string | null> };
  for (const p of toFix(ps)) {
    if (p.field === "title" && p.fix) out.title = p.fix;
    else if (p.field === "lead" && p.fix) out.lead = p.fix;
    else if (isPoint(p) && p.point >= 1 && p.point <= out.points.length) out.points[p.point - 1] = p.fix || null;
  }
  return { title: out.title, lead: out.lead, points: out.points.filter((x): x is string => !!x) };
}

export interface CheckResult { draft: Draft; held: boolean; copyWrong: boolean; receiptIds: number[] }

/**
 * Check once, put the fixes in, re-check only what changed. `ask` is the paid call (a test passes its own);
 * `held` means the item must not be selected: a title or lead still wrong (`copyWrong`), or no point left.
 */
export async function checkAndFix(first: Draft, ask: (d: Partial<Draft>, step: string) => Promise<{ problems: Problem[]; receiptId: number }>): Promise<CheckResult> {
  const c = await ask(first, "check");
  const receiptIds = [c.receiptId];
  c.problems = keepingCountries(first, c.problems);
  const fixes = toFix(c.problems);
  // No points means the reader still has to click.
  if (!fixes.length) return { draft: first, held: first.points.length === 0, copyWrong: false, receiptIds };
  const fixed = applyFixes(first, c.problems);
  // A title or lead the checker could not fix stays wrong.
  let held = fixes.some((p) => (p.field === "title" || p.field === "lead") && !p.fix);
  const before = new Set(first.points);
  const changed = fixed.points.filter((p) => !before.has(p));
  const partial: Partial<Draft> = {};
  if (fixed.title !== first.title) partial.title = fixed.title;
  if (fixed.lead !== first.lead) partial.lead = fixed.lead;
  if (changed.length) partial.points = changed;
  if (!Object.keys(partial).length) return { draft: fixed, held: held || fixed.points.length === 0, copyWrong: held, receiptIds };
  const r2 = await ask(partial, "recheck");
  receiptIds.push(r2.receiptId);
  r2.problems = keepingCountries(partial, r2.problems);
  // The re-check only stops serious errors; a misleading one takes the checker's fix, with no third check
  // (10-23: re-checks kept finding new "misleading" in the changed sentences and held every item).
  const grave = serious(r2.problems);
  if (grave.some((p) => (p.field === "title" && partial.title) || (p.field === "lead" && partial.lead))) held = true;
  const bad = new Set(grave.filter(isPoint).map((p) => changed[p.point - 1]).filter((x): x is string => !!x));
  const last = { ...fixed, points: [...fixed.points] };
  for (const p of r2.problems.filter((p) => p.severity === "misleading" && p.fix)) {
    if (p.field === "title" && partial.title) last.title = p.fix;
    else if (p.field === "lead" && partial.lead) last.lead = p.fix;
    else if (isPoint(p) && changed[p.point - 1] && !bad.has(changed[p.point - 1]!)) last.points[last.points.indexOf(changed[p.point - 1]!)] = p.fix;
  }
  const draft = { ...last, points: last.points.filter((p) => !bad.has(p)) };
  return { draft, held: held || draft.points.length === 0, copyWrong: held, receiptIds };
}

/** The checker on a selected item's copy (title = titleZh, lead = summaryZh, points = the lines of reasonZh). */
export async function checkCopy(a: AnalyzeInputArticle, w: { titleZh: string; summaryZh: string; reasonZh: string | null }, subject: string, attemptTag?: string): Promise<CheckResult> {
  const model = await modelFor("check");
  const original = a.xPost ? String(a.xPost.text ?? a.title) : (a.bodyText ?? a.excerpt ?? "");
  // A paywalled article leaves only its free opening (10-23: note.com, 203 and 301 characters, no figure in them):
  // the points can say nothing the reader could use, so it is not selected, and nothing is paid to check it.
  if (!a.xPost && PAYWALLED_HOSTS.test(a.url) && original.trim().length < MIN_ORIGINAL) return { draft: { title: w.titleZh, lead: w.summaryZh, points: reasonLines(w.reasonZh ?? "") }, held: true, copyWrong: true, receiptIds: [] };
  return checkAndFix({ title: w.titleZh, lead: w.summaryZh, points: reasonLines(w.reasonZh ?? "") }, async (d, step) => {
    const res = await chatJson({
      model, purpose: "check_item", subject, promptVersion: VERSION, system: CHECK_SYSTEM,
      user: [`来源：${a.source.name}`, `原题：${a.title}`, `原文：\n${original}`, `中文稿：\n${JSON.stringify(d, null, 1)}`].join("\n\n"),
      // DeepSeek thinking on a long original ran past the default 120 s once in 40 (10-23 exam).
      schema: Answer, maxTokens: 8000, timeoutMs: 300_000, attemptTag: [attemptTag, step].filter(Boolean).join(":"),
    });
    return { problems: res.data.problems, receiptId: res.receiptId };
  });
}
