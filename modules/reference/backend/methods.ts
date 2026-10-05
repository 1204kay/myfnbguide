// Grouping a situation's stories by the practice they tell (HANDOFF §9.2, 10/5: "多篇原文说的同一种方式、方法、
// 经验"): one model call a situation puts the stories that tell the same practice together, titles and sums up
// each practice, and writes a short overview of the situation (prompts/methods.md). The program checks that
// every story is placed once and within its group, and that every number is a story's own; a grouping with
// problems goes back once with them named, and is not stored if it still fails (the page then shows one card a
// story, as before). How many shops and countries stand behind a practice the program counts, never the model.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { sql } from "@aihot/backend/db";
import { modelFor } from "@aihot/backend/editorial/models";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { chatJson } from "@aihot/backend/providers/llm";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { findSituation } from "../situations.ts";
import type { CaseStory } from "../types.ts";
import { sourceNumbers, unfoundNumbers, untranslated, WORDING } from "./checks.ts";

export const METHODS_STEP = "referenceMethods";
const PURPOSE = "reference_methods";
const SYSTEM = promptFromText("reference/methods", readFileSync(new URL("../prompts/methods.md", import.meta.url), "utf8"));
const PROMPT_VERSION = `reference-methods@${createHash("sha256").update(SYSTEM).digest("hex").slice(0, 10)}`;

/** A story as the grouping reads it: where it sits in the situation, and what it tells. */
export interface Member {
  id: string;
  group: string | null;
  story: CaseStory;
}

export interface Method {
  group: string | null;
  title: string;
  summary: string;
  cases: string[];
}

export interface Grouping {
  overview: string;
  methods: Method[];
}

const OutputSchema = z.object({
  overview: z.string().trim().min(1).max(120),
  methods: z.array(z.object({
    group: z.string().trim().min(1).nullable().default(null),
    title: z.string().trim().min(1).max(24),
    summary: z.string().trim().min(1).max(150),
    cases: z.array(z.string().trim().min(1)).min(1),
  })).min(1),
});

/** Which stories a situation holds and how they read: a change in any of them groups it again. */
export function membersKey(members: Member[]): string {
  const lines = members.map((m) => [m.id, m.group ?? "", m.story.title, m.story.placements[0]?.card ?? ""].join("|")).sort();
  return createHash("sha256").update(PROMPT_VERSION).update(lines.join("\n")).digest("hex").slice(0, 16);
}

/** The model's answer as a grouping, or what is wrong with it, each problem as a sentence it can act on. */
export function readGrouping(raw: unknown, members: Member[]): { grouping: Grouping | null; problems: string[] } {
  const parsed = OutputSchema.safeParse(raw);
  if (!parsed.success) return { grouping: null, problems: parsed.error.issues.slice(0, 6).map((i) => `格式不对：${i.path.join(".")} ${i.message}`) };
  const out = parsed.data;
  const byId = new Map(members.map((m) => [m.id, m]));
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const [i, m] of out.methods.entries()) {
    const name = `第 ${i + 1} 个做法「${m.title}」`;
    for (const id of m.cases) {
      const member = byId.get(id);
      if (!member) problems.push(`${name}里的 ${id} 不是这种情况的故事：只用给出的 id`);
      else if (member.group !== m.group) problems.push(`${name}放进了另一个原因组的故事 ${id}：只在同一个原因组里归并`);
      if (seen.has(id)) problems.push(`故事 ${id} 出现在两个做法里：每篇只放进一个做法`);
      seen.add(id);
    }
    // The numbers a practice's sum-up may name are its own stories'.
    const source = sourceNumbers(m.cases.flatMap((id) => (byId.get(id) ? [JSON.stringify(byId.get(id)!.story)] : [])).join("\n"));
    const missing = unfoundNumbers(m.summary, source);
    if (missing.length) problems.push(`${name}的归纳里的数字 ${missing.join("、")} 在这些故事里找不到：删掉，或改成故事写的数字`);
  }
  for (const m of members) if (!seen.has(m.id)) problems.push(`故事 ${m.id}（${m.story.title}）没有放进任何做法：每篇都要放进一个做法`);
  if (/\d/.test(out.overview.normalize("NFKC"))) problems.push("综述里写了数字：综述不写数字");
  const texts: Array<[string, string]> = [["综述", out.overview], ...out.methods.flatMap((m, i): Array<[string, string]> => [[`第 ${i + 1} 个做法的标题`, m.title], [`第 ${i + 1} 个做法的归纳`, m.summary]])];
  for (const [where, text] of texts) {
    const foreign = untranslated(text);
    if (foreign) problems.push(`${where}有没有翻译的${foreign}：译成中文，只有店名、人名可以保留原文`);
    for (const [pattern, fix] of WORDING) {
      const hit = pattern.exec(text);
      if (hit) problems.push(`${where}用了“${hit[0]}”：${fix}`);
    }
  }
  return { grouping: problems.length ? null : out, problems };
}

/** What the model reads of each story: its place in the situation and the practice it tells, kept short. */
function describe(m: Member): string {
  const s = m.story;
  const body = s.parts.map((p) => `${p.heading}：${p.blocks.flatMap((b) => (b.type === "text" ? [b.text] : b.type === "list" ? b.items.map((i) => i.text) : b.type === "flow" ? [b.steps.join("→")] : [])).join(" ").slice(0, 200)}`).join("\n");
  const shop = [s.shop.country, s.shop.city, s.shop.name].filter(Boolean).join(" · ");
  return [`id：${m.id}`, `原因组：${m.group ?? "null"}`, `店：${shop}`, `标题：${s.title}`, `卡片：${s.placements[0]?.card ?? ""}`, `人物：${s.who}`, body].join("\n");
}

/** Groups one situation's stories and stores the result; null when there is nothing to group or the answer still fails. */
export async function groupSituation(slug: string, members: Member[]): Promise<{ stored: boolean; problems: string[] } | null> {
  const situation = findSituation(slug);
  if (!situation || members.length < 2) return null;
  const groups = situation.groups.map((g) => `- ${g.key}：${g.title}（${g.line}）`).join("\n");
  const material = [`情况：${situation.title}（${situation.dek}）`, `原因组：\n${groups}`, `故事：\n\n${members.map(describe).join("\n\n")}`].join("\n\n");
  const model = await modelFor(METHODS_STEP);
  const receiptIds: number[] = [];
  let user = `请按系统规则归并以下故事，只输出 JSON。\n\n${material}`;
  let read: ReturnType<typeof readGrouping> = { grouping: null, problems: [] };
  // The first answer, and one more with its problems named.
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await chatJson({
      model, purpose: PURPOSE, subject: `situation:${slug}@${membersKey(members)}`, promptVersion: PROMPT_VERSION,
      system: SYSTEM, user, schema: z.unknown(), temperature: 0.2, maxTokens: 4000, timeoutMs: 180_000,
    });
    receiptIds.push(res.receiptId);
    read = readGrouping(res.data, members);
    if (read.grouping) break;
    user = [`请按系统规则归并以下故事，只输出 JSON。`, material, `你上一次的输出：\n${JSON.stringify(res.data)}`,
      `上一次的输出有以下问题，请改正后重新输出完整的 JSON：\n${read.problems.map((p) => `- ${p}`).join("\n")}`].join("\n\n");
  }
  const key = membersKey(members);
  await sql.begin(async (tx) => {
    // A grouping that still fails keeps the last good one (the page shows it, or one card a story) and marks these
    // members as tried, so it is not paid for again until the stories change.
    if (read.grouping) {
      await tx`
        INSERT INTO reference_situations (slug, members, tried, overview, methods, problems, receipt_ids, prompt_version, updated_at)
        VALUES (${slug}, ${key}, ${key}, ${read.grouping.overview}, ${sql.json(read.grouping.methods as never)}, '[]', ${receiptIds}, ${PROMPT_VERSION}, now())
        ON CONFLICT (slug) DO UPDATE SET members = EXCLUDED.members, tried = EXCLUDED.tried, overview = EXCLUDED.overview, methods = EXCLUDED.methods,
          problems = '[]', receipt_ids = EXCLUDED.receipt_ids, prompt_version = EXCLUDED.prompt_version, updated_at = now()`;
    } else {
      await tx`
        INSERT INTO reference_situations (slug, members, tried, problems, receipt_ids, prompt_version, updated_at)
        VALUES (${slug}, '', ${key}, ${sql.json(read.problems as never)}, ${receiptIds}, ${PROMPT_VERSION}, now())
        ON CONFLICT (slug) DO UPDATE SET tried = EXCLUDED.tried, problems = EXCLUDED.problems, receipt_ids = EXCLUDED.receipt_ids, updated_at = now()`;
    }
    for (const id of receiptIds) await completeReceipt(tx, id);
  });
  return { stored: !!read.grouping, problems: read.problems };
}

/** Situations whose stories changed since they were last grouped or tried (or never were), with their members. */
export async function situationsToGroup(bySituation: Map<string, Member[]>, limit: number): Promise<Array<[string, Member[]]>> {
  const stored = new Map((await sql<{ slug: string; members: string; tried: string }[]>`
    SELECT slug, members, tried FROM reference_situations`).map((r) => [r.slug, r]));
  const due: Array<[string, Member[]]> = [];
  for (const [slug, members] of bySituation) {
    const key = membersKey(members);
    const row = stored.get(slug);
    if (members.length < 2 || row?.members === key || row?.tried === key) continue;
    due.push([slug, members]);
    if (due.length >= limit) break;
  }
  return due;
}
