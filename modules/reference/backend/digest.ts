// 10-18 (十一): what an item's page says under its summary, written so that every line can be traced to the
// original. Checked against their originals, 11 of 13 rewritten stories and 6 of 19 write-ups had serious errors:
// advice, worked examples and other shops written as the shop's own, details the original never gave. So:
// 1. one call decides whether the original is one shop telling its own story (prompts/kind.md); the program keeps
//    "own_shop" only when the shop's name is in the original;
// 2. such an original is written as a story (write.ts composeCase), and then checked sentence by sentence against
//    the numbered original (prompts/story-check.md): a sentence that fails is taken out, never mended; a failing
//    title or opening, or more than a few failing sentences, holds the story;
// 3. any other original gets key points taken from its sentences (prompts/digest.md): each point names the
//    sentences it comes from, its numbers must be in them, and one more call checks each point against them
//    (prompts/digest-check.md); a point that fails is dropped, never mended.
// Stores nothing: myfnb/eval-reference.ts tries it on cases (--digest) before it replaces anything on the site.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { modelFor } from "@aihot/backend/editorial/models";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { MAX_BODY_CHARS } from "@aihot/backend/editorial/writing";
import { chatJson } from "@aihot/backend/providers/llm";
import type { Block, CaseStory, ItemBody } from "../types.ts";
import { BODY_STEP } from "./body.ts";
import { sourceNumbers, unfoundNumbers } from "./checks.ts";
import { type Article, composeCase } from "./write.ts";

const prompt = (name: string) => promptFromText(`reference/${name}`, readFileSync(new URL(`../prompts/${name}.md`, import.meta.url), "utf8"));
const KIND = prompt("kind");
const DIGEST = prompt("digest");
const DIGEST_CHECK = prompt("digest-check");
const STORY_CHECK = prompt("story-check");
const VERSION = `reference-digest@${createHash("sha256").update(KIND).update(DIGEST).update(DIGEST_CHECK).update(STORY_CHECK).update(readFileSync(new URL(import.meta.url), "utf8")).digest("hex").slice(0, 10)}`;
/** Below this much text there is nothing to take points from beyond the summary: no call. */
const MIN_MATERIAL = 300;
/** A story keeps at most this many failing sentences (taken out); more and the rest is not to be trusted either. */
const MAX_CUT = 2;

/**
 * The original as numbered sentences: [0] the title, [1] the author when known (a story may name the writer), then
 * the body cut after 。！？!? and after a full stop that ends a sentence (not 1.5, not Mr.), and at line breaks.
 */
export function sentencesOf(a: Pick<Article, "title" | "author" | "bodyText" | "excerpt">): string[] {
  const body = (a.bodyText ?? a.excerpt ?? "").slice(0, MAX_BODY_CHARS);
  const cut = body.replace(/([。！？!?])\s*/g, "$1\n").replace(/(?<![A-Z][a-z]?|\d)\.\s+(?=\S)/g, ".\n");
  return [`标题：${a.title}`, `作者：${a.author ?? "（未注明）"}`, ...cut.split(/\n+/).map((s) => s.trim()).filter((s) => s.length > 1)];
}
const numbered = (lines: string[]) => lines.map((s, i) => `[${i}] ${s}`).join("\n");
const bare = (t: string) => t.normalize("NFKC").replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();

const Ids = z.array(z.coerce.number().int()).default([]);
const KindAnswer = z.object({ kind: z.enum(["own_shop", "other"]).catch("other"), shop: z.string().nullable().default(null), src: Ids, reason: z.string().default("") });
const Item = z.object({ text: z.string().trim().min(1), src: Ids });
const DigestAnswer = z.discriminatedUnion("material", [
  z.object({ material: z.literal("thin"), reason: z.string().default("") }),
  z.object({ material: z.literal("body"), points: z.array(Item).default([]), fits: z.array(Item).default([]), unfits: z.array(Item).default([]) }),
]);
const CheckAnswer = z.object({ items: z.array(z.object({ i: z.coerce.number().int(), ok: z.boolean(), src: Ids, why: z.string().default("") })) });

/** Whether the original is one shop telling its own story: the model says so, and the shop's name is in it. */
export function ownShop(answer: z.infer<typeof KindAnswer>, lines: string[]): boolean {
  if (answer.kind !== "own_shop" || !answer.shop?.trim()) return false;
  const name = bare(answer.shop);
  return name.length > 0 && lines.some((l) => bare(l).includes(name));
}

/** What is wrong with a point before it is checked: no sentence named, a sentence that is not there, a number not in them. */
export function pointProblem(item: { text: string; src: number[] }, lines: string[]): string | null {
  if (!item.src.length) return "没写依据哪几句";
  if (item.src.some((n) => n < 0 || n >= lines.length)) return "依据的句子编号不存在";
  const missing = unfoundNumbers(item.text, sourceNumbers(item.src.map((n) => lines[n]).join("\n")));
  return missing.length ? `数 ${missing.join("、")} 不在依据的句子里` : null;
}

export interface Dropped { text: string; why: string }
export interface Composed {
  route: "story" | "digest";
  status: "story" | "body" | "thin" | "held";
  story: CaseStory | null;
  body: ItemBody | null;
  /** What was taken out, and why: the trial reads these too. */
  dropped: Dropped[];
  problems: string[];
  receiptIds: number[];
}

async function ask<S extends z.ZodType>(id: string, purpose: string, system: string, user: string, schema: S, receiptIds: number[]): Promise<z.infer<S>> {
  const res = await chatJson({
    model: await modelFor(BODY_STEP), purpose, subject: `article:${id}`, promptVersion: VERSION,
    system, user, schema, temperature: 0, maxTokens: 4000, timeoutMs: 180_000,
  });
  receiptIds.push(res.receiptId);
  return res.data;
}

/** Key points of an original that is no shop's own story. */
async function digest(a: Article, lines: string[], receiptIds: number[]): Promise<Omit<Composed, "route" | "receiptIds">> {
  const answer = await ask(a.id, "reference_digest", DIGEST, ["请从以下材料摘出要点，只输出 JSON。", numbered(lines)].join("\n\n"), DigestAnswer, receiptIds);
  if (answer.material === "thin") return { status: "thin", story: null, body: null, dropped: [], problems: [`材料不够：${answer.reason}`] };
  const dropped: Dropped[] = [];
  const groups = (["points", "fits", "unfits"] as const).map((key) => answer[key].filter((item) => {
    const why = pointProblem(item, lines);
    if (why) dropped.push({ text: item.text, why });
    return !why;
  }));
  const all = groups.flat();
  if (all.length) {
    const user = all.map((item, i) => `${i + 1}. ${item.text}\n依据：\n${item.src.map((n) => `[${n}] ${lines[n]}`).join("\n")}`).join("\n\n");
    const check = await ask(a.id, "reference_digest_check", DIGEST_CHECK, user, CheckAnswer, receiptIds);
    const ok = new Set(check.items.filter((c) => c.ok).map((c) => c.i - 1));
    for (const [i, item] of all.entries()) if (!ok.has(i)) dropped.push({ text: item.text, why: check.items.find((c) => c.i - 1 === i)?.why || "核对没有答" });
    const kept = new Set(all.filter((_, i) => ok.has(i)));
    groups.forEach((g, k) => { groups[k] = g.filter((item) => kept.has(item)); });
  }
  const [points, fits, unfits] = groups as [typeof all, typeof all, typeof all];
  if (points.length < 2) return { status: "held", story: null, body: null, dropped, problems: [`核对后要点只剩 ${points.length} 条`] };
  const list = (items: typeof all, lead: string | null) => items.map((x) => ({ lead, text: x.text }));
  const parts: ItemBody["parts"] = [{ heading: "要点", blocks: [{ type: "list", items: list(points, null) }] }];
  if (fits.length || unfits.length) parts.push({ heading: "适用和不适用", blocks: [{ type: "list", items: [...list(fits, "适用"), ...list(unfits, "不适用")] }] });
  return { status: "body", story: null, body: { lead: null, parts, open: null }, dropped, problems: [] };
}

/** A story's sentences as the reader meets them, each with where it sits, so a failing one can be taken out. */
type Spot = { at: "title" | "lead" | "who" | "open" } | { at: "text" | "item"; part: number; block: number; item?: number };
const split = (t: string) => t.match(/[^。！？!?]+[。！？!?」”）)]*/g)?.map((s) => s.trim()).filter(Boolean) ?? (t.trim() ? [t.trim()] : []);
export function storySentences(story: CaseStory): Array<{ text: string; spot: Spot }> {
  const out: Array<{ text: string; spot: Spot }> = [];
  out.push({ text: story.title, spot: { at: "title" } });
  for (const s of split(story.lead)) out.push({ text: s, spot: { at: "lead" } });
  for (const s of split(story.who)) out.push({ text: s, spot: { at: "who" } });
  story.parts.forEach((p, part) => p.blocks.forEach((b, block) => {
    if (b.type === "text") for (const s of split(b.text)) out.push({ text: s, spot: { at: "text", part, block } });
    if (b.type === "list") b.items.forEach((x, item) => out.push({ text: `${x.lead ? `${x.lead}：` : ""}${x.text}`, spot: { at: "item", part, block, item } }));
    if (b.type === "quote") out.push({ text: b.text, spot: { at: "text", part, block } });
  }));
  if (story.open) out.push({ text: story.open, spot: { at: "open" } });
  return out;
}

/** The story without the failing sentences; null when what failed cannot be taken out (title, opening, too many). */
export function withoutFailing(story: CaseStory, sentences: ReturnType<typeof storySentences>, failing: Set<number>): CaseStory | null {
  if (failing.size > MAX_CUT) return null;
  const bad = [...failing].map((i) => sentences[i]!);
  if (bad.some((s) => s.spot.at === "title" || s.spot.at === "lead")) return null;
  const gone = (t: string) => bad.some((s) => s.text === t);
  const keep = (t: string) => split(t).filter((s) => !gone(s)).join("");
  const parts = story.parts.map((p, pi) => ({
    ...p,
    blocks: p.blocks.flatMap((b, bi): Block[] => {
      if (b.type === "text") { const text = keep(b.text); return text ? [{ ...b, text }] : []; }
      if (b.type === "quote") return bad.some((s) => s.spot.at === "text" && s.spot.part === pi && s.spot.block === bi && s.text === b.text) ? [] : [b];
      if (b.type === "list") {
        const items = b.items.filter((_, ii) => !bad.some((s) => s.spot.at === "item" && s.spot.part === pi && s.spot.block === bi && s.spot.item === ii));
        return items.length ? [{ ...b, items }] : [];
      }
      return [b];
    }),
  })).filter((p) => p.blocks.length);
  if (!parts.length) return null;
  return { ...story, who: keep(story.who), open: story.open && !gone(story.open) ? story.open : null, parts };
}

async function story(a: Article, lines: string[], receiptIds: number[]): Promise<Omit<Composed, "route" | "receiptIds">> {
  const c = await composeCase(a);
  receiptIds.push(...c.receiptIds);
  if (c.status !== "story" || !c.story) return { status: c.status, story: null, body: null, dropped: [], problems: c.problems };
  const sentences = storySentences(c.story);
  const user = [`原文：\n${numbered(lines)}`, `故事：\n${sentences.map((s, i) => `${i + 1}. ${s.text}`).join("\n")}`].join("\n\n");
  const check = await ask(a.id, "reference_story_check", STORY_CHECK, user, CheckAnswer, receiptIds);
  const answered = new Set(check.items.map((x) => x.i - 1));
  const failing = new Set([...sentences.keys()].filter((i) => !answered.has(i) || !check.items.find((x) => x.i - 1 === i)!.ok));
  const dropped = [...failing].map((i) => ({ text: sentences[i]!.text, why: check.items.find((x) => x.i - 1 === i)?.why || "核对没有答" }));
  const kept = withoutFailing(c.story, sentences, failing);
  if (!kept) return { status: "held", story: null, body: null, dropped, problems: [`核对没过：${failing.size} 句不符合原文${dropped.some((d) => d.text === c.story!.title) ? "（含标题）" : ""}`] };
  return { status: "story", story: kept, body: null, dropped, problems: [] };
}

/** Writes one item the 10-18 way: a story when the original is one shop's own, key points otherwise. Stores nothing. */
export async function composeTraced(a: Article): Promise<Composed> {
  const receiptIds: number[] = [];
  const lines = sentencesOf(a);
  if ((a.bodyText ?? a.excerpt ?? "").trim().length < MIN_MATERIAL) {
    return { route: "digest", status: "thin", story: null, body: null, dropped: [], problems: ["材料不够：原文只有标题或一两句话"], receiptIds };
  }
  const kind = await ask(a.id, "reference_kind", KIND, ["请判断以下材料，只输出 JSON。", numbered(lines)].join("\n\n"), KindAnswer, receiptIds);
  const route = ownShop(kind, lines) ? "story" : "digest";
  const out = route === "story" ? await story(a, lines, receiptIds) : await digest(a, lines, receiptIds);
  return { route, ...out, receiptIds };
}
