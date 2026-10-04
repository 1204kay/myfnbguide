// The reference library's backend: a schedule finds selected items without a case and queues them, the
// queue writes each case (backend/write.ts), and the api answers the pages (backend/read.ts).
import { readFileSync } from "node:fs";
import { config } from "@aihot/backend/config";
import { defineQueue, defineServerModule } from "@aihot/backend/modules";
import { enqueueOn } from "@aihot/backend/jobs/queue";
import { readCase, readHome, readKind, readShop, readSituation, readStatus } from "./backend/read.ts";
import { articlesToWrite, MODEL_STEP, writeCase } from "./backend/write.ts";

const CASES = defineQueue<{ articleId: string }>({
  name: "reference.case",
  options: { policy: "short", retryLimit: 3, retryDelay: 120, retryBackoff: true, expireInSeconds: 900 },
  worker: { localConcurrency: 2, pollingIntervalSeconds: 5 },
  run: ({ articleId }) => writeCase(articleId),
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
  },
  queues: [CASES],
  schedules: [{
    name: "reference.cases",
    cron: "*/10 * * * *",
    run: async () => {
      if (!config.modelCallsEnabled) return { queued: 0, reason: "model calls are off" };
      const ids = await articlesToWrite(30);
      for (const articleId of ids) await enqueueOn(CASES, { articleId }, { singletonKey: articleId });
      return { queued: ids.length };
    },
  }],
  http: (app) => {
    app.get(SAMPLE_PATH, async (_req, reply) => reply.header("Cache-Control", "no-store").header("X-Robots-Tag", "noindex").type("text/html; charset=utf-8")
      .send(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex"><style>body{margin:0}</style></head><body>${readFileSync(SAMPLE_FILE, "utf8")}</body></html>`));
    app.get("/api/reference", async (_req, reply) => reply.header("Cache-Control", CACHE).send(await readHome()));
    // Written, not written (thin: too little or only news), held by the checks, and still to write.
    app.get("/api/reference/status", async (_req, reply) =>
      reply.header("Cache-Control", "no-store").send({ ...(await readStatus()), waiting: (await articlesToWrite(1000)).length }));
    app.get("/api/reference/situations/:slug", async (req, reply) => {
      const page = await readSituation((req.params as { slug: string }).slug);
      return page ? reply.header("Cache-Control", CACHE).send(page) : reply.code(404).send({ error: "not found" });
    });
    app.get("/api/reference/cases/:id", async (req, reply) => {
      const page = await readCase((req.params as { id: string }).id);
      return page ? reply.header("Cache-Control", CACHE).send(page) : reply.code(404).send({ error: "not found" });
    });
    app.get("/api/reference/kinds/:slug", async (req, reply) => {
      const page = await readKind((req.params as { slug: string }).slug);
      return page ? reply.header("Cache-Control", CACHE).send(page) : reply.code(404).send({ error: "not found" });
    });
    app.get("/api/reference/shops/:key", async (req, reply) => {
      const page = await readShop((req.params as { key: string }).key);
      return page ? reply.header("Cache-Control", CACHE).send(page) : reply.code(404).send({ error: "not found" });
    });
  },
});
