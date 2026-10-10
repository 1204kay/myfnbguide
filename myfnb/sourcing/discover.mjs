// Finds a feed for each candidate site: <link rel=alternate> on the given page, else common feed paths.
// Input lines: id|name|url|tags(comma)|tier   Output: candidates JSON in sources.json shape.
//   node myfnb/sourcing/discover.mjs in.txt out.json   (no feed found: out.miss.txt, then try discover2.mjs)
import { readFileSync, writeFileSync } from "node:fs";
import { get } from "./polite.mjs";
const [inp, outp] = process.argv.slice(2);
const rows = readFileSync(inp, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => {
  const [id, name, url, tags, tier] = l.split("|").map((x) => x.trim());
  return { id, name, url, tags: (tags || "").split(",").map((t) => t.trim()).filter(Boolean), tier: tier || "T2" };
});
const isFeed = (t) => /<(rss|feed|rdf:RDF)[\s>]/i.test(t.slice(0, 3000)) && /<(item|entry)[\s>]/i.test(t);
const count = (t) => (t.match(/<(item|entry)[\s>]/gi) || []).length;
async function discover(row) {
  if (/\/(feed|rss)|\.xml|\.rss|rss\b/i.test(new URL(row.url).pathname + new URL(row.url).search)) {
    const f = await get(row.url);
    if (f.status === 200 && isFeed(f.text)) return { feed: f.url, items: count(f.text), how: "given" };
    return { error: `given feed ${f.status}${f.err ? " " + f.err : ""}` };
  }
  const page = await get(row.url);
  const found = [];
  if (page.text) {
    for (const m of page.text.matchAll(/<link\b[^>]*>/gi)) {
      const tag = m[0];
      if (/rel=["']?alternate/i.test(tag) && /type=["']?application\/(rss|atom)\+xml/i.test(tag)) {
        const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
        if (href && !/comments/i.test(href)) found.push(new URL(href.replace(/&amp;/g, "&"), page.url).toString());
      }
    }
  }
  const origin = new URL(page.url || row.url).origin;
  const tries = [...found, ...["/feed/", "/rss", "/rss.xml", "/feed.xml", "/index.xml", "/atom.xml", "/feed", "/rss/", "/news/feed/", "/blog/feed/"].map((p) => origin + p)];
  for (const u of [...new Set(tries)].slice(0, 8)) {
    const f = await get(u);
    if (f.status === 200 && isFeed(f.text) && count(f.text) > 0) return { feed: f.url, items: count(f.text), how: found.includes(u) ? "link" : "path", page: page.status };
  }
  return { error: `no feed (page ${page.status}${page.err ? " " + page.err : ""})` };
}
const out = [], miss = [];
let i = 0;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (i < rows.length) {
    const row = rows[i++];
    const d = await discover(row);
    if (d.feed) {
      out.push({ id: row.id, name: row.name, kind: "rss", config: { feedUrl: d.feed, _aihot: { initialBackfillLimit: 3 } }, tier: row.tier, first_party: row.tier !== "T2", owner_entity_id: null, participation_mode: "editorial", interval_minutes: 120, tags: row.tags, site_fulltext: false, syndicate_fulltext: false });
      console.log(`✓ ${row.id}  ${d.feed}  (${d.items}, ${d.how})`);
    } else { miss.push(`${row.id}|${row.name}|${row.url}|${d.error}`); console.log(`✗ ${row.id}  ${d.error}`); }
  }
}));
out.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(outp, JSON.stringify({ sources: out }, null, 2));
writeFileSync(outp.replace(/\.json$/, ".miss.txt"), miss.join("\n") + "\n");
console.log(`\n${out.length} feeds, ${miss.length} without`);
