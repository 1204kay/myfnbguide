// 「整天一起挑」的离线试跑（2026-10-25，讨论串「修好 MYFNB 挑稿评分」，十一定：逐条打分改不出同一天的先后，手册 公司/经验.md E14）。
// 现在每条稿单独打分，日报再按规则从入选的里排 12 条；这里改成每天一次调用，把这一天站上进来的全部稿（编号、来源、标题、导读，
// 顺序打乱、不给分数）一起交给模型，让它直接挑出最多 12 条。只读：不改任何条目和分数，库里只多这次调用的回执。
// 量法和 eval-selection-compare.ts 的「一天挑 12 条」一样：挑出来的里有几条是 Kay 挑的；同时列出现行（站上分数按日报规则排出的正文）的命中。
// 标注：myfnb/labels-2026-10-25-day*.tsv（Kay 10-25 两轮整天挑稿）。提示词只用手册「评分标准」§1、§3 的描述（来自 10-22、10-23），
// 没放第二轮四天（10-19、10-20、10-21、10-24）的任何例子，所以那四天是留出集。
//   node myfnb/eval-listwise.ts            只估调用次数和花费，不调模型
//   node myfnb/eval-listwise.ts --apply    跑：每天 × 每个模型 × --reps 次
//   --models a,b   默认「站上评分用的模型」和 deepseek-v4-pro-llm；--reps 2；--cap-usd 2（回执累计到这个数就停）
//   --pools 1,3    候选池几天（Kay 10-25「一天挑不出 可以两三天都行」，十一定一起比）：1 = 每天只看当天；3 = 当天加前两天里还没上过日报的，
//                  按日期顺序一天天往下排，上过的稿和它那件事不再出现。六天是连着的 10-19 到 10-24，10-19 的前两天没有标注，只看当天。
//   --shadow 2026-10-06,2026-10-07   影子（2026-10-25，Kay「你和十一决定」，十一定）：不读标注，给哪几天就挑哪几天，和那天实际的日报正文并排，
//                  给 Kay 不标名字地挑。池子 = 那天日报窗口（前一天 08:00 到当天 08:00，取 reports 里存的）里进了列表的稿，取法和日报一样
//                  （edition.ts periodReports，dailyScope = pool：eligible，按到达和放出里晚的那个归天）；3 天池把窗口往前延两天，去掉更早几天已经上过日报的稿和那件事
//                  （跑过影子的天按影子自己挑的算，没跑的天按实际日报算）。只用 deepseek-v4-pro-llm，每天每池 1 次，安全阀默认 US$0.5（这个用途的全部历史回执，调用前查，最后一次可能略超）。
//                  不加 --apply 只列每天池子多大、估花费；加了才调用，并排结果写进容器里的 JSON（路径打在最后一行）。
// 在服务器上：ops 门 `bg myfnb/eval-listwise.ts --apply`，再 `tail <编号>`。
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { REPO_ROOT } from "@aihot/backend/config";
import { addDays } from "@aihot/contracts/time";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { chatJson } from "@aihot/backend/providers/llm";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { modelFor } from "@aihot/backend/editorial/models";

const { values } = parseArgs({ options: {
  apply: { type: "boolean", default: false }, models: { type: "string" }, reps: { type: "string", default: "2" }, "cap-usd": { type: "string", default: "2" }, pools: { type: "string", default: "1,3" },
  shadow: { type: "string" },
} });
const DAYS = ["1019", "1020", "1021", "1022", "1023", "1024"];
const HOLDOUT = new Set(["1019", "1020", "1021", "1024"]);
const PURPOSE = "eval_listwise_daily";
const VERSION = "listwise-2026-10-25";
const MAIN = 12, PER_SOURCE = 2;

const labels = new Map<string, { id: string; kay: boolean }[]>();
for (const d of DAYS) {
  const rows = readFileSync(path.join(REPO_ROOT, `myfnb/labels-2026-10-25-day${d}.tsv`), "utf8").split("\n")
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("article_id")).map((l) => l.split("\t"));
  labels.set(d, rows.map(([id, label]) => ({ id: id!, kay: label === "选进" })));
}
type Pub = { article_id: string; title: string; summary: string | null; source: string; source_id: string; story_id: string | null; t1: boolean; score: string | null; selected: boolean };
const ids = [...labels.values()].flat().map((r) => r.id);
const dayOf = new Map([...labels].flatMap(([d, rs]) => rs.map((r) => [r.id, d] as const)));
const pubs = new Map((await sql<Pub[]>`
  SELECT p.article_id, p.title, p.summary, s.name AS source, p.source_id, p.story_id::text, s.tier = 'T1' AS t1, p.score::text, p.selected
  FROM publications p JOIN sources s ON s.id = p.source_id WHERE p.article_id IN ${sql(ids)}`).map((p) => [p.article_id, p]));

// 打乱：按 article_id 的哈希排，同一来源不扎堆，每次跑顺序相同。
const hash = (id: string) => createHash("sha1").update(id).digest("hex");
const order = (d: string) => labels.get(d)!.filter((r) => pubs.has(r.id))
  .sort((a, b) => createHash("sha1").update(a.id).digest("hex").localeCompare(createHash("sha1").update(b.id).digest("hex")));

const SYSTEM = `你在替 MYFNB 编每天的日报。MYFNB 给全世界说中文、开店或想开店的人看，不偏向任何一个国家；读者一天花几分钟看完，就知道这一行在发生什么，读到能拿回自己店里想一想的东西。
下面是这一天站上进来的全部稿，每条有编号、来源、标题和导读。请从中挑出最该放进当天日报的，最多 12 条，按重要性从高到低排。不够格的不要凑数，宁缺毋滥。
主编最近几天是这样取舍的（是判断的方向，不是死规则）：
- 先放「这一行在怎么变」：品类、品牌、价格、平台、用工、成本这一层的变化，写出了数字、做法或者谁在动。大品牌的新动作、一整类店的数据、平台和政策对一大批店的影响，都在这一类。
- 一家真实的店的经过也要，但一天的名额先给上面那一类。
- 只对一种店、一个场景适用的操作做法（一道菜怎么做、某个节日怎么促销、某款设备怎么用），收银和软件公司写来推自己产品的文章，一般不放。
- 只在一个国家、又没说对店有什么影响的数字或公告（协会活动、评奖、会议通知），一般不放。
- 同一件事有几家在报，只放写得最全的一条。
只输出 JSON：{"picks":[{"n":编号,"why":"一句话"}]}`;
const Schema = z.object({ picks: z.array(z.object({ n: z.number().int(), why: z.string() })) });

// 影子：见文件头 --shadow。和上面的标注评测共用提示词，只换池子和输出。
if (values.shadow) {
  const SHADOW = "eval_listwise_shadow", SHADOW_MODEL = "deepseek-v4-pro-llm";
  const dates = values.shadow.split(",").sort();
  const shadowCap = process.argv.some((a) => a.startsWith("--cap-usd")) ? Number(values["cap-usd"]) : 0.5;
  const pools = values.pools.split(",").map(Number);
  type Daily = { key: string; window_start: Date; window_end: Date; items: { itemId: string; title: string; sourceName: string; summary: string }[] };
  const dailies = new Map((await sql<Daily[]>`
    SELECT key, window_start, window_end,
      coalesce((SELECT jsonb_agg(i) FROM jsonb_array_elements(content->'sections') sec, jsonb_array_elements(sec->'items') i), '[]'::jsonb) AS items
    FROM reports WHERE kind = 'daily' AND key >= ${addDays(dates[0]!, -2)} AND key <= ${dates.at(-1)!}`).map((d) => [d.key, d]));
  type Cand = { article_id: string; title: string; summary: string | null; source: string; story: string };
  const poolOfShadow = async (d: string, pool: number, used: Set<string>, usedStories: Set<string>) => {
    const daily = dailies.get(d);
    if (!daily) return null;
    const start = new Date(daily.window_start.getTime() - (pool - 1) * 86400_000);
    const rows = await sql<Cand[]>`
      SELECT p.article_id, p.title, p.summary, s.name AS source, coalesce(p.story_id::text, p.article_id) AS story
      FROM publications p JOIN sources s ON s.id = p.source_id
      -- 和日报取稿同一条件（packages/backend/src/reports/edition.ts periodReports，dailyScope = pool）：按到达和放出两者里晚的那个归天。
      WHERE p.visibility = 'public' AND p.eligible AND NOT p.backfill
        AND (
          ((p.visible_after IS NULL OR p.visible_after <= p.timeline_at) AND p.timeline_at >= ${start} AND p.timeline_at < ${daily.window_end})
          OR (p.visible_after > p.timeline_at AND p.visible_after >= ${start} AND p.visible_after < ${daily.window_end})
        )
        AND p.timeline_at >= ${start}::timestamptz - interval '24 hours'`;
    return rows.filter((r) => !used.has(r.article_id) && !usedStories.has(r.story)).sort((a, b) => hash(a.article_id).localeCompare(hash(b.article_id)));
  };
  const listOf = (rows: Cand[]) => rows.map((r, i) => `${i + 1}. 【${r.source}】${r.title}\n   ${(r.summary ?? "").replace(/\s+/g, " ")}`).join("\n");
  const shadowSpent = async () => Number((await sql<{ usd: string | null }[]>`
    SELECT sum(coalesce(r.cost, (r.usage->>'prompt_tokens')::numeric / 1e6 * p.input_per_mtok + (r.usage->>'completion_tokens')::numeric / 1e6 * p.output_per_mtok, 0))::text AS usd
    FROM receipt_attempts r JOIN receipts rc ON rc.id = r.receipt_id
    LEFT JOIN LATERAL (SELECT input_per_mtok, output_per_mtok FROM service_prices sp WHERE sp.service = r.service AND sp.model IN (r.model, '') ORDER BY sp.model = '' LIMIT 1) p ON true
    WHERE rc.purpose = ${SHADOW}`)[0]?.usd ?? 0);
  // 3 天池里，没跑影子的前两天按实际日报算「已上过」。
  const usedByDaily = (d: string, used: Set<string>, usedStories: Set<string>, storyOf: Map<string, string>) => {
    for (const it of dailies.get(d)?.items ?? []) { used.add(it.itemId); usedStories.add(storyOf.get(it.itemId) ?? it.itemId); }
  };
  const storyOf = new Map((await sql<{ article_id: string; story: string }[]>`
    SELECT article_id, coalesce(story_id::text, article_id) AS story FROM publications
    WHERE article_id IN ${sql([...dailies.values()].flatMap((d) => d.items.map((i) => i.itemId)).concat(["-"]))}`).map((r) => [r.article_id, r.story]));
  const out: Record<string, unknown> = {};
  console.log(`# 影子：${dates.join("、")}；模型 ${SHADOW_MODEL}，池 ${pools.join("、")} 天，每天每池 1 次；安全阀 US$${shadowCap}（只算 ${SHADOW} 的回执，现在 US$${(await shadowSpent()).toFixed(3)}）`);
  for (const pool of pools) {
    const used = new Set<string>(), usedStories = new Set<string>();
    for (const d of dates) {
      if (pool > 1) for (let k = pool - 1; k >= 1; k--) { const prev = addDays(d, -k); if (!dates.includes(prev)) usedByDaily(prev, used, usedStories, storyOf); }
      const list = await poolOfShadow(d, pool, used, usedStories);
      const day = (out[d] ??= { actual: dailies.get(d)?.items.map((i) => ({ title: i.title, source: i.sourceName, summary: i.summary })) ?? null }) as Record<string, unknown>;
      // 这天没挑成（没有日报、到了安全阀、调用失败），3 天池里后面几天按实际日报算它上过的稿，免得重复出现。
      if (!list) { console.log(`${d} 池${pool}天：库里没有这天的日报，跳过`); usedByDaily(d, used, usedStories, storyOf); continue; }
      const chars = SYSTEM.length + listOf(list).length;
      if (!values.apply) { console.log(`${d} 池${pool}天：${list.length} 条，输入约 ${Math.round(chars / 1.5 / 1000)}k token；实际日报正文 ${dailies.get(d)!.items.length} 条`); continue; }
      if (await shadowSpent() >= shadowCap) { console.log(`# 回执累计到安全阀 US$${shadowCap}，停`); usedByDaily(d, used, usedStories, storyOf); break; }
      try {
        const res = await chatJson({
          model: SHADOW_MODEL, purpose: SHADOW, subject: `${VERSION}:shadow:p${pool}:${d}`, promptVersion: VERSION,
          system: SYSTEM, user: listOf(list), schema: Schema, temperature: 0, maxTokens: 16000, timeoutMs: 300_000,
        });
        await completeReceipt(sql, res.receiptId);
        const picks: { title: string; source: string; summary: string; why: string }[] = [];
        for (const x of res.data.picks) {
          const r = list[x.n - 1];
          if (!r || used.has(r.article_id) || usedStories.has(r.story) || picks.length >= MAIN) continue;
          used.add(r.article_id); usedStories.add(r.story);
          picks.push({ title: r.title, source: r.source, summary: r.summary ?? "", why: x.why });
        }
        day[`pool${pool}`] = picks;
        console.log(`${d} 池${pool}天：池 ${list.length} 条 · 挑 ${picks.length}${res.reused ? "（用已有回执）" : ""}`);
      } catch (e) {
        console.log(`${d} 池${pool}天：调用失败 ${String(e).slice(0, 160)}`);
        usedByDaily(d, used, usedStories, storyOf);
      }
    }
  }
  if (values.apply) {
    const file = path.join(tmpdir(), `listwise-shadow-${dates[0]}-${dates.at(-1)}.json`);
    writeFileSync(file, JSON.stringify(out, null, 1));
    console.log(`# 影子回执合计 US$${(await shadowSpent()).toFixed(3)}\n# 并排结果：${file}`);
  }
  await stopBoss().catch(() => {});
  await closeDb();
  process.exit(0);
}

type Row = { id: string; kay: boolean };
const userOf = (list: Row[]) => list.map((r, i) => {
  const p = pubs.get(r.id)!;
  return `${i + 1}. 【${p.source}】${p.title}\n   ${(p.summary ?? "").replace(/\s+/g, " ")}`;
}).join("\n");

// 现行：站上的分数和入选，按日报规则（edition.ts arrangeDaily 的近似，同 eval-selection-compare.ts）排出的正文。
const currentMain = (d: string) => {
  const rows = order(d).map((r) => ({ ...r, p: pubs.get(r.id)! }));
  const byStory = Map.groupBy(rows, (r) => r.p.story_id ?? r.id);
  const importance = (story: string) => {
    const rs = byStory.get(story)!;
    return Math.max(...rs.filter((r) => r.p.selected).map((r) => Number(r.p.score ?? 0)))
      + 5 * Math.log2(1 + new Set(rs.map((r) => r.p.source_id)).size) + (rs.some((r) => r.p.t1) ? 5 : 0);
  };
  const ranked = rows.filter((r) => r.p.selected).map((r) => ({ ...r, imp: importance(r.p.story_id ?? r.id) }))
    .sort((a, b) => b.imp - a.imp || Number(b.p.score ?? 0) - Number(a.p.score ?? 0) || a.id.localeCompare(b.id));
  const stories = new Set<string>(), perSource = new Map<string, number>(), main: typeof ranked = [];
  for (const e of ranked) {
    const story = e.p.story_id ?? e.id;
    if (main.length >= MAIN || stories.has(story) || (perSource.get(e.p.source_id) ?? 0) >= PER_SOURCE) continue;
    stories.add(story); perSource.set(e.p.source_id, (perSource.get(e.p.source_id) ?? 0) + 1); main.push(e);
  }
  return main;
};

const models = values.models ? values.models.split(",") : [await modelFor("score"), "deepseek-v4-pro-llm"];
const reps = Number(values.reps);
const pools = values.pools.split(",").map(Number);
// 池子：第 i 天加前 pool-1 天，去掉这次已经上过的稿和那件事，按哈希打乱。
const poolOf = (i: number, pool: number, used: Set<string>, usedStories: Set<string>) =>
  DAYS.slice(Math.max(0, i - pool + 1), i + 1).flatMap((d) => labels.get(d)!).filter((r) => pubs.has(r.id) && !used.has(r.id) && !usedStories.has(pubs.get(r.id)!.story_id ?? r.id))
    .sort((a, b) => hash(a.id).localeCompare(hash(b.id)));
const inChars = pools.reduce((n, pool) => n + DAYS.reduce((m, _, i) => m + SYSTEM.length + userOf(poolOf(i, pool, new Set(), new Set())).length, 0), 0);
console.log(`# ${DAYS.length} 天（留出 ${[...HOLDOUT].join("、")}），共 ${ids.length} 条，库里找到 ${pubs.size} 条；模型 ${models.join("、")}，每个 ${reps} 次，候选池 ${pools.join("、")} 天`);
console.log(`# 调用 ${DAYS.length * pools.length * models.length * reps} 次，输入约 ${Math.round(inChars / 1.5 / 1000)}k token × ${models.length * reps}（中文约 1.5 字一个 token，3 天池按没去重算，偏高），安全阀 US$${values["cap-usd"]}`);
console.log("\n# 现行（站上分数按日报规则排出的正文）：天 · Kay 挑了几条 · 正文几条 · 其中 Kay 挑的");
for (const d of DAYS) {
  const main = currentMain(d), kay = labels.get(d)!.filter((r) => r.kay).length;
  console.log(`${d}${HOLDOUT.has(d) ? "（留出）" : ""}: Kay ${kay} · 正文 ${main.length} · 中 ${main.filter((r) => r.kay).length}`);
}
if (!values.apply) { await stopBoss().catch(() => {}); await closeDb(); process.exit(0); }

const usd = sql`coalesce(r.cost, (r.usage->>'prompt_tokens')::numeric / 1e6 * p.input_per_mtok + (r.usage->>'completion_tokens')::numeric / 1e6 * p.output_per_mtok, 0)`;
const price = sql`LEFT JOIN LATERAL (SELECT input_per_mtok, output_per_mtok FROM service_prices sp WHERE sp.service = r.service AND sp.model IN (r.model, '') ORDER BY sp.model = '' LIMIT 1) p ON true`;
const spent = async () => Number((await sql<{ usd: string | null }[]>`
  SELECT sum(${usd})::text AS usd FROM receipt_attempts r JOIN receipts rc ON rc.id = r.receipt_id ${price} WHERE rc.purpose = ${PURPOSE}`)[0]?.usd ?? 0);
const cap = Number(values["cap-usd"]);
const total = new Map<string, { hit: number; picked: number; holdHit: number; holdPicked: number }>();
console.log("\n# 整天一起挑：模型 · 第几次 · 池几天 · 天 · 挑了几条 · 其中 Kay 挑的（K = Kay 挑了，括号里是那条进来的日子）");
for (const m of models) for (let rep = 1; rep <= reps; rep++) for (const pool of pools) {
  const used = new Set<string>(), usedStories = new Set<string>(), key = `${m} #${rep} 池${pool}天`;
  const t = { hit: 0, picked: 0, holdHit: 0, holdPicked: 0 };
  total.set(key, t);
  for (const [i, d] of DAYS.entries()) {
    if (await spent() >= cap) { console.log(`# 回执累计到安全阀 US$${cap}，停`); break; }
    const list = poolOf(i, pool, used, usedStories);
    try {
      const res = await chatJson({
        model: m, purpose: PURPOSE, subject: `${VERSION}:p${pool}:${d}:${rep}`, promptVersion: VERSION,
        system: SYSTEM, user: userOf(list), schema: Schema, temperature: 0, maxTokens: 16000, timeoutMs: 300_000,
      });
      await completeReceipt(sql, res.receiptId);
      const picks: Row[] = [];
      for (const x of res.data.picks) {
        const r = list[x.n - 1];
        if (!r || used.has(r.id) || usedStories.has(pubs.get(r.id)!.story_id ?? r.id) || picks.length >= MAIN) continue;
        used.add(r.id); usedStories.add(pubs.get(r.id)!.story_id ?? r.id); picks.push(r);
        console.log(`  ${r.kay ? "K" : " "} ${pubs.get(r.id)!.title.slice(0, 48)}${pool > 1 ? `（${dayOf.get(r.id)}）` : ""} — ${x.why.slice(0, 36)}`);
      }
      const hit = picks.filter((r) => r.kay).length;
      t.hit += hit; t.picked += picks.length;
      if (HOLDOUT.has(d)) { t.holdHit += hit; t.holdPicked += picks.length; }
      console.log(`${key} ${d}${HOLDOUT.has(d) ? "（留出）" : ""}: 池 ${list.length} 条 · 挑 ${picks.length} · 中 ${hit}${res.reused ? "（用已有回执）" : ""}`);
    } catch (e) {
      console.log(`${key} ${d}: 调用失败 ${String(e).slice(0, 160)}`);
    }
  }
}
const kayAll = DAYS.reduce((n, d) => n + labels.get(d)!.filter((r) => r.kay).length, 0);
const kayHold = [...HOLDOUT].reduce((n, d) => n + labels.get(d)!.filter((r) => r.kay).length, 0);
console.log(`\n# 合计（Kay 六天共挑 ${kayAll} 条，留出四天 ${kayHold} 条）：六天挑了几条中几条 · 其中留出四天`);
for (const [k, t] of total) console.log(`${k}: 挑 ${t.picked} 中 ${t.hit} · 留出 挑 ${t.holdPicked} 中 ${t.holdHit}`);
console.log(`# 这个用途的回执合计 US$${(await spent()).toFixed(3)}`);
await stopBoss().catch(() => {});
await closeDb();
