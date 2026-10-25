// Writes the labelled samples as the gold set of the framework's own evaluation (scripts/eval-selection.ts,
// docs/selection.md「校准」), so a score prompt is checked the way the original checks one, wrong cases and the
// model's reasons in SelectBench (十一 10-25). The file holds originals' text, so it goes where it is told
// (on the server a temporary folder, deleted after the run), never into the repository.
//   node myfnb/build-gold-rounds.ts <out.jsonl>
// Development: the rounds the score prompt has been tuned on —
//   five      myfnb/labels-2026-10-23.tsv          可看 select · 不看 reject
//   new       myfnb/labels-2026-10-16.tsv, the first 15 必看 (select)
//   old       myfnb/gold-labels.tsv, the first 15 不看 (reject)
//   capital   myfnb/labels-2026-10-24-capital.tsv  可看 select · 不看 reject
//   country   myfnb/labels-2026-10-24-country.tsv  可看 select · 不看 reject
//   kay3      myfnb/labels-2026-10-25-kay3.tsv     40 site items of 10-18..24 near the line, Kay's 10-25 grades
//   kay4      myfnb/labels-2026-10-25-kay4.tsv     40 site items of 10-18..25 scored 10–41, Kay's 10-25 grades
//   real      myfnb/labels-2026-10-25-real.tsv     the source trial's two blind checks, Kay's 10-25 grades; not in the database
// Holdout: myfnb/labels-2026-10-25-holdout.tsv, 30 the prompt was never tuned on, for the last check only.
// Rows not in the database (real, holdout, feed-labelled r2-…) are read from their feed as myfnb/trial-sources.ts
// reads them, or from the page when the feed has moved on; one that can be read neither way is counted and left out.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";
import { loadAnalyzeInput, type AnalyzeInputArticle } from "@aihot/backend/editorial/analyze";
import { fetchRss } from "@aihot/backend/sources/rss";
import { extractFromUrl, pageFetchable } from "@aihot/backend/content/extract";

const out = process.argv[2];
if (!out) throw new Error("usage: node myfnb/build-gold-rounds.ts <out.jsonl>");

const lines = (file: string) => readFileSync(path.join(REPO_ROOT, file), "utf8").split(/\r?\n/)
  .filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("article_id\t") && !l.startsWith("key\t")).map((l) => l.split("\t"));
type Decision = "select" | "reject" | "either";
type Case = { key: string; decision: Decision; stratum: string; split: "development" | "holdout"; id?: string; url?: string; feed?: [string, string]; title?: string };
const yes = (label: string): Decision => (label === "可看" || label === "必看" ? "select" : "reject");
// real is labelled by Kay in three grades (10-25): 必看 select, 可看 either, 不看 reject.
const graded = (label: string): Decision => (label === "必看" ? "select" : label === "可看" ? "either" : "reject");

const labelled = (file: string, stratum: string, decide: (label: string) => Decision | null): Case[] =>
  lines(file).flatMap(([id, label, , , , url]) => {
    const decision = decide(label!);
    return decision ? [{ key: id!, decision, stratum, split: "development" as const, id: url ? undefined : id, url: url || undefined }] : [];
  });
const capital = labelled("myfnb/labels-2026-10-24-capital.tsv", "capital", yes);
const country = labelled("myfnb/labels-2026-10-24-country.tsv", "country", yes);
// Three of Kay's 10-02 labels are in rounds capital and country too; they count there only.
const taken = new Set([...capital, ...country].map((c) => c.key));
const cases: Case[] = [
  ...labelled("myfnb/labels-2026-10-23.tsv", "five", yes),
  ...labelled("myfnb/labels-2026-10-16.tsv", "new", (l) => (l === "必看" ? "select" : null)).slice(0, 15),
  ...labelled("myfnb/gold-labels.tsv", "old", (l) => (l === "不看" ? "reject" : null)).filter((c) => !taken.has(c.key)).slice(0, 15),
  ...capital,
  ...country,
  ...labelled("myfnb/labels-2026-10-25-kay3.tsv", "kay3", graded),
  ...labelled("myfnb/labels-2026-10-25-kay4.tsv", "kay4", graded),
  ...lines("myfnb/labels-2026-10-25-real.tsv").map(([key, label, feed, feedUrl, url, title]) =>
    ({ key: key!, decision: graded(label!), stratum: "real", split: "development" as const, url, feed: [feed!, feedUrl!] as [string, string], title })),
  // thin: Kay saw no content for it (the original would not open, or only a one-line blurb), so its 不进 is not his taste.
  ...lines("myfnb/labels-2026-10-25-holdout.tsv").map(([key, label, feed, feedUrl, url, title, thin]) =>
    ({ key: key!, decision: label as Decision, stratum: thin ? "holdout-thin" : "holdout", split: "holdout" as const, url, feed: [feed!, feedUrl!] as [string, string], title })),
];

const byUrl = new Map((await sql<{ id: string; url: string }[]>`SELECT id, url FROM articles WHERE url IN ${sql(cases.flatMap((c) => c.url ?? []))}`)
  .map((a) => [a.url, a.id]));
const feeds = new Map<string, Awaited<ReturnType<typeof fetchRss>>["candidates"]>();
async function fromFeed(c: Case): Promise<AnalyzeInputArticle | null> {
  if (!c.feed || !c.url) return null;
  const [name, feedUrl] = c.feed;
  if (!feeds.has(feedUrl)) {
    const source = { id: "gold", name, kind: "rss", config: { feedUrl }, tier: "T2", participation_mode: "editorial",
      first_party: false, interval_minutes: 720, enabled: true, cursor: null, fail_count: 0 };
    feeds.set(feedUrl, await fetchRss(source as never, { force: true }).then((r) => r.candidates).catch(() => []));
  }
  const item = feeds.get(feedUrl)!.find((x) => x.url === c.url);
  let body = item?.bodyText ?? null;
  if (!body && pageFetchable(c.url, "rss")) body = (await extractFromUrl(c.url, `gold:${c.url}`, {}, { paidFallback: false }).catch(() => null))?.text ?? null;
  if (!item && !body) return null;
  return {
    id: c.key, revision: 1, title: item?.title ?? c.title!, url: c.url, author: null, publishedAt: item?.publishedAt ?? null,
    publicationTime: null, bodyText: body, excerpt: item?.excerpt ?? null, bodyStatus: body ? "ok" : "unconfirmed", xPost: null, media: [],
    source: { name, kind: "rss", tier: "T2", firstParty: false },
  };
}

const rows: string[] = [];
const missing: string[] = [];
for (const c of cases) {
  const id = c.id ?? (c.url ? byUrl.get(c.url) : undefined);
  const a = (id ? await loadAnalyzeInput(id) : null) ?? (await fromFeed(c));
  if (!a) { missing.push(`${c.stratum} ${c.key}`); continue; }
  rows.push(JSON.stringify({
    caseId: `${c.stratum}-${c.key}`,
    material: { title: a.title, originalTitle: null, publishedAt: a.publishedAt?.toISOString() ?? null, sourceName: a.source.name,
      bodyZh: null, bodyOriginal: a.bodyText ?? a.excerpt ?? null },
    sourceFacts: { sourceKind: a.source.kind, sourceTier: a.source.tier, firstParty: a.source.firstParty, language: null },
    samplingContext: { benchmarkSplit: c.split, samplingStratum: c.stratum },
    gold: { decision: c.decision },
  }));
}
writeFileSync(out, `${rows.join("\n")}\n`);
console.log(`# gold: ${rows.length} cases (${[...new Set(cases.map((c) => c.stratum))].map((s) => `${s} ${rows.filter((r) => r.includes(`"samplingStratum":"${s}"`)).length}`).join(", ")}), ${missing.length} not found${missing.length ? `: ${missing.join(", ")}` : ""}`);
await closeDb();
