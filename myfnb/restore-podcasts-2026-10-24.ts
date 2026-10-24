// 2026-10-24：10-15、10-20 两个 Buzzsprout 播客改了 RSS 简介，引擎把简介当成新版本，盖掉了逐字稿。停住的那些
// （分析失败的）由 archive 模块每 10 分钟自动放回（PR #41、#51）；10-23 前已经按简介分析过、上了站的那些（当时 113 期）
// 不自动放：放回要再付一次分析。十一 10-24 定今天放：逐字稿作为新版本放回去，引擎按逐字稿重新分析一次。
// 做法和 modules/archive/backend/transcribe.ts 的 restoreTranscripts 一样，只是不限于 failed。
// 这是事实错误的修正（条目是照简介写的，不是照节目内容），不是拿新写法重写旧条目（工作约定 §15）。
// 不带参数只列出有几期、各是哪个播客；--apply 放回（--limit 限一次放几期，默认全部）。
//   sudo docker compose run --rm -T -v <检出>/myfnb:/app/myfnb:ro worker node myfnb/restore-podcasts-2026-10-24.ts [--apply] [--limit N]
import { contentHash, reviseMaterial } from "@aihot/backend/content/materials";
import { closeDb, sql } from "@aihot/backend/db";
import { queueProcessing } from "@aihot/backend/jobs/content";
import { stopBoss } from "@aihot/backend/jobs/queue";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const limitAt = args.indexOf("--limit");
const limit = limitAt >= 0 ? Number(args[limitAt + 1]) : 10_000;

const rows = await sql<{ id: string; source: string; state: string; transcript: string }[]>`
  SELECT a.id, s.name AS source, a.processing_state AS state, t.body_text AS transcript FROM archive_episodes e
  JOIN articles a ON a.id = e.article_id
  JOIN sources s ON s.id = a.source_id
  JOIN LATERAL (SELECT r.body_text FROM article_revisions r WHERE r.article_id = a.id AND length(r.body_text) = e.transcript_chars
                ORDER BY r.revision DESC LIMIT 1) t ON true
  WHERE e.status = 'transcribed' AND a.body_text IS DISTINCT FROM t.body_text
  ORDER BY a.discovered_at DESC`;
const by = new Map<string, number>();
for (const r of rows) by.set(`${r.source}（${r.state}）`, (by.get(`${r.source}（${r.state}）`) ?? 0) + 1);
console.log(`正文不是逐字稿的期数：${rows.length}`);
for (const [k, n] of by) console.log(`  ${k} ${n}`);

let restored = 0;
if (apply) {
  for (const row of rows.slice(0, limit)) {
    const done = await sql.begin(async (tx) => {
      const [a] = await tx<{ title: string; excerpt: string | null; body_text: string | null }[]>`
        SELECT title, excerpt, body_text FROM articles WHERE id = ${row.id} FOR UPDATE`;
      if (!a || a.body_text === row.transcript) return false;
      await reviseMaterial(tx, row.id, {
        set: sql`body_text = ${row.transcript}, body_status = 'ok'`,
        hash: contentHash({ title: a.title, bodyText: row.transcript, excerpt: a.excerpt }), title: a.title, bodyText: row.transcript,
      });
      return true;
    });
    if (!done) continue;
    await queueProcessing(row.id);
    restored += 1;
  }
}
console.log(apply ? `\n已放回 ${restored} 期，排进了分析队列。` : "\n只列出，没有放回；放回用 --apply。");
await stopBoss();
await closeDb();
