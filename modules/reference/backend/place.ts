// Placing a selected item in the library (待决 #19): since 10-24 no stories are written (决定记录 2026-10-24「参考库不再写
// 故事」), and the situation pages list items, not stories. An item selected after the stories stopped (10-18) had no
// case, so it sat on no situation page; nor did one whose case came out thin or held. One short model call now reads the item's own title, 导读 and 原文要点 (not the
// original: the call only picks a place, and the three are what the page shows) and picks the situation and its group,
// as the story writer did (prompts/case.md 六), with who tells it for the counts (read.ts tellerOf). No title or line is
// written. An answer that names a situation or group not in the list goes back once with that named; one still wrong is
// stored with none, so it is not paid for again. Every call goes through the engine's receipts and budget.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { sql } from "@aihot/backend/db";
import { modelFor } from "@aihot/backend/editorial/models";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { chatJson } from "@aihot/backend/providers/llm";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { selectedCondition } from "@aihot/backend/publication/scope";
import { findSituation, SITUATIONS } from "../situations.ts";
import type { Speaker } from "../types.ts";

export const PLACE_STEP = "referencePlace";
const PURPOSE = "reference_place";
const SITUATION_LIST = SITUATIONS.map((s) => `- ${s.slug}：${s.title} | ${s.groups.map((g) => `${g.key}：${g.title}（${g.line}）`).join("；")}`).join("\n");
export const PLACE_SYSTEM = promptFromText("reference/place", readFileSync(new URL("../prompts/place.md", import.meta.url), "utf8"), { situations: SITUATION_LIST });
export const PLACE_VERSION = `reference-place@${createHash("sha256").update(PLACE_SYSTEM).digest("hex").slice(0, 10)}`;

const SPEAKERS = ["owner", "staff", "adviser", "vendor", "media"] as const satisfies readonly Speaker[];
const AnswerSchema = z.object({
  main: z.string().trim().default(""),
  speaker: z.enum(SPEAKERS).catch("media"),
  placements: z.array(z.object({
    situation: z.string().trim(),
    fit: z.string().trim().default(""),
    group: z.string().trim().nullable().default(null),
  })).default([]),
});

export interface Placed {
  situation: string;
  group: string | null;
  /** Why it sits there, in a sentence: not shown, for checking a placement against the item. */
  fit: string;
}

export interface Placing {
  /** Whose problem it helps with, in a sentence, written before the place is picked: not shown, for checking. */
  main: string;
  speaker: Speaker;
  placements: Placed[];
}

/** The model's answer as a placing, or what is wrong with it: one situation from the list, a group of it or none. */
export function readPlacing(answer: unknown): { placing: Placing | null; problems: string[] } {
  const parsed = AnswerSchema.safeParse(answer);
  if (!parsed.success) return { placing: null, problems: ["格式不对"] };
  const { speaker, placements } = parsed.data;
  const main = parsed.data.main.slice(0, 120);
  if (placements.length > 1) return { placing: null, problems: ["只放一个最合适的情况"] };
  const p = placements[0];
  if (!p) return { placing: { main, speaker, placements: [] }, problems: [] };
  const situation = findSituation(p.situation);
  if (!situation) return { placing: null, problems: [`情况“${p.situation}”不在清单里`] };
  if (p.group !== null && !situation.groups.some((g) => g.key === p.group)) {
    return { placing: null, problems: [`“${p.group}”不是“${situation.slug}”的组，要写那个情况里的组 key 或 null`] };
  }
  return { placing: { main, speaker, placements: [{ situation: situation.slug, group: p.group, fit: p.fit.slice(0, 120) }] }, problems: [] };
}

interface Item {
  id: string;
  revision: number;
  title: string;
  summary: string | null;
  reason: string | null;
  source: string;
}

export interface PlaceResult {
  id: string;
  title: string;
  placing: Placing;
  problems: string[];
  receiptIds: number[];
}

/** Places one item: up to two answers, the second with the first's problem named. Stores nothing (placeItem stores). */
export async function composePlacing(item: Item): Promise<PlaceResult> {
  const model = await modelFor(PLACE_STEP);
  const material = [
    `本站标题：${item.title}`, `导读：${item.summary ?? "（无）"}`, `原文要点：\n${item.reason ?? "（无）"}`, `来源：${item.source}`,
  ].join("\n");
  let user = `请按系统规则放好下面这条原文，只输出 JSON。\n\n${material}`;
  const receiptIds: number[] = [];
  let problems: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await chatJson({
      model, purpose: PURPOSE, subject: `article:${item.id}@${item.revision}`, promptVersion: PLACE_VERSION,
      system: PLACE_SYSTEM, user, schema: z.unknown(), temperature: 0.2, maxTokens: 400, timeoutMs: 60_000,
    });
    receiptIds.push(res.receiptId);
    const read = readPlacing(res.data);
    if (read.placing) return { id: item.id, title: item.title, placing: read.placing, problems, receiptIds };
    problems = read.problems;
    user = `${user}\n\n你上一次的回答有问题：${problems.join("；")}。照清单改正，只输出 JSON。`;
  }
  // Still wrong: stored with none, as an item that fits no situation is, so the schedule does not pay for it again.
  return { id: item.id, title: item.title, placing: { main: "", speaker: "media", placements: [] }, problems, receiptIds };
}

/**
 * The items to place: selected now, not shown as a story, and not placed at their revision. That is the ones no case
 * was written for (stories stopped 10-18), and the ones whose case came out thin or held before: the pages list only
 * shown stories, so those were on no page either (review of #122).
 */
export async function articlesToPlace(limit: number, now = new Date()): Promise<Item[]> {
  return sql<Item[]>`
    SELECT p.article_id AS id, a.revision, p.title, p.summary, p.reason, s.name AS source
    FROM publications p
    JOIN articles a ON a.id = p.article_id
    JOIN sources s ON s.id = p.source_id
    LEFT JOIN reference_cases c ON c.article_id = p.article_id
    LEFT JOIN reference_placements r ON r.article_id = p.article_id
    WHERE ${selectedCondition(now)} AND (c.article_id IS NULL OR c.status <> 'story')
      AND (r.article_id IS NULL OR r.revision < a.revision)
    ORDER BY p.sort_at DESC LIMIT ${limit}`;
}

/** Places one item and stores where it sits. */
export async function storePlacing(item: Pick<Item, "id" | "revision">, result: PlaceResult): Promise<void> {
  const { placing } = result;
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO reference_placements (article_id, revision, situations, placements, speaker, receipt_ids, prompt_version, updated_at)
      VALUES (${item.id}, ${item.revision}, ${placing.placements.map((p) => p.situation)}, ${sql.json(placing.placements as never)},
              ${placing.speaker}, ${result.receiptIds}, ${PLACE_VERSION}, now())
      ON CONFLICT (article_id) DO UPDATE SET revision = EXCLUDED.revision, situations = EXCLUDED.situations,
        placements = EXCLUDED.placements, speaker = EXCLUDED.speaker, receipt_ids = EXCLUDED.receipt_ids,
        prompt_version = EXCLUDED.prompt_version, updated_at = now()`;
    for (const id of result.receiptIds) await completeReceipt(tx, id);
  });
}

/** Places up to `limit` items waiting, one after another, and stores each. */
export async function placeWaiting(limit: number): Promise<PlaceResult[]> {
  const out: PlaceResult[] = [];
  for (const item of await articlesToPlace(limit)) {
    const result = await composePlacing(item);
    await storePlacing(item, result);
    out.push(result);
  }
  return out;
}

/**
 * The daily placing runs once the settings row `reference.placing` is there ({"on": true}): set by myfnb/place-now.ts
 * after a small run is checked, deleted to stop. Not a deploy: starting and stopping a paid step is not one.
 */
export async function placingOn(): Promise<boolean> {
  const [row] = await sql<{ value: { on?: unknown } }[]>`SELECT value FROM settings WHERE key = 'reference.placing'`;
  return row?.value.on === true;
}
