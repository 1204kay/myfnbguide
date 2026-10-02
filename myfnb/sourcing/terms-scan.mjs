// Rule 3 helper: finds each site's terms-of-use page and prints the sentences about crawling, automated
// access, text and data mining, AI, RSS and personal-only use, so only those need reading by hand.
//   node myfnb/sourcing/terms-scan.mjs candidates.json [id ...]   (sources.json shape; scans the feed's site)
import { readFileSync } from "node:fs";
const UA = "Mozilla/5.0 (compatible; MyFnBBot/1.0; +https://new.myfnbguide.com/about)";
const [file, ...only] = process.argv.slice(2);
let { sources } = JSON.parse(readFileSync(file, "utf8"));
if (only.length) sources = sources.filter((s) => only.includes(s.id));
const LINK = /(terms|conditions|legal|disclaimer|copyright|nutzungsbedingungen|impressum|agb|condizioni|termini|note-legali|t[eé]rminos|aviso-legal|condiciones|termos|conditions-g|mentions-l|cgu|利用規約|ご利用|規約|이용약관|使用条款|服务条款|版权|免责|條款|vilkår|villkor|voorwaarden|regulamin|podmínky)/i;
const KEY = /(scrap(e|ing|er)|crawl|\brobots?\b|\bbots?\b|spider|automated (means|system|tool|program|device|process|access|query|collection|software|script|method)|by automated|harvest|data[- ]?mining|text and data|\bTDM\b|machine learning|train(ing)? (any |an )?(artificial|AI|model|machine)|large language|\bLLM|personal,? non-?commercial|personal use only|solely for (your )?personal|for your (own )?personal|internal (business )?(use|purposes)|Data-Mining|Text- und Data|automatisiert|eksploracj|estrazione|download automatico|minería de datos|extracción|automatizad|mineração|raspagem|aspiration|fouille de textes|usage personnel|uso personal|uso personale|uso pessoal|クローラ|スクレイピング|自動的に|私的使用|크롤링|스크래핑|爬虫|抓取|个人使用|非商业|爬蟲)/i;
async function get(url) {
  try {
    const r = await fetch(url, { headers: { "user-agent": UA, "accept-language": "en,zh;q=0.8" }, redirect: "follow", signal: AbortSignal.timeout(20000) });
    return { status: r.status, url: r.url, text: r.status === 200 ? await r.text() : "" };
  } catch (e) { return { status: 0, url, text: "" }; }
}
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ").replace(/<\/(p|li|div|h\d|br|tr|section)>|<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8217;|&rsquo;/g, "'").replace(/[ \t]+/g, " ");
for (const s of sources) {
  const site = new URL(s.config.feedUrl ?? s.config.url).origin;
  const home = await get(site + "/");
  const links = new Set();
  for (const m of home.text.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1], label = strip(m[2]).trim();
    if (LINK.test(href) || LINK.test(label)) { try { links.add(new URL(href, home.url || site).toString()); } catch {} }
  }
  for (const p of ["/terms-of-use/", "/terms-and-conditions/", "/terms-conditions/", "/terms/", "/terms-of-service/", "/legal/", "/disclaimer/", "/copyright/"]) links.add(site + p);
  const hits = [];
  const seen = [];
  for (const u of [...links].filter((u) => !/privacy|cookie|datenschutz|privacidad|riservatezza|個人情報|개인정보|隐私/i.test(u)).slice(0, 10)) {
    const page = await get(u);
    if (page.status !== 200 || page.text.length < 500) continue;
    seen.push(page.url);
    for (const sentence of strip(page.text).split(/(?<=[.!?。！？])\s+|\n+/)) {
      const t = sentence.trim();
      if (t.length > 25 && t.length < 700 && KEY.test(t) && !/cookie|privacy policy|google analytics|newsletter/i.test(t)) hits.push(t);
    }
  }
  console.log(`\n=== ${s.id}  ${seen.length ? seen.join(" ") : "（没找到条款页，home " + home.status + "）"}`);
  for (const h of [...new Set(hits)].slice(0, 40)) console.log("  · " + h.slice(0, 400));
}
