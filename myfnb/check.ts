// 核对员（决定记录 2026-10-23）：一个模型拿原文逐句核一份中文稿，列出问题，每个问题带改好后的整个字段。
// 试跑用（myfnb/trial-check.ts 考试、myfnb/trial-pipeline.ts 写—核—改），还没接进 worker。
import { z } from "zod";
import type { AnalyzeInputArticle } from "@aihot/backend/editorial/input";
import { promptText, promptVersion } from "@aihot/backend/editorial/prompts";
import { chatJson } from "@aihot/backend/providers/llm";

export const Problem = z.object({
  field: z.string(), point: z.coerce.number().catch(0), quote: z.string(), kind: z.coerce.number().catch(0),
  severity: z.string(), why: z.string(), fix: z.string().catch(""),
});
export type Problem = z.infer<typeof Problem>;
const Answer = z.object({ problems: z.array(Problem) });

/** A draft in the fields the prompt names: the 要点 form (title, lead, points) or the site's old one (title, summary, reason). */
export type Draft = { title: string; lead: string; points: string[] } | { title: string; summary: string; reason: string };

const SYSTEM = promptText("check-item");
const VERSION = promptVersion("check-item");

export async function checkDraft(model: string, a: AnalyzeInputArticle, draft: Draft, tag: string): Promise<{ problems: Problem[]; receiptId: number }> {
  const res = await chatJson({
    model, purpose: "trial_check_item", subject: `article:${a.id}`, promptVersion: VERSION, system: SYSTEM,
    user: [`来源：${a.source.name}`, `原题：${a.title}`, `原文：\n${a.bodyText ?? a.excerpt ?? ""}`, `中文稿：\n${JSON.stringify(draft, null, 1)}`].join("\n\n"),
    // The default 120 s cut one of 40 drafts in the 10-23 exam (DeepSeek thinking on a long original).
    schema: Answer, maxTokens: 4000, attemptTag: tag, timeoutMs: 300_000,
  });
  return { problems: res.data.problems, receiptId: res.receiptId };
}

export const serious = (ps: Problem[]) => ps.filter((p) => p.severity === "serious");

/** The 要点 draft with each serious problem's fix put in its field; a problem with no fix drops its point. */
export function applyFixes(d: { title: string; lead: string; points: string[] }, ps: Problem[]): { title: string; lead: string; points: string[] } {
  const out = { title: d.title, lead: d.lead, points: [...d.points] as Array<string | null> };
  for (const p of serious(ps)) {
    if (p.field === "title" && p.fix) out.title = p.fix;
    else if (p.field === "lead" && p.fix) out.lead = p.fix;
    else if ((p.field === "point" || p.field === "points") && p.point >= 1 && p.point <= out.points.length) out.points[p.point - 1] = p.fix || null;
  }
  return { title: out.title, lead: out.lead, points: out.points.filter((x): x is string => !!x) };
}
