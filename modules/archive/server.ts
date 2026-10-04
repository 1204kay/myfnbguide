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
        const done = new Set((await sql<{ source_id: string }[]>`SELECT DISTINCT source_id FROM archive_episodes`).map((r) => r.source_id));
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
    // Episodes by status, and how many wait for transcription (their notes scored at least the floor).
    app.get("/api/archive/status", async (_req, reply) => {
      const rows = await sql<{ source_id: string; status: string; n: number; chars: number | null }[]>`
        SELECT source_id, status, count(*)::int AS n, sum(transcript_chars)::int AS chars FROM archive_episodes GROUP BY 1, 2 ORDER BY 1, 2`;
      return reply.header("Cache-Control", "no-store").send({ episodes: rows, waiting: (await episodesToTranscribe(1000)).length });
    });
  },
});
