// 十一说 (myfnb/HANDOFF.md §9.0, 10-18): one issue a day at the top of the 08:00 daily, 800–1,200 characters on one
// question, from one to three originals. Writing an original in one go is where who-said-it, the numbers and the
// conditions went wrong (10-18: 11 of 13 rewritten stories had serious errors), and checking afterwards did not mend
// it. So an issue is written in three steps, and only from what survives them:
// 0. pick: one call chooses a question and the one to three originals that speak to it (prompts/issue-pick.md);
// 1. facts: each original on its own is taken apart into 5–10 facts, each with who said it, its kind and the numbered
//    sentences it comes from (prompts/issue-facts.md); the program checks the sentences exist and every number is in
//    them, one more call checks each fact against them (prompts/issue-facts-check.md); a fact that fails is dropped;
// 2. write: the issue is written from the kept facts alone, every sentence naming the facts it uses
//    (prompts/issue-write.md); the program checks numbers, length, wording, quotes (only from QUOTABLE_SOURCES) and
//    sends problems back, at most twice;
// 3. check: a last call reads each sentence against the facts it names (prompts/issue-check.md), sentences that put
//    facts together marked as such: that is where the first trial's serious errors were (made-up causes and order,
//    one original's point given to all, a plan or a supposed case told as done). It runs even when the program still
//    finds problems, so the trial can tell what it would have let through. One failing sentence, or one problem
//    left, holds the whole issue: the daily then leads as it always did.
// Fewer than MIN_FACTS kept facts is no issue. Stores nothing: myfnb/trial-issues.ts tries it and writes files.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { chatJson, ModelOutputError } from "@aihot/backend/providers/llm";
import { SITUATIONS, findSituation } from "../situations.ts";
import { sourceNumbers, unfoundNumbers, WORDING } from "./checks.ts";
import { sentencesOf } from "./digest.ts";

export const ISSUE_STEP = "referenceIssue";
/** Words an issue must not use besides the site's (HANDOFF §9.0, Kay 10-18 13:22): no spoken openings, no made-up experience. */
const ISSUE_WORDING: ReadonlyArray<readonly [RegExp, string]> = [
  [/大家好|咱们|小编/u, "不写口语的称呼，用书面语"],
  [/下期见|打烊后/u, "结尾用自己的一句话，不用「下期见」「打烊后」"],
  [/后来我发现|我开店|我当年|我的店/u, "十一是 AI，没有亲身经历：用原文的例子"],
];
const WORDING_FIXES = new Set([...WORDING, ...ISSUE_WORDING].map(([, fix]) => fix));
const SITUATION_LIST = SITUATIONS.map((s) => `- ${s.slug}：${s.title}`).join("\n");
const prompt = (name: string, values: Record<string, string> = {}) =>
  promptFromText(`reference/${name}`, readFileSync(new URL(`../prompts/${name}.md`, import.meta.url), "utf8"), values);
const PICK = prompt("issue-pick", { situations: SITUATION_LIST });
const FACTS = prompt("issue-facts");
const FACTS_CHECK = prompt("issue-facts-check");
// The words the program sends a draft back for, told beforehand: 20 of the first trial's 38 drafts were sent back for them.
const WRITE = prompt("issue-write", { wording: [...WORDING_FIXES].map((f) => `- ${f}`).join("\n") });
const CHECK = prompt("issue-check");
export const ISSUE_VERSION = `reference-issue@${createHash("sha256").update(PICK).update(FACTS).update(FACTS_CHECK).update(WRITE).update(CHECK)
  .update(readFileSync(new URL(import.meta.url), "utf8")).digest("hex").slice(0, 10)}`;

/**
 * Sources whose original sentences an issue may quote, one or two at most, with where they come from. Read source by
 * source on 10-18 (Core System Studio handbook, 业务线/myfnbguide/记录/2026-10-18/信源转载条款-2026-10-18.md): Petpooja
 * and the owners' own blogs have no terms against it; 红餐网's notice reserves everything and carries other media's
 * pieces, note's terms forbid copying without the writer's consent, so neither is quoted. No source's pictures are used.
 */
export const QUOTABLE_SOURCES: ReadonlySet<string> = new Set(["rss-petpooja", "rss-zieigyou", "rss-ryourigaka", "rss-kojinkuroji", "rss-yoshitencho"]);

/** An original shorter than this is not taken apart: it cannot carry an issue's share of facts. */
const MIN_MATERIAL = 600;
/** Fewer kept facts than this is no issue (HANDOFF §9.0: 核过的事实不到 4 条，不写正文). */
export const MIN_FACTS = 4;
/** The body's length in characters, without spaces (HANDOFF §9.0: 800–1,200 字). The prompt aims at 900–1,100. */
export const BODY_CHARS = { min: 800, max: 1200 } as const;
/** Times a draft goes back with the program's problems; the stories' writing has gone back twice since 10/9. */
const REWRITES = 2;
/** Kana left in a fact: the map shows a fact's short as it is (first trial: Japanese left on 8 issues' maps). */
const KANA = /[\u3040-\u30ff]/u;

export interface IssueArticle {
  id: string;
  /** "A", "B", "C": how facts and the issue name it. */
  letter: string;
  sourceId: string;
  sourceName: string;
  title: string;
  url: string;
  /** The original as numbered sentences (digest.ts sentencesOf): [0] title, [1] author. */
  lines: string[];
}

export function issueArticle(letter: string, a: { id: string; sourceId: string; title: string; url: string; author: string | null; bodyText: string | null; excerpt: string | null; source: { name: string } }): IssueArticle {
  return { id: a.id, letter, sourceId: a.sourceId, sourceName: a.source.name.replace(/（[^）]*）$/u, ""), title: a.title, url: a.url, lines: sentencesOf(a) };
}

export type Ask = <S extends z.ZodType>(purpose: string, system: string, user: string, schema: S) => Promise<z.infer<S>>;

/** Asks the named model through the engine's receipts and budget; the receipts it made go to `receiptIds`. */
export function modelAsk(model: string, subject: string, receiptIds: number[]): Ask {
  return async (purpose, system, user, schema) => {
    const once = () => chatJson({ model, purpose, subject, promptVersion: ISSUE_VERSION, system, user, schema, temperature: 0, maxTokens: 6000, timeoutMs: 240_000 });
    // Unusable output once is asked again once (first trial: 2 of 20 of Claude's issues, broken JSON); a second is the answer.
    const res = await once().catch((error: unknown) => {
      if (error instanceof ModelOutputError) return once();
      throw error;
    });
    receiptIds.push(res.receiptId);
    return res.data;
  };
}

const numbered = (lines: string[]) => lines.map((s, i) => `[${i}] ${s}`).join("\n");
const Ids = z.array(z.coerce.number().int()).default([]);
const CheckAnswer = z.object({ items: z.array(z.object({ i: z.coerce.number().int(), ok: z.boolean(), why: z.string().default("") })) });

// ---------------------------------------------------------------- 0. pick

export interface Candidate { id: string; title: string; summary: string; sourceName: string }
const PickAnswer = z.object({
  pick: z.object({ topic: z.string().trim().min(1), ids: z.array(z.coerce.number().int()).min(1), shelf: z.string(), why: z.string().default("") }).nullable(),
  reason: z.string().default(""),
});
export interface Pick { topic: string; ids: string[]; shelf: string; why: string }

/** The question of the day and its originals, or null with why not; the program keeps only listed ids and a known shelf. */
export async function pickMaterial(candidates: Candidate[], ask: Ask): Promise<{ pick: Pick | null; reason: string }> {
  if (!candidates.length) return { pick: null, reason: "没有候选" };
  const list = candidates.map((c, i) => `[${i}] ${c.title}\n摘要：${c.summary}\n来源：${c.sourceName}`).join("\n\n");
  const answer = await ask("reference_issue_pick", PICK, `请从以下候选里选题，只输出 JSON。\n\n${list}`, PickAnswer);
  if (!answer.pick) return { pick: null, reason: answer.reason || "模型没有选" };
  const ids = [...new Set(answer.pick.ids)].filter((n) => n >= 0 && n < candidates.length).slice(0, 3).map((n) => candidates[n]!.id);
  if (!ids.length) return { pick: null, reason: "选的编号不在候选里" };
  const shelf = findSituation(answer.pick.shelf) ? answer.pick.shelf : "";
  return { pick: { topic: answer.pick.topic, ids, shelf, why: answer.pick.why }, reason: "" };
}

// ---------------------------------------------------------------- 1. facts

export type FactType = "fact" | "advice" | "example" | "view";
/** keep: what the fact must not lose when written (a supposed case, a plan, what a unit counts), "" when nothing. */
export interface Fact { id: string; article: string; text: string; short: string; who: string; type: FactType; keep: string; src: number[] }
export interface Dropped { text: string; why: string }

const FactItem = z.object({
  text: z.string().trim().min(1), short: z.string().trim().min(1), who: z.string().trim().default("作者"),
  type: z.enum(["fact", "advice", "example", "view"]).catch("view"), keep: z.string().trim().default(""), src: Ids,
});
const FactsAnswer = z.discriminatedUnion("material", [
  z.object({ material: z.literal("thin"), reason: z.string().default("") }),
  z.object({
    material: z.literal("body"),
    own_shop: z.object({ is: z.boolean().catch(false), shop: z.string().nullable().default(null), src: Ids }).default({ is: false, shop: null, src: [] }),
    facts: z.array(FactItem).default([]),
  }),
]);

/** What is wrong with a fact before it is checked: no sentence named, one that is not there, a number not in them. */
export function factProblem(f: { text: string; short: string; src: number[] }, lines: string[]): string | null {
  if (!f.src.length) return "没写依据哪几句";
  if (KANA.test(f.text) || KANA.test(f.short)) return "没有译成中文";
  if (f.src.some((n) => n < 0 || n >= lines.length)) return "依据的句子编号不存在";
  const found = sourceNumbers(f.src.map((n) => lines[n]).join("\n"));
  const missing = [...new Set([...unfoundNumbers(f.text, found), ...unfoundNumbers(f.short, found)])];
  return missing.length ? `数 ${missing.join("、")} 不在依据的句子里` : null;
}

const bare = (t: string) => t.normalize("NFKC").replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();

/** One original's checked facts, and whether it is one shop telling its own story (its name must be in the original). */
export async function factsOf(a: IssueArticle, ask: Ask): Promise<{ facts: Fact[]; dropped: Dropped[]; ownShop: string | null; problem: string | null }> {
  if (a.lines.slice(2).join("").length < MIN_MATERIAL) return { facts: [], dropped: [], ownShop: null, problem: `${a.letter} 篇材料不够` };
  const answer = await ask("reference_issue_facts", FACTS, `请拆出事实清单，只输出 JSON。\n\n${numbered(a.lines)}`, FactsAnswer);
  if (answer.material === "thin") return { facts: [], dropped: [], ownShop: null, problem: `${a.letter} 篇材料不够：${answer.reason}` };
  const shop = answer.own_shop.is && answer.own_shop.shop?.trim() && a.lines.some((l) => bare(l).includes(bare(answer.own_shop.shop!))) ? answer.own_shop.shop.trim() : null;
  const dropped: Dropped[] = [];
  const listed = answer.facts.filter((f) => {
    const why = factProblem(f, a.lines);
    if (why) dropped.push({ text: f.text, why });
    return !why;
  });
  let kept = listed;
  if (listed.length) {
    const user = listed.map((f, i) => `${i + 1}. text：${f.text}\nshort：${f.short}\nwho：${f.who}\ntype：${f.type}\nkeep：${f.keep || "（无）"}\n依据：\n${f.src.map((n) => `[${n}] ${a.lines[n]}`).join("\n")}`).join("\n\n");
    const check = await ask("reference_issue_facts_check", FACTS_CHECK, user, CheckAnswer);
    const ok = new Set(check.items.filter((c) => c.ok).map((c) => c.i - 1));
    kept = listed.filter((f, i) => {
      if (!ok.has(i)) dropped.push({ text: f.text, why: check.items.find((c) => c.i - 1 === i)?.why || "核对没有答" });
      return ok.has(i);
    });
  }
  return { facts: kept.map((f, i) => ({ ...f, id: `${a.letter}${i + 1}`, article: a.letter })), dropped, ownShop: shop, problem: null };
}

// ---------------------------------------------------------------- 2. write

const FactRefs = z.array(z.string().trim()).default([]);
const IssueAnswer = z.object({
  hook: z.string().trim().min(1),
  brief: z.array(z.object({ text: z.string().trim().min(1), facts: FactRefs })),
  questions: z.array(z.string().trim().min(1)),
  body: z.array(z.object({ heading: z.string().trim().nullable().default(null), text: z.string().trim().min(1), bold: z.string().trim().nullable().default(null), facts: FactRefs })),
  map: z.array(z.object({ heading: z.string().trim().min(1), facts: FactRefs })),
  view: z.string().trim().min(1),
  quote: z.object({ article: z.string().trim(), from: z.coerce.number().int(), to: z.coerce.number().int() }).nullable().default(null),
});
export type IssueText = z.infer<typeof IssueAnswer>;

const chars = (t: string) => t.replace(/\s/g, "").length;

/**
 * Every place a reader meets the issue's words, with the facts it claims to use (the hook and the questions may draw
 * on any). `joined`: the sentence puts facts together (the hook, the brief, the questions, a paragraph on more than one
 * original), where the first trial's serious errors were; the check reads those for three more things.
 */
export function issueSentences(issue: IssueText, facts: Fact[]): Array<{ at: string; text: string; facts: string[]; joined: boolean }> {
  const all = facts.map((f) => f.id);
  const split = (t: string) => t.match(/[^。！？!?]+[。！？!?」”）)]*/gu)?.map((s) => s.trim()).filter(Boolean) ?? [t];
  const several = (ids: string[]) => new Set(ids.map((id) => id.replace(/\d+$/u, ""))).size > 1;
  return [
    { at: "hook", text: issue.hook, facts: all, joined: true },
    ...issue.brief.map((b, i) => ({ at: `brief ${i + 1}`, text: b.text, facts: b.facts, joined: true })),
    ...issue.questions.map((q, i) => ({ at: `question ${i + 1}`, text: q, facts: all, joined: true })),
    ...issue.body.flatMap((p, i) => [
      ...(p.heading ? [{ at: `body ${i + 1} heading`, text: p.heading, facts: p.facts, joined: several(p.facts) }] : []),
      ...split(p.text).map((text) => ({ at: `body ${i + 1}`, text, facts: p.facts, joined: several(p.facts) })),
    ]),
    { at: "view", text: issue.view, facts: [], joined: false },
  ];
}

/** The program's reading of a written issue: each problem in words the writer is sent back with. */
export function issueProblems(issue: IssueText, facts: Fact[], articles: IssueArticle[]): string[] {
  const problems: string[] = [];
  const byId = new Map(facts.map((f) => [f.id, f]));
  const lines = new Map(articles.map((a) => [a.letter, a.lines]));
  const evidence = (ids: string[]) => sourceNumbers(ids.flatMap((id) => {
    const f = byId.get(id);
    return f ? [f.text, ...f.src.map((n) => lines.get(f.article)?.[n] ?? "")] : [];
  }).join("\n"));
  if (issue.brief.length !== 3) problems.push(`三分钟版要正好三句，写了 ${issue.brief.length} 句`);
  if (issue.questions.length !== 3) problems.push(`「这期说什么」要正好三个问题，写了 ${issue.questions.length} 个`);
  if (issue.map.length < 2 || issue.map.length > 4) problems.push(`要点图要 2 到 4 组，写了 ${issue.map.length} 组`);
  const length = issue.body.reduce((n, p) => n + chars(p.text), 0);
  if (length < BODY_CHARS.min || length > BODY_CHARS.max) {
    // Where to cut or add, in numbers: "too long" alone came back too long again (first trial, 13 of 20 of DeepSeek's).
    const longest = issue.body.map((p, i) => [i + 1, chars(p.text)] as const).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([i, n]) => `第 ${i} 段 ${n} 字`).join("、");
    problems.push(length > BODY_CHARS.max
      ? `正文要 ${BODY_CHARS.min} 到 ${BODY_CHARS.max} 字，写了 ${length} 字：删去约 ${length - 1000} 字，删到 1,000 字左右（最长的是${longest}），删的是重复和铺垫，不删事实的限定`
      : `正文要 ${BODY_CHARS.min} 到 ${BODY_CHARS.max} 字，写了 ${length} 字：补约 ${1000 - length} 字，只用清单里还没用到的事实`);
  }
  const cited = [...issue.brief.map((b) => b.facts), ...issue.body.map((p) => p.facts), ...issue.map.map((g) => g.facts)].flat();
  const unknown = [...new Set(cited.filter((id) => !byId.has(id)))];
  if (unknown.length) problems.push(`事实编号 ${unknown.join("、")} 不在清单里`);
  issue.brief.forEach((b, i) => { if (!b.facts.length) problems.push(`三分钟版第 ${i + 1} 句没写用到哪几条事实`); });
  issue.body.forEach((p, i) => {
    if (!p.facts.length && i < issue.body.length - 1) problems.push(`正文第 ${i + 1} 段没写用到哪几条事实`);
    if (p.bold && !p.text.includes(p.bold)) problems.push(`正文第 ${i + 1} 段的加粗句不在这一段里`);
  });
  for (const s of issueSentences(issue, facts)) {
    if (s.at === "view") continue;
    const missing = unfoundNumbers(s.text, evidence(s.facts));
    if (missing.length) problems.push(`${s.at}：数 ${missing.join("、")} 不在它用到的事实里`);
  }
  const viewNumbers = unfoundNumbers(issue.view, new Set());
  if (viewNumbers.length) problems.push(`十一的看法不能带数字（${viewNumbers.join("、")}）`);
  const shorts = issue.map.flatMap((g) => g.facts.map((id) => byId.get(id)?.short ?? ""));
  const reader = [issue.hook, ...issue.brief.map((b) => b.text), ...issue.questions, ...issue.body.flatMap((p) => [p.heading ?? "", p.text]), ...issue.map.map((g) => g.heading), ...shorts, issue.view].join("\n");
  for (const [pattern, fix] of [...WORDING, ...ISSUE_WORDING]) if (pattern.test(reader)) problems.push(`用词：${fix}`);
  if (issue.quote) {
    const a = articles.find((x) => x.letter === issue.quote!.article);
    const { from, to } = issue.quote;
    if (!a) problems.push(`摘句的原文 ${issue.quote.article} 不存在`);
    else if (!QUOTABLE_SOURCES.has(a.sourceId)) problems.push(`${a.sourceName} 的条款不许摘句，quote 填 null`);
    else if (from < 2 || to < from || to - from > 1 || to >= a.lines.length) problems.push("摘句只能是原文正文里相连的一两句");
  }
  return problems;
}

// ---------------------------------------------------------------- 3. check, and the whole

export interface ComposedIssue {
  status: "issue" | "thin" | "held";
  topic: string;
  shelf: string;
  articles: IssueArticle[];
  issue: IssueText | null;
  facts: Fact[];
  /** Original by original: the shop telling its own story, when it is one (its name is in the original). */
  ownShops: Record<string, string>;
  /** What was taken out or failed, and why: the trial reads these too. */
  dropped: Dropped[];
  problems: string[];
}

/** Writes one issue from its originals in three steps; stores nothing. */
export async function composeIssue(articles: IssueArticle[], pick: { topic: string; shelf: string }, ask: Ask): Promise<ComposedIssue> {
  const base = { topic: pick.topic, shelf: pick.shelf, articles, ownShops: {} as Record<string, string> };
  const facts: Fact[] = [];
  const dropped: Dropped[] = [];
  const problems: string[] = [];
  for (const a of articles) {
    const r = await factsOf(a, ask);
    facts.push(...r.facts);
    dropped.push(...r.dropped);
    if (r.problem) problems.push(r.problem);
    if (r.ownShop) base.ownShops[a.letter] = r.ownShop;
  }
  if (facts.length < MIN_FACTS) return { ...base, status: "thin", issue: null, facts, dropped, problems: [...problems, `核过的事实只有 ${facts.length} 条，不到 ${MIN_FACTS} 条`] };

  const list = facts.map((f) => `${f.id}（第 ${f.article} 篇｜${f.who}｜${f.type}${f.keep ? `｜必须保留：${f.keep}` : ""}）${f.text}`).join("\n");
  const sources = articles.map((a) => `第 ${a.letter} 篇：${a.sourceName}《${a.title}》${base.ownShops[a.letter] ? `（${base.ownShops[a.letter]} 讲自己的店）` : ""}`).join("\n");
  const quotable = articles.filter((a) => QUOTABLE_SOURCES.has(a.sourceId)).map((a) => `第 ${a.letter} 篇（句子编号从 2 起是正文）：\n${numbered(a.lines)}`);
  const user = [`这一期的话题：${pick.topic}`, `原文：\n${sources}`, `事实清单：\n${list}`, quotable.length ? `可以摘句的原文：\n\n${quotable.join("\n\n")}` : "可以摘句的原文：无（quote 填 null）"].join("\n\n");
  let issue = await ask("reference_issue_write", WRITE, user, IssueAnswer);
  let found = issueProblems(issue, facts, articles);
  for (let round = 0; found.length && round < REWRITES; round += 1) {
    // Back with the problems named, as a case goes back (write.ts); what still fails holds the issue.
    issue = await ask("reference_issue_write", WRITE, `${user}\n\n上一稿有这些问题，请只改这些地方，其余照旧，输出整期：\n${found.map((p) => `- ${p}`).join("\n")}\n\n上一稿：\n${JSON.stringify(issue)}`, IssueAnswer);
    found = issueProblems(issue, facts, articles);
  }

  const sentences = issueSentences(issue, facts);
  const byId = new Map(facts.map((f) => [f.id, f]));
  const checkUser = [
    `事实清单：\n${list}`,
    `这一期的句子：\n${sentences.map((s, i) => `${i + 1}. ${s.at === "view" ? "【十一的看法】" : s.joined ? "【合写】" : ""}${s.text}\n   用到：${s.at === "view" ? "无" : s.facts.filter((id) => byId.has(id)).join("、") || "无"}`).join("\n")}`,
  ].join("\n\n");
  const check = await ask("reference_issue_check", CHECK, checkUser, CheckAnswer);
  const answered = new Map(check.items.map((c) => [c.i - 1, c]));
  const failing = sentences.flatMap((s, i) => (answered.get(i)?.ok ? [] : [{ text: `${s.at}：${s.text}`, why: answered.get(i)?.why || "核对没有答" }]));
  const held = [...found, ...(failing.length ? [`成文核对没过：${failing.length} 句`] : [])];
  if (held.length) return { ...base, status: "held", issue, facts, dropped: [...dropped, ...failing], problems: [...problems, ...held] };
  return { ...base, status: "issue", issue, facts, dropped, problems };
}

// ---------------------------------------------------------------- the daily's top, and a page to read

/** What the daily's lead carries for an issue (the original ReportPaper lead: a title and a paragraph). */
export function dailyLead(c: ComposedIssue, no: number): { kicker: string; title: string; leadParagraph: string } | null {
  if (c.status !== "issue" || !c.issue) return null;
  const from = c.articles.map((a) => `${a.sourceName}《${a.title}》`).join("、");
  return { kicker: `十一说 · 第 ${no} 期｜原文：${from}`, title: c.issue.hook, leadParagraph: c.issue.brief.map((b) => b.text).join("") };
}

/** An issue as the trial reads it, in the order of its page (HANDOFF §9.0 7.); held ones show what failed. */
export function issueMarkdown(c: ComposedIssue, no: number): string {
  const out: string[] = [`# 十一说 · 第 ${no} 期（${c.status === "issue" ? "过了核对" : c.status === "thin" ? "材料不够" : "没过核对"}）`, ""];
  out.push(`话题：${c.topic}　书架：${findSituation(c.shelf)?.title ?? "（未定）"}`, "");
  out.push("原文：", ...c.articles.map((a) => `- 第 ${a.letter} 篇：${a.sourceName}《${a.title}》 ${a.url}${c.ownShops[a.letter] ? `（${c.ownShops[a.letter]} 讲自己的店）` : ""}`), "");
  const i = c.issue;
  if (i) {
    const lead = dailyLead({ ...c, status: "issue" }, no)!;
    out.push("## 日报顶部看到的", "", `**${lead.title}**`, lead.kicker, "", "## 三分钟版", ...i.brief.map((b) => `- ${b.text}`), "");
    out.push("## 这期说什么", ...i.questions.map((q) => `- ${q}`), "", "## 正文", "");
    for (const p of i.body) {
      if (p.heading) out.push(`### ${p.heading}`, "");
      out.push((p.bold ? p.text.replace(p.bold, `**${p.bold}**`) : p.text) + `　〔${p.facts.join(" ")}〕`, "");
    }
    const byId = new Map(c.facts.map((f) => [f.id, f]));
    out.push("## 要点图", ...i.map.flatMap((g) => [`- **${g.heading}**`, ...g.facts.flatMap((id) => (byId.get(id) ? [`  - ${byId.get(id)!.short}（${byId.get(id)!.who}）`] : []))]), "");
    out.push("## 原文出处", ...c.articles.map((a) => `- ${a.sourceName}：《${a.title}》 ${a.url}`), "");
    if (i.quote) {
      const a = c.articles.find((x) => x.letter === i.quote!.article);
      if (a) out.push("## 原文摘句", `「${a.lines.slice(i.quote.from, i.quote.to + 1).join(" ")}」（${a.sourceName}，原文第 ${i.quote.from - 1} 句起）`, "");
    }
    out.push("## 十一的看法", i.view, "", "> 关于十一：十一是 AI。本期每一句事实都来自原文，并经过三步核对：拆出事实、逐条对照原文、成文后复查。「十一的看法」是十一的观点，并非原文内容。AI 整理，以原文为准。", "");
  }
  out.push("## 事实清单（核过的）", ...c.facts.map((f) => `- ${f.id}｜${f.who}｜${f.type}｜${f.text}${f.keep ? `（必须保留：${f.keep}）` : ""}（原文第 ${f.src.join("、")} 句）`), "");
  if (c.problems.length) out.push("## 问题", ...c.problems.map((p) => `- ${p}`), "");
  if (c.dropped.length) out.push("## 拿掉的", ...c.dropped.map((d) => `- ${d.text}：${d.why}`), "");
  return out.join("\n");
}
