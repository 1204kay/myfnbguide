// Writing a case: one model call turns a selected item into a story placed in the situations
// (prompts/case.md), the program computes the examples and checks the numbers and wording (checks.ts),
// and a story with problems is written once more with them named. Every call goes through the engine's
// receipts and budget; the second call differs in its input, so it is a new paid answer, and a run again
// over the same input reuses both.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { sql } from "@aihot/backend/db";
import { loadAnalyzeInput } from "@aihot/backend/editorial/analyze";
import { modelFor } from "@aihot/backend/editorial/models";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { renderContext } from "@aihot/backend/editorial/writing";
import { chatJson } from "@aihot/backend/providers/llm";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { selectedCondition } from "@aihot/backend/publication/scope";
import { SHOP_KINDS, SITUATIONS, type ShopKind } from "../situations.ts";
import type { Block, CaseStory } from "../types.ts";
import { checkStory, MAX_CHARS } from "./checks.ts";
import { computeExample, ExampleInputSchema } from "./examples.ts";

export const MODEL_STEP = "referenceCase";
const PURPOSE = "reference_case";

const SITUATION_LIST = SITUATIONS.map((s) => `- ${s.slug}：${s.title} | ${s.groups.map((g) => `${g.key}：${g.title}`).join("；")}`).join("\n");
const KIND_LIST = SHOP_KINDS.map((k) => `  - ${k.slug}：${k.title}（${k.dek.replace(/。$/, "")}）`).join("\n");
export const CASE_SYSTEM = promptFromText("reference/case", readFileSync(new URL("../prompts/case.md", import.meta.url), "utf8"), { situations: SITUATION_LIST, kinds: KIND_LIST });
// The prompt and the length limit the checks apply: either changing writes every case again.
const PROMPT_VERSION = `reference-case@${createHash("sha256").update(CASE_SYSTEM).update(String(MAX_CHARS)).digest("hex").slice(0, 10)}`;

const text = z.string().trim().min(1);
const number = z.coerce.number().finite().positive();
const item = z.object({ label: text.max(30), value: number });

// Every part has a ceiling a little above what the prompt asks (prompts/case.md), so a long story comes back
// with the very block to shorten named (see `where`), not only its total.
const BlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: text.max(240) }),
  z.object({ type: z.literal("list"), items: z.array(z.object({ lead: z.string().trim().max(14).nullable().default(null), text: text.max(90) })).min(1).max(6) }),
  z.object({ type: z.literal("flow"), steps: z.array(text.max(40)).min(2).max(6) }),
  z.object({ type: z.literal("quote"), text: text.max(80), who: text.max(60) }),
  z.object({ type: z.literal("compare"), unit: text.max(8), per: z.enum(["周", "月"]).nullable().default(null), items: z.array(item).min(2).max(5), caption: text.max(90) }),
  z.object({ type: z.literal("parts"), unit: text.max(8), items: z.array(item).min(2).max(7), against: item.nullable().default(null), caption: text.max(90) }),
  z.object({ type: z.literal("example"), example: ExampleInputSchema, caption: text.max(120) }),
]);

const StorySchema = z.object({
  material: z.literal("story"),
  title: text.max(40),
  lead: text.max(80),
  who: text.max(140),
  parts: z.array(z.object({ heading: text.max(30), blocks: z.array(BlockSchema).min(1).max(3) })).min(1).max(4),
  open: z.string().trim().max(90).nullable().default(null),
  shop: z.object({
    name: z.string().trim().nullable().default(null),
    country: text.max(12),
    city: z.string().trim().nullable().default(null),
    // A kind outside the list is no kind: the case still shows under its situations.
    kind: z.enum(SHOP_KINDS.map((k) => k.slug) as [ShopKind, ...ShopKind[]]).nullable().catch(null),
    size: z.string().trim().nullable().default(null),
    speaker: z.enum(["owner", "staff", "adviser", "vendor", "media"]),
  }),
  placements: z.array(z.object({ situation: text, group: z.string().trim().nullable().default(null), card: text.max(80) })).max(2),
});

const OutputSchema = z.discriminatedUnion("material", [
  z.object({ material: z.literal("thin"), reason: z.string().default("") }),
  z.object({ material: z.literal("news"), reason: z.string().default("") }),
  StorySchema,
]);

type Output = z.infer<typeof OutputSchema>;
type Written = { status: "thin"; reason: string } | { status: "story"; story: CaseStory };

/** The written blocks as the pages draw them: examples and totals computed here. */
function computeBlock(block: z.infer<typeof BlockSchema>): Block {
  switch (block.type) {
    case "compare": {
      const first = block.items[0]!.value;
      const last = block.items.at(-1)!.value;
      const amount = last - first;
      const yearly = block.per ? amount * (block.per === "周" ? 52 : 12) : null;
      return { ...block, change: { amount, percent: Math.round((amount / first) * 1000) / 10, yearly } };
    }
    case "parts": {
      const total = block.items.reduce((sum, i) => sum + i.value, 0);
      return { ...block, total, gap: block.against ? block.against.value - total : null };
    }
    case "example": return computeExample(block.example, block.caption);
    default: return block;
  }
}

const NAMES: Record<string, string> = {
  title: "标题", lead: "开头", who: "人物", open: "结尾说明", heading: "小标题", text: "文字", items: "列表", steps: "流程",
  caption: "图的说明", card: "卡片", blocks: "内容块", parts: "段落", placements: "情况", shop: "店", example: "举例",
};

/** Where in the answer a problem is, as the writer reads it: ["parts", 2, "blocks", 0, "text"] → "第 3 段第 1 块的文字". */
function where(path: PropertyKey[]): string {
  let out = "";
  for (const [i, key] of path.entries()) {
    const next = path[i + 1];
    if (typeof key === "number") continue;
    if (typeof next === "number" && key === "parts") out += `第 ${next + 1} 段`;
    else if (typeof next === "number" && key === "blocks") out += `第 ${next + 1} 块`;
    else if (typeof next === "number" && (key === "items" || key === "steps")) out += `第 ${next + 1} 项`;
    else if (typeof next === "number" && key === "placements") out += `第 ${next + 1} 个情况`;
    else out += `${out ? "的" : ""}${key === "lead" && path.includes("items") ? "要点" : NAMES[String(key)] ?? String(key)}`;
  }
  return out || "整体";
}

/** The model's answer as a story, or what is wrong with it. */
export function readOutput(raw: unknown): { written: Written | null; problems: string[] } {
  const parsed = OutputSchema.safeParse(raw);
  if (!parsed.success) {
    return { written: null, problems: parsed.error.issues.slice(0, 8).map((i) => {
      if (i.code !== "too_big") return `格式不对：${where(i.path)} ${i.message}`;
      const value = i.path.reduce<unknown>((v, k) => (v as Record<PropertyKey, unknown> | undefined)?.[k], raw);
      const now = typeof value === "string" ? `，现在 ${[...value].length} 字` : Array.isArray(value) ? `，现在 ${value.length} 个` : "";
      return `${where(i.path)}太长：最多 ${String(i.maximum)} ${i.origin === "array" ? "个" : "字"}${now}；删去次要的内容，不要拆成更多块`;
    }) };
  }
  const out: Output = parsed.data;
  // Not a story either way: too little material, or news and data with no shop's practice in it (they stay in 最新).
  if (out.material === "thin") return { written: { status: "thin", reason: `材料不够：${out.reason}` }, problems: [] };
  if (out.material === "news") return { written: { status: "thin", reason: `新闻或数据：${out.reason}` }, problems: [] };
  try {
    const { material: _, ...story } = out;
    // A story is in a situation once: a second placement in the same situation (another group) is dropped.
    const placements = story.placements.filter((p, i) => story.placements.findIndex((q) => q.situation === p.situation) === i);
    return { written: { status: "story", story: { ...story, placements, parts: story.parts.map((p) => ({ heading: p.heading, blocks: p.blocks.map(computeBlock) })) } }, problems: [] };
  } catch (error) {
    return { written: null, problems: [`举例算不出来：${(error as Error).message}`] };
  }
}

export interface CaseResult {
  status: "story" | "thin" | "held";
  problems: string[];
}

/** Writes (or writes again) the case of one article and stores it. Null when the article is gone. */
export async function writeCase(articleId: string): Promise<CaseResult | null> {
  const a = await loadAnalyzeInput(articleId);
  if (!a) return null;
  const material = renderContext(a, { annotateQuoted: true });
  const model = await modelFor(MODEL_STEP);
  const receiptIds: number[] = [];
  let user = ["请按系统规则把以下材料写成一个故事，只输出 JSON。", material].join("\n\n");
  let written: Written | null = null;
  let problems: string[] = [];
  // The first answer, and up to two more with its problems named.
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await chatJson({
      model, purpose: PURPOSE, subject: `article:${a.id}@${a.revision}`, promptVersion: PROMPT_VERSION,
      system: CASE_SYSTEM, user, schema: z.unknown(), temperature: 0.3, maxTokens: 6000, timeoutMs: 180_000,
    });
    receiptIds.push(res.receiptId);
    const read = readOutput(res.data);
    written = read.written;
    problems = written?.status === "story" ? checkStory(written.story, material) : read.problems;
    if (!problems.length) break;
    user = [
      "请按系统规则把以下材料写成一个故事，只输出 JSON。", material,
      `你上一次的输出：\n${JSON.stringify(res.data)}`,
      `上一次的输出有以下问题，请改正后重新输出完整的 JSON，其余保持不变：\n${problems.map((p) => `- ${p}`).join("\n")}`,
    ].join("\n\n");
  }
  const status: CaseResult["status"] = problems.length || !written ? "held" : written.status;
  const story = written?.status === "story" ? written.story : null;
  const shopKey = story?.shop.name ? createHash("sha256").update(`${story.shop.country}|${story.shop.name.toLowerCase().replace(/\s+/g, " ")}`).digest("hex").slice(0, 12) : null;
  const situations = status === "story" && story ? story.placements.map((p) => p.situation) : [];
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO reference_cases (article_id, revision, status, story, situations, shop_key, problems, receipt_ids, prompt_version, updated_at)
      VALUES (${a.id}, ${a.revision}, ${status}, ${story ? sql.json(story as never) : null}, ${situations}, ${shopKey},
              ${sql.json((written?.status === "thin" ? [written.reason] : problems) as never)}, ${receiptIds}, ${PROMPT_VERSION}, now())
      ON CONFLICT (article_id) DO UPDATE SET revision = EXCLUDED.revision, status = EXCLUDED.status, story = EXCLUDED.story,
        situations = EXCLUDED.situations, shop_key = EXCLUDED.shop_key, problems = EXCLUDED.problems, receipt_ids = EXCLUDED.receipt_ids,
        prompt_version = EXCLUDED.prompt_version, updated_at = now()`;
    // The answers are used (stored, or held with their problems): their receipts are done, like the engine's.
    for (const id of receiptIds) await completeReceipt(tx, id);
  });
  return { status, problems };
}

/**
 * Selected items with no case yet, or whose article or the writing prompt changed since: newest first. A
 * changed prompt rewrites every case, which the library's size makes cheap for now (two calls a case at most).
 */
export async function articlesToWrite(limit: number, now = new Date()): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    SELECT p.article_id AS id FROM publications p
    JOIN articles a ON a.id = p.article_id
    LEFT JOIN reference_cases c ON c.article_id = p.article_id
    WHERE ${selectedCondition(now)} AND (c.article_id IS NULL OR c.revision < a.revision OR c.prompt_version <> ${PROMPT_VERSION})
    ORDER BY p.sort_at DESC LIMIT ${limit}`;
  return rows.map((r) => r.id);
}
