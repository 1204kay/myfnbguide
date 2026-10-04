// Trial-fetches candidate sources with the framework's own collectors, before they go into
// industry/sources.json: does the feed or listing parse, how many items a day after the source's own
// filters, how fresh, and the newest titles to judge relevance by. Same file shape as sources.json
// ({ "sources": [...] }), so an accepted entry is copied over unchanged. The source rules (robots.txt,
// AI reading) are checked separately: node myfnb/check-sources.mjs <same file>.
//   node myfnb/vet-sources.ts <candidates.json> [--out report.json] [--titles 8]
import { readFileSync, writeFileSync } from "node:fs";
import { fetchRss } from "@aihot/backend/sources/rss";
import { fetchWebList } from "@aihot/backend/sources/web-list";
import { fetchJsonList } from "@aihot/backend/sources/json-list";
import { admitListing } from "@aihot/backend/sources/filters";
import { unsupportedConfig } from "@aihot/backend/sources/config-keys";
import type { Candidate, SourceRow } from "@aihot/backend/sources/types";

const args = process.argv.slice(2);
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
const out = opt("--out");
const titles = Number(opt("--titles") ?? 8);
const { sources } = JSON.parse(readFileSync(args[0]!, "utf8")) as { sources: Array<Omit<SourceRow, "enabled" | "cursor" | "fail_count">> };

const DAY = 86400000;
interface Result { id: string; name: string; ok: boolean; error?: string; items: number; perDay: number; newestDays: number | null; titles: string[] }

async function vet(s: Omit<SourceRow, "enabled" | "cursor" | "fail_count">): Promise<Result> {
  const row: SourceRow = { ...s, enabled: true, cursor: null, fail_count: 0 };
  const base = { id: s.id, name: s.name, items: 0, perDay: 0, newestDays: null, titles: [] };
  const bad = unsupportedConfig(row.kind, row.config);
  if (bad.length) return { ...base, ok: false, error: `unsupported config: ${bad.join(", ")}` };
  let found: Candidate[];
  try {
    found = row.kind === "rss" ? (await fetchRss(row, { force: true })).candidates
      : row.kind === "web_list" ? await fetchWebList(row)
      : row.kind === "json_list" ? await fetchJsonList(row)
      : [];
  } catch (e) {
    return { ...base, ok: false, error: String((e as Error).message ?? e).slice(0, 160) };
  }
  const kept = [...new Map(admitListing(found, row).map((c) => [c.url, c])).values()];
  const now = Date.now();
  const dated = kept.map((c) => c.publishedAt?.getTime()).filter((t): t is number => !!t && t <= now + DAY).sort((a, b) => b - a);
  // Items a day: over the last week when the listing reaches further back, else over what it spans.
  const week = dated.filter((t) => t > now - 7 * DAY).length;
  const span = dated.length ? Math.max((now - dated.at(-1)!) / DAY, 1) : 0;
  const perDay = !dated.length ? 0 : dated.at(-1)! < now - 7 * DAY ? week / 7 : dated.length / span;
  const newest = [...kept].sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0));
  return {
    ...base, ok: true, items: kept.length, perDay: Math.round(perDay * 10) / 10,
    newestDays: dated.length ? Math.round(((now - dated[0]!) / DAY) * 10) / 10 : null,
    titles: newest.slice(0, titles).map((c) => `${c.publishedAt?.toISOString().slice(0, 10) ?? "----------"} ${c.title}${c.categories?.length ? `  [${c.categories.slice(0, 3).join(" / ")}]` : ""}`),
  };
}

const results: Result[] = [];
let next = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < sources.length) {
    const s = sources[next++]!;
    const r = await vet(s);
    results.push(r);
    const head = r.ok ? `✓ ${r.id}  ${r.perDay}/天  最新 ${r.newestDays ?? "?"} 天前  ${r.items} 条` : `✗ ${r.id}  ${r.error}`;
    console.log([head, ...r.titles.map((t) => `    ${t}`)].join("\n"));
  }
}));
if (out) writeFileSync(out, JSON.stringify(results.sort((a, b) => a.id.localeCompare(b.id)), null, 1));
const ok = results.filter((r) => r.ok);
console.log(`\n${ok.length}/${results.length} 抓取成功，合计每天约 ${Math.round(ok.reduce((n, r) => n + r.perDay, 0))} 条（过滤后）`);
process.exit(0);
