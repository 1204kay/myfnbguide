// 全集重筛的题材判定（2026-10-25，Kay 同意用 DeepSeek，十一定：全部判完，估算超过 US$5 先报）。
// 起因：10-24 的「12 方向全面搜」用的是一次次搜索，没有回到全集（决定记录 L1129）。这次把播客整库、Kagi 博客、Common Crawl、GDELT 新闻域名、
// 新闻站的餐饮栏目、日本博客目录、注册库和 Wikidata 的全部候选按 12 方向的宽口径词根筛过（程序做，不花钱），剩下的在这里逐个读名称、简介和最近几条标题，判题材。
// 只判「这个来源常不常发 MYFNB 要的东西」，不判条款：条款、robots 在筛候选时已经按平台判过，接入前照常逐个查。
// 输入：myfnb/sourcing/universe-2026-10-25.jsonl.gz（压缩，原文件 54MB），一行一个候选 {id, kind, url, title, desc, items[], lang}。
//   第二批 universe2-2026-10-25.jsonl.gz（68,383 个，id 以 g2 开头）：按 12 方 × 27 类逐格补词根后重扫多出来的，用 --input 指定；
//   十一 10-25 定两批合计不超过 US$10、判完余额至少留 US$5，所以第二批用 --cap-usd 10 --min-balance 5。
//   node myfnb/judge-universe.ts            数候选、按 20 个一批估调用次数和花费，不调模型
//   node myfnb/judge-universe.ts --apply    判全部候选，逐条结果写进容器里的文件（路径打在第一行）
//   --cap-usd 6     回执累计到这个数就停（安全阀；估算在 US$5 以内才跑）
//   --min-balance 12  开跑前用同一把密钥读 DeepSeek 余额（只读），低于这个数不跑（十一 10-25：不足 US$12 先告诉十一）
//   --until 04:55   到这个时刻（MYT 时:分，取下一次出现的；也可以写完整的 ISO 时间）不再领新批，手上的批做完就退出；
//                   默认 04:55，避开 05:00–08:00
//   --reserve 3000  给线上留的模型调用次数，算法同 trial-sources.ts（这一小时离上限不到十分之一就等，每天不够就停）
// 同一批再判会直接用已有回执、不花钱，停下以后用同一条命令重开就是接着判。
// 在服务器上：ops 门 `bg myfnb/judge-universe.ts --apply`，再 `tail <编号>`。
import { appendFileSync, readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { credential, REPO_ROOT } from "@aihot/backend/config";
import { addDays, beijingAt, beijingDate, beijingStamp } from "@aihot/contracts/time";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { chatJson, MODELS } from "@aihot/backend/providers/llm";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { modelFor } from "@aihot/backend/editorial/models";

const { values } = parseArgs({ options: {
  apply: { type: "boolean", default: false }, "cap-usd": { type: "string", default: "6" }, "min-balance": { type: "string", default: "12" }, until: { type: "string", default: "04:55" }, reserve: { type: "string", default: "3000" },
  input: { type: "string", default: "universe-2026-10-25.jsonl.gz" }, batch: { type: "string", default: "20" }, jobs: { type: "string", default: "4" },
} });
type Cand = { id: string; kind: string; url: string; title: string; desc: string; items: string[]; lang?: string };
const raw = readFileSync(path.join(REPO_ROOT, "myfnb/sourcing", values.input));
const cands = (values.input.endsWith(".gz") ? gunzipSync(raw) : raw).toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Cand);
const size = Number(values.batch);
const batches: Cand[][] = [];
for (let i = 0; i < cands.length; i += size) batches.push(cands.slice(i, i + size));

const SYSTEM = `你替一个餐饮行业资讯站判断候选信息源。这个站给全球华人餐饮从业者看，收的是「餐饮业正在发生什么」，从谁的角度讲都可以：
经营者和店主、食客、员工和厨师、加盟商、供应商和食材产地、房东和商业地产、资本和投资人、政府和协会和法律界、外卖支付订位点评平台、设备和科技服务商、
做现制餐饮的超市便利店、研究和数据机构。题材包括运营、营销、用工、外卖、设备科技、食品安全、菜单和饮品趋势、酒水、业态、团餐、财务和通胀、并购融资、
加盟、高管人事、供应链和食材价格、店面设计、开店关店、消费趋势和食客行为、政策税费、法律诉讼、营养标示、展会奖项、创业和经营者本人的经过。
食客那一边也要：食客普遍在追什么、嫌什么、怎样花钱、吃法怎样在变，有依据的。

不要的：只介绍一家店或几道菜好不好吃的探店和食评、食谱和家常做法、美食攻略和旅游吃什么、榜单本身、博主个人动态、单店开幕优惠、
和餐饮无关的（只是名字里有 bar、kitchen、cafe 之类的字）、只卖食品零售商品的厂家、纯酒类品鉴笔记。

每个候选给你名称、简介和最近几条标题。判这个来源**常不常**发上面要的东西：
- Y：多数或相当一部分内容是要的；
- ?：偶尔有，或者看不出来；
- N：基本没有。
party 写它主要从谁的角度讲（上面 12 方之一，用中文简称，比如 经营者、食客、员工、平台、研究；N 的写 无）。why 用中文一句话，说凭哪几条标题判的。
只输出 JSON：{"items":[{"id":"…","v":"Y|?|N","party":"…","why":"…"}]}，每个候选一项，id 照抄。`;
const Schema = z.object({ items: z.array(z.object({ id: z.string(), v: z.enum(["Y", "?", "N"]), party: z.string(), why: z.string() })) });
// MYT 和北京时间同为 UTC+8，换算用 contracts/time.ts。
function untilOf(v: string): Date {
  if (!/^\d{2}:\d{2}$/.test(v)) return new Date(v);
  const today = beijingDate(Date.now());
  const t = beijingAt(today, v);
  return t.getTime() > Date.now() ? t : beijingAt(addDays(today, 1), v);
}
const userOf = (b: Cand[]) => b.map((c) => [`id: ${c.id}`, `类型: ${c.kind}`, `名称: ${c.title.slice(0, 120)}`, `网址: ${c.url}`,
  `简介: ${c.desc.slice(0, 400)}`, `最近标题: ${c.items.filter(Boolean).slice(0, 8).map((t) => t.slice(0, 90)).join(" ｜ ")}`].join("\n")).join("\n\n");

// 估算：DeepSeek flash 每百万 token 输入 US$0.15、输出 US$0.6，高峰乘 2（myfnb/price-deepseek-2026-10-24.ts）；字符数按 2.5 个字符一个 token 粗算。
const inTok = batches.reduce((n, b) => n + (SYSTEM.length + userOf(b).length) / 2.5, 0);
const outTok = cands.length * 45;
const est = (inTok * 0.15 + outTok * 0.6) / 1e6;
const kinds = new Map<string, number>();
for (const c of cands) kinds.set(c.kind, (kinds.get(c.kind) ?? 0) + 1);
console.log(`# 候选 ${cands.length} 个（${[...kinds].map(([k, n]) => `${k} ${n}`).join("、")}），${batches.length} 次调用；`
  + `估算输入约 ${(inTok / 1e6).toFixed(1)}M token、输出约 ${(outTok / 1e6).toFixed(1)}M，约 US$${est.toFixed(2)}（高峰 US$${(est * 2).toFixed(2)}）`);
if (!values.apply) {
  console.log("加 --apply 才判。");
  await closeDb();
  process.exit(0);
}

const usd = sql`coalesce(r.cost, (r.usage->>'prompt_tokens')::numeric / 1e6 * p.input_per_mtok + (r.usage->>'completion_tokens')::numeric / 1e6 * p.output_per_mtok, 0)`;
const price = sql`LEFT JOIN LATERAL (SELECT input_per_mtok, output_per_mtok FROM service_prices sp WHERE sp.service = r.service AND sp.model IN (r.model, '') ORDER BY sp.model = '' LIMIT 1) p ON true`;
const runStart = new Date();
// 安全阀按这个用途的全部历史回执算：每晚用同一条命令重开，几晚加起来也不超过 --cap-usd。
const spentSoFar = async () => {
  const [r] = await sql<{ usd: string | null }[]>`
    SELECT sum(${usd})::text AS usd FROM receipt_attempts r JOIN receipts rc ON rc.id = r.receipt_id ${price} WHERE rc.purpose = 'judge_source_candidate'`;
  return Number(r?.usd ?? 0);
};
const model = await modelFor("prefilter");
const spec = MODELS[model];
// 熔断按回执的 service 计数（receipts.ts 的 checkBudget）：用哪个模型就看哪一行 budgets。
const service = spec?.service ?? "llm";
const reserve = Number(values.reserve);
const budgetLeft = async () => {
  const [b] = await sql<{ hour: number; day: number }[]>`
    SELECT (SELECT per_hour FROM budgets WHERE service = ${service}) - count(*) FILTER (WHERE started_at > now() - interval '1 hour') AS hour,
           (SELECT per_day FROM budgets WHERE service = ${service}) - count(*) AS day
    FROM receipt_attempts WHERE service = ${service} AND origin = 'live' AND started_at > now() - interval '1 day'`;
  return b!;
};
const outFile = path.join(tmpdir(), `judge-universe-${runStart.toISOString().replace(/[:.]/g, "")}.jsonl`);
console.log(`# 逐条结果写在 ${outFile}`);
const base = spec?.baseUrlEnv ? credential("models", spec.baseUrlEnv) : null;
if (base?.includes("deepseek.com")) {
  const r = await fetch(`${base.replace(/\/v1\/?$/, "")}/user/balance`, { headers: { Authorization: `Bearer ${credential("models", spec!.apiKeyEnv!)}` } });
  const b = (await r.json()) as { balance_infos?: { currency: string; total_balance: string }[] };
  const usdBal = Number(b.balance_infos?.find((x) => x.currency === "USD")?.total_balance ?? 0);
  console.log(`# DeepSeek 余额 US$${usdBal.toFixed(2)}`);
  if (usdBal < Number(values["min-balance"])) {
    console.log(`# 余额低于 US$${values["min-balance"]}，不跑`);
    await closeDb();
    process.exit(0);
  }
}
const cap = Number(values["cap-usd"]);
let spent = await spentSoFar();
console.log(`# 这个用途的回执此前已累计 US$${spent.toFixed(3)}，安全阀 US$${cap}；熔断看 budgets 的 ${service} 一行`);
const until = untilOf(values.until);
console.log(`# 到 ${until.toISOString()}（MYT ${beijingStamp(until)}）不再领新批`);
let stopped = "";
let next = 0;
const tally = { Y: 0, "?": 0, N: 0, missing: 0, failed: 0 };
const worker = async () => {
  while (next < batches.length && !stopped) {
    const i = next++;
    if (Date.now() >= until.getTime()) { stopped = `# 到点停在第 ${i + 1} 批（手上的批已做完），下次用同一条命令接着判`; break; }
    if (spent >= cap) { stopped = `# 回执累计 US$${spent.toFixed(3)}，到安全阀 ${cap}，停在第 ${i + 1} 批`; break; }
    let left = await budgetLeft();
    while (left.day >= reserve && left.hour < reserve / 10 && Date.now() < until.getTime()) {
      await new Promise((r) => setTimeout(r, 60_000));
      left = await budgetLeft();
    }
    if (Date.now() >= until.getTime()) { stopped = `# 等熔断时到点，停在第 ${i + 1} 批，下次用同一条命令接着判`; break; }
    if (left.day < reserve) { stopped = `# 模型调用熔断只剩每天 ${left.day} 次，给线上留 ${reserve} 次，停在第 ${i + 1} 批`; break; }
    const b = batches[i]!;
    try {
      const res = await chatJson({
        model, purpose: "judge_source_candidate", subject: `universe:${b[0]!.id}..${b.at(-1)!.id}`, promptVersion: "judge-universe-2026-10-25",
        system: SYSTEM, user: userOf(b), schema: Schema, temperature: 0, maxTokens: 4000,
      });
      await completeReceipt(sql, res.receiptId);
      spent = await spentSoFar();
      const got = new Map(res.data.items.map((x) => [x.id, x]));
      for (const c of b) {
        const x = got.get(c.id);
        if (!x) tally.missing++; else tally[x.v]++;
        appendFileSync(outFile, `${JSON.stringify({ id: c.id, kind: c.kind, url: c.url, title: c.title, v: x?.v ?? null, party: x?.party ?? "", why: x?.why ?? "" })}\n`);
      }
    } catch (e) {
      tally.failed += b.length;
      for (const c of b) appendFileSync(outFile, `${JSON.stringify({ id: c.id, kind: c.kind, url: c.url, title: c.title, v: null, err: String(e).slice(0, 120) })}\n`);
    }
    if ((i + 1) % 50 === 0) console.log(`# 第 ${i + 1}/${batches.length} 批，US$${spent.toFixed(3)}，Y ${tally.Y} · ? ${tally["?"]} · N ${tally.N}`);
  }
};
await Promise.all(Array.from({ length: Number(values.jobs) }, worker));
if (stopped) console.log(stopped);
console.log(`# 完：Y ${tally.Y} · ? ${tally["?"]} · N ${tally.N} · 漏答 ${tally.missing} · 调用失败 ${tally.failed}；回执合计 US$${spent.toFixed(3)}`);
console.log("# 漏答和失败的用同一条命令再跑一次（判过的批直接用已有回执）");
await stopBoss().catch(() => {});
await closeDb();
