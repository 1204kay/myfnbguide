// 全面找信源的成本样本（2026-10-24，十一同意，上限 US$1）：新候选每天约 3,900 条，接之前先量出真实的数，给 Kay 定接多少。
// 从 myfnb/sourcing/trial-sample-2026-10-24.json 的订阅里各取最新几条（层内按每天产量加权抽：G 综合全站订阅、S 其余新候选、
// R 账本重开的；G 和 S 按搜索分组分层），走站上同样的预筛和两次评分（editorial/analyze.ts 的 runSelectionPrefilter、runSelectionScores），量出：
//   过预筛的比例、评分过线（入选）的比例、预筛和评分每条实际花多少（回执的 cost）；
//   一道不花钱的代码过滤（标题、摘要、网址里有没有餐饮词）会放过多少、漏掉多少预筛通过和入选的；
//   线上最近 7 天每一步的花费和条数（只读），用来算过了预筛以后归类、写稿、核对每条要多花多少。
// 站上什么都不变：不建信源、不写条目，库里只多模型回执。正文只在内存里用，不写进输出；输出是标题、网址和判定。
//   node myfnb/trial-sources.ts                列出会抓哪些订阅，不调模型
//   node myfnb/trial-sources.ts --apply        抓、判，打出逐条结果和汇总
//   --per 3        每个订阅取最新几条（默认 3）
//   --cap-usd 1    回执累计到这个数就停（默认 1）
//   --sample <文件> 换一份订阅清单（myfnb/sourcing/ 下）；--jobs 6 同时抓几个订阅（默认 1）
// 全量试吃（Kay 10-24 21:11 同意约 US$9）：--sample trial-full-2026-10-24.json --per 10 --cap-usd 10 --jobs 6。
// 同一条（同样的标题和正文）再判会直接用已有回执、不花钱，所以撞上限停下以后，第二天用同一条命令重开就是接着跑。
// 结尾按订阅列出判了几条、过预筛几条、入选几条，用来挑命中高的那一档。
//   --reserve 3000 模型调用熔断（budgets 表 llm，按过去 1 小时、24 小时滚动计数，和线上共用）离上限不到这么多次就停，
//                  给线上留余量（默认 3000）。10-24 第一轮没有这道，撞了每小时上限，1,840 条没判，线上也跟着推迟。
// 在服务器上：ops 门 `bg myfnb/trial-sources.ts --apply`，再 `tail <编号>`。
import { appendFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { REPO_ROOT } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { runSelectionPrefilter, runSelectionScores, scoresSelect, type AnalyzeInputArticle } from "@aihot/backend/editorial/analyze";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { fetchRss } from "@aihot/backend/sources/rss";
import { extractFromUrl, pageFetchable } from "@aihot/backend/content/extract";
import type { SourceRow } from "@aihot/backend/sources/types";

const { values } = parseArgs({ options: {
  apply: { type: "boolean", default: false }, per: { type: "string", default: "3" }, "cap-usd": { type: "string", default: "1" },
  sample: { type: "string", default: "trial-sample-2026-10-24.json" }, jobs: { type: "string", default: "1" },
  reserve: { type: "string", default: "3000" },
} });
type Feed = { group: string; name: string; feedUrl: string; perDay: number };
const sample = JSON.parse(readFileSync(path.join(REPO_ROOT, "myfnb/sourcing", values.sample), "utf8")) as {
  volume: Record<string, { feeds: number; perDay: number }>; feeds: Feed[];
};
const groups = Object.keys(sample.volume);
const per = Number(values.per);
const cap = Number(values["cap-usd"]);

// 代码过滤：标题、摘要和网址里有没有一个餐饮词（多语言）。词表故意宽，宁可多放：它只替预筛挡掉明显不相干的。
const FOOD = new RegExp([
  "餐", "飲", "饮", "食", "菜", "吃", "店", "外卖", "外賣", "咖啡", "茶", "酒", "厨", "廚", "料理", "麵", "面馆", "火锅", "火鍋", "奶茶", "烘焙", "麵包", "面包",
  "飲食", "外食", "レストラン", "居酒屋", "ラーメン", "グルメ", "カフェ", "メニュー", "フード",
  "식당", "외식", "음식", "카페", "메뉴", "배달", "요리", "치킨", "프랜차이즈", "맛집",
  "restaura", "food", "dining", "diner", "café", "cafe", "coffee", "menu", "chef", "kitchen", "\\bbar\\b", "\\bpub\\b", "brew", "beer", "wine", "cocktail",
  "pizza", "burger", "takeaway", "takeout", "delivery", "franchis", "hospitality", "catering", "bakery", "\\beat", "meal", "drink", "\\btea\\b", "snack", "grocery",
  "comida", "gastronom", "cocina", "cerveza", "vino", "bebida", "alimenta", "lanchonete", "padaria", "delivery", "hostel", "hotel",
  "gastro", "essen", "küche", "imbiss", "bäcker", "ristorant", "cucina", "cibo", "trattoria", "boulang", "brasserie", "cuisine", "nourriture",
  "\\bmat\\b", "kök", "ravintol", "horeca", "eten", "keuken",
  "makan", "restoran", "kuliner", "minuman", "kopi", "ẩm thực", "nhà hàng", "quán", "món", "อาหาร", "ร้าน", "กาแฟ",
  "مطعم", "مطاعم", "طعام", "قهوة", "مقهى", "מסעד", "אוכל",
].join("|"), "i");
const passesCode = (s: string) => FOOD.test(s);

const sourceOf = (f: Feed, i: number): SourceRow => ({
  id: `trial-${i}`, name: f.name, kind: "rss", config: { feedUrl: f.feedUrl }, tier: "T2", participation_mode: "editorial",
  first_party: false, interval_minutes: 720, enabled: true, cursor: null, fail_count: 0,
});

if (!values.apply) {
  for (const g of groups) console.log(`${g}: ${sample.feeds.filter((f) => f.group === g).length} 个订阅（全组 ${sample.volume[g].feeds} 个，每天约 ${sample.volume[g].perDay} 条）`);
  console.log(`每个订阅取最新 ${per} 条，最多 ${sample.feeds.length * per} 条；加 --apply 才抓和判。`);
  await closeDb();
  process.exit(0);
}

type Row = { group: Feed["group"]; feed: string; title: string; url: string; code: boolean; label: string | null; reason: string; scores: number[]; selected: boolean; cost: number; err?: string };
const rows: Row[] = [];
let spentUsd = 0;
// 回执的 cost 栏在 DeepSeek 上是空的（10-24 第一趟：292 张全空，上限因此没起作用），花费按用量乘价格表算（同 myfnb/check.ts 的 spent）。
const usd = sql`coalesce(r.cost, (r.usage->>'prompt_tokens')::numeric / 1e6 * p.input_per_mtok + (r.usage->>'completion_tokens')::numeric / 1e6 * p.output_per_mtok, 0)`;
const price = sql`LEFT JOIN LATERAL (SELECT input_per_mtok, output_per_mtok FROM service_prices sp WHERE sp.service = r.service AND sp.model IN (r.model, '') ORDER BY sp.model = '' LIMIT 1) p ON true`;
// 只数这一趟真发出去的调用（receipt_attempts 和 receipts 有同样的 service、model、cost、usage 栏）：同一条再跑一次会直接用
// 已有的回执、不再收费，分几天跑的第二天重开时，前一天判过的不该再算进上限。
const runStart = new Date();
const costOf = async (ids: number[]) => {
  if (!ids.length) return 0;
  const [r] = await sql<{ usd: string | null }[]>`
    SELECT sum(${usd})::text AS usd FROM receipt_attempts r ${price} WHERE r.receipt_id IN ${sql(ids)} AND r.started_at >= ${runStart}`;
  return Number(r?.usd ?? 0);
};
// 逐条结果同时写进容器里的文件：第一趟的 ssh 连线断了，终端里的输出全丢了。
const outFile = path.join(tmpdir(), `trial-sources-${new Date().toISOString().replace(/[:.]/g, "")}.jsonl`);
console.log(`# 逐条结果也写在 ${outFile}`);

// 和 providers/receipts.ts 的 checkBudget 同一个数法；每小时的余量取每天余量的十分之一。
const reserve = Number(values.reserve);
const budgetLeft = async () => {
  const [b] = await sql<{ hour: number; day: number }[]>`
    SELECT (SELECT per_hour FROM budgets WHERE service = 'llm') - count(*) FILTER (WHERE started_at > now() - interval '1 hour') AS hour,
           (SELECT per_day FROM budgets WHERE service = 'llm') - count(*) AS day
    FROM receipt_attempts WHERE service = 'llm' AND origin = 'live' AND started_at > now() - interval '1 day'`;
  return b!;
};
let stopped = "";
let next = 0;
const worker = async () => {
  while (next < sample.feeds.length) {
    const i = next++;
    const f = sample.feeds[i]!;
    if (spentUsd >= cap) { console.log(`# 回执累计 US$${spentUsd.toFixed(3)}，到上限 ${cap}，停`); break; }
    const left = await budgetLeft();
    if (left.day < reserve || left.hour < reserve / 10) {
      stopped ||= `# 模型调用熔断只剩每天 ${left.day} 次、这一小时 ${left.hour} 次，给线上留 ${reserve} 次，停在第 ${i + 1} 个订阅（${f.name}）`;
      break;
    }
    let items;
    try {
      items = (await fetchRss(sourceOf(f, i), { force: true })).candidates
        .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)).slice(0, per);
    } catch (e) {
      console.log(`! ${f.name}：抓不到（${String(e).slice(0, 80)}）`);
      appendFileSync(outFile, `${JSON.stringify({ group: f.group, feed: f.name, fetchError: String(e).slice(0, 200) })}\n`);
      continue;
    }
    for (const c of items) {
      if (spentUsd >= cap) break;
      let body = c.bodyText ?? null;
      if (!body && pageFetchable(c.url, "rss")) {
        // 和站上一样先读文章页；不用付费的 Jina 兜底，读不到就按标题和摘要判（站上那种情况会等页面）。
        body = (await extractFromUrl(c.url, `trial:${c.url}`, {}, { paidFallback: false }).catch(() => null))?.text ?? null;
      }
      const id = `trial-src-${createHash("sha256").update(c.url).digest("hex").slice(0, 16)}`;
      const a: AnalyzeInputArticle = {
        id, revision: 1, title: c.title, url: c.url, author: c.author ?? null, publishedAt: c.publishedAt ?? null, publicationTime: c.publicationTime ?? null,
        bodyText: body, excerpt: c.excerpt ?? null, bodyStatus: body ? "ok" : "unconfirmed", xPost: null, media: [],
        source: { name: f.name, kind: "rss", tier: "T2", firstParty: false },
      };
      const row: Row = { group: f.group, feed: f.name, title: c.title, url: c.url, code: passesCode(`${c.title} ${c.excerpt ?? ""} ${c.url}`), label: null, reason: "", scores: [], selected: false, cost: 0 };
      const ids: number[] = [];
      try {
        const pre = await runSelectionPrefilter(a, { attemptTag: "trial-sources-1024" }, (r) => ids.push(r));
        row.label = pre.label;
        row.reason = pre.reason;
        if (pre.label !== "BLOCK") {
          const s = await runSelectionScores(a, { attemptTag: "trial-sources-1024" }, (r) => ids.push(r));
          row.scores = s?.values ?? [];
          row.selected = scoresSelect(s);
        }
      } catch (e) {
        row.err = String(e).slice(0, 100);
      }
      for (const r of ids) await completeReceipt(sql, r);
      row.cost = await costOf(ids);
      spentUsd += row.cost;
      rows.push(row);
      appendFileSync(outFile, `${JSON.stringify(row)}\n`);
      console.log(`${row.group} | ${row.code ? "码过" : "码挡"} | ${row.label ?? "-"} | ${row.scores.join("+") || "-"}${row.selected ? " 入选" : ""} | ${row.title.slice(0, 50).replace(/\s+/g, " ")} | ${row.url}`);
    }
  }
};
// 同时跑几个订阅时，上限在每条判完后才看，最多多花 jobs 条的钱。
await Promise.all(Array.from({ length: Number(values.jobs) }, worker));
if (stopped) console.log(stopped);

const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(0)}%` : "-");
console.log(`\n# 汇总：${rows.length} 条，回执合计 US$${spentUsd.toFixed(3)}`);
for (const g of [...groups, "全部"]) {
  const set = g === "全部" ? rows : rows.filter((r) => r.group === g);
  const judged = set.filter((r) => r.label);
  const pass = judged.filter((r) => r.label !== "BLOCK");
  const sel = judged.filter((r) => r.selected);
  const code = judged.filter((r) => r.code);
  const avg = (rs: Row[]) => (rs.length ? rs.reduce((n, r) => n + r.cost, 0) / rs.length : 0);
  console.log(`${g}: 判了 ${judged.length} 条 · 过预筛 ${pass.length}（${pct(pass.length, judged.length)}）· 入选 ${sel.length}（${pct(sel.length, judged.length)}）`
    + ` · 每条预筛 US$${avg(judged.filter((r) => r.label === "BLOCK")).toFixed(5)}，过预筛的预筛加评分 US$${avg(pass).toFixed(5)}`);
  console.log(`   代码过滤放过 ${code.length}（${pct(code.length, judged.length)}）· 挡掉的里面过预筛的 ${judged.filter((r) => !r.code && r.label !== "BLOCK").length} 条、入选的 ${judged.filter((r) => !r.code && r.selected).length} 条`);
}

// 按订阅：判了几条 / 过预筛 / 入选，入选多的排前面；每天产量用来算接这个订阅每月要花多少。
const perFeed = new Map<string, { judged: number; pass: number; sel: number }>();
for (const r of rows.filter((r) => r.label)) {
  const s = perFeed.get(r.feed) ?? { judged: 0, pass: 0, sel: 0 };
  s.judged++;
  if (r.label !== "BLOCK") s.pass++;
  if (r.selected) s.sel++;
  perFeed.set(r.feed, s);
}
console.log("\n# 按订阅（入选 / 过预筛 / 判了 · 每天约几条 · 订阅名）");
const perDayOf = new Map(sample.feeds.map((f) => [f.name, f.perDay]));
for (const [feed, s] of [...perFeed].sort((a, b) => b[1].sel - a[1].sel || b[1].pass - a[1].pass)) {
  console.log(`${s.sel}\t${s.pass}\t${s.judged}\t${perDayOf.get(feed) ?? "-"}\t${feed}`);
}

// 线上最近 7 天：每一步的花费和条数，和同期过预筛、入选的文章数（只读）。
const steps = await sql<{ purpose: string; n: string; usd: string | null }[]>`
  SELECT r.purpose, count(*)::text AS n, sum(${usd})::text AS usd FROM receipts r ${price}
  WHERE r.created_at > now() - interval '7 days' AND r.status IN ('received', 'completed') AND coalesce(r.subject, '') NOT LIKE 'article:trial-%'
  GROUP BY r.purpose ORDER BY sum(${usd}) DESC NULLS LAST`;
console.log("\n# 线上最近 7 天每一步（回执条数 / US$）");
for (const s of steps) console.log(`${s.purpose}\t${s.n}\t${Number(s.usd ?? 0).toFixed(3)}`);
const [counts] = await sql<{ judged: string; pass: string; selected: string }[]>`
  SELECT count(*)::text AS judged, count(*) FILTER (WHERE relevance <> 'block')::text AS pass, count(*) FILTER (WHERE selected)::text AS selected
  FROM (SELECT DISTINCT ON (article_id) relevance, selected FROM analyses WHERE created_at > now() - interval '7 days' ORDER BY article_id, id DESC) x`;
console.log(`同期判过的文章 ${counts?.judged}，过预筛 ${counts?.pass}，入选 ${counts?.selected}`);

await stopBoss().catch(() => {});
await closeDb();
