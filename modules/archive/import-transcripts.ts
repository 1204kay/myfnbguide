// Stores transcripts made outside the server with the same speech model (whisper-large-v3-turbo, run on a local
// GPU) for episodes still waiting in the queue: the free tier takes about 16 hours of audio a day, and the 10/10
// archive picks queued several hundred hours. One JSON line an episode, {"id": article id, "text": transcript},
// on stdin; an episode already transcribed, or a text under 200 characters, is left as it is.
//   sudo docker compose exec -T worker node modules/archive/import-transcripts.ts < transcripts.jsonl
import { createInterface } from "node:readline";
import { closeDb, sql } from "@aihot/backend/db";
import { storeTranscript } from "./backend/transcribe.ts";

const counts = { stored: 0, done: 0, short: 0, missing: 0 };
for await (const line of createInterface({ input: process.stdin })) {
  if (!line.trim()) continue;
  const { id, text } = JSON.parse(line) as { id: string; text: string };
  const [row] = await sql<{ status: string; source_id: string; url: string; identity_key: string; title: string }[]>`
    SELECT e.status, a.source_id, a.url, a.identity_key, a.title FROM archive_episodes e JOIN articles a ON a.id = e.article_id
    WHERE e.article_id = ${id}`;
  if (!row) counts.missing++;
  else if (row.status === "transcribed") counts.done++;
  else if (text.length < 200) counts.short++;
  else {
    await storeTranscript(id, row, text);
    counts.stored++;
  }
}
console.log(`已存入 ${counts.stored}，已转写过 ${counts.done}，太短 ${counts.short}，找不到 ${counts.missing}`);
await closeDb();
