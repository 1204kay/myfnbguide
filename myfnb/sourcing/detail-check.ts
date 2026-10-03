// Checks a web_list source's detail rule on a few of its article pages with the framework's own fetchDetail:
// the date, title and summary the collector would take from each page (vet-sources.ts reads the listing only).
//   node myfnb/sourcing/detail-check.ts <candidates.json> <source id> <article url> [<article url> ...]
import { readFileSync } from "node:fs";
import { fetchDetail } from "@aihot/backend/sources/web-list";
import type { SourceRow } from "@aihot/backend/sources/types";

const [file, id, ...urls] = process.argv.slice(2);
const { sources } = JSON.parse(readFileSync(file!, "utf8")) as { sources: SourceRow[] };
const source = sources.find((s) => s.id === id);
if (!source) throw new Error(`no source ${id} in ${file}`);
const d = source.config.detail ?? {};
for (const url of urls) {
  const got = await fetchDetail(url, { ...source, enabled: true, cursor: null, fail_count: 0 }, {
    date: true, title: !!(d.titleSelector || d.titleRegex), summary: !!d.summarySelector, body: true,
  });
  console.log(`${got.publishedAt?.toISOString() ?? "no date"} | ${got.title ?? "-"} | body ${got.body?.text.length ?? 0} chars | ${url}`);
}
