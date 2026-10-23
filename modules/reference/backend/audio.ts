// 十一说 read aloud (Kay 10-23 chose player B: a 听 button in the top bar, then a bar at the bottom while it plays).
// The audio is made off the server (Qwen3-TTS, one fixed voice Kay picked; the server's 4 GB cannot hold the model) and
// put in the data volume as <no>.mp3 with <no>.json beside it ({"seconds": n}) by myfnb/issue-audio.sh. An issue
// without both files has no audio and its page shows no 听 button, so the page code can ship before any audio does.
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "@aihot/backend/config";

const DIR = path.join(config.dataDir, "reference", "audio");

/** The issue's audio as its page needs it, or null when it has none. */
export async function issueAudio(no: number): Promise<{ url: string; seconds: number } | null> {
  try {
    const [meta] = await Promise.all([readFile(path.join(DIR, `${no}.json`), "utf8"), stat(path.join(DIR, `${no}.mp3`))]);
    const seconds = Number((JSON.parse(meta) as { seconds?: unknown }).seconds);
    return Number.isFinite(seconds) && seconds > 0 ? { url: `/api/reference/issues/${no}/audio.mp3`, seconds: Math.round(seconds) } : null;
  } catch {
    return null;
  }
}

/**
 * The mp3 with byte ranges: Safari will not play (or seek) a media file whose server ignores Range, so this cannot
 * go through static.ts sendFile, which sends the whole file each time.
 */
export async function sendIssueAudio(req: FastifyRequest, reply: FastifyReply, no: number) {
  const file = path.join(DIR, `${no}.mp3`);
  const size = await stat(file).then((s) => s.size, () => null);
  if (size === null) return reply.code(404).type("text/plain; charset=utf-8").send("Not found");
  reply.header("Content-Type", "audio/mpeg").header("Accept-Ranges", "bytes").header("Cache-Control", "public, max-age=3600");
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ""));
  if (!m || (!m[1] && !m[2])) return reply.header("Content-Length", size).send(createReadStream(file));
  // "bytes=-n" is the last n bytes.
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (start >= size || start > end) return reply.code(416).header("Content-Range", `bytes */${size}`).send();
  return reply.code(206).header("Content-Range", `bytes ${start}-${end}/${size}`).header("Content-Length", end - start + 1)
    .send(createReadStream(file, { start, end }));
}
