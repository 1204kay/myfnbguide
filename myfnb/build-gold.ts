// Builds the gold file for scripts/eval-selection.ts from the labels kept in the repo. The labels file holds
// only ids, titles and the user's decisions (no source text: that stays out of git); this reads each item's
// title, body and source where it can. 必看 = select, 不看 = reject, 可看 = either.
// Run on the server, then evaluate in the same container (.data is not in the image):
//   sudo docker compose exec -T worker sh -c "node myfnb/build-gold.ts && node scripts/eval-selection.ts --gold .data/gold.jsonl --n 500"
//   node myfnb/build-gold.ts [labels.tsv] [out.jsonl]   (defaults: myfnb/gold-labels.tsv, .data/gold.jsonl)
// labels.tsv columns: article_id, label (必看/可看/不看), split (development/holdout), stratum[, source_id, url, title].
// A row with a source_id was labelled straight from its source's feed (round 2, 2026-10-03): most such items were
// never collected (sources only bring in 2–3 old items), so the item comes from the database if it was collected
// since, else from the source's feed, else from its page.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "@aihot/backend/config";
import { extractFromUrl } from "@aihot/backend/content/extract";
import { closeDb, sql } from "@aihot/backend/db";
import { fetchJsonList } from "@aihot/backend/sources/json-list";
import { fetchRss } from "@aihot/backend/sources/rss";
import type { Candidate, SourceRow } from "@aihot/backend/sources/types";
import { fetchWebList } from "@aihot/backend/sources/web-list";

const [inp = "myfnb/gold-labels.tsv", outp = ".data/gold.jsonl"] = process.argv.slice(2);
const DECISION: Record<string, "select" | "reject" | "either"> = { 必看: "select", 不看: "reject", 可看: "either" };

const labels = readFileSync(path.resolve(REPO_ROOT, inp), "utf8").split(/\r?\n/)
  .filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("article_id\t"))
  .map((l) => {
    const [id, label, split, stratum, source, url, title] = l.split("\t");
    return { id: id!, label: label!, split: split || "development", stratum: stratum || "", source: source || "", url: url || "", title: title || "" };
  });
const bad = labels.filter((r) => !DECISION[r.label]);
if (bad.length) throw new Error(`unknown labels: ${bad.map((r) => `${r.id}=${r.label}`).join(", ")}`);

type Item = { id: string; title: string; language: string | null; published_at: Date | null; body_text: string | null; excerpt: string | null; source_name: string; kind: string; tier: string; first_party: boolean };
const fromDb = labels.filter((r) => !r.source).map((r) => r.id);
const rows = await sql<Item[]>`
  SELECT a.id, a.title, a.language, a.published_at, a.body_text, a.excerpt, s.name AS source_name, s.kind, s.tier, s.first_party
  FROM articles a JOIN sources s ON s.id = a.source_id
  WHERE a.id IN ${sql(fromDb.length ? fromDb : [""])}`;
const byId = new Map(rows.map((r) => [r.id, r]));

const fromFeeds = labels.filter((r) => r.source);
if (fromFeeds.length) {
  const collected = await sql<(Item & { url: string; source_id: string })[]>`
    SELECT a.id, a.url, a.source_id, a.title, a.language, a.published_at, a.body_text, a.excerpt, s.name AS source_name, s.kind, s.tier, s.first_party
    FROM articles a JOIN sources s ON s.id = a.source_id
    WHERE a.url IN ${sql(fromFeeds.map((r) => r.url))}`;
  const sources = await sql<SourceRow[]>`SELECT * FROM sources WHERE id IN ${sql([...new Set(fromFeeds.map((r) => r.source))])}`;
  for (const s of sources) {
    const mine = fromFeeds.filter((r) => r.source === s.id);
    const done = new Map(collected.filter((a) => a.source_id === s.id).map((a) => [a.url, a]));
    let found: Candidate[] = [];
    if (mine.some((r) => !done.has(r.url))) {
      try {
        const row = { ...s, cursor: null };
        found = s.kind === "rss" ? (await fetchRss(row, { force: true })).candidates
          : s.kind === "web_list" ? await fetchWebList(row)
          : s.kind === "json_list" ? await fetchJsonList(row)
          : [];
      } catch (e) {
        console.log(`${s.id}: ${String((e as Error).message ?? e).slice(0, 120)}`);
      }
    }
    for (const r of mine) {
      const a = done.get(r.url);
      if (a) { byId.set(r.id, a); continue; }
      const c = found.find((x) => x.url === r.url);
      let body = c?.bodyText || null;
      if (!body && /^https?:\/\//.test(r.url)) body = (await extractFromUrl(r.url, { allowJina: false, subject: "gold" }))?.text ?? null;
      if (!c && !body) continue;
      byId.set(r.id, {
        id: r.id, title: c?.title || r.title, language: c?.language ?? null, published_at: c?.publishedAt ?? null,
        body_text: body, excerpt: c?.excerpt ?? null, source_name: s.name, kind: s.kind, tier: s.tier, first_party: s.first_party,
      });
    }
  }
}

const out: string[] = [];
const missing: string[] = [];
for (const r of labels) {
  const a = byId.get(r.id);
  if (!a) { missing.push(r.id); continue; }
  out.push(JSON.stringify({
    caseId: r.id,
    material: { title: a.title, originalTitle: null, publishedAt: a.published_at?.toISOString() ?? null, sourceName: a.source_name, bodyZh: null, bodyOriginal: a.body_text || a.excerpt || null },
    sourceFacts: { sourceKind: a.kind, sourceTier: a.tier, firstParty: a.first_party, language: a.language },
    samplingContext: { benchmarkSplit: r.split, samplingStratum: r.stratum || r.label },
    gold: { decision: DECISION[r.label] },
  }));
}
const target = path.resolve(REPO_ROOT, outp);
mkdirSync(path.dirname(target), { recursive: true });
writeFileSync(target, out.join("\n") + "\n");
const count = (d: string) => labels.filter((r) => DECISION[r.label] === d && byId.has(r.id)).length;
console.log(`gold: ${out.length} cases (select ${count("select")}, reject ${count("reject")}, either ${count("either")}) -> ${outp}`);
if (missing.length) console.log(`not found (skipped): ${missing.length} — ${missing.join(" ")}`);
await closeDb();
