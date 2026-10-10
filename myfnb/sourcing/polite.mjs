// The page fetch discover.mjs and discover2.mjs share. An address the site's robots.txt closes to every robot is
// not requested (nor accepted as where a redirect ends), and requests to one host are 1.3 seconds apart.
// 2026-10-11: a round read five feeds their robots.txt had closed and asked one host for eight paths in a row.
// Whether a site turns away AI agents, and its terms, are still check-sources.mjs and a reading by hand.
const UA = "Mozilla/5.0 (compatible; MyFnBBot/1.0; +https://new.myfnbguide.com/about)";
const ACCEPT = "text/html,application/xhtml+xml,application/rss+xml,application/xml;q=0.9,*/*;q=0.8";
const hosts = new Map();

const hostOf = (url) => { const h = new URL(url).host; if (!hosts.has(h)) hosts.set(h, { turn: Promise.resolve() }); return hosts.get(h); };

async function raw(url) {
  const host = hostOf(url);
  const turn = host.turn.then(async () => {
    try {
      const r = await fetch(url, { headers: { "user-agent": UA, accept: ACCEPT }, redirect: "follow", signal: AbortSignal.timeout(20000) });
      return { status: r.status, url: r.url, text: r.status === 200 ? await r.text() : "", type: r.headers.get("content-type") ?? "" };
    } catch (e) { return { status: 0, url, text: "", type: "", err: String(e.cause?.code || e.message).slice(0, 60) }; }
  });
  host.turn = turn.then(() => new Promise((r) => setTimeout(r, 1300)));
  return turn;
}

/** The rules robots.txt gives every robot (the group for *; a group ends at its first rule line). */
function rulesOf(text) {
  const rules = [];
  let agents = [], ruled = false;
  for (const line of text.split(/\r?\n/)) {
    const m = line.replace(/#.*/, "").match(/^\s*([a-z-]+)\s*:\s*(.*?)\s*$/i);
    if (!m) continue;
    const k = m[1].toLowerCase();
    if (k === "user-agent") { if (ruled) { agents = []; ruled = false; } agents.push(m[2].toLowerCase()); }
    else if (k === "allow" || k === "disallow") { ruled = true; if (m[2] && agents.includes("*")) rules.push([k, m[2]]); }
  }
  return rules;
}
const pattern = (v) => new RegExp("^" + v.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*"));

async function closed(url) {
  const u = new URL(url), host = hostOf(url);
  host.rules ??= raw(`${u.origin}/robots.txt`).then((r) => rulesOf(r.text));
  let best = ["allow", ""];
  for (const [k, v] of await host.rules) {
    if (pattern(v).test(u.pathname + u.search) && (v.length > best[1].length || (v.length === best[1].length && k === "allow"))) best = [k, v];
  }
  return best[0] === "disallow";
}

export async function get(url) {
  const shut = { status: 0, url, text: "", type: "", err: "robots.txt closes it" };
  if (await closed(url)) return shut;
  const r = await raw(url);
  // /feed answering from /feed/ is the closed address after all.
  return r.url !== url && (await closed(r.url)) ? shut : r;
}
