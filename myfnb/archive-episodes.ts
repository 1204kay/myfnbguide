// Lists every episode of the named podcast sources as the engine's own RSS reader sees them (the same URL the archive
// import would store), with the title, date and the start of the notes: the input for choosing which episodes are
// worth taking in before any model is paid (myfnb/HANDOFF.md §9.2 item 4). No model, no database.
//   node myfnb/archive-episodes.ts <out.json> <source id> [...]
import { readFileSync, writeFileSync } from "node:fs";
import { fetchRss } from "@aihot/backend/sources/rss";
import { admitListing } from "@aihot/backend/sources/filters";
import type { SourceRow } from "@aihot/backend/sources/types";

const [out, ...ids] = process.argv.slice(2);
if (!out || !ids.length) throw new Error("usage: node myfnb/archive-episodes.ts <out.json> <source id> [...]");
const { sources } = JSON.parse(readFileSync(new URL("../industry/sources.json", import.meta.url), "utf8")) as { sources: Array<Omit<SourceRow, "enabled" | "cursor" | "fail_count">> };
const result: Record<string, Array<{ url: string; title: string; date: string | null; notes: string }>> = {};
for (const id of ids) {
  const s = sources.find((x) => x.id === id);
  if (!s) throw new Error(`no source ${id}`);
  const row = { ...s, enabled: true, cursor: null, fail_count: 0 } as SourceRow;
  const read = await fetchRss(row, { force: true });
  result[id] = admitListing(read.candidates, row).map((c) => ({
    url: c.url, title: c.title, date: c.publishedAt?.toISOString().slice(0, 10) ?? null,
    notes: (c.excerpt ?? "").replace(/\s+/g, " ").trim().slice(0, 500),
  }));
  console.log(id, result[id]!.length);
}
writeFileSync(out, JSON.stringify(result, null, 1));
process.exit(0);
