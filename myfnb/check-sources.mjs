// Re-checks every source in industry/sources.json against the collection rule on the terms page:
// robots.txt must allow the path we fetch, must not turn away the AI agents that read pages for a user
// (ChatGPT-User, Claude-User, Perplexity-User, OAI-SearchBot and the like), and its Content-Signal must not
// say ai-input=no. Turning away only AI training crawlers (GPTBot, CCBot…) or ai-train=no is allowed: the
// site trains no model, it writes a short summary and links the original (myfnb/HANDOFF.md, the source
// rules). Sources change their robots.txt; the framework does not read it, so run this monthly, and on a
// candidate file before adding a source.
//   node myfnb/check-sources.mjs [sources.json]
// It also honours a text-and-data-mining reservation (W3C TDMRep): /.well-known/tdmrep.json, a robots.txt
// "TDM-policy:" file, or a tdm-reservation response header on the feed (a reservation counts as the terms
// refusing text and data mining).
// The AI agent list is the community-maintained one from github.com/ai-robots-txt/ai.robots.txt.
// A source's terms of use still need reading by hand (no crawling, text and data mining or AI use).
import { readFileSync } from "node:fs";

const AGENTS_URL = "https://raw.githubusercontent.com/ai-robots-txt/ai.robots.txt/main/robots.json";
// Agents that fetch a page because a person asked an AI assistant or AI search to read it. Blocking one
// of these refuses AI reading for readers, which is what our use resembles.
const ASSIST = new Set(["chatgpt-user", "oai-searchbot", "claude-user", "claude-searchbot", "perplexity-user", "perplexitybot", "duckassistbot", "mistralai-user", "meta-externalfetcher", "gemini-deep-research", "google-cloudvertexbot", "amzn-user", "novaact", "operator", "youbot", "phindbot", "kagi-fetcher", "cohere-ai-user", "manus-user"]);
// Named in that list, but blocking them says nothing about AI: link previews, plain search, a library.
const GENERAL = new Set(["facebookexternalhit", "applebot", "scrapy", "googleother", "googleother-image", "googleother-video", "petalbot", "semrushbot-ocob", "semrushbot-swa"]);
// The collector's own User-Agent (packages/backend/src/lib/http-fetch.ts): some sites answer robots.txt per agent.
const UA = "Mozilla/5.0 (compatible; MyFnBBot/1.0; +https://new.myfnbguide.com/about)";

const ai = new Set(Object.keys(await (await fetch(AGENTS_URL, { signal: AbortSignal.timeout(20000) })).json()).map((n) => n.toLowerCase()).filter((n) => !GENERAL.has(n)));
const { sources } = JSON.parse(readFileSync(process.argv[2] ?? new URL("../industry/sources.json", import.meta.url), "utf8"));

/** robots.txt groups: the agents a group names and its allow/disallow rules. */
function groups(text) {
  const out = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.replace(/#.*/, "").trim().match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === "user-agent") { if (!cur || cur.rules.length) out.push((cur = { agents: [], rules: [] })); cur.agents.push(v.toLowerCase()); }
    else if (cur && (k === "allow" || k === "disallow") && v) cur.rules.push([k, v]);
  }
  return out;
}
/** Longest matching rule wins; allow wins a tie. */
function disallowed(rules, path) {
  let best = null;
  for (const [k, pat] of rules) {
    const re = new RegExp("^" + pat.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
    if (re.test(path) && (!best || pat.length > best[1].length || (pat.length === best[1].length && k === "allow"))) best = [k, pat];
  }
  return best?.[0] === "disallow";
}

/** GET with one retry (a single timeout on a slow network is not a refusal); null when there is no answer. */
async function get(u) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(u, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(20000) });
      return { status: res.status, headers: res.headers, text: res.status === 200 ? await res.text() : "" };
    } catch {}
  }
  return null;
}
/** TDMRep rules of a site: [{ location, reserved }] from /.well-known/tdmrep.json and robots.txt TDM-policy files. */
async function tdmRules(origin, robots) {
  const files = [`${origin}/.well-known/tdmrep.json`];
  for (const line of robots.split(/\r?\n/)) {
    const m = line.match(/^\s*tdm-policy\s*:\s*(\S+)/i);
    if (m && /\.json(\?|$)/i.test(m[1])) files.push(new URL(m[1], origin).toString());
  }
  const rules = [];
  for (const f of files) {
    const res = await get(f);
    if (res?.status !== 200) continue;
    try {
      for (const e of [].concat(JSON.parse(res.text))) if (e && typeof e.location === "string") rules.push({ location: e.location, reserved: Number(e["tdm-reservation"]) === 1 });
    } catch {}
  }
  return rules;
}
/** The most specific TDMRep location matching the path decides. */
function tdmReserved(rules, path) {
  let best = null;
  for (const r of rules) {
    const re = new RegExp("^" + r.location.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*"));
    if (re.test(path) && (!best || r.location.length > best.location.length)) best = r;
  }
  return best?.reserved === true;
}

const sites = new Map();
let failed = 0;
for (const s of sources) {
  const url = new URL(s.config.url ?? s.config.feedUrl);
  const path = url.pathname + url.search;
  if (!sites.has(url.origin)) {
    const robots = await get(`${url.origin}/robots.txt`);
    sites.set(url.origin, { robots, tdm: await tdmRules(url.origin, robots?.status === 200 ? robots.text : "") });
  }
  const { robots: res, tdm } = sites.get(url.origin);
  const problems = [];
  const notes = [];
  if (!res || (res.status !== 200 && res.status !== 404)) problems.push(`robots.txt unreadable (${res?.status ?? "no answer"})`);
  const text = res?.status === 200 ? res.text : "";
  if (tdmReserved(tdm, path)) problems.push("TDMRep: text and data mining reserved (tdmrep.json)");
  const feed = await get(url.toString());
  if (feed && /^\s*1\s*$/.test(feed.headers.get("tdm-reservation") ?? "")) problems.push("TDMRep: tdm-reservation header on the feed");
  for (const g of groups(text)) {
    if (g.agents.includes("*") && disallowed(g.rules, path)) problems.push(`robots.txt disallows ${path} for every crawler`);
    if (!disallowed(g.rules, "/") && !disallowed(g.rules, path)) continue;
    const assist = g.agents.filter((a) => ASSIST.has(a));
    const train = g.agents.filter((a) => ai.has(a) && !ASSIST.has(a));
    if (assist.length) problems.push(`robots.txt turns away AI agents that read for users: ${assist.slice(0, 6).join(", ")}${assist.length > 6 ? "…" : ""}`);
    if (train.length) notes.push(`turns away AI training crawlers only (allowed): ${train.slice(0, 4).join(", ")}${train.length > 4 ? "…" : ""}`);
  }
  for (const line of text.split(/\r?\n/)) {
    if (!/^\s*content-signal\s*:/i.test(line)) continue;
    if (/ai-input\s*=\s*no/i.test(line)) problems.push(`Content-Signal: ${line.split(":").slice(1).join(":").trim()}`);
    else if (/ai-train\s*=\s*no/i.test(line)) notes.push("Content-Signal ai-train=no (allowed)");
  }
  if (problems.length) failed += 1;
  const lines = [...new Set(problems), ...new Set(notes)];
  console.log(`${problems.length ? "✗" : "✓"} ${s.id}${lines.length ? `\n    ${lines.join("\n    ")}` : ""}`);
}
console.log(failed ? `\n${failed} source(s) break the rule: pause them in the admin Sources page (or scripts/delete-sources.ts) and update industry/sources.json.` : `\nall ${sources.length} sources pass`);
process.exit(failed ? 1 : 0);
