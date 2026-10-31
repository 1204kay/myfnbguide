// The reference library's backend: a schedule finds selected items without a case and queues them, the
// queue writes each case (backend/write.ts); another writes up every other listed item for its page (backend/body.ts);
// another groups each situation's stories by practice once they change (backend/methods.ts); and the api answers
// the pages and the item page's block (backend/read.ts).
import { config } from "@aihot/backend/config";
import { sql } from "@aihot/backend/db";
import { defineQueue, defineServerModule } from "@aihot/backend/modules";
import { enqueueOn } from "@aihot/backend/jobs/queue";
import { beijingDate } from "@aihot/contracts/time";
import { SITUATIONS } from "./situations.ts";
import {
  membersBySituation, readCase, readHome, readItemText, readShare, readShop, readSituation, readStatus, sitemapEntries,
} from "./backend/read.ts";
import { renderShare, shareCard, shareEtag } from "./backend/share.ts";
import { articlesToBody, BODY_STEP, writeBody } from "./backend/body.ts";
import { blocking, problemKind } from "./backend/checks.ts";
import { groupSituation, METHODS_STEP, situationsToGroup } from "./backend/methods.ts";
import { ISSUE_CHECK_STEP, ISSUE_STEP, modelAsk } from "./backend/issue.ts";
import { MAX_READS, voiceIssue, voiceReport } from "./backend/voice.ts";
import { modelFor } from "@aihot/backend/editorial/models";
import { completeReceipt } from "@aihot/backend/providers/receipts";
import { issueLead, issueSitemap, readIssue, writeIssue } from "./backend/issues.ts";
import { issueAudio, sendIssueAudio } from "./backend/audio.ts";
import { articlesToWrite, MODEL_STEP, writeCase } from "./backend/write.ts";
import { articlesToPlace, PLACE_STEP, placeWaiting, placingOn } from "./backend/place.ts";

// 10-18: new stories are not written for now (十一). 30 live stories checked against their originals had 11 with
// serious errors (myfnb/HANDOFF.md §3.1); until the prompt and checks are fixed and tried on 20 new ones, items keep
// their title and summary only. Jobs queued before are dropped too. Set back to false to write again.
const STORIES_PAUSED = true;
// 10-18: new write-ups are paused as well (十一): 19 tried on the same items had 6 with serious errors. New items show
// their title, summary and the original link; write-ups already shown stay. Set back to false to write again.
const BODIES_PAUSED = true;

const CASES = defineQueue<{ articleId: string }>({
  name: "reference.case",
  options: { policy: "short", retryLimit: 3, retryDelay: 120, retryBackoff: true, expireInSeconds: 900 },
  worker: { localConcurrency: 2, pollingIntervalSeconds: 5 },
  run: async (jobs) => { if (!STORIES_PAUSED) for (const { articleId } of jobs) await writeCase(articleId); },
});

const BODIES = defineQueue<{ articleId: string }>({
  name: "reference.body",
  options: { policy: "short", retryLimit: 3, retryDelay: 120, retryBackoff: true, expireInSeconds: 900 },
  worker: { localConcurrency: 2, pollingIntervalSeconds: 5 },
  run: async (jobs) => { if (!BODIES_PAUSED) for (const { articleId } of jobs) await writeBody(articleId); },
});

// 十一说 (backend/issues.ts): one a day; two drafts, checks and up to five rounds of mending take long, so it runs as a job
// of its own with room for that, and one retry for a model that failed.
// 十一说 is written from the day the settings row `reference.issues` names ({"from": "2026-10-24"}, a Beijing date); with
// no row it is not. Each issue costs (about US$2, mostly the check), so starting and stopping is Kay's and must not wait
// for a deploy (10-23: one sentence stops it). Stop: DELETE FROM settings WHERE key = 'reference.issues'.
async function issuesFrom(): Promise<string | null> {
  const [row] = await sql<{ value: { from?: unknown } }[]>`SELECT value FROM settings WHERE key = 'reference.issues'`;
  return typeof row?.value.from === "string" ? row.value.from : null;
}

const ISSUES = defineQueue<{ date: string }>({
  name: "reference.issue",
  options: { policy: "short", retryLimit: 1, retryDelay: 300, expireInSeconds: 3 * 3600 },
  worker: { localConcurrency: 1, pollingIntervalSeconds: 10 },
  run: async (jobs) => { for (const { date } of jobs) await writeIssue(date); },
});

// 十一说 read aloud (backend/voice.ts) once the day's issue is up, from the day the settings row `reference.voice` names
// ({"from": "2026-11-01"}); with no row it is not. A reading that fails its check is read again at the next run, up to
// MAX_READS a day of Gemini's ten free ones; what still fails leaves the issue as text.
async function voiceFrom(): Promise<string | null> {
  const [row] = await sql<{ value: { from?: unknown } }[]>`SELECT value FROM settings WHERE key = 'reference.voice'`;
  return typeof row?.value.from === "string" ? row.value.from : null;
}

const VOICES = defineQueue<{ no: number }>({
  name: "reference.voice",
  options: { policy: "short", retryLimit: 0, expireInSeconds: 3600 },
  worker: { localConcurrency: 1, pollingIntervalSeconds: 10 },
  run: async (jobs) => {
    for (const { no } of jobs) {
      const [writer, checker] = await Promise.all([modelFor(ISSUE_STEP), modelFor(ISSUE_CHECK_STEP)]);
      const receipts: number[] = [];
      await voiceIssue(no, { write: modelAsk(writer, `voice:${no}`, receipts), check: modelAsk(checker, `voice:${no}`, receipts) });
      if (receipts.length) await sql.begin(async (tx) => { for (const id of receipts) await completeReceipt(tx, id); });
    }
  },
});

// Placing the items no story was written for (backend/place.ts): once a day, all waiting in one job, one short call each.
const PLACES = defineQueue<{ date: string }>({
  name: "reference.place",
  options: { policy: "short", retryLimit: 1, retryDelay: 600, expireInSeconds: 3600 },
  worker: { localConcurrency: 1, pollingIntervalSeconds: 10 },
  run: async (jobs) => { for (const _ of jobs) await placeWaiting(PLACE_LIMIT); },
});
/** At most this many a day: a day selects about 10–20 (/api/site/stats); the rest of a backlog goes on the next days. */
const PLACE_LIMIT = 300;

const METHODS = defineQueue<{ slug: string }>({
  name: "reference.methods",
  options: { policy: "short", retryLimit: 2, retryDelay: 300, retryBackoff: true, expireInSeconds: 900 },
  worker: { localConcurrency: 1, pollingIntervalSeconds: 10 },
  // The stories as they are when the job runs, not when it was queued.
  run: async (jobs) => { for (const { slug } of jobs) await groupSituation(slug, (await membersBySituation()).get(slug) ?? []); },
});

/** Shared caches keep a page as long as the engine keeps its topic pages: a minute. */
const CACHE = "public, max-age=60, stale-while-revalidate=60";
/** A story's share image is kept as the engine keeps its items' (apps/api/src/routes/og.ts CONTENT_IMAGE_CACHE): it changes with the story. */
const IMAGE_CACHE = "public, max-age=300, s-maxage=3600, must-revalidate";

export default defineServerModule({
  name: "reference",
  models: {
    [MODEL_STEP]: { label: "参考库的故事（入选内容写成故事，并放进老板遇到的情况）", env: "REFERENCE_CASE_MODEL", purposes: ["reference_case"] },
    [BODY_STEP]: { label: "条目页的正文（不是参考库故事的条目，整理自原文，写在导读下面）", env: "REFERENCE_BODY_MODEL", purposes: ["reference_body"] },
    [PLACE_STEP]: { label: "参考库的情况（没有故事的入选条目，只选放进哪个情况、哪一组）", env: "REFERENCE_PLACE_MODEL", purposes: ["reference_place"] },
    [METHODS_STEP]: { label: "参考库的做法（同一种情况里说同一种做法的故事归在一起）", env: "REFERENCE_METHODS_MODEL", purposes: ["reference_methods"] },
    [ISSUE_STEP]: { label: "十一说的写手（读这一天的全部收录，写两稿快讯加细说一件，再各为念出来改一遍）", env: "REFERENCE_ISSUE_MODEL", purposes: ["reference_issue_write", "reference_issue_speak", "reference_issue_voice"] },
    [ISSUE_CHECK_STEP]: { label: "十一说的核对（读点名原文的全文核三条规则，写出改好的句子；改不了的由编辑只改有问题的句子）", env: "REFERENCE_ISSUE_CHECK_MODEL", purposes: ["reference_issue_check", "reference_issue_edit", "reference_issue_review", "reference_issue_listen", "reference_issue_voice_check"] },
  },
  queues: [CASES, BODIES, PLACES, METHODS, ISSUES, VOICES],
  // The daily leads with the day's 十一说 when it was written in time (Kay 10-18: 每天放在 08:00 日报最上面).
  dailyLead: (date) => issueLead(date),
  // llms.txt names the library beside the engine's pages.
  llms: () => ({
    pages: [`- [参考](${config.siteUrl}/reference): 按遇到的事，查各地店家的做法和经验；说同一种做法的各家店归在一起，每个故事附原文出处`],
  }),
  sitemap: { entries: async () => [...await issueSitemap(), ...await sitemapEntries()] },
  schedules: [{
    name: "reference.cases",
    cron: "*/10 * * * *",
    run: async () => {
      if (!config.modelCallsEnabled) return { queued: 0, reason: "model calls are off" };
      if (STORIES_PAUSED) return { queued: 0, reason: "new stories are paused (10-18)" };
      const ids = await articlesToWrite(30);
      for (const articleId of ids) await enqueueOn(CASES, { articleId }, { singletonKey: articleId });
      return { queued: ids.length };
    },
  }, {
    // The day's selected items into their situations (backend/place.ts), in DeepSeek's off-peak hours (00:30–08:30
    // Beijing), before 十一说 and the daily at 05:00. Only once the settings row `reference.placing` is there.
    name: "reference.place",
    cron: "30 3 * * *",
    missed: "once",
    run: async () => {
      if (!config.modelCallsEnabled) return { queued: 0, reason: "model calls are off" };
      if (!(await placingOn())) return { queued: 0, reason: "placing is not on (settings reference.placing)" };
      if (!(await articlesToPlace(1)).length) return { queued: 0, reason: "nothing to place" };
      const date = beijingDate(new Date());
      await enqueueOn(PLACES, { date }, { singletonKey: date });
      return { queued: 1, date };
    },
  }, {
    // Every listed item of the last days that is no story gets its write-up; older ones wait for the rewrite script.
    name: "reference.bodies",
    cron: "*/10 * * * *",
    run: async () => {
      if (!config.modelCallsEnabled) return { queued: 0, reason: "model calls are off" };
      if (BODIES_PAUSED) return { queued: 0, reason: "new write-ups are paused (10-18)" };
      const ids = await articlesToBody(40);
      for (const articleId of ids) await enqueueOn(BODIES, { articleId }, { singletonKey: articleId });
      return { queued: ids.length };
    },
  }, {
    // Once a day before the daily issue is composed (layout D1): a situation is grouped again only when its stories
    // changed, so the stories written through the day cost one call a situation, not one each.
    name: "reference.methods",
    cron: "0 5 * * *",
    missed: "once",
    run: async () => {
      if (!config.modelCallsEnabled) return { queued: 0, reason: "model calls are off" };
      const due = await situationsToGroup(await membersBySituation(), SITUATIONS.length);
      for (const [slug] of due) await enqueueOn(METHODS, { slug }, { singletonKey: slug });
      return { queued: due.length };
    },
  }, {
    // 十一说: three hours before the 08:00 daily, from what it lists so far (the last three hours wait for tomorrow's).
    name: "reference.issue",
    cron: "0 5 * * *",
    missed: "once",
    run: async () => {
      if (!config.modelCallsEnabled) return { queued: 0, reason: "model calls are off" };
      const date = beijingDate(new Date());
      const from = await issuesFrom();
      if (!from || date < from) return { queued: 0, reason: "十一说 is not on (settings reference.issues)" };
      await enqueueOn(ISSUES, { date }, { singletonKey: date });
      return { queued: 1, date };
    },
  }, {
    // 十一说 read aloud: every half hour of the morning, the day's issue once it is written and has no audio yet.
    name: "reference.voice",
    cron: "20,50 5-9 * * *",
    run: async () => {
      if (!config.modelCallsEnabled) return { queued: 0, reason: "model calls are off" };
      const date = beijingDate(new Date());
      const from = await voiceFrom();
      if (!from || date < from) return { queued: 0, reason: "十一说 read aloud is not on (settings reference.voice)" };
      const [row] = await sql<{ no: number }[]>`SELECT no FROM reference_issues WHERE date = ${date} AND status = 'issue'`;
      if (!row) return { queued: 0, reason: "no issue yet" };
      if (await issueAudio(row.no)) return { queued: 0, reason: "already read" };
      const report = await voiceReport(row.no);
      if (report && !["error", "check failed"].includes(report.status)) return { queued: 0, reason: report.status };
      if ((report?.tries ?? 0) >= MAX_READS && !report?.unheard) return { queued: 0, reason: "no reads left today" };
      await enqueueOn(VOICES, { no: row.no }, { singletonKey: String(row.no) });
      return { queued: 1, no: row.no };
    },
  }],
  http: (app) => {
    app.get("/api/reference", async (_req, reply) => reply.header("Cache-Control", CACHE).send(await readHome()));
    // Written, not written (thin: too little or only news), held by the checks, and still to write.
    app.get("/api/reference/status", async (_req, reply) =>
      reply.header("Cache-Control", "no-store").send({
        ...(await readStatus()), waiting: (await articlesToWrite(1000)).length,
        // The items no story was written for (backend/place.ts): placed in a situation, in none, and still to place.
        placing: { ...Object.fromEntries((await sql<{ k: string; n: number }[]>`
          SELECT CASE WHEN cardinality(situations) > 0 THEN 'placed' ELSE 'none' END AS k, count(*)::int AS n FROM reference_placements GROUP BY 1`)
          .map((r) => [r.k, r.n])), waiting: (await articlesToPlace(5000)).length },
        // The item pages' write-ups: written, thin, held, and still to write.
        bodies: Object.fromEntries((await sql<{ status: string; n: number }[]>`SELECT status, count(*)::int AS n FROM reference_bodies GROUP BY 1`).map((r) => [r.status, r.n])),
        // How many held write-ups each kind of problem stopped, as for the cases.
        bodiesHeld: (await sql<{ problems: string[] }[]>`SELECT problems FROM reference_bodies WHERE status = 'held'`)
          .reduce<Record<string, number>>((out, r) => { for (const kind of new Set(r.problems.map(problemKind))) out[kind] = (out[kind] ?? 0) + 1; return out; }, {}),
        // Which sources give too little to write up, the most first: where more of the original has to be read.
        bodiesThinBySource: Object.fromEntries((await sql<{ name: string; n: number }[]>`
          SELECT s.name, count(*)::int AS n FROM reference_bodies b JOIN articles a ON a.id = b.article_id JOIN sources s ON s.id = a.source_id
          WHERE b.status = 'thin' GROUP BY 1 ORDER BY 2 DESC LIMIT 20`).map((r) => [r.name, r.n])),
        bodiesWaiting: (await articlesToBody(5000)).length,
        // The last stories and write-ups written, newest first, to read what a change of the writing did: written, thin,
        // held, or held with the earlier one kept (written with problems).
        recent: (await sql<{ id: string; kind: string; status: string; problems: string[]; at: Date }[]>`
          (SELECT article_id AS id, 'story' AS kind, status, problems, updated_at AS at FROM reference_cases ORDER BY updated_at DESC LIMIT 20)
          UNION ALL (SELECT article_id, 'body', status, problems, updated_at FROM reference_bodies ORDER BY updated_at DESC LIMIT 20)
          ORDER BY at DESC LIMIT 20`).map((r) => ({
          id: r.id, kind: r.kind, at: r.at,
          result: r.status === "thin" ? "thin" : r.status === "held" ? "held" : r.problems.some(blocking) ? "held, earlier kept" : r.problems.length ? "written, with notes" : "written",
          problems: r.status === "thin" ? [] : [...new Set(r.problems.map(problemKind))],
        })),
        // What myfnb/rewrite-reference.ts would write under the current prompts: old ones, and older items never written up.
        toRewrite: { stories: (await articlesToWrite(5000, new Date(), { all: true })).length, bodies: (await articlesToBody(5000, new Date(), { all: true })).length },
      }));
    // The last run of myfnb/eval-reference.ts (or ?run=), case by case: the site's prompt and the candidate side by side.
    app.get("/api/reference/eval", async (req, reply) => {
      const asked = (req.query as { run?: string }).run;
      const [last] = await sql<{ run: string | null }[]>`SELECT max(run) AS run FROM reference_evals`;
      const run = asked ?? last?.run;
      if (!run) return reply.header("Cache-Control", "no-store").send({ run: null, cases: [] });
      const rows = await sql<{ id: string; title: string; summary: string | null; variant: string; kind: string; status: string; problems: string[]; output: unknown }[]>`
        SELECT e.article_id AS id, p.title, p.summary, e.variant, e.kind, e.status, e.problems, e.output
        FROM reference_evals e JOIN publications p ON p.article_id = e.article_id
        WHERE e.run = ${run} ORDER BY e.article_id, e.kind DESC, e.variant DESC`;
      const cases = new Map<string, { id: string; title: string; summary: string | null; results: unknown[] }>();
      for (const r of rows) {
        const c = cases.get(r.id) ?? { id: r.id, title: r.title, summary: r.summary, results: [] };
        c.results.push({ variant: r.variant, kind: r.kind, status: r.status, problems: r.problems, output: r.output });
        cases.set(r.id, c);
      }
      return reply.header("Cache-Control", "no-store").send({ run, cases: [...cases.values()] });
    });
    app.get("/api/reference/issues/:no", async (req, reply) => {
      const no = Number((req.params as { no: string }).no);
      const page = Number.isSafeInteger(no) && no > 0 ? await readIssue(no) : null;
      return page ? reply.header("Cache-Control", CACHE).send(page) : reply.code(404).send({ error: "not found" });
    });
    app.get("/api/reference/issues/:no/audio.mp3", async (req, reply) => {
      const no = Number((req.params as { no: string }).no);
      return Number.isSafeInteger(no) && no > 0 ? sendIssueAudio(req, reply, no) : reply.code(404).send({ error: "not found" });
    });
    app.get("/api/reference/situations/:slug", async (req, reply) => {
      const page = await readSituation((req.params as { slug: string }).slug);
      return page ? reply.header("Cache-Control", CACHE).send(page) : reply.code(404).send({ error: "not found" });
    });
    // A folded story (backend/read.ts foldedStories) is answered as the engine answers a merged story (routes/site.ts):
    // 308 to its item, which the page follows.
    app.get("/api/reference/cases/:id", async (req, reply) => {
      const page = await readCase((req.params as { id: string }).id);
      if (page?.folded) return reply.code(308).header("Location", `/api/site/items/${page.id}`).header("Cache-Control", CACHE).send({ mergedInto: page.id });
      return page ? reply.header("Cache-Control", CACHE).send(page) : reply.code(404).send({ error: "not found" });
    });
    // The item page's block (web/item-part.tsx): the item's story, or its write-up; 404 for neither.
    app.get("/api/reference/items/:id", async (req, reply) => {
      const text = await readItemText((req.params as { id: string }).id);
      return text ? reply.header("Cache-Control", CACHE).send(text) : reply.code(404).send({ error: "not found" });
    });
    // A story's share image (backend/share.ts), answered as the engine answers its items' (apps/api/src/routes/og.ts):
    // an ETag of what the card shows, 304 for one the reader has, a plain 404 for a story not shown.
    app.get("/og/reference/cases/:file", async (req, reply) => {
      const file = (req.params as { file: string }).file;
      const found = file.endsWith(".png") ? await readShare(file.slice(0, -4)) : null;
      if (!found) return reply.code(404).header("Cache-Control", "public, max-age=300").type("text/plain; charset=utf-8").send("Not found");
      const card = shareCard(found.story, found);
      const tag = `"reference-${shareEtag(card)}"`;
      reply.header("ETag", tag).header("Cache-Control", IMAGE_CACHE);
      if (String(req.headers["if-none-match"] ?? "").split(",").some((t) => t.trim().replace(/^W\//, "") === tag)) return reply.code(304).send();
      return reply.type("image/png").send(await renderShare(card));
    });
    app.get("/api/reference/shops/:key", async (req, reply) => {
      const page = await readShop((req.params as { key: string }).key);
      // All its stories folded: to the library, as a folded story goes to its item.
      if (page && "folded" in page) return reply.code(308).header("Location", "/api/reference").header("Cache-Control", CACHE).send({ mergedInto: "reference" });
      return page ? reply.header("Cache-Control", CACHE).send(page) : reply.code(404).send({ error: "not found" });
    });
  },
});
