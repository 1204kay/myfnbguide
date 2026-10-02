// Second look for a feed: follows the homepage's news/blog/press links and tries platform feed paths
// (WordPress in a subfolder, Squarespace ?format=rss, Wix blog-feed.xml, HubSpot rss.xml, Drupal rss.xml).
// Also notes a WordPress REST API (json_list possible). Input lines: id|name|url  Output JSON per row.
//   node myfnb/sourcing/discover2.mjs in.txt out.json
import { readFileSync, writeFileSync } from "node:fs";
const UA = "Mozilla/5.0 (compatible; MyFnBBot/1.0; +https://new.myfnbguide.com/about)";
const [inp, outp] = process.argv.slice(2);
const rows = readFileSync(inp, "utf8").split(/\r?\n/).filter((l) => l.trim() && !l.startsWith("#")).map((l) => { const [id, name, url] = l.split("|").map((x) => x.trim()); return { id, name, url }; });
async function get(url) {
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/rss+xml,application/xml;q=0.9,*/*;q=0.8" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
    return { status: r.status, url: r.url, text: r.status === 200 ? await r.text() : "", type: r.headers.get("content-type") ?? "" };
  } catch (e) { return { status: 0, url, text: "" }; }
}
const isFeed = (t) => /<(rss|feed|rdf:RDF)[\s>]/i.test(t.slice(0, 3000)) && /<(item|entry)[\s>]/i.test(t);
const count = (t) => (t.match(/<(item|entry)[\s>]/gi) || []).length;
const newest = (t) => {
  const ds = [...t.matchAll(/<(pubDate|updated|published|dc:date)>([^<]+)</gi)].map((m) => Date.parse(m[2].trim())).filter(Number.isFinite);
  return ds.length ? new Date(Math.max(...ds)).toISOString().slice(0, 10) : null;
};
const NEWS = /news|blog|press|media|insight|article|noticias|not[ií]cias|aktuell|presse|actualit|nieuws|novinky|aktuality|haber|uutiset|tiedot|ニュース|お知らせ|新闻|资讯|動態|动态|뉴스|소식|보도|comunicat|stampa|prensa|imprensa|wiadomo|aktualno/i;
async function look(row) {
  const home = await get(row.url);
  if (!home.text) return { error: `home ${home.status}` };
  const base = new URL(home.url);
  const pages = [home.url];
  for (const m of home.text.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
    let u; try { u = new URL(m[1].replace(/&amp;/g, "&"), base); } catch { continue; }
    if (u.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue;
    const text = m[2].replace(/<[^>]+>/g, " ");
    if ((NEWS.test(u.pathname) || NEWS.test(text)) && u.pathname.split("/").filter(Boolean).length <= 2) pages.push(u.origin + u.pathname);
  }
  const uniq = [...new Set(pages)].slice(0, 5);
  const tries = [];
  for (const p of uniq) {
    const pg = p === home.url ? home : await get(p);
    for (const m of (pg.text || "").matchAll(/<link\b[^>]*>/gi)) {
      const tag = m[0];
      if (/rel=["']?alternate/i.test(tag) && /application\/(rss|atom)\+xml/i.test(tag)) {
        const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
        if (href && !/comment/i.test(href)) tries.push(new URL(href.replace(/&amp;/g, "&"), pg.url || p).toString());
      }
    }
    for (const m of (pg.text || "").matchAll(/href=["']([^"']*(?:rss|feed|atom)[^"']*)["']/gi)) {
      if (!/comment|feedback|facebook|twitter|feedly|instagram/i.test(m[1])) { try { tries.push(new URL(m[1].replace(/&amp;/g, "&"), pg.url || p).toString()); } catch {} }
    }
    const q = p.replace(/\/$/, "");
    if (p !== home.url) tries.push(`${q}/feed/`, `${q}?format=rss`, `${q}/rss.xml`, `${q}/rss`, `${q}.rss`, `${q}/feed.xml`);
  }
  tries.push(`${base.origin}/blog-feed.xml`, `${base.origin}/?feed=rss2`, `${base.origin}/index.php/feed/`, `${base.origin}/feed/rss2`);
  const feeds = [];
  for (const u of [...new Set(tries)].slice(0, 30)) {
    const f = await get(u);
    if (f.status === 200 && isFeed(f.text)) {
      if (!feeds.some((x) => x.feed === f.url)) feeds.push({ feed: f.url, items: count(f.text), newest: newest(f.text), title: (f.text.match(/<title>(?:<!\[CDATA\[)?([^<\]]*)/i)?.[1] ?? "").trim().slice(0, 60) });
    }
  }
  const wp = await get(`${base.origin}/wp-json/wp/v2/posts?per_page=3`);
  return { pages: uniq, feeds, wpjson: wp.status === 200 && wp.text.trim().startsWith("[") };
}
const out = {};
let i = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (i < rows.length) {
    const r = rows[i++];
    out[r.id] = { name: r.name, url: r.url, ...(await look(r)) };
    const o = out[r.id];
    console.log(`${o.feeds?.length ? "✓" : "·"} ${r.id} ${o.error ?? ""}${(o.feeds ?? []).map((f) => `\n    ${f.feed} (${f.items}, ${f.newest}) ${f.title}`).join("")}${o.wpjson ? "\n    wp-json" : ""}`);
  }
}));
writeFileSync(outp, JSON.stringify(out, null, 1));
