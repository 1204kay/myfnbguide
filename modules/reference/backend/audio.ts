// 十一说 read aloud (Kay 10-23 chose player B: a 听 button in the top bar, then a bar at the bottom while it plays).
// The audio is made off the server (Qwen3-TTS, one fixed voice Kay picked; the server's 4 GB cannot hold the model) and
// put in the data volume as <no>.mp3 with <no>.json beside it ({"seconds": n}) by myfnb/issue-audio.sh. An issue
// without both files has no audio and its page shows no 听 button, so the page code can ship before any audio does.
// <no>.txt, when there, is the listen script the voice read (Kay 10-31: a transcript to follow while listening, as
// 樊登 and 小宇宙 have); it is not the page's text, which is written to be read (no "回到英国" between news items).
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { config } from "@aihot/backend/config";

const DIR = path.join(config.dataDir, "reference", "audio");

/** The listen script's lines as the 文字稿 shows them; `starts` in <no>.json counts the same lines. */
export const scriptLines = (script: string) => script.split(/\n+/u).map((l) => l.trim()).filter(Boolean);

/**
 * The issue's audio as its page needs it, or null when it has none. `starts`, when <no>.json has them for each line
 * of the 文字稿 (backend/voice.ts lineStarts), lets the 文字稿 follow the voice; otherwise it is shown whole.
 */
export async function issueAudio(no: number): Promise<{ url: string; seconds: number; transcript: string[] | null; starts?: number[] } | null> {
  try {
    const [meta] = await Promise.all([readFile(path.join(DIR, `${no}.json`), "utf8"), stat(path.join(DIR, `${no}.mp3`))]);
    const json = JSON.parse(meta) as { seconds?: unknown; starts?: unknown };
    const seconds = Number(json.seconds);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    const script = await readFile(path.join(DIR, `${no}.txt`), "utf8").catch(() => "");
    const lines = scriptLines(script);
    const starts = Array.isArray(json.starts) && json.starts.length === lines.length && json.starts.every((t) => typeof t === "number") ? json.starts as number[] : undefined;
    return { url: `/api/reference/issues/${no}/audio.mp3`, seconds: Math.round(seconds), transcript: lines.length ? lines : null, ...(starts && lines.length ? { starts } : {}) };
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
