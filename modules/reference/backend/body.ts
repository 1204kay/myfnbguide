// Writing an item's 正文 · AI 整理自原文 (prompts/body.md): every listed item that is no story of the library (news,
// data, rules, interviews, and selected items whose case came out thin or held) is written up from its original the
// way a case is, so its page says what the original says (用户 10/9: 全部以参考页面为标准). One model call, checked
// like a case (checks.ts: numbers in the original, wording, length); a write-up with problems goes back with them
// named, at most twice. Every call goes through the engine's receipts and budget.
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
import { listedCondition } from "@aihot/backend/publication/scope";
import type { CaseStory, ItemBody } from "../types.ts";
import { checkStory, MAX_CHARS, repeatedNumbers, summaryFigures } from "./checks.ts";
import { BlockSchema, computeBlock, EDIT, spaceStory, textOnly, where } from "./write.ts";

export const BODY_STEP = "referenceBody";
const PURPOSE = "reference_body";
export const BODY_SYSTEM = promptFromText("reference/body", readFileSync(new URL("../prompts/body.md", import.meta.url), "utf8"));
// The prompt, the edit request and the length limit: changing any writes every write-up again.
const PROMPT_VERSION = `reference-body@${createHash("sha256").update(BODY_SYSTEM).update(EDIT).update(String(MAX_CHARS)).digest("hex").slice(0, 10)}`;
/** Below this much text (body, else excerpt) there is nothing to write up beyond the summary: no call. */
const MIN_MATERIAL = 300;

const text = z.string().trim().min(1);
const OutputSchema = z.discriminatedUnion("material", [
  z.object({ material: z.literal("thin"), reason: z.string().default("") }),
  z.object({
    material: z.literal("body"),
    lead: text.max(160),
    parts: z.array(z.object({ heading: text.max(30), blocks: z.array(BlockSchema).min(1).max(3) })).min(1).max(4),
    open: z.string().trim().max(90).nullable().default(null),
  }),
]);

type Written = { status: "thin"; reason: string } | { status: "body"; body: ItemBody };

/** A write-up as the case checks and spacing read it: a story with no title, shop or placement. */
const asStory = (body: ItemBody): CaseStory => ({
  title: "", lead: body.lead, who: "", parts: body.parts, open: body.open, placements: [],
  shop: { name: null, label: "", country: "", city: null, kind: null, size: null, speaker: "media" },
});

/** The model's answer as a write-up, or what is wrong with it. */
export function readBody(raw: unknown): { written: Written | null; problems: string[] } {
  const parsed = OutputSchema.safeParse(raw);
  if (!parsed.success) {
    return { written: null, problems: parsed.error.issues.slice(0, 8).map((i) =>
      i.code === "too_big" ? `${where(i.path)}太长：最多 ${String(i.maximum)} ${i.origin === "array" ? "个" : "字"}；删去次要的内容，不要拆成更多块` : `格式不对：${where(i.path)} ${i.message}`) };
  }
  const out = parsed.data;
  if (out.material === "thin") return { written: { status: "thin", reason: `材料不够：${out.reason}` }, problems: [] };
  try {
    return { written: { status: "body", body: { lead: out.lead, open: out.open, parts: out.parts.map((p) => ({ heading: p.heading, blocks: p.blocks.map(computeBlock) })) } }, problems: [] };
  } catch (error) {
    return { written: null, problems: [`举例算不出来：${(error as Error).message}`] };
  }
}

export interface BodyResult {
  status: "body" | "thin" | "held";
  problems: string[];
}

/** Writes (or writes again) one item's write-up and stores it. Null when the article is gone. */
export async function writeBody(articleId: string): Promise<BodyResult | null> {
  const a = await loadAnalyzeInput(articleId);
  if (!a) return null;
  const receiptIds: number[] = [];
  let written: Written | null = null;
  let problems: string[] = [];
  if ((a.bodyText ?? a.excerpt ?? "").trim().length < MIN_MATERIAL) {
    written = { status: "thin", reason: "材料不够：原文只有标题或一两句话" };
  } else {
    const material = renderContext(a, { annotateQuoted: true });
    const model = await modelFor(BODY_STEP);
    // What the reader has read before the write-up: it says what these do not (prompts/body.md lead).
    const [shown] = await sql<{ title: string; summary: string | null; reason: string | null }[]>`SELECT title, summary, reason FROM publications WHERE article_id = ${a.id}`;
    const page = shown ? [`本站标题：${shown.title}`, `导读：${shown.summary ?? "（无）"}`, `收录理由：${shown.reason ?? "（无）"}`].join("\n") : "";
    let user = ["请按系统规则整理以下材料，只输出 JSON。", page, material].filter(Boolean).join("\n\n");
    // The first answer, and up to two more with its problems named.
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await chatJson({
        model, purpose: PURPOSE, subject: `article:${a.id}@${a.revision}`, promptVersion: PROMPT_VERSION,
        system: BODY_SYSTEM, user, schema: z.unknown(), temperature: 0.3, maxTokens: 5000, timeoutMs: 180_000,
      });
      receiptIds.push(res.receiptId);
      const read = readBody(res.data);
      written = read.written;
      problems = written?.status === "body" ? checkStory(asStory(written.body), material) : read.problems;
      const repeated = written?.status === "body" && shown?.summary ? repeatedNumbers(written.body.lead, shown.summary) : [];
      if (repeated.length) problems.push(`开头重复了导读里的数字 ${repeated.join("、")}：读者刚读完导读，开头只写导读没写的（说话的人是谁、读后面需要知道的背景），这些数字留给后面的段落和图`);
      // The paragraphs below do not write the summary's figures out again either: a figure carries those it needs.
      const again = written?.status === "body" && shown?.summary ? summaryFigures(written.body.parts.flatMap((p) => p.blocks.flatMap((b) => b.type === "text" ? [b.text] : b.type === "list" ? b.items.map((x) => x.text) : [])).join("\n"), shown.summary) : [];
      if (again.length >= 3) problems.push(`正文的文字重复了导读里的数字 ${again.slice(0, 6).join("、")}：读者刚读完导读，删掉文字里重复导读的句子，要用的数字放进图`);
      if (!problems.length) break;
      const list = problems.map((p) => `- ${p}`).join("\n");
      user = problems.every(textOnly)
        ? [EDIT, `故事：\n${JSON.stringify(res.data)}`, `问题：\n${list}`].join("\n\n")
        : [
          "请按系统规则整理以下材料，只输出 JSON。", page, material,
          `你上一次的输出：\n${JSON.stringify(res.data)}`,
          `上一次的输出有以下问题，请改正后重新输出完整的 JSON，其余保持不变：\n${list}`,
        ].join("\n\n");
    }
  }
  const status: BodyResult["status"] = problems.length || !written ? "held" : written.status;
  const body = written?.status === "body" ? (({ lead, parts, open }) => ({ lead, parts, open }))(spaceStory(asStory(written.body))) : null;
  await sql.begin(async (tx) => {
    // A write-up already shown stays when writing it again fails the checks (as a case does, write.ts).
    const [shown] = status === "held" ? await tx`SELECT 1 FROM reference_bodies WHERE article_id = ${a.id} AND status = 'body'` : [];
    if (shown) await tx`UPDATE reference_bodies SET prompt_version = ${PROMPT_VERSION}, receipt_ids = ${receiptIds}, updated_at = now() WHERE article_id = ${a.id}`;
    else await tx`
      INSERT INTO reference_bodies (article_id, revision, status, body, problems, receipt_ids, prompt_version, updated_at)
      VALUES (${a.id}, ${a.revision}, ${status}, ${body ? sql.json(body as never) : null},
              ${sql.json((written?.status === "thin" ? [written.reason] : problems) as never)}, ${receiptIds}, ${PROMPT_VERSION}, now())
      ON CONFLICT (article_id) DO UPDATE SET revision = EXCLUDED.revision, status = EXCLUDED.status, body = EXCLUDED.body,
        problems = EXCLUDED.problems, receipt_ids = EXCLUDED.receipt_ids, prompt_version = EXCLUDED.prompt_version, updated_at = now()`;
    for (const id of receiptIds) await completeReceipt(tx, id);
  });
  return { status, problems };
}

/** Items listed in the last few days are written up as they come; older ones are written by the rewrite script. */
const RECENT_DAYS = 3;

/**
 * Listed items to write up, newest first. A selected item waits for its case (the story is its write-up) and is
 * written up only when the case came out thin or held. As they come: items of the last days with no write-up, or
 * whose article changed. With all (myfnb/rewrite-reference.ts): every listed item whose write-up is missing or was
 * written under another prompt, so a changed prompt rewrites the old ones only once it has been checked on new ones
 * (用户 10/9：先确定写法，才全面重写).
 */
export async function articlesToBody(limit: number, now = new Date(), { all = false } = {}): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    SELECT p.article_id AS id FROM publications p
    JOIN articles a ON a.id = p.article_id
    LEFT JOIN reference_cases c ON c.article_id = p.article_id
    LEFT JOIN reference_bodies b ON b.article_id = p.article_id
    WHERE ${listedCondition(now)}
      AND (NOT p.selected OR c.status IN ('thin', 'held'))
      AND ${all
        ? sql`(b.article_id IS NULL OR b.revision < a.revision OR b.prompt_version <> ${PROMPT_VERSION})`
        : sql`(b.revision < a.revision OR (b.article_id IS NULL AND p.sort_at > ${now}::timestamptz - make_interval(days => ${RECENT_DAYS})))`}
    ORDER BY p.sort_at DESC LIMIT ${limit}`;
  return rows.map((r) => r.id);
}
