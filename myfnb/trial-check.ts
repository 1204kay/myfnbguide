// 核对员的考试（决定记录 2026-10-23「MYFNB 线上内容逐条核对」）：拿 10-23 盲核过的同一批 20 条当考卷
// （myfnb/check-exam-2026-10-23.json：站上旧写法和要点第二趟，各带两名核对员的结论），让一个模型拿原文核每一份稿，
// 看它抓不抓得到已知的严重错、会不会把没错的判成严重。只写到文件，库里只多模型回执。
//   --model deepseek-v4-pro-llm   核对用哪个模型（site/models.ts 里的名字），可以写多个，各考一遍
//   --no 18 --no 06               只考这几条（编号见考卷）；不写就考全部 20 条
//   --out /out                    这一趟的文件夹放在哪
//   不写 --apply 只列出要考多少份稿，不调模型。
// 在服务器上（一次性容器，挂上这个分支的提示词、模型表和脚本；正在跑的 worker 不动），见 myfnb/trial-understand-run.sh 的 check。
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import { loadAnalyzeInput } from "@aihot/backend/editorial/input";
import { checkDraft, type Problem } from "./check.ts";

type Key = "serious" | "disputed" | "clean";
type Exam = { items: Array<{ no: string; id: string; site: { title: string; summary: string; reason: string; key: Key }; new: { title: string; lead: string; points: string[]; key: Key } }> };

const args = process.argv.slice(2);
const all = (flag: string) => args.flatMap((a, i) => (a === flag && args[i + 1] ? [args[i + 1]!] : []));
const apply = args.includes("--apply");
const models = all("--model");
const only = all("--no");
const exam = JSON.parse(readFileSync(new URL("./check-exam-2026-10-23.json", import.meta.url), "utf8")) as Exam;
const items = exam.items.filter((it) => !only.length || only.includes(it.no));

/** The draft as the reader sees it, in the fields the prompt names. */
const draftOf = (it: Exam["items"][number], version: "site" | "new") => version === "site"
  ? { title: it.site.title, summary: it.site.summary, reason: it.site.reason }
  : { title: it.new.title, lead: it.new.lead, points: it.new.points };

const jobs = models.flatMap((model) => items.flatMap((it) => (["site", "new"] as const).map((version) => ({ model, it, version }))));
console.log(`考 ${models.join("、") || "（没写 --model）"}：${items.length} 条 × 2 版 = 每个模型 ${items.length * 2} 份稿${apply ? "" : "（预览，不调模型）"}`);
if (!apply || !models.length) { await stopBoss(); await closeDb(); process.exit(0); }

type Result = { model: string; no: string; version: "site" | "new"; key: Key; problems: Problem[] | null; error?: string; receiptId?: number };
const results: Result[] = [];
// Four at a time: DeepSeek with thinking takes a minute or two per draft.
for (let i = 0; i < jobs.length; i += 4) {
  await Promise.all(jobs.slice(i, i + 4).map(async ({ model, it, version }) => {
    const key = it[version].key;
    const a = await loadAnalyzeInput(it.id);
    if (!a) { results.push({ model, no: it.no, version, key, problems: null, error: "读不到原文" }); return; }
    try {
      const res = await checkDraft(model, a, draftOf(it, version), `check-${version}`);
      results.push({ model, no: it.no, version, key, problems: res.problems, receiptId: res.receiptId });
      console.log(`${model} ${it.no} ${version}：严重 ${res.problems.filter((p) => p.severity === "serious").length}，轻微 ${res.problems.filter((p) => p.severity !== "serious").length}`);
    } catch (error) {
      results.push({ model, no: it.no, version, key, problems: null, error: error instanceof Error ? error.message : String(error) });
      console.log(`${model} ${it.no} ${version}：失败 ${error instanceof Error ? error.message : String(error)}`);
    }
  }));
}

const run = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, "");
const dir = join(all("--out").at(-1) ?? "/out", `check-${run}`);
mkdirSync(dir, { recursive: true });
const out: string[] = [`# 核对员考试 ${run}`, ""];
for (const model of models) {
  const mine = results.filter((r) => r.model === model);
  const flagged = (r: Result) => !!r.problems?.some((p) => p.severity === "serious");
  const of = (key: Key) => mine.filter((r) => r.key === key && r.problems);
  const caught = of("serious").filter(flagged), falseAlarm = of("clean").filter(flagged);
  const ids = mine.flatMap((r) => (r.receiptId ? [r.receiptId] : []));
  const [cost] = ids.length ? await sql<{ usd: string | null }[]>`SELECT sum(cost)::text AS usd FROM receipts WHERE id IN ${sql(ids)}` : [{ usd: null }];
  const tag = (rs: Result[]) => rs.map((r) => `${r.no}${r.version === "site" ? "旧" : "新"}`).join(" ") || "无";
  out.push(`## ${model}`, "",
    `- 已知严重错：抓到 ${caught.length}/${of("serious").length}（${tag(caught)}）；漏掉 ${tag(of("serious").filter((r) => !flagged(r)))}`,
    `- 两人都判没严重错的：判成严重 ${falseAlarm.length}/${of("clean").length}（${tag(falseAlarm)}）`,
    `- 只有一人判严重的：判成严重 ${of("disputed").filter(flagged).length}/${of("disputed").length}（${tag(of("disputed").filter(flagged))}）`,
    `- 失败 ${mine.filter((r) => !r.problems).length} 份；花费 ${cost?.usd ?? "未知"}（回执记的金额）`, "");
  for (const r of mine.sort((x, y) => x.no.localeCompare(y.no) || x.version.localeCompare(y.version))) {
    out.push(`### ${r.no} ${r.version === "site" ? "旧写法" : "要点"}（考卷：${r.key}）`, "");
    if (!r.problems) out.push(`失败：${r.error}`, "");
    else if (!r.problems.length) out.push("没有问题", "");
    else for (const p of r.problems) out.push(`- **${p.severity}** ${p.field} 第 ${p.kind} 类：「${p.quote}」 ${p.why}${p.fix ? ` → ${p.fix}` : ""}`);
    out.push("");
  }
}
writeFileSync(join(dir, "核对.md"), out.join("\n"));
writeFileSync(join(dir, "核对.json"), JSON.stringify(results, null, 1));
console.log(out.filter((l) => l.startsWith("## ") || l.startsWith("- 已知") || l.startsWith("- 两人") || l.startsWith("- 只有") || l.startsWith("- 失败")).join("\n"));
console.log(`写到 ${dir}`);
await stopBoss();
await closeDb();
