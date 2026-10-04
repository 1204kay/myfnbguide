// The archive's backend: an hourly import of the sources it opens that have not been taken in yet, a queue
// that transcribes podcast episodes one at a time, and its status in numbers.
import { defineQueue, defineServerModule } from "@aihot/backend/modules";
import { enqueueOn } from "@aihot/backend/jobs/queue";
import { sql } from "@aihot/backend/db";
import { ARCHIVE } from "./plan.ts";
import { importSource } from "./backend/importer.ts";
import { episodesToTranscribe, transcribeEpisode } from "./backend/transcribe.ts";

const TRANSCRIBE = defineQueue<{ articleId: string }>({
  name: "archive.transcribe",
  options: { policy: "short", retryLimit: 1, retryDelay: 600, expireInSeconds: 1800 },
  worker: { localConcurrency: 1, pollingIntervalSeconds: 10 },
  run: ({ articleId }) => transcribeEpisode(articleId),
});

export default defineServerModule({
  name: "archive",
  queues: [TRANSCRIBE],
  schedules: [
    {
      name: "archive.import",
      cron: "20 * * * *",
      // Reading feeds is collection: off unless COLLECT_ENABLED, like the engine's.
      when: () => process.env.COLLECT_ENABLED === "true",
      run: async () => {
        const done = new Set((await sql<{ source_id: string }[]>`SELECT source_id FROM archive_sources WHERE finished_at IS NOT NULL`).map((r) => r.source_id));
        const results = [];
        for (const plan of ARCHIVE.filter((p) => !done.has(p.id))) results.push(await importSource(plan));
        return { imported: results };
      },
    },
    {
      name: "archive.transcribe",
      cron: "*/10 * * * *",
      run: async () => {
        const ids = await episodesToTranscribe(3);
        for (const articleId of ids) await enqueueOn(TRANSCRIBE, { articleId }, { singletonKey: articleId });
        return { queued: ids.length };
      },
    },
  ],
  http: (app) => {
    // In numbers: each source's import, its entries by status, why transcriptions failed (the start of each
    // error, which names no secret), and how many wait for transcription (notes at least at the floor).
    app.get("/api/archive/status", async (_req, reply) => {
      const sources = await sql`SELECT source_id, pages, found, finished_at, left(error, 200) AS error FROM archive_sources ORDER BY source_id`;
      const episodes = await sql`SELECT source_id, status, count(*)::int AS n, sum(transcript_chars)::int AS chars FROM archive_episodes GROUP BY 1, 2 ORDER BY 1, 2`;
      const failures = await sql`SELECT left(error, 160) AS error, count(*)::int AS n FROM archive_episodes WHERE status = 'failed' GROUP BY 1 ORDER BY 2 DESC`;
      return reply.header("Cache-Control", "no-store").send({ sources, episodes, failures, waiting: (await episodesToTranscribe(1000)).length });
    });
  },
});
