// Failure cases: an opened archive enters today or the daily instead of history; a new episode of a podcast the site
// collects is never kept for transcription, or waits behind the archive; an archive episode is transcribed though
// its notes scored below the floor, or while the service has no budget row; the transcript does not become the
// article's body or is not analysed again; a rate limit marks an episode failed for good; an archive that names
// its picks takes in others.
import { tag } from "../../../tests/setup.ts";
import assert from "node:assert/strict";
import http from "node:http";
import { after, before, test } from "node:test";

process.env.ALLOW_PRIVATE_NETWORK_FETCH = "true";
process.env.GEMINI_API_KEY = "test-gemini-key";
const { closeDb, sql } = await import("@aihot/backend/db");
const { stopBoss } = await import("@aihot/backend/jobs/queue");
const { audioByTitle, importSource, noteNewEpisodes, PACE } = await import("../backend/importer.ts");
const { upsertMaterial } = await import("@aihot/backend/content/materials");
PACE.pageMs = 0;
const { episodesToTranscribe, GEMINI, SERVICE, transcribeEpisode } = await import("../backend/transcribe.ts");

const T = tag();
const SOURCE = `archive-${T}`;
const TRANSCRIPT = "Host: Today we talk about how a small cafe kept its staff for five years. ".repeat(6);
let geminiCalls: string[] = [];
let limited = false;

const server = http.createServer((req, res) => {
  const url = req.url ?? "/";
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  req.resume();
  req.on("end", () => {
    // The podcast's feed, and another podcast's whose archive takes in only the episodes it picked.
    if (url === "/feed.xml" || url === "/picked.xml") {
      const name = url === "/feed.xml" ? "episodes" : "picked";
      res.writeHead(200, { "content-type": "application/rss+xml" });
      res.end(`<?xml version="1.0"?><rss version="2.0"><channel><title>Cafe talk</title>${[1, 2, 3].map((n) => `<item><title>Episode ${n} ${T}</title>
        <link>${base}/${name}/${n}</link><guid>${base}/${name}/${n}</guid><pubDate>Mon, 0${n} Jan 2024 10:00:00 GMT</pubDate>
        <description>Episode ${n} notes: how one cafe owner handled the morning rush and kept the team.</description>
        <enclosure url="${base}/audio/${n}.mp3" type="audio/mpeg" length="4"/></item>`).join("")}</channel></rss>`);
      return;
    }
    if (url.startsWith("/audio/")) { res.writeHead(200, { "content-type": "audio/mpeg" }); res.end(Buffer.from("ID3x")); return; }
    // A blog's paged feed: two pages, the first with one article its source excludes, then an empty one.
    // The same blog as WordPress serves it: a page past the last answers 404.
    const wpPage = /^\/wp\.xml\?paged=(\d+)$/.exec(url);
    if (wpPage && Number(wpPage[1]) > 1) { res.writeHead(404); res.end(); return; }
    const blogPage = /^\/(?:blog|wp)\.xml\?paged=(\d+)$/.exec(url);
    if (blogPage) {
      const n = Number(blogPage[1]);
      const items = n === 1 ? [`${base}/blog/tips/a`, `${base}/blog/compliance/b`] : n === 2 ? [`${base}/blog/tips/c`] : [];
      res.writeHead(200, { "content-type": "application/rss+xml" });
      res.end(`<?xml version="1.0"?><rss version="2.0"><channel><title>Blog</title>${items.map((link, i) => `<item><title>Post ${n}-${i} ${T}</title><link>${link}</link><guid>${link}</guid>
        <pubDate>Mon, 0${n} Jan 2024 10:00:00 GMT</pubDate><description>How a restaurant counts its stock every week, step by step, with the numbers it keeps.</description></item>`).join("")}</channel></rss>`);
      return;
    }
    geminiCalls.push(`${req.method} ${url.split("?")[0]}`);
    if (url === "/upload/v1beta/files") { res.writeHead(200, { "x-goog-upload-url": `${base}/upload-session` }); res.end("{}"); return; }
    if (url === "/upload-session") { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify({ file: { name: "files/f1", uri: `${base}/files/f1`, state: "ACTIVE" } })); return; }
    if (url.includes(":generateContent")) {
      if (limited) { res.writeHead(429); res.end("{}"); return; }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ candidates: [{ content: { parts: [{ text: TRANSCRIPT }] }, finishReason: "STOP" }], usageMetadata: { promptTokenCount: 10 } }));
      return;
    }
    if (req.method === "DELETE") { res.writeHead(200); res.end("{}"); return; }
    res.writeHead(404); res.end();
  });
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
const BASE = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
GEMINI.base = BASE;

before(async () => {
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, config) VALUES (${SOURCE}, 'Cafe talk', 'rss', 'T2', 'editorial', ${sql.json({ feedUrl: `${BASE}/feed.xml`, summaryIsBody: true })})`;
  await sql`UPDATE sources SET tags = ARRAY['播客'] WHERE id = ${SOURCE}`;
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, config) VALUES (${`${SOURCE}-picked`}, 'Cafe talk 2', 'rss', 'T2', 'editorial', ${sql.json({ feedUrl: `${BASE}/picked.xml`, summaryIsBody: true })})`;
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, config) VALUES (${`${SOURCE}-blog`}, 'Blog', 'rss', 'T2', 'editorial', ${sql.json({ feedUrl: `${BASE}/blog.xml?paged=1`, denyUrlPrefixes: [`${BASE}/blog/compliance/`] })})`;
});
after(async () => { server.close(); await stopBoss(); await closeDb(); });

test("each episode's audio is found by its title", () => {
  const audio = audioByTitle(`<rss><channel><item><title> A  title </title><enclosure url="https://x/a.mp3" type="audio/mpeg"/></item><item><title>No audio</title></item><item><title>It&#39;s here</title><enclosure url="https://x/b.mp3" type="audio/mpeg"/></item></channel></rss>`);
  assert.deepEqual([...audio], [["A title", { url: "https://x/a.mp3", type: "audio/mpeg" }], ["It's here", { url: "https://x/b.mp3", type: "audio/mpeg" }]]);
});

test("an opened archive comes in as history, and only episodes whose notes score at the floor are transcribed", async () => {
  const result = await importSource({ id: SOURCE });
  assert.deepEqual([result.found, result.created, result.withAudio, result.finished], [3, 3, 3, true]);
  const rows = await sql<{ id: string; title: string; backfill: boolean; backfill_reason: string; audio_url: string }[]>`
    SELECT a.id, a.title, a.backfill, a.backfill_reason, e.audio_url FROM articles a JOIN archive_episodes e ON e.article_id = a.id WHERE a.source_id = ${SOURCE} ORDER BY a.title`;
  assert.ok(rows.every((r) => r.backfill && r.backfill_reason === "archive"), "history: not today, not in the daily");
  assert.deepEqual(rows.map((r) => r.audio_url), [1, 2, 3].map((n) => `${BASE}/audio/${n}.mp3`));
  assert.deepEqual((await importSource({ id: SOURCE })).created, 0, "a second import adds nothing");

  // Scores of the notes: one above the floor, one below, one not analysed yet.
  const [high, low] = rows;
  for (const [row, score] of [[high!, 55], [low!, 12]] as const) {
    await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, score, selected) VALUES (${row.id}, 1, 'rule', 'pass', ${score}, false)`;
  }
  assert.deepEqual((await episodesToTranscribe(10)).filter((id) => rows.some((r) => r.id === id)), [high!.id]);
  await sql`UPDATE sources SET enabled = false WHERE id = ${SOURCE}`;
  assert.deepEqual((await episodesToTranscribe(10)).filter((id) => rows.some((r) => r.id === id)), [], "a stopped source is not transcribed");
  await sql`UPDATE sources SET enabled = true WHERE id = ${SOURCE}`;

  await sql`DELETE FROM budgets WHERE service = ${SERVICE}`;
  assert.equal((await transcribeEpisode(high!.id)).status, "skipped", "no budget row, no call");
  assert.deepEqual(geminiCalls, []);
  await sql`INSERT INTO budgets (service, per_minute, per_hour, per_day, note) VALUES (${SERVICE}, 5, 50, 200, 'test')`;

  limited = true;
  const rateLimited = await transcribeEpisode(high!.id);
  assert.equal(rateLimited.status, "skipped", `a rate limit leaves the episode to try again (${rateLimited.error})`);
  assert.equal((await sql`SELECT status FROM archive_episodes WHERE article_id = ${high!.id}`)[0]!.status, "imported");
  limited = false;
  geminiCalls = [];

  const done = await transcribeEpisode(high!.id);
  assert.equal(done.status, "transcribed");
  assert.deepEqual(geminiCalls, ["POST /upload/v1beta/files", "POST /upload-session", `POST /v1beta/models/${GEMINI.model}:generateContent`, "DELETE /v1beta/files/f1"]);
  const [article] = await sql<{ revision: number; body_text: string; backfill: boolean; processing_state: string }[]>`
    SELECT revision, body_text, backfill, processing_state FROM articles WHERE id = ${high!.id}`;
  assert.deepEqual([article!.revision, article!.body_text, article!.backfill], [2, TRANSCRIPT.trim(), true], "the transcript is the new revision, still history");
  const [episode] = await sql<{ status: string; transcript_chars: number; receipt_id: string }[]>`SELECT status, transcript_chars, receipt_id FROM archive_episodes WHERE article_id = ${high!.id}`;
  assert.equal(episode!.status, "transcribed");
  assert.equal(episode!.transcript_chars, TRANSCRIPT.trim().length);
  assert.equal((await sql`SELECT status FROM receipts WHERE id = ${episode!.receipt_id}`)[0]!.status, "completed");
  assert.deepEqual(await episodesToTranscribe(10).then((ids) => ids.filter((id) => rows.some((r) => r.id === id))), [], "done once");

  // A failure is tried again under another model, not under the same one (scores are read for the current revision).
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, score, selected) VALUES (${high!.id}, 2, 'rule', 'pass', 55, false)`;
  await sql`UPDATE archive_episodes SET status = 'failed', error = 'gemini-older-model: gemini HTTP 404' WHERE article_id = ${high!.id}`;
  assert.deepEqual((await episodesToTranscribe(10)).filter((id) => rows.some((r) => r.id === id)), [high!.id]);
  await sql`UPDATE archive_episodes SET error = ${`${GEMINI.model}: gemini HTTP 400`} WHERE article_id = ${high!.id}`;
  assert.deepEqual((await episodesToTranscribe(10)).filter((id) => rows.some((r) => r.id === id)), []);
});

test("a blog's older pages come in until the first empty one, through the source's own filters", async () => {
  const result = await importSource({ id: `${SOURCE}-blog`, pages: { url: `${BASE}/blog.xml?paged={n}`, to: 5 } });
  assert.deepEqual([result.pages, result.found, result.created, result.withAudio, result.finished], [2, 2, 2, 0, true], "the excluded article stays out; page 3 is empty");
  const [mark] = await sql<{ pages: number; finished_at: Date | null }[]>`SELECT pages, finished_at FROM archive_sources WHERE source_id = ${`${SOURCE}-blog`}`;
  assert.ok(mark!.pages === 2 && mark!.finished_at, "finished once the empty page was read");
  const broken = await importSource({ id: `${SOURCE}-blog`, pages: { url: "http://127.0.0.1:1/blog.xml?paged={n}", to: 3 } });
  assert.ok(!broken.finished && broken.error, "an unreachable page stops the run with its error, not finished");
  assert.equal((await sql`SELECT finished_at FROM archive_sources WHERE source_id = ${`${SOURCE}-blog`}`)[0]!.finished_at, null);
  const urls = (await sql<{ url: string }[]>`SELECT url FROM articles WHERE source_id = ${`${SOURCE}-blog`} ORDER BY url`).map((r) => r.url);
  assert.deepEqual(urls, [`${BASE}/blog/tips/a`, `${BASE}/blog/tips/c`]);
  const wordpress = await importSource({ id: `${SOURCE}-blog`, pages: { url: `${BASE}/wp.xml?paged={n}`, to: 5 } });
  assert.ok(wordpress.finished && !wordpress.error && wordpress.pages === 1, "a 404 past the first page is the end of the archive");
});

test("an archive with picks takes in only the episodes it names", async () => {
  const result = await importSource({ id: `${SOURCE}-picked`, only: [`${BASE}/picked/2`, `${BASE}/picked/9`] });
  assert.deepEqual([result.found, result.created, result.finished], [1, 1, true], "an episode no longer listed is not looked for");
  const urls = (await sql<{ url: string }[]>`SELECT url FROM articles WHERE source_id = ${`${SOURCE}-picked`}`).map((r) => r.url);
  assert.deepEqual(urls, [`${BASE}/picked/2`]);
});

test("new episodes of a podcast the site collects are kept for transcription and go first, however thin their notes", async () => {
  const id = `${SOURCE}-new`;
  await sql`INSERT INTO sources (id, name, kind, tier, participation_mode, config, tags) VALUES (${id}, 'Cafe talk new', 'rss', 'T2', 'editorial', ${sql.json({ feedUrl: `${BASE}/feed.xml` })}, ${["播客"]})`;
  // Two episodes the collection took in today; one title the feed does not have.
  const taken = [];
  for (const title of [`Episode 1 ${T}`, `Not in the feed ${T}`]) {
    taken.push((await upsertMaterial({ sourceId: id, url: `${BASE}/new/${title.length}`, title, bodyText: "Short notes.", bodyStatus: "ok", via: "fetch", publishedAt: new Date() })).articleId);
  }
  assert.deepEqual(await noteNewEpisodes().then((r) => r.added >= 1), true);
  const kept = await sql<{ article_id: string; audio_url: string }[]>`SELECT article_id, audio_url FROM archive_episodes WHERE source_id = ${id}`;
  assert.deepEqual(kept.map((k) => [k.article_id, k.audio_url]), [[taken[0], `${BASE}/audio/1.mp3`]], "found by its title; one the feed lacks waits");
  await noteNewEpisodes();
  const [again] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM archive_episodes WHERE source_id = ${id}`;
  assert.equal(again!.n, 1, "kept once");
  // Notes that only say what the episode will discuss: no summary, waiting for its content (relevance unknown), and
  // transcribed for it, ahead of the archive.
  await sql`INSERT INTO analyses (article_id, input_revision, origin, relevance, score, selected) VALUES (${taken[0]!}, 1, 'rule', 'unknown', 8, false)`;
  assert.equal((await episodesToTranscribe(10))[0], taken[0]);
  // Notes too thin to score at the floor, but past the prefilter and listed: transcribed too.
  await sql`UPDATE analyses SET relevance = 'pass' WHERE article_id = ${taken[0]!}`;
  assert.equal((await episodesToTranscribe(10))[0], taken[0]);
});
