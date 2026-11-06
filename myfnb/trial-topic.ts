// 参考页综合整理的试写（手册决定记录 L2575，Kay 11-06 07:11「你们讨论决定吧」）：一类情况的全部原文条目（标题、导读、
// 原文要点，按原因分组）交给一个模型写一篇综合整理（modules/reference/prompts/topic-write.md），再交核对员逐句对原文
// （prompts/topic-check.md），核出「严重」的句子删掉。只写文件，网站和数据库都不动，只留引擎的回执。用来和 Claude
// 在讨论串里试写的那篇比（手册项目文件 myfnb/参考页改版-2026-11-06/），没退步才做成模块。
//   --slug opening-cost（要写的情况）；--model 写的模型、--check-model 核的模型，都写 site/models.ts 里的一个；
//   --out 文件放哪（默认 /out）；--cap-usd 0.3：算上最坏情况超过就不调用。不加 --apply 只列出要给模型的条目，不调用。
// 在服务器上（一次性容器，正在跑的 worker 不动）：
//   sudo docker compose run --rm -v /opt/myfnbguide-trial/modules/reference:/app/modules/reference:ro \
//     -v /opt/myfnbguide-trial/myfnb:/app/myfnb:ro -v /tmp/myfnb-trial:/out worker \
//     node myfnb/trial-topic.ts --slug opening-cost --model deepseek-flash-think-llm --check-model deepseek-flash-think-llm --apply
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { chatJson, MODELS } from "@aihot/backend/providers/llm";
import { ModelOutputError } from "@aihot/backend/providers/receipts";
import { ISSUE_VERSION, type Ask, type Usage } from "../modules/reference/backend/issue.ts";
import { joined } from "../modules/reference/backend/claude.ts";
import { readSituation } from "../modules/reference/backend/read.ts";

const args = process.argv.slice(2);
const one = (flag: string) => { const i = args.lastIndexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const apply = args.includes("--apply");
const slug = one("--slug");
if (!slug) throw new Error("写 --slug，例如 opening-cost");
const model = one("--model") ?? "deepseek-flash-think-llm";
const checkModel = one("--check-model") ?? model;
for (const m of [model, checkModel]) if (!MODELS[m]) throw new Error(`${m} 不在 site/models.ts：${Object.keys(MODELS).join("、")}`);
/** US$ per million input / output tokens: DeepSeek's price list (11-06, peak hours, uncached input). */
const PRICES: Record<string, [number, number]> = { "deepseek-flash": [0.3, 1.2], "deepseek-flash-think": [0.3, 1.2], "deepseek-flash-think-llm": [0.3, 1.2] };
const priceOf = (m: string) => { const p = PRICES[m]; if (!p) throw new Error(`没有 ${m} 的价钱，写进 PRICES 再跑`); return p; };
const cap = Number(one("--cap-usd") ?? 0.3);
const out = one("--out") ?? "/out";

const prompt = (name: string, values: Record<string, string> = {}) =>
  promptFromText(`reference/${name}`, readFileSync(new URL(`../modules/reference/prompts/${name}.md`, import.meta.url), "utf8"), values);

interface Item { n: number; id: string; title: string; src: string; summary: string; points: string; group: string }

const page = await readSituation(slug);
if (!page) throw new Error(`没有 ${slug} 这种情况`);
const groups = [...page.groups.map((g, i) => ({ no: String(i + 1), title: g.title, cases: g.cases })), ...(page.rest.length ? [{ no: "其他", title: "其他做法", cases: page.rest }] : [])];
const ids = groups.flatMap((g) => g.cases.map((c) => c.id));
const rows = await sql<{ article_id: string; summary: string | null; reason: string | null }[]>`
  SELECT article_id, summary, reason FROM publications WHERE article_id = ANY(${ids})`;
const byId = new Map(rows.map((r) => [r.article_id, r]));
let n = 0;
const items: Item[] = groups.flatMap((g) => g.cases.map((c) => ({
  n: ++n, id: c.id, title: c.title, src: c.src, group: g.no,
  summary: byId.get(c.id)?.summary ?? "", points: byId.get(c.id)?.reason ?? c.reason ?? "",
})));
const listing = groups.map((g) => [`## 第 ${g.no} 组：${g.title}`, ...items.filter((i) => i.group === g.no).map((i) =>
  `〔${i.n}〕${i.src}\n标题：${i.title}\n导读：${i.summary}\n原文要点：${i.points.replace(/\n/g, "；")}`)].join("\n\n")).join("\n\n");
const chars = listing.length;
console.log(`${page.title}：${groups.length} 组，${items.length} 条，给模型的原文约 ${chars} 字`);
/**
 * Room to write: 十一说's ask gives 8,000 plus the preset's 12,000 for thinking, and the first run on the server (11-06
 * 08:5x, 66k characters in) spent all 20,000 thinking before any JSON. DeepSeek flash writes up to 384K (官方价格页
 * 「输出长度 最大 384K」, 11-06), so 40,000 in all here: thinking over 120 items, then a ~3,000-character article.
 */
const OUTPUT = 28_000;
/** The check writes a short list: 8,000 past its thinking (十一说's ask), so the run's worst case stays small. */
const CHECK_OUTPUT = 8_000;
const outputOf = (m: string, room = OUTPUT) => room + (MODELS[m]?.reasoningTokens ?? 0);
/** The most a call can cost: every character an input token (more than any text here takes) and all the output it may write. */
const worst = (m: string, room = OUTPUT) => (chars * 1.5 * priceOf(m)[0] + outputOf(m, room) * priceOf(m)[1]) / 1e6;
const need = worst(model) + worst(checkModel, CHECK_OUTPUT) * 2;
console.log(`最坏情况约 US$${need.toFixed(3)}（写一次、核对最多两次，每次都写满），上限 US$${cap}`);
if (!apply) { await closeDb(); process.exit(0); }
if (need > cap) throw new Error("超过 --cap-usd，没有调用");

const receipts: number[] = [];
const used: Record<string, Usage> = {};
const tally = (m: string) => (u: Usage) => { const t = (used[m] ??= { input: 0, output: 0 }); t.input += u.input; t.output += u.output; };
const subject = `reference-topic:${slug}`;
const Article = z.object({
  title: z.string().trim().min(1),
  lead: z.array(z.string().trim().min(1)).min(1),
  sections: z.array(z.object({ group: z.string().trim().min(1), paragraphs: z.array(z.string().trim().min(1)).min(1) })).min(1),
});
const Problems = z.object({ problems: z.array(z.object({ quote: z.string(), why: z.string(), severity: z.string() })) });
type ArticleText = z.infer<typeof Article>;

/** As backend/issue.ts modelAsk, with room for a long input's thinking (OUTPUT); unusable output once is asked again once. */
const askOf = (m: string, room = OUTPUT): Ask => async (purpose, system, user, schema, attempt) => {
  const once = (tag?: string) => chatJson({ model: m, purpose, subject, promptVersion: ISSUE_VERSION, system, user: joined(user), schema, temperature: 0, maxTokens: room, timeoutMs: 900_000, attemptTag: tag });
  const res = await once(attempt).catch((error: unknown) => {
    if (error instanceof ModelOutputError) return once(`${attempt ?? ""}retry`);
    throw error;
  });
  receipts.push(res.receiptId);
  if (!res.reused) tally(m)({ input: Number(res.usage?.prompt_tokens ?? 0), output: Number(res.usage?.completion_tokens ?? 0) });
  return res.data;
};
const write = askOf(model);
const check = askOf(checkModel, CHECK_OUTPUT);
const article = await write("reference_topic_write", prompt("topic-write", { 题目: page.title }), `# ${page.title}\n\n${listing}`, Article);
// The first run on the server wrote 「第 1 组」 for 1, and the headings came out as the group's number (11-06 08:57).
const groupTitle = (g: string) => groups.find((x) => x.no === g.replace(/^第\s*|\s*组$/gu, "").trim())?.title ?? g;
const text = (a: ArticleText) => [`# ${a.title}`, "", ...a.lead, "", ...a.sections.flatMap((s) => [`## ${groupTitle(s.group)}`, "", ...s.paragraphs.flatMap((p) => [p, ""])])].join("\n");
const found = await check("reference_topic_check", prompt("topic-check"), `# 综合整理\n\n${text(article)}\n\n# 原文\n\n${listing}`, Problems);
// 严重的句子删掉（照十一说：改不准的不留）；轻的留着，列在文件里给人看。
const serious = found.problems.filter((p) => p.severity.includes("严重"));
const cut = (s: string) => serious.reduce((t, p) => (p.quote && t.includes(p.quote) ? t.replace(p.quote, "") : t), s).replace(/\s{2,}/g, " ").trim();
const final: ArticleText = { title: article.title, lead: article.lead.map(cut).filter(Boolean), sections: article.sections.map((s) => ({ ...s, paragraphs: s.paragraphs.map(cut).filter(Boolean) })) };
const again = serious.length ? await check("reference_topic_check", prompt("topic-check"), `# 综合整理\n\n${text(final)}\n\n# 原文\n\n${listing}`, Problems, "recheck") : { problems: [] };

await sql.begin(async (tx) => { for (const id of receipts) await completeReceipt(tx, id); });
const cited = new Set([...text(final).matchAll(/〔([^〕]+)〕/gu)].flatMap((m) => m[1]!.split(/[,，、\s]+/).map(Number)));
const sources = items.filter((i) => cited.has(i.n)).map((i) => `- 〔${i.n}〕${i.title}（${i.src}）https://www.myfnbguide.com/items/${i.id}`);
const usd = Object.entries(used).reduce((s, [m, u]) => s + (u.input * priceOf(m)[0] + u.output * priceOf(m)[1]) / 1e6, 0);
const chineseChars = text(final).replace(/〔[^〕]*〕/gu, "").replace(/[\s#]/g, "").length;
mkdirSync(out, { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "");
const base = join(out, `topic-${slug}-${model}-${stamp}`);
writeFileSync(`${base}.md`, [text(final), "## 原文出处", "", ...sources, "",
  "---", `写：${model}；核对：${checkModel}；约 ${chineseChars} 字，引用 ${sources.length} 条原文；花费约 US$${usd.toFixed(4)}（高峰价推算，按回执的 token 数）`,
  `核对第一遍：严重 ${serious.length} 处（已删），轻 ${found.problems.length - serious.length} 处（留着）；删后再核：${again.problems.length} 处`, "",
  "### 第一遍核出的问题", "", ...found.problems.map((p) => `- 【${p.severity}】${p.quote}\n  ${p.why}`), "",
  "### 删后再核的问题", "", ...again.problems.map((p) => `- 【${p.severity}】${p.quote}\n  ${p.why}`)].join("\n"));
writeFileSync(`${base}.json`, JSON.stringify({ slug, model, checkModel, usage: used, usd, receipts, draft: article, found, final, again }, null, 2));
console.log(`写好了：${base}.md（约 ${chineseChars} 字，严重 ${serious.length} 处已删，再核 ${again.problems.length} 处，约 US$${usd.toFixed(4)}）`);
await stopBoss().catch(() => {});
await closeDb();
