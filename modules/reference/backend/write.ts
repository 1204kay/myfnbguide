// Writing a case: one model call turns a selected item into a story placed in the situations
// (prompts/case.md), the program computes the examples and checks the numbers and wording (checks.ts),
// and a story with problems goes back with them named: as an edit of its own text when only the text needs
// mending, with the material again otherwise. Every call goes through the engine's receipts and budget; each
// later call differs in its input, so it is a new paid answer, and a run again over the same input reuses them.
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
import { spaced } from "../format.ts";
import { SHOP_KINDS, SITUATIONS, type ShopKind } from "../situations.ts";
import type { Block, CaseStory } from "../types.ts";
import { badness, blocking, checkStory } from "./checks.ts";
import { computeExample, ExampleInputSchema } from "./examples.ts";

export const MODEL_STEP = "referenceCase";
const PURPOSE = "reference_case";

const SITUATION_LIST = SITUATIONS.map((s) => `- ${s.slug}：${s.title} | ${s.groups.map((g) => `${g.key}：${g.title}（${g.line}）`).join("；")}`).join("\n");
const KIND_LIST = SHOP_KINDS.map((k) => `  - ${k.slug}：${k.title}（${k.dek.replace(/。$/, "")}）`).join("\n");
export const CASE_SYSTEM = promptFromText("reference/case", readFileSync(new URL("../prompts/case.md", import.meta.url), "utf8"), { situations: SITUATION_LIST, kinds: KIND_LIST });
/**
 * Problems the writer can mend in its own text: too long, a word, retelling the original, a label for a heading,
 * an untranslated sentence, a title opening with where it is from. Those go back without the material, as an edit of the story: given the whole material
 * again, the writer wrote it afresh and as long as before (10/5: 53 of 65 held were too long after two more tries).
 * A country or city left unnamed (全国、本地) is not one of them: only the material says which.
 */
export const textOnly = (problem: string) => /太长|用了“|原文说|分格标签|没有翻译|^标题以|从哪里来|重复了导读|又写了一遍|写成了问句|直接从这个人写起|说的是同一件事/.test(problem) && !/国家名|城市名/.test(problem);
export const EDIT = "下面是你按系统规则写好的故事（JSON），有以下问题。只修改有问题的地方：太长就删去次要的句子和细节，不拆成更多块；用词按提示改；不加新的内容和数字。其余保持不变，输出完整的 JSON。";
/**
 * The last pass over a story that passed the checks: its wording made plain written Chinese, nothing else (the
 * writer kept spoken words the checks cannot list: 撑、活、盯、攒、往上走; reviews of 10/5). Kept only when the
 * checks still pass and no number changed.
 */
const STYLE_SYSTEM = promptFromText("reference/style", readFileSync(new URL("../prompts/style.md", import.meta.url), "utf8"));
// The prompts, the edit request and the checks: the rewrite script writes again every case written under others.
/**
 * The code that checks and shapes an answer (checks.ts, and this file's schema and splitting): a story held under
 * one set of checks is written again under the next, by the rewrite script (myfnb/rewrite-reference.ts).
 */
export const CHECKING = ["./checks.ts", "./write.ts"].map((f) => readFileSync(new URL(f, import.meta.url), "utf8")).join("\n");
const PROMPT_VERSION = `reference-case@${createHash("sha256").update(CASE_SYSTEM).update(EDIT).update(STYLE_SYSTEM).update(CHECKING).digest("hex").slice(0, 10)}`;
const numbersOf = (story: CaseStory) => (JSON.stringify(story).match(/\d+(?:\.\d+)?/g) ?? []).sort().join(",");

const text = z.string().trim().min(1);
const number = z.coerce.number().finite().positive();
/** The longest paragraph a text block holds; a longer one is split at its sentences into paragraphs of up to PARAGRAPH. */
const TEXT_MAX = 240;
const PARAGRAPH = 200;

/** Blocks a part may hold: three as asked, more where long paragraphs were split (splitLong) or the writer went over. */
export const BLOCKS = 6;
const item = z.object({ label: text.max(30), value: number });

// Every part has a ceiling a little above what the prompt asks (prompts/case.md), so a long story comes back
// with the very block to shorten named (see `where`), not only its total.
export const BlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text: text.max(TEXT_MAX) }),
  z.object({ type: z.literal("list"), items: z.array(z.object({ lead: z.string().trim().max(14).nullable().default(null), text: text.max(90) })).min(1).max(6) }),
  z.object({ type: z.literal("flow"), steps: z.array(text.max(40)).min(2).max(6) }),
  z.object({ type: z.literal("quote"), text: text.max(80), who: text.max(60) }),
  z.object({ type: z.literal("compare"), unit: text.max(8), per: z.enum(["周", "月"]).nullable().default(null), items: z.array(item).min(2).max(5), caption: text.max(90) }),
  z.object({ type: z.literal("parts"), unit: text.max(8), items: z.array(item).min(2).max(7), against: item.nullable().default(null), caption: text.max(90) }),
  z.object({ type: z.literal("example"), example: ExampleInputSchema, caption: text.max(120) }),
  z.object({ type: z.literal("numbers"), point: z.string().trim().max(30).nullable().default(null), items: z.array(z.object({ value: text.max(16), label: text.max(24) })).min(1).max(3), caption: z.string().trim().max(90).nullable().default(null) }),
  z.object({ type: z.literal("change"), before: z.object({ label: text.max(8), text: text.max(80) }), after: z.object({ label: text.max(8), text: text.max(80) }), caption: z.string().trim().max(90).nullable().default(null) }),
]);

const StorySchema = z.object({
  material: z.literal("story"),
  title: text.max(40),
  lead: text.max(80),
  who: text.max(140),
  parts: z.array(z.object({ heading: text.max(30), blocks: z.array(BlockSchema).min(1).max(BLOCKS) })).min(1).max(4),
  open: z.string().trim().max(90).nullable().default(null),
  shop: z.object({
    name: z.string().trim().nullable().default(null),
    label: text.max(20),
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
export function computeBlock(block: z.infer<typeof BlockSchema>): Block {
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
  caption: "图的说明", card: "卡片", blocks: "内容块", parts: "段落", placements: "情况", shop: "店", label: "店家说明", example: "举例",
};

/** Where in the answer a problem is, as the writer reads it: ["parts", 2, "blocks", 0, "text"] → "第 3 段第 1 块的文字". */
export function where(path: PropertyKey[]): string {
  let out = "";
  for (const [i, key] of path.entries()) {
    const next = path[i + 1];
    if (typeof key === "number") continue;
    if (typeof next === "number" && key === "parts") out += `第 ${next + 1} 段`;
    else if (typeof next === "number" && key === "blocks") out += `第 ${next + 1} 块`;
    else if (typeof next === "number" && (key === "items" || key === "steps")) out += `第 ${next + 1} 项`;
    else if (typeof next === "number" && key === "placements") out += `第 ${next + 1} 个情况`;
    // A label is the shop's line only under shop: in a figures card or a chart it says what a number is (10/9 eval:
    // a card's label sent back as 店家说明, and the writer cut the wrong field).
    else out += `${out ? "的" : ""}${key === "lead" && path.includes("items") ? "要点" : key === "label" && !path.includes("shop") ? "说明" : NAMES[String(key)] ?? String(key)}`;
  }
  return out || "整体";
}

/** The model's answer as a story, or what is wrong with it. */
/**
 * The answer with each over-long text block split at its sentences into two or more paragraphs, as an editor would:
 * nothing is cut. A paragraph over the limit was the commonest reason a story or write-up was held (10/9 trial:
 * 太长：某一块 held 59 stories and 23 write-ups, the model writing 260 characters after being asked twice for 240).
 */
export function splitLong(raw: unknown): unknown {
  const answer = raw as { parts?: Array<{ blocks?: unknown[] }> } | null;
  if (!answer || !Array.isArray(answer.parts)) return raw;
  return { ...answer, parts: answer.parts.map((part) => !part || !Array.isArray(part.blocks) ? part : {
    ...part,
    blocks: part.blocks.flatMap((b) => {
      const block = b as { type?: unknown; text?: unknown };
      if (block?.type !== "text" || typeof block.text !== "string" || [...block.text].length <= TEXT_MAX) return [b];
      const paragraphs: string[] = [];
      for (const sentence of block.text.match(/[^。！？；]+[。！？；]?/gu) ?? [block.text]) {
        const last = paragraphs.length - 1;
        if (last >= 0 && [...paragraphs[last]! + sentence].length <= PARAGRAPH) paragraphs[last] += sentence;
        else paragraphs.push(sentence);
      }
      return paragraphs.map((text) => ({ type: "text", text: text.trim() }));
    }),
  }) };
}

export function readOutput(answer: unknown): { written: Written | null; problems: string[] } {
  const raw = splitLong(answer);
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
    // One situation, the writer's first: the second was mostly a stretch (reviews of 10/5: 10 of 23 misplaced).
    const placements = story.placements.slice(0, 1);
    return { written: { status: "story", story: { ...story, placements, parts: story.parts.map((p) => ({ heading: p.heading, blocks: p.blocks.map(computeBlock) })) } }, problems: [] };
  } catch (error) {
    return { written: null, problems: [`举例算不出来：${(error as Error).message}`] };
  }
}

export interface CaseResult {
  status: "story" | "thin" | "held";
  problems: string[];
}

/**
 * A shop's name as its key reads it: one shop's stories meet on its page however the writer spaced, cased or
 * punctuated the name, or added a reading in brackets ("クチーナカメヤマ（Cucina Kameyama）" and "クチーナカメヤマ").
 */
export function shopNameKey(name: string): string {
  const normal = name.normalize("NFKC").toLowerCase();
  const bare = normal.replace(/[(（][^()（）]*[)）]/g, "").replace(/[\s\p{P}\p{S}]/gu, "");
  return bare || normal.replace(/\s+/g, " ").trim();
}

/** What readers read of a story, spaced (format.ts spaced) as it is stored; names, numbers and examples' inputs as written. */
export function spaceStory(story: CaseStory): CaseStory {
  const s = spaced;
  const block = (b: Block): Block => {
    switch (b.type) {
      case "text": return { ...b, text: s(b.text) };
      case "list": return { ...b, items: b.items.map((i) => ({ lead: i.lead && s(i.lead), text: s(i.text) })) };
      case "flow": return { ...b, steps: b.steps.map(s) };
      case "quote": return { ...b, text: s(b.text), who: s(b.who) };
      case "compare": return { ...b, caption: s(b.caption), items: b.items.map((i) => ({ ...i, label: s(i.label) })) };
      case "parts": return { ...b, caption: s(b.caption), items: b.items.map((i) => ({ ...i, label: s(i.label) })), against: b.against && { ...b.against, label: s(b.against.label) } };
      case "example": return { ...b, caption: s(b.caption), result: s(b.result) };
      case "numbers": return { ...b, caption: b.caption && s(b.caption), items: b.items.map((i) => ({ value: s(i.value), label: s(i.label) })) };
      case "change": return { ...b, caption: b.caption && s(b.caption), before: { label: s(b.before.label), text: s(b.before.text) }, after: { label: s(b.after.label), text: s(b.after.text) } };
    }
  };
  return {
    ...story, title: s(story.title), lead: s(story.lead), who: s(story.who), open: story.open && s(story.open),
    shop: { ...story.shop, label: s(story.shop.label) },
    parts: story.parts.map((p) => ({ heading: s(p.heading), blocks: p.blocks.map(block) })),
    placements: story.placements.map((p) => ({ ...p, card: s(p.card) })),
  };
}

export type Article = NonNullable<Awaited<ReturnType<typeof loadAnalyzeInput>>>;
/** The system prompt a case is written with, and its version (receipts key on it). */
export interface Prompt { system: string; version: string }
export const CASE_PROMPT: Prompt = { system: CASE_SYSTEM, version: PROMPT_VERSION };
/** A candidate case prompt from its text, filled in as the site's is (myfnb/eval-reference.ts). */
export function casePrompt(text: string): Prompt {
  const system = promptFromText("reference/case-candidate", text, { situations: SITUATION_LIST, kinds: KIND_LIST });
  return { system, version: `reference-case-candidate@${createHash("sha256").update(system).update(EDIT).update(STYLE_SYSTEM).update(CHECKING).digest("hex").slice(0, 10)}` };
}

/** A case as written from an article, before it is stored (writeCase stores it; the eval script only reads it). */
export interface ComposedCase {
  status: CaseResult["status"];
  story: CaseStory | null;
  reason: string | null;
  problems: string[];
  receiptIds: number[];
}

/** Writes one article's case with a prompt: up to three answers, checked, and the wording pass. Stores nothing. */
export async function composeCase(a: Article, prompt: Prompt = CASE_PROMPT): Promise<ComposedCase> {
  const material = renderContext(a, { annotateQuoted: true });
  const model = await modelFor(MODEL_STEP);
  const receiptIds: number[] = [];
  let user = ["请按系统规则把以下材料写成一个故事，只输出 JSON。", material].join("\n\n");
  let written: Written | null = null;
  let answer: unknown = null;
  let problems: string[] = [];
  let best: { written: Written | null; answer: unknown; problems: string[] } | null = null;
  // The first answer, and up to two more with its problems named.
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await chatJson({
      model, purpose: PURPOSE, subject: `article:${a.id}@${a.revision}`, promptVersion: prompt.version,
      system: prompt.system, user, schema: z.unknown(), temperature: 0.3, maxTokens: 6000, timeoutMs: 180_000,
    });
    receiptIds.push(res.receiptId);
    const read = readOutput(res.data);
    written = read.written;
    answer = res.data;
    problems = written?.status === "story" ? checkStory(written.story, material) : read.problems;
    // A later try can be worse than an earlier one: the best of them is the one kept.
    if (!best || badness(written, problems) < badness(best.written, best.problems)) best = { written, answer, problems };
    if (!problems.length) break;
    const list = problems.map((p) => `- ${p}`).join("\n");
    user = problems.every(textOnly)
      ? [EDIT, `故事：\n${JSON.stringify(res.data)}`, `问题：\n${list}`].join("\n\n")
      : [
        "请按系统规则把以下材料写成一个故事，只输出 JSON。", material,
        `你上一次的输出：\n${JSON.stringify(res.data)}`,
        `上一次的输出有以下问题，请改正后重新输出完整的 JSON，其余保持不变：\n${list}`,
      ].join("\n\n");
  }
  ({ written, answer, problems } = best ?? { written, answer, problems });
  if (!problems.some(blocking) && written?.status === "story") {
    const styled = await chatJson({
      model, purpose: PURPOSE, subject: `article:${a.id}@${a.revision}`, promptVersion: prompt.version,
      system: STYLE_SYSTEM, user: JSON.stringify(answer), schema: z.unknown(), temperature: 0.2, maxTokens: 6000, timeoutMs: 180_000,
    });
    receiptIds.push(styled.receiptId);
    const read = readOutput(styled.data);
    const after = read.written?.status === "story" ? checkStory(read.written.story, material) : null;
    if (read.written?.status === "story" && after && !after.some(blocking) && after.length <= problems.length && numbersOf(read.written.story) === numbersOf(written.story)) {
      written = read.written;
      problems = after;
    }
  }
  const status: CaseResult["status"] = !written || problems.some(blocking) ? "held" : written.status;
  const story = written?.status === "story" ? spaceStory(written.story) : null;
  return { status, story, reason: written?.status === "thin" ? written.reason : null, problems, receiptIds };
}

/** Writes (or writes again) the case of one article and stores it. Null when the article is gone. */
export async function writeCase(articleId: string): Promise<CaseResult | null> {
  const a = await loadAnalyzeInput(articleId);
  if (!a) return null;
  const { status, story, reason, problems, receiptIds } = await composeCase(a);
  const shopKey = story?.shop.name ? createHash("sha256").update(`${story.shop.country}|${shopNameKey(story.shop.name)}`).digest("hex").slice(0, 12) : null;
  const situations = status === "story" && story ? story.placements.map((p) => p.situation) : [];
  await sql.begin(async (tx) => {
    // A story already shown stays when writing it again (a new prompt, a new revision) fails the checks: rewriting
    // every case would otherwise hide a quarter of the library (27% of first writes were held, 10/9). It is marked
    // as tried under this prompt, so it is not written again until the next change.
    const [shown] = status === "held" ? await tx`SELECT 1 FROM reference_cases WHERE article_id = ${a.id} AND status = 'story'` : [];
    if (shown) {
      // What held the new one, for the status page: the shown story stays, its problems are the rewrite's.
      await tx`UPDATE reference_cases SET prompt_version = ${PROMPT_VERSION}, receipt_ids = ${receiptIds}, problems = ${sql.json(problems as never)}, updated_at = now() WHERE article_id = ${a.id}`;
    } else await tx`
      INSERT INTO reference_cases (article_id, revision, status, story, situations, shop_key, problems, receipt_ids, prompt_version, updated_at)
      VALUES (${a.id}, ${a.revision}, ${status}, ${story ? sql.json(story as never) : null}, ${situations}, ${shopKey},
              ${sql.json((reason ? [reason] : problems) as never)}, ${receiptIds}, ${PROMPT_VERSION}, now())
      ON CONFLICT (article_id) DO UPDATE SET revision = EXCLUDED.revision, status = EXCLUDED.status, story = EXCLUDED.story,
        situations = EXCLUDED.situations, shop_key = EXCLUDED.shop_key, problems = EXCLUDED.problems, receipt_ids = EXCLUDED.receipt_ids,
        prompt_version = EXCLUDED.prompt_version, updated_at = now()`;
    // The answers are used (stored, or held with their problems): their receipts are done, like the engine's.
    for (const id of receiptIds) await completeReceipt(tx, id);
  });
  return { status, problems };
}

/**
 * Selected items to write a case for, newest first: no case yet, or the article changed since. With all
 * (myfnb/rewrite-reference.ts) also the cases written under another prompt, so a changed prompt rewrites the old
 * ones only once it has been checked on new ones (用户 10/9：先确定写法，才全面重写).
 */
export async function articlesToWrite(limit: number, now = new Date(), { all = false } = {}): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    SELECT p.article_id AS id FROM publications p
    JOIN articles a ON a.id = p.article_id
    LEFT JOIN reference_cases c ON c.article_id = p.article_id
    WHERE ${selectedCondition(now)}
      AND (c.article_id IS NULL OR c.revision < a.revision ${all ? sql`OR c.prompt_version <> ${PROMPT_VERSION}` : sql``})
    ORDER BY p.sort_at DESC LIMIT ${limit}`;
  return rows.map((r) => r.id);
}
