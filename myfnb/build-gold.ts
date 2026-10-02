// Builds the gold file for scripts/eval-selection.ts from the labels kept in the repo. The labels file holds
// only article ids and the user's decisions (no source text: that stays out of git); this reads each
// article's title, body and source from the database. 必看 = select, 不看 = reject, 可看 = either.
// Run on the server, then evaluate in the same container (.data is not in the image):
//   sudo docker compose exec -T worker sh -c "node myfnb/build-gold.ts && node scripts/eval-selection.ts --gold .data/gold.jsonl --n 500"
//   node myfnb/build-gold.ts [labels.tsv] [out.jsonl]   (defaults: myfnb/gold-labels.tsv, .data/gold.jsonl)
// labels.tsv columns: article_id, label (必看/可看/不看), split (development/holdout), stratum.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "@aihot/backend/config";
import { closeDb, sql } from "@aihot/backend/db";

const [inp = "myfnb/gold-labels.tsv", outp = ".data/gold.jsonl"] = process.argv.slice(2);
const DECISION: Record<string, "select" | "reject" | "either"> = { 必看: "select", 不看: "reject", 可看: "either" };

const labels = readFileSync(path.resolve(REPO_ROOT, inp), "utf8").split(/\r?\n/)
  .filter((l) => l.trim() && !l.startsWith("#") && !l.startsWith("article_id\t"))
  .map((l) => { const [id, label, split, stratum] = l.split("\t"); return { id: id!, label: label!, split: split || "development", stratum: stratum || "" }; });
const bad = labels.filter((r) => !DECISION[r.label]);
if (bad.length) throw new Error(`unknown labels: ${bad.map((r) => `${r.id}=${r.label}`).join(", ")}`);

const rows = await sql<{ id: string; title: string; language: string | null; published_at: Date | null; body_text: string | null; excerpt: string | null; source_name: string; kind: string; tier: string; first_party: boolean }[]>`
  SELECT a.id, a.title, a.language, a.published_at, a.body_text, a.excerpt, s.name AS source_name, s.kind, s.tier, s.first_party
  FROM articles a JOIN sources s ON s.id = a.source_id
  WHERE a.id IN ${sql(labels.length ? labels.map((r) => r.id) : [""])}`;
const byId = new Map(rows.map((r) => [r.id, r]));

const out: string[] = [];
const missing: string[] = [];
for (const r of labels) {
  const a = byId.get(r.id);
  if (!a) { missing.push(r.id); continue; }
  out.push(JSON.stringify({
    caseId: a.id,
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
if (missing.length) console.log(`not in the database (skipped): ${missing.length} — ${missing.join(" ")}`);
await closeDb();
