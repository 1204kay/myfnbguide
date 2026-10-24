// A candidate score prompt (myfnb/selection-score-candidate.md, written when a new one is tried; 10/16's went live) beside the site's (industry/prompts/selection-score.md),
// on the items the user labelled, each scored twice like the score step of editorial/analyze.ts on its current material.
// Nothing on the site changes and nothing is written under .data, so it runs without -u root through the ops gate.
// The site's half reuses the receipts of the live scoring wherever the material is unchanged, so it is mostly free.
//   Labels: myfnb/labels-2026-10-16.tsv (this round, the user's current taste) and myfnb/gold-labels.tsv (earlier rounds;
//   a case relabelled this round is taken from this round). Feed-labelled rows are found by url if collected since.
//   myfnb/labels-2026-10-23.tsv (round "five"): items the 10-23 standard (五个理由, 决定记录 2026-10-23) takes in (可看)
//   or still keeps out (不看), each checked against its original.
//   myfnb/labels-2026-10-24-capital.tsv (round "capital"): every report of one week on results, listings, funding, revenue
//   goals and franchise deals, for the capital rule (十一 10-24): 可看 where it shows one shop's numbers or what carried the
//   results, 不看 where only the totals, the deal or the funding.
//   myfnb/labels-2026-10-24-country.tsv (round "country"): one week's reports on one country's rules, government measures and
//   lobbying, and service companies' how-tos, for the single-country rule and vendors' compliance guides (十一 10-24).
//   myfnb/labels-2026-10-25-real.tsv (round "real"): the two blind checks of the source trial (十一 10-24), labelled by 十一's
//   three rules (十一 10-25, Kay「你和十一讨论」). Not in the database: each is read from its feed as myfnb/trial-sources.ts
//   reads it (same id, so the site's half reuses the trial's receipts), or from its page when the feed has moved on.
//   node myfnb/eval-score-candidate.ts [--rounds five,new,old,capital,country,real] [--small] [--max-calls 1200] [--concurrency 6]
//   On the server, the --small run on the branch eval/score-candidate is myfnb/eval-score-run.sh (allowed on Kay's PC as one fixed command).
//   --small (十一 10-24, DeepSeek nearly spent): round five whole, the first 15 必看 of round new (10-16 has only one 不看) and
//   the first 15 不看 of round old, rounds capital, country and real whole. Each side is scored twice and the two averaged, as the site's selection rule does
//   (industry/selection.ts): one score a side swung across 46 where the site's two would not (打分稳不稳, 手册 2026-10-24).
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { createHash } from "node:crypto";
import { REPO_ROOT } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { buildScoreInput, loadAnalyzeInput, PROMPT_VERSIONS, SCORE_SYSTEM, ScoreSchema, type AnalyzeInputArticle } from "@aihot/backend/editorial/analyze";
import { modelFor } from "@aihot/backend/editorial/models";
import { promptFromText } from "@aihot/backend/editorial/prompts";
import { chatJson } from "@aihot/backend/providers/llm";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { fetchRss } from "@aihot/backend/sources/rss";
import { extractFromUrl, pageFetchable } from "@aihot/backend/content/extract";

const { values } = parseArgs({ options: { rounds: { type: "string", default: "five,new,old,capital,country,real" }, small: { type: "boolean", default: false }, "max-calls": { type: "string", default: "1200" }, concurrency: { type: "string", default: "6" } } });
const ROUNDS = ["five", "new", "old", "capital", "country", "real"] as const;
const rounds = new Set(values.rounds.split(","));

type Row = { id: string; label: string; round: (typeof ROUNDS)[number]; url: string };
function readLabels(file: string, round: Row["round"]): Row[] {
  return readFileSync(path.resolve(REPO_ROOT, file), "utf8").split(/\r?\n/)
    .filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("article_id\t"))
    .map((l) => { const c = l.split("\t"); return { id: c[0]!, label: c[1]!, round, url: c[4] ? c[5] ?? "" : "" }; });
}
const five = readLabels("myfnb/labels-2026-10-23.tsv", "five");
const firstOf = (rs: Row[], label: string) => rs.filter((r) => r.label === label).slice(0, 15);
const all16 = readLabels("myfnb/labels-2026-10-16.tsv", "new");
const seen = new Set(all16.map((r) => r.id));
const capital = readLabels("myfnb/labels-2026-10-24-capital.tsv", "capital");
const country = readLabels("myfnb/labels-2026-10-24-country.tsv", "country");
// Three of Kay's 10-02 labels are in rounds capital and country too; they count there only.
for (const r of [...capital, ...country]) seen.add(r.id);
const gold = readLabels("myfnb/gold-labels.tsv", "old").filter((r) => !seen.has(r.id));
const rows = (values.small ? [...five, ...firstOf(all16, "必看"), ...firstOf(gold, "不看"), ...capital, ...country] : [...five, ...all16, ...gold, ...capital, ...country]).filter((r) => rounds.has(r.round));

// Feed-labelled cases (r2-…, r3-…) are articles only if the source has collected that url since.
const urls = rows.filter((r) => r.url).map((r) => r.url);
const byUrl = new Map((urls.length ? await sql<{ id: string; url: string }[]>`SELECT id, url FROM articles WHERE url IN ${sql(urls)}` : [])
  .map((a) => [a.url, a.id]));
const cases: Array<Row & { a: AnalyzeInputArticle }> = [];
let missing = 0;
for (const r of rows) {
  const id = r.url ? byUrl.get(r.url) : r.id;
  const a = id ? await loadAnalyzeInput(id) : null;
  if (a) cases.push({ ...r, a }); else missing++;
}
// Round real: key, label, feed name, feed url, item url, title.
const real = rounds.has("real") ? readFileSync(path.join(REPO_ROOT, "myfnb/labels-2026-10-25-real.tsv"), "utf8").split(/\r?\n/)
  .filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("key\t")).map((l) => l.split("\t")) : [];
const feeds = new Map<string, Awaited<ReturnType<typeof fetchRss>>["candidates"]>();
for (const [key, label, feed, feedUrl, url, title] of real) {
  if (!feeds.has(feedUrl!)) {
    const source = { id: "trial-eval", name: feed!, kind: "rss", config: { feedUrl }, tier: "T2", participation_mode: "editorial",
      first_party: false, interval_minutes: 720, enabled: true, cursor: null, fail_count: 0 } as const;
    feeds.set(feedUrl!, await fetchRss(source as never, { force: true }).then((r) => r.candidates).catch(() => []));
  }
  const c = feeds.get(feedUrl!)!.find((x) => x.url === url);
  let body = c?.bodyText ?? null;
  if (!body && pageFetchable(url!, "rss")) body = (await extractFromUrl(url!, `trial:${url}`, {}, { paidFallback: false }).catch(() => null))?.text ?? null;
  if (!c && !body) { missing++; continue; }
  const a: AnalyzeInputArticle = {
    id: `trial-src-${createHash("sha256").update(url!).digest("hex").slice(0, 16)}`, revision: 1, title: c?.title ?? title!, url: url!,
    author: c?.author ?? null, publishedAt: c?.publishedAt ?? null, publicationTime: c?.publicationTime ?? null, bodyText: body,
    excerpt: c?.excerpt ?? null, bodyStatus: body ? "ok" : "unconfirmed", xPost: null, media: [],
    source: { name: feed!, kind: "rss", tier: "T2", firstParty: false },
  };
  cases.push({ id: key!, label: label!, round: "real", url: url!, a });
}
// myfnb/eval-only.json, when it is in the checkout, narrows the run to a few cases by title and scores each of them
// `times` times a side, every score printed (#67 第 3 次评测, 十一 10-24: one case 1 point over the line, scored once a side).
// A file, not a flag, so the command allowed on Kay's computer stays word for word the same.
const only = existsSync(path.join(REPO_ROOT, "myfnb/eval-only.json"))
  ? JSON.parse(readFileSync(path.join(REPO_ROOT, "myfnb/eval-only.json"), "utf8")) as { titles: string[]; times: number } : null;
if (only) cases.splice(0, cases.length, ...cases.filter((c) => only.titles.some((t) => c.a.title.includes(t))));
const times = only ? only.times : 2;
const most = cases.length * 2 * times;
console.log(`# ${cases.length} cases (${ROUNDS.map((r) => `${r} ${cases.filter((c) => c.round === r).length}`).join(", ")}), ${missing} not in the database · at most ${most} calls`);
if (most > Number(values["max-calls"])) throw new Error(`at most ${most} calls, over --max-calls ${values["max-calls"]}: none sent`);

const CANDIDATE_TEXT = readFileSync(path.join(REPO_ROOT, "myfnb/selection-score-candidate.md"), "utf8");
const CANDIDATE = promptFromText("selection-score-candidate", CANDIDATE_TEXT);
const CANDIDATE_VERSION = `selection-score-candidate@${createHash("sha256").update(CANDIDATE_TEXT).digest("hex").slice(0, 10)}`;
const model = await modelFor("score");

// Two calls in a row, as the score step makes them (analyze.ts runScores); the site's prompt with the step's own
// request identity, so an unchanged material reuses the live receipts.
async function score(a: AnalyzeInputArticle, system: string, version: string, tag: string): Promise<number | null> {
  let sum = 0;
  for (let i = 1; i <= times; i++) {
    const res = await chatJson({
      model, purpose: "score_article", subject: `article:${a.id}@${a.revision}`, promptVersion: version, system, user: buildScoreInput(a),
      schema: ScoreSchema, temperature: 0.2, maxTokens: 1024, timeoutMs: 120_000, attemptTag: `${tag}score-${i}`,
    });
    await completeReceipt(sql, res.receiptId);
    sum += res.data.attentionScore;
    if (only) console.log(`  ${tag || "site:"} ${i} ${res.data.attentionScore} | ${a.title.slice(0, 40)}`);
  }
  return sum / times;
}

const out: Array<{ c: (typeof cases)[number]; cur: number | null; cand: number | null }> = new Array(cases.length);
let next = 0;
await Promise.all(Array.from({ length: Number(values.concurrency) }, async () => {
  while (next < cases.length) {
    const i = next++;
    const c = cases[i]!;
    const safe = (p: Promise<number | null>) => p.catch((e) => { console.log(`! ${c.id} ${String(e).slice(0, 100)}`); return null; });
    out[i] = { c, cur: await safe(score(c.a, SCORE_SYSTEM, PROMPT_VERSIONS.score, "")), cand: await safe(score(c.a, CANDIDATE, CANDIDATE_VERSION, "candidate:")) };
  }
}));

const auc = (hi: number[], lo: number[]) => hi.length && lo.length
  ? (hi.reduce((n, x) => n + lo.reduce((m, y) => m + (x > y ? 1 : x === y ? 0.5 : 0), 0), 0) / (hi.length * lo.length)).toFixed(3) : "-";
for (const round of ROUNDS) {
  const set = out.filter((x) => x.c.round === round);
  for (const which of ["cur", "cand"] as const) {
    const s = (label: string) => set.filter((x) => x.c.label === label && x[which] !== null).map((x) => x[which]!);
    console.log(`== ${round} ${which}: 必看 ${s("必看").length} 可看 ${s("可看").length} 不看 ${s("不看").length} · AUC 必看>可看 ${auc(s("必看"), s("可看"))} 必看>不看 ${auc(s("必看"), s("不看"))} 可看>不看 ${auc(s("可看"), s("不看"))}`);
    const line = [];
    for (let t = 30; t <= 70; t += 4) line.push(`${t}:${["必看", "可看", "不看"].map((l) => s(l).filter((v) => v >= t).length).join("/")}`);
    console.log(`   入选 必看/可看/不看 ${line.join("  ")}`);
  }
}
console.log("# label | site | candidate | title");
// Round old is long, so only the ones the candidate would let in (34 and up) are listed.
for (const x of out.filter((x) => x.c.round !== "old" || (x.cand ?? 0) >= 34).sort((p, q) => (q.cand ?? -1) - (p.cand ?? -1))) {
  console.log(`${x.c.round} ${x.c.label} | ${x.cur ?? "-"} | ${x.cand ?? "-"} | ${x.c.a.title.slice(0, 50).replace(/\s+/g, " ")}`);
}
await closeDb();
