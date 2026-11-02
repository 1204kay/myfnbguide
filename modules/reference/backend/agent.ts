// What AI agents read of the reference library and 十一说: the engine's Agent socket (packages/backend/src/modules.ts
// AgentAbility), so each is an address under /api/v1/agent, an MCP tool with the same answer, and a line in the guide
// and llms.txt. Kay 11-02 「包括让别的AI愿意来也对」: the engine's search reaches back 7 days, so without these an agent
// cannot reach the library (every selected item since the start, by what an owner runs into) nor the site's own daily
// program. The answers are put together with the engine's helpers (publication/agent.ts answer), as its own are.
import { z } from "zod";
import { sql } from "@aihot/backend/db";
import type { AgentAbility } from "@aihot/backend/modules";
import { answer, NO_INTERNALS, stamp } from "@aihot/backend/publication/agent";
import { siteUrl } from "@aihot/backend/publication/links";
import { mcpToolName } from "@aihot/contracts/mcp";
import { ITEM_COPY, reasonLines, SITE } from "@aihot/site";
import { SITUATIONS } from "../situations.ts";
import { fullCountText } from "../format.ts";
import type { CaseCard, IssuePage, ReferenceHome, SituationPage } from "../types.ts";
import { readHome, readSituation } from "./read.ts";
import { issuePath, readIssue } from "./issues.ts";

const linkText = (title: string) => title.replace(/([[\]])/g, "\\$1");
const CACHE = "public, max-age=300, must-revalidate";
const REFERENCE_TOOL = mcpToolName("get_reference");
const ISSUE_TOOL = mcpToolName("get_shiyi");
const NAME = "十一说";

// ---- 参考库 ----

export function referenceIndexAnswer(home: ReferenceHome): string {
  if (!home.categories.length) return answer([`# ${SITE.name} 参考库`, "", "参考库现在还没有内容。"], null, ["如实告诉用户参考库还没有内容。"]);
  const data = home.categories.flatMap((c) => [
    `## ${c.title}`,
    ...c.situations.map((s) => `- [${linkText(s.title)}](${siteUrl(`/reference/${s.slug}`)})（situation=${s.slug}）：${s.dek}（${fullCountText(s.count)}）`),
    "",
  ]);
  return answer([
    `# ${SITE.name} 参考库`,
    "",
    `按小店老板遇到的事整理各地店家的做法和经验：${home.totals.situations} 种情况、${home.totals.cases} 条原文，从开站收到现在，不只最近 7 天。每条附原文出处。`,
  ], data, [
    `先挑最贴近用户问题的一两种情况，再读它的内容：用 MCP 工具 ${REFERENCE_TOOL} 带 situation，或打开上面的网页地址。`,
    "这里的情况比搜索早得多；用户问「各地店家遇到这种事怎么做」时先查这里，问最近的新闻再用搜索。",
    NO_INTERNALS,
  ]);
}

function caseLines(cards: CaseCard[], originals: Map<string, string>): string[] {
  return cards.flatMap((c, i) => {
    const reason = c.reason ? reasonLines(c.reason) : [];
    return [
      `${i + 1}. [${linkText(c.title)}](${siteUrl(`/items/${c.item.id}`)})`,
      `   ${[c.src, c.item.source.name].filter(Boolean).join(" · ")}`,
      ...(reason.length ? [`   ${ITEM_COPY.reasonLabel}：${reason.join("；")}`] : c.item.summary ? [`   摘要：${c.item.summary}`] : []),
      ...(originals.has(c.item.id) ? [`   原文：${originals.get(c.item.id)}`] : []),
      "",
    ];
  });
}

export function situationAnswer(page: SituationPage, originals: Map<string, string>): string {
  const data = [
    ...page.groups.flatMap((g, i) => [`## ${i + 1}. ${g.title}：${g.line}`, "", ...caseLines(g.cases, originals)]),
    ...(page.groups.length && page.rest.length ? ["## 其他", ""] : []),
    ...caseLines(page.rest, originals),
  ];
  return answer([
    `# ${SITE.name} 参考库 · ${page.title}`,
    "",
    `${page.category.title} · ${fullCountText(page.count)}${page.updatedAt ? ` · ${stamp(page.updatedAt)} 更新（北京时间）` : ""}`,
    "",
    page.dek,
    "",
    `网页：${siteUrl(`/reference/${page.slug}`)}`,
  ], data, [
    "这些是各地店家和业内人士自己讲的做法，按原因分组，组内从新到旧。先用一两句话说有哪几类做法，再挑 2–5 个最贴近用户情况的例子，每个写国家、来源，标题链接到 MYFNB。",
    `只转述原文讲了什么，不替用户下结论，不说「你应该」；没有${ITEM_COPY.reasonLabel}的条目不要编细节。`,
    "内容由 AI 整理、没有逐条人工审核；数字、原话请用户回原文核对，用户要出处时给原文链接。",
    NO_INTERNALS,
  ]);
}

/** The originals of the items the cards are, from the publications the library reads. */
async function originalsOf(page: SituationPage): Promise<Map<string, string>> {
  const ids = [...page.groups.flatMap((g) => g.cases), ...page.rest].map((c) => c.item.id);
  if (!ids.length) return new Map();
  const rows = await sql<{ id: string; url: string }[]>`SELECT article_id AS id, url FROM publications WHERE article_id = ANY(${ids}::text[])`;
  return new Map(rows.map((r) => [r.id, r.url]));
}

async function referenceText(slug: string | undefined): Promise<{ text: string; structured: Record<string, unknown> }> {
  if (!slug) {
    const home = await readHome();
    return { text: referenceIndexAnswer(home), structured: { situations: home.categories.flatMap((c) => c.situations.map((s) => ({ slug: s.slug, category: c.title, title: s.title, dek: s.dek, count: s.count }))) } };
  }
  const page = await readSituation(slug);
  if (!page) return { text: answer([`# ${SITE.name} 参考库`, "", `没有 ${slug} 这种情况。`], null, [`不带 situation 再调一次 ${REFERENCE_TOOL}，从列出的情况里选。`]), structured: { situation: null } };
  return { text: situationAnswer(page, await originalsOf(page)), structured: { situation: page } };
}

// ---- 十一说 ----

/** Each issue, newest first: its number, day and title, for the list under an issue. */
async function issueList(): Promise<Array<{ no: number; date: string; title: string }>> {
  return sql<{ no: number; date: string; title: string }[]>`
    SELECT no, to_char(date, 'YYYY-MM-DD') AS date, content->'issue'->>'title' AS title
    FROM reference_issues WHERE status = 'issue' ORDER BY no DESC`;
}

export function issueAnswer(p: IssuePage, all: Array<{ no: number; date: string; title: string }>): string {
  const { issue, lines } = p;
  const data = [
    `## 这期说什么`,
    issue.brief.join(""),
    "",
    "## 正文",
    lines.open,
    issue.preview,
    ...issue.news.flatMap((x) => ["", `### ${x.head}`, x.text]),
    ...(issue.deep ? ["", lines.turn, "", `### ${issue.title}`, issue.deep] : []),
    ...(issue.close ? ["", issue.close] : []),
    lines.end,
    "",
    "## 原文出处（正文里的〔n〕）",
    ...p.sources.map((s) => `${s.n}. ${s.sourceName}：《${s.title}》 ${s.url}`),
  ];
  const others = all.filter((x) => x.no !== p.no).map((x) => `- 第 ${x.no} 期（${x.date}）[${linkText(x.title)}](${siteUrl(issuePath(x.no))})`);
  return answer([
    `# ${NAME} · 第 ${p.no} 期：${issue.title}`,
    "",
    `${p.date} 的 ${SITE.name} 日报头条。${NAME}是 ${SITE.name} 自己的每日节目：AI 十一读完当天收录的 ${p.count} 条，挑要紧的讲，点名 ${p.sources.length} 篇原文。`,
    "",
    `网页：${siteUrl(issuePath(p.no))}${p.audio ? `（可以听，约 ${Math.round(p.audio.seconds / 60)} 分钟）` : ""}`,
    ...(others.length ? ["", "## 往期", ...others] : []),
  ], data, [
    `${NAME}由 AI 写成、经另一个模型对照原文核对，没有逐条人工审核；讲到的事以〔n〕点名的原文为准，算账的例子是假设。`,
    `转述时写明出自 ${SITE.name}「${NAME}」第几期，并链接到网页；用户要出处时给对应的原文链接。`,
    NO_INTERNALS,
  ]);
}

async function issueText(no: number | undefined): Promise<{ text: string; structured: Record<string, unknown> }> {
  const all = await issueList();
  const want = no ?? all[0]?.no;
  const page = want ? await readIssue(want) : null;
  if (!page) {
    const head = no ? `没有第 ${no} 期${NAME}。` : `还没有发布过${NAME}。`;
    return { text: answer([`# ${NAME}`, "", head], null, ["如实告诉用户；不要换一期冒充。"]), structured: { issue: null } };
  }
  return { text: issueAnswer(page, all), structured: { issue: page, issues: all } };
}

// ---- the abilities ----

const SLUGS = SITUATIONS.map((s) => s.slug) as [string, ...string[]];

export const AGENT_ABILITIES: AgentAbility[] = [
  {
    path: "/reference",
    title: "参考库",
    ask: "店家遇到某种情况（定价、招人、房租、差评……）各地是怎么做的；不限最近 7 天",
    answer: async () => referenceIndexAnswer(await readHome()),
    etagPrefix: "agent-reference",
    cacheControl: CACHE,
    mcp: {
      tool: "get_reference",
      use: "for what shops elsewhere did about a situation an owner runs into (the reference library, since the start)",
      description: "Get the MYFNB reference library: what small food businesses in many countries did about a situation an owner runs into (pricing, hiring, rent, bad reviews, cash flow...), every item since the site began, each with its original link. Without situation, lists the situations; with one, returns its items grouped by cause. Use this rather than search when the user asks how others handle something, not for recent news.",
      input: z.object({
        situation: z.enum(SLUGS).optional().describe("A situation slug from the list returned without it, e.g. pricing."),
      }),
      run: async (args) => referenceText(typeof args.situation === "string" ? args.situation : undefined),
    },
  },
  {
    path: "/shiyi",
    title: NAME,
    ask: `${SITE.name} 自己的每日节目${NAME}（最新一期全文，附往期）`,
    answer: async () => (await issueText(undefined)).text,
    etagPrefix: "agent-shiyi",
    cacheControl: CACHE,
    mcp: {
      tool: "get_shiyi",
      use: `for ${SITE.name}'s own daily program 十一说`,
      description: `Get 十一说, ${SITE.name}'s own daily program that leads the daily: an AI reads every item of the day and writes a short news round-up and one story told in depth, citing the originals. Without no, returns the latest issue in full and the list of issues; with no, that issue.`,
      input: z.object({
        no: z.number().int().positive().optional().describe("The issue number, from the list of issues."),
      }),
      run: async (args) => issueText(typeof args.no === "number" ? args.no : undefined),
    },
  },
];
