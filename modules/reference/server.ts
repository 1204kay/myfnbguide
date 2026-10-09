// The reference library's backend: a schedule finds selected items without a case and queues them, the
// queue writes each case (backend/write.ts); another writes up every other listed item for its page (backend/body.ts);
// another groups each situation's stories by practice once they change (backend/methods.ts); and the api answers
// the pages and the item page's block (backend/read.ts).
import { readFileSync } from "node:fs";
import { config } from "@aihot/backend/config";
import { sql } from "@aihot/backend/db";
import { defineQueue, defineServerModule } from "@aihot/backend/modules";
import { enqueueOn } from "@aihot/backend/jobs/queue";
import { SITUATIONS } from "./situations.ts";
import {
  membersBySituation, readCase, readHome, readItemText, readShop, readSituation, readStatus, sitemapEntries,
} from "./backend/read.ts";
import { articlesToBody, BODY_STEP, writeBody } from "./backend/body.ts";
import { problemKind } from "./backend/checks.ts";
import { groupSituation, METHODS_STEP, situationsToGroup } from "./backend/methods.ts";
import { articlesToWrite, MODEL_STEP, writeCase } from "./backend/write.ts";

const CASES = defineQueue<{ articleId: string }>({
  name: "reference.case",
  options: { policy: "short", retryLimit: 3, retryDelay: 120, retryBackoff: true, expireInSeconds: 900 },
  worker: { localConcurrency: 2, pollingIntervalSeconds: 5 },
  run: async (jobs) => { for (const { articleId } of jobs) await writeCase(articleId); },
});

const BODIES = defineQueue<{ articleId: string }>({
  name: "reference.body",
  options: { policy: "short", retryLimit: 3, retryDelay: 120, retryBackoff: true, expireInSeconds: 900 },
  worker: { localConcurrency: 2, pollingIntervalSeconds: 5 },
  run: async (jobs) => { for (const { articleId } of jobs) await writeBody(articleId); },
});

const METHODS = defineQueue<{ slug: string }>({
  name: "reference.methods",
  options: { policy: "short", retryLimit: 2, retryDelay: 300, retryBackoff: true, expireInSeconds: 900 },
  worker: { localConcurrency: 1, pollingIntervalSeconds: 10 },
  // The stories as they are when the job runs, not when it was queued.
  run: async (jobs) => { for (const { slug } of jobs) await groupSituation(slug, (await membersBySituation()).get(slug) ?? []); },
});

/**
 * The hand-made sample pages (myfnb/samples) for the owners' feedback round (HANDOFF §9.1): at an address only
 * the user hands out, kept from search engines. Removed with the samples once that round is over.
 */
export const SAMPLE_PATH = "/s/xxrjcgidcy";
const SAMPLE_FILE = new URL("../../myfnb/samples/v2-busy-no-profit.html", import.meta.url);

/** Shared caches keep a page as long as the engine keeps its topic pages: a minute. */
const CACHE = "public, max-age=60, stale-while-revalidate=60";

export default defineServerModule({
  name: "reference",
  models: {
    [MODEL_STEP]: { label: "参考库的故事（入选内容写成故事，并放进老板遇到的情况）", env: "REFERENCE_CASE_MODEL", purposes: ["reference_case"] },
    [BODY_STEP]: { label: "条目页的正文（不是参考库故事的条目，整理自原文，写在导读下面）", env: "REFERENCE_BODY_MODEL", purposes: ["reference_body"] },
    [METHODS_STEP]: { label: "参考库的做法（同一种情况里说同一种做法的故事归在一起）", env: "REFERENCE_METHODS_MODEL", purposes: ["reference_methods"] },
  },
  queues: [CASES, BODIES, METHODS],
  // llms.txt names the library beside the engine's pages.
  llms: () => ({
    pages: [`- [参考](${config.siteUrl}/reference): 按遇到的事，查各地店家的做法和经验；说同一种做法的各家店归在一起，每个故事附原文出处`],
  }),
  sitemap: { entries: () => sitemapEntries() },
  schedules: [{
    name: "reference.cases",
    cron: "*/10 * * * *",
    run: async () => {
      if (!config.modelCallsEnabled) return { queued: 0, reason: "model calls are off" };
      const ids = await articlesToWrite(30);
      for (const articleId of ids) await enqueueOn(CASES, { articleId }, { singletonKey: articleId });
      return { queued: ids.length };
    },
  }, {
    // Every listed item of the last days that is no story gets its write-up; older ones wait for the rewrite script.
    name: "reference.bodies",
    cron: "*/10 * * * *",
    run: async () => {
      if (!config.modelCallsEnabled) return { queued: 0, reason: "model calls are off" };
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
  }],
  http: (app) => {
    app.get(SAMPLE_PATH, async (_req, reply) => reply.header("Cache-Control", "no-store").header("X-Robots-Tag", "noindex").type("text/html; charset=utf-8")
      .send(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex"><style>body{margin:0}</style></head><body>${readFileSync(SAMPLE_FILE, "utf8")}</body></html>`));
    app.get("/api/reference", async (_req, reply) => reply.header("Cache-Control", CACHE).send(await readHome()));
    // Written, not written (thin: too little or only news), held by the checks, and still to write.
    app.get("/api/reference/status", async (_req, reply) =>
      reply.header("Cache-Control", "no-store").send({
        ...(await readStatus()), waiting: (await articlesToWrite(1000)).length,
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
          result: r.status === "thin" ? "thin" : r.status === "held" ? "held" : r.problems.length ? "held, earlier kept" : "written",
          problems: r.status === "thin" ? [] : [...new Set(r.problems.map(problemKind))],
        })),
        // What myfnb/rewrite-reference.ts would write under the current prompts: old ones, and older items never written up.
        toRewrite: { stories: (await articlesToWrite(5000, new Date(), { all: true })).length, bodies: (await articlesToBody(5000, new Date(), { all: true })).length },
      }));
    app.get("/api/reference/situations/:slug", async (req, reply) => {
      const page = await readSituation((req.params as { slug: string }).slug);
      return page ? reply.header("Cache-Control", CACHE).send(page) : reply.code(404).send({ error: "not found" });
    });
    app.get("/api/reference/cases/:id", async (req, reply) => {
      const page = await readCase((req.params as { id: string }).id);
      return page ? reply.header("Cache-Control", CACHE).send(page) : reply.code(404).send({ error: "not found" });
    });
    // The item page's block (web/item-part.tsx): the item's story, or its write-up; 404 for neither.
    app.get("/api/reference/items/:id", async (req, reply) => {
      const text = await readItemText((req.params as { id: string }).id);
      return text ? reply.header("Cache-Control", CACHE).send(text) : reply.code(404).send({ error: "not found" });
    });
    app.get("/api/reference/shops/:key", async (req, reply) => {
      const page = await readShop((req.params as { key: string }).key);
      return page ? reply.header("Cache-Control", CACHE).send(page) : reply.code(404).send({ error: "not found" });
    });
  },
});
