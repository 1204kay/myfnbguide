// Grouping a situation's stories by the practice they tell (layout D1; the owner, 10/5: "多篇原文说的同一种方式、
// 方法、经验"): one model call a situation puts the stories that tell the same practice together, titles and sums
// up each practice, gives each shop in it a line, and writes a short overview of the situation
// (prompts/methods.md). Where the stories sit the program mends itself (a story outside its group, placed twice
// or nowhere, one shop on two lines); what the model wrote it checks (lengths, words, every number from the
// stories it stands for), and a grouping with such problems goes back with them named, at most twice, and is not
// stored if it still fails (the page keeps the last good one, or shows one card a story). The live run of 10/5
// failed 19 of 45 situations, most of them on where stories sat or on a length named in zod's English. How many
// shops and countries stand behind a practice the program counts, never the model. The first live groupings, under
// one prompt, went to both ends: in 19 of 39 situations about a practice a story (25 for 26 in 老板自己累垮), in 13
// each cause group of two shops or more one practice, under a title some of its shops did not do (熟客不再来: 25
// stories, 3 practices).
// The prompt now asks for the one thing every shop in a practice did, with an example each way and each line checked
// against its title; each shop's detail goes in its line (myfnb/notes-practices-2026-10-05.md).
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { sql } from "@aihot/backend/db";
import { modelFor } from "@aihot/backend/editorial/models";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { chatJson } from "@aihot/backend/providers/llm";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { spaced } from "../format.ts";
import { findSituation, type Situation } from "../situations.ts";
import type { CaseStory } from "../types.ts";
import { sourceNumbers, unfoundNumbers, untranslated, WORDING } from "./checks.ts";

export const METHODS_STEP = "referenceMethods";
const PURPOSE = "reference_methods";
const SYSTEM = promptFromText("reference/methods", readFileSync(new URL("../prompts/methods.md", import.meta.url), "utf8"));
/**
 * Problems the model can mend in its own text: too long, a word, an untranslated sentence, digits in the overview.
 * Those go back as an edit of its answer, without the stories (the case writer, given its material again, wrote
 * afresh and as long as before: write.ts). Read from the start of the problem only: a line quoted in another
 * problem may itself say 太长.
 */
export const textOnly = (problem: string) => /^(?:综述|第 \d+ 个做法(?:第 \d+ 家的那一行|的标题|的归纳))(?:太长：|有没有翻译的|用了“)|^综述里写了数字/.test(problem);
const EDIT = "下面是你按系统规则写好的归并（JSON），有以下问题。只修改有问题的地方：太长就删去次要的条件和数字，用词按提示改；不加新的内容和数字，不改 caseIds 和 group。其余保持不变，输出完整的 JSON。";
/** The prompt, the edit request and the stored shape: a grouping made under another is not read (backend/read.ts) and is made again. */
export const PROMPT_VERSION = `reference-methods@${createHash("sha256").update(SYSTEM).update(EDIT).digest("hex").slice(0, 10)}`;

/** A story as the grouping reads it: where it sits in the situation, who tells it (read.ts tellerOf) and what it tells. */
export interface Member {
  id: string;
  group: string | null;
  teller: string;
  story: CaseStory;
}

/** One practice as stored: its stories, a line a shop. */
export interface Method {
  /** Its anchor on the page, from its stories (stable while its first story stays in it). */
  key: string;
  group: string | null;
  title: string;
  summary: string;
  shops: Array<{ caseIds: string[]; line: string }>;
}

export interface Grouping {
  overview: string;
  methods: Method[];
}

// The answer's shape only: the lengths are read below, so a long text comes back named in words the model acts on.
const OutputSchema = z.object({
  overview: z.string().trim().min(1),
  methods: z.array(z.object({
    group: z.string().trim().min(1).nullable().default(null),
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    shops: z.array(z.object({ caseIds: z.array(z.string().trim().min(1)), line: z.string().trim().min(1) })),
  })).min(1),
});

/**
 * What the prompt asks of each text, what to cut when it is over, and a ceiling a little above the ask, so an
 * answer slightly over is not sent back for that alone.
 */
const LENGTHS = {
  overview: { asked: 120, ceiling: 130, cut: "删去次要的原因和做法，只留最常见的几种" },
  title: { asked: 20, ceiling: 24, cut: "只写怎么做，删去某一家的细节、条件和数字" },
  summary: { asked: 150, ceiling: 160, cut: "删去次要的条件和数字，只留共同的做法和最关键的差别" },
  // 31–32 characters held two situations back on 10/5; a line wraps on a phone either way.
  line: { asked: 24, ceiling: 36, cut: "删去次要的条件和数字，只留这家店怎么做和一个关键数字或结果" },
};

/** Which stories a situation holds, who tells them and how they read: a change in any of them groups it again. */
export function membersKey(members: Member[]): string {
  const lines = members.map((m) => [m.id, m.group ?? "", m.teller, m.story.title, m.story.placements[0]?.card ?? ""].join("|")).sort();
  return createHash("sha256").update(PROMPT_VERSION).update(lines.join("\n")).digest("hex").slice(0, 16);
}

/** "s1", "s2"…: the tellers as the model reads them, in the members' order. */
function tellerNames(members: Member[]): Map<string, string> {
  const names = new Map<string, string>();
  for (const m of members) if (!names.has(m.teller)) names.set(m.teller, `s${names.size + 1}`);
  return names;
}

/**
 * A story the grouping left out, as a practice of its own in its group, a card like any one-shop practice (layout
 * A7-3): the story's title, its sentence of what the shop did, and its last heading (not an example's) as the
 * shop's line. Texts the case's checks passed when it was written.
 */
function alone(m: Member): Omit<Method, "key"> {
  const s = m.story;
  const heading = s.parts.filter((p) => !p.blocks.some((b) => b.type === "example")).at(-1)?.heading;
  return { group: m.group, title: s.title, summary: s.placements[0]?.card || s.lead, shops: [{ caseIds: [m.id], line: heading || s.title }] };
}

/** A practice's anchor on the page, from its stories (stable while its first story stays in it). */
const keyOf = (caseIds: string[]) => createHash("sha256").update([...caseIds].sort()[0]!).digest("hex").slice(0, 8);

/**
 * The model's answer as a grouping, or what is wrong with it, each problem as a sentence it can act on (named by
 * its place in the answer: 第 N 个做法, 第 M 家). Where the stories sit is mended, each mend noted in `repairs`:
 * an id not of this situation is dropped; a story in a practice of another group is taken out of it; a story
 * placed again keeps its first place; one shop's lines in a practice become its first line, with all their
 * stories; a practice left without stories is dropped; a story left without a practice stands alone (`alone`).
 * A practice whose group is wrong as a whole is moved to its stories' group. A practice that lost a story to
 * another place may still speak of that shop: with one story left it stands alone in that story's own words,
 * with more it goes back to the model.
 */
export function readGrouping(raw: unknown, members: Member[]): { grouping: Grouping | null; problems: string[]; repairs: string[] } {
  const parsed = OutputSchema.safeParse(raw);
  if (!parsed.success) return { grouping: null, problems: parsed.error.issues.slice(0, 6).map((i) => `格式不对：${i.path.join(".")} ${i.message}`), repairs: [] };
  const out = parsed.data;
  const byId = new Map(members.map((m) => [m.id, m]));
  const names = tellerNames(members);
  const problems: string[] = [];
  const repairs: string[] = [];
  // Where each story was placed first: by which practice.
  const placed = new Map<string, number>();
  const soloed: Member[] = [];
  const kept = out.methods.flatMap((given, i) => {
    const name = `第 ${i + 1} 个做法`;
    // A group wrong for the whole practice ("null" written as a word, a misspelt key) is its stories' own group.
    const groups = [...new Set(given.shops.flatMap((s) => s.caseIds).flatMap((id) => (byId.has(id) ? [byId.get(id)!.group] : [])))];
    const m = groups.length === 1 && groups[0] !== given.group ? { ...given, group: groups[0] as string | null } : given;
    if (m !== given) repairs.push(`${name}写的原因组 ${given.group ?? "null"} 和它的故事不符，已改为${m.group ? `原因组 ${m.group}` : "没有原因组"}`);
    const taken: string[] = [];
    const lines: Array<{ n: number; caseIds: string[]; line: string; teller: string | null }> = [];
    for (const [j, shop] of m.shops.entries()) {
      const caseIds = shop.caseIds.filter((id) => {
        const member = byId.get(id);
        if (!member) repairs.push(`${name}里的 ${id} 不是这种情况的故事，已删去`);
        else if (member.group !== m.group) {
          repairs.push(`故事 ${id} 属于${member.group ? `原因组 ${member.group}` : "没有原因组的故事"}，已从${name}移出`);
          taken.push(id);
        } else if (placed.has(id)) {
          repairs.push(`故事 ${id} 放进了不止一处，只留在第一处，已从${name}删去`);
          // Written twice in this practice it stays in it; placed first in another, this practice lost it.
          if (placed.get(id) !== i) taken.push(id);
        } else {
          placed.set(id, i);
          return true;
        }
        return false;
      });
      const tellers = [...new Set(caseIds.map((id) => byId.get(id)!.teller))];
      if (tellers.length > 1) problems.push(`${name}第 ${j + 1} 家的那一行放了不同店家（${tellers.map((t) => names.get(t)).join("、")}）的故事：一行只写一家店`);
      const same = tellers.length === 1 ? lines.find((l) => l.teller === tellers[0]) : undefined;
      if (same) {
        same.caseIds.push(...caseIds);
        repairs.push(`${name}里同一家店（${names.get(tellers[0]!)}）写了两行，已把第 ${j + 1} 家的那一行合进第 ${same.n + 1} 家的那一行`);
      } else if (caseIds.length) lines.push({ n: j, caseIds, line: shop.line, teller: tellers.length === 1 ? tellers[0]! : null });
    }
    if (!lines.length) return [];
    if (taken.length) {
      const ids = lines.flatMap((l) => l.caseIds);
      if (ids.length === 1) {
        repairs.push(`${name}移出故事以后只剩一篇，改用这篇故事自己的标题和说明`);
        soloed.push(byId.get(ids[0]!)!);
        return [];
      }
      problems.push(`${name}移出了故事 ${taken.join("、")}（不属于这个原因组，或已放在别处）：标题、归纳和各行只写留下的店家，不写被移出的故事`);
    }
    return [{ ...m, n: i, lines }];
  });
  const left = members.filter((m) => !placed.has(m.id));
  for (const m of left) repairs.push(`故事 ${m.id}（${m.story.title}）没有放进任何做法，已单独列为一个做法`);

  // What the model wrote, in the practices it keeps: its lengths, its words, and every number from the stories it stands for.
  const numbersOf = (ids: string[]) => sourceNumbers(ids.map((id) => JSON.stringify(byId.get(id)!.story)).join("\n"));
  const texts: Array<[where: string, text: string, kind: keyof typeof LENGTHS]> = [["综述", out.overview, "overview"]];
  for (const m of kept) {
    const name = `第 ${m.n + 1} 个做法`;
    texts.push([`${name}的标题`, m.title, "title"], [`${name}的归纳`, m.summary, "summary"]);
    for (const l of m.lines) {
      const where = `${name}第 ${l.n + 1} 家的那一行`;
      texts.push([where, l.line, "line"]);
      const missing = unfoundNumbers(l.line, numbersOf(l.caseIds));
      if (missing.length) problems.push(`${where}「${l.line}」的数字 ${missing.join("、")} 在这家店的故事里找不到：删掉，或改成故事写的数字`);
    }
    const missing = unfoundNumbers(m.summary, numbersOf(m.lines.flatMap((l) => l.caseIds)));
    if (missing.length) problems.push(`${name}的归纳里的数字 ${missing.join("、")} 在这个做法的故事里找不到：删掉，或改成故事写的数字`);
  }
  const digits = out.overview.normalize("NFKC").match(/\d+(?:[.,]\d+)*%?/g);
  if (digits) problems.push(`综述里写了数字 ${[...new Set(digits)].join("、")}：综述不写数字，删去带数字的说法`);
  for (const [where, text, kind] of texts) {
    const { asked, ceiling, cut } = LENGTHS[kind];
    const length = [...text.replace(/\s/g, "")].length;
    if (length > ceiling) problems.push(`${where}太长：最多 ${asked} 字，现在 ${length} 字；${cut}`);
    const foreign = untranslated(text);
    if (foreign) problems.push(`${where}有没有翻译的${foreign}：译成中文，只有店名、人名可以保留原文`);
    for (const [pattern, fix] of WORDING) {
      const hit = pattern.exec(text);
      if (hit) problems.push(`${where}用了“${hit[0]}”（“${text.slice(Math.max(0, hit.index - 8), hit.index + hit[0].length + 8)}”）：${fix}`);
    }
  }
  if (problems.length) return { grouping: null, problems, repairs };
  const methods = [...kept.map((m) => ({ group: m.group, title: m.title, summary: m.summary, shops: m.lines.map((l) => ({ caseIds: l.caseIds, line: l.line })) })), ...soloed.map(alone), ...left.map(alone)];
  return {
    grouping: {
      overview: spaced(out.overview),
      methods: methods.map((m) => ({
        key: keyOf(m.shops.flatMap((s) => s.caseIds)), group: m.group, title: spaced(m.title), summary: spaced(m.summary),
        shops: m.shops.map((s) => ({ caseIds: s.caseIds, line: spaced(s.line) })),
      })),
    },
    problems, repairs,
  };
}

/** What the model reads of each story: its place in the situation, who tells it and the practice it tells, kept short. */
function describe(m: Member, teller: string): string {
  const s = m.story;
  const body = s.parts.map((p) => `${p.heading}：${p.blocks.flatMap((b) => (b.type === "text" ? [b.text] : b.type === "list" ? b.items.map((i) => i.text) : b.type === "flow" ? [b.steps.join("→")] : b.type === "change" ? [b.after.text] : [])).join(" ").slice(0, 200)}`).join("\n");
  const shop = [s.shop.country, s.shop.label || s.shop.name].filter(Boolean).join(" · ");
  return [`id：${m.id}`, `原因组：${m.group ?? "null"}`, `店家：${teller}（${shop}）`, `标题：${s.title}`, `做了什么：${s.placements[0]?.card ?? ""}`, `人物：${s.who}`, body].join("\n");
}

/**
 * What the model reads of a situation: its cause groups, then its stories a group at a time in the situation's
 * order, those of no group last, so it reads together the stories it may put together (newest first, a group's
 * stories lay scattered among the others). `members` comes back in that order, which the shops' names (s1, s2…)
 * follow, here and in the problems sent back.
 */
export function materialOf(situation: Situation, given: Member[]): { members: Member[]; text: string } {
  const at = (group: string | null) => {
    const i = situation.groups.findIndex((g) => g.key === group);
    return i < 0 ? situation.groups.length : i;
  };
  const members = [...given].sort((a, b) => at(a.group) - at(b.group));
  const names = tellerNames(members);
  const groups = situation.groups.map((g) => `- ${g.key}：${g.title}（${g.line}）`).join("\n");
  const heads = [...situation.groups.map((g) => `原因组 ${g.key}（${g.title}）`), "没有原因组"];
  const stories = heads.flatMap((head, i) => {
    const own = members.filter((m) => at(m.group) === i);
    return own.length ? [`${head}的 ${own.length} 篇故事：\n\n${own.map((m) => describe(m, names.get(m.teller)!)).join("\n\n")}`] : [];
  });
  return { members, text: [`情况：${situation.title}（${situation.dek}）`, `原因组：\n${groups}`, ...stories].join("\n\n") };
}

/** Groups one situation's stories and stores the result; null when there is nothing to group. */
export async function groupSituation(slug: string, given: Member[]): Promise<{ stored: boolean; problems: string[] } | null> {
  const situation = findSituation(slug);
  if (!situation || given.length < 2) return null;
  const { members, text: material } = materialOf(situation, given);
  const model = await modelFor(METHODS_STEP);
  const receiptIds: number[] = [];
  let user = `请按系统规则归并以下故事，只输出 JSON。\n\n${material}`;
  let read: ReturnType<typeof readGrouping> = { grouping: null, problems: [], repairs: [] };
  // The first answer, and up to two more with its problems named.
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await chatJson({
      model, purpose: PURPOSE, subject: `situation:${slug}@${membersKey(members)}`, promptVersion: PROMPT_VERSION,
      system: SYSTEM, user, schema: z.unknown(), temperature: 0.2, maxTokens: 5000, timeoutMs: 180_000,
    });
    receiptIds.push(res.receiptId);
    read = readGrouping(res.data, members);
    if (read.grouping) break;
    const list = (lines: string[]) => lines.map((p) => `- ${p}`).join("\n");
    // With the material again, the mends are named too: a number of a story taken out of a practice reads as missing.
    user = read.problems.every(textOnly)
      ? [EDIT, `归并：\n${JSON.stringify(res.data)}`, `问题：\n${list(read.problems)}`].join("\n\n")
      : [
        `请按系统规则归并以下故事，只输出 JSON。`, material, `你上一次的输出：\n${JSON.stringify(res.data)}`,
        ...(read.repairs.length ? [`程序已经按规则调整了上一次的输出：\n${list(read.repairs)}`] : []),
        `上一次的输出有以下问题，请改正后重新输出完整的 JSON：\n${list(read.problems)}`,
      ].join("\n\n");
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
