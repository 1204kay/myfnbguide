// Appends one batch to myfnb/sources-ledger.tsv: every candidate looked at, accepted or not, and why.
//   node myfnb/sourcing/ledger.mjs <batch> <input.txt> <discovered.json> <final.json> <reasons.json>
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const [batch, inp, disc, fin, reasons] = process.argv.slice(2);
const L = new URL("../sources-ledger.tsv", import.meta.url);
const rows = readFileSync(inp, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => l.split("|").map((x) => x.trim()));
const found = new Map(JSON.parse(readFileSync(disc, "utf8")).sources.map((s) => [s.id, s]));
const final = new Map(JSON.parse(readFileSync(fin, "utf8")).sources.map((s) => [s.id, s]));
const why = JSON.parse(readFileSync(reasons, "utf8"));
const miss = existsSync(disc.replace(/\.json$/, ".miss.txt")) ? new Map(readFileSync(disc.replace(/\.json$/, ".miss.txt"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => { const p = l.split("|"); return [p[0], p[3]]; })) : new Map();
const out = [];
const seen = new Set();
const line = (id, name, url, result, reason) => { seen.add(id); out.push([id, name, url, batch, result, reason].join("\t")); };
for (const s of final.values()) line(s.id, s.name, s.config.feedUrl ?? s.config.url, "接入", why[s.id] ?? "");
for (const [id, name, url] of rows) {
  if (seen.has(id)) continue;
  const f = found.get(id);
  if (why[id]) line(id, name, f?.config.feedUrl ?? url, "不接", why[id]);
  else if (!f) line(id, name, url, "不接", `找不到订阅源（${(miss.get(id) ?? "").replace(/^no feed \(page (\d+)[^)]*\)/, "首页 $1").replace(/^no feed/, "")}）`);
}
for (const s of found.values()) if (!seen.has(s.id)) line(s.id, s.name, s.config.feedUrl, "不接", why[s.id] ?? "（未写原因）");
const head = "id\t名称\t网址\t批次\t结果\t原因\n";
const prev = existsSync(L) ? readFileSync(L, "utf8") : head;
writeFileSync(L, prev + out.join("\n") + "\n");
console.log(out.length, "rows;", out.filter((l) => l.includes("\t接入\t")).length, "accepted;", out.filter((l) => l.includes("未写原因")).length, "without reason");
