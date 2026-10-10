// An episode's transcript for the writers: the one its host published is read where the feed names one; else the
// audio goes to a speech model (Whisper, at Groq) and comes back as the spoken text. Either way it becomes the
// article's body (a new revision, analysed again). The transcript is read by the
// models only; readers see the site's own summary and story, never the full text (site_fulltext is off).
// The call goes through the engine's receipts and budget, and it is not made while the service has no
// budget row (receipts.ts treats a service without one as unlimited).
import { sql } from "@aihot/backend/db";
import { config, credential } from "@aihot/backend/config";
import { upsertMaterial } from "@aihot/backend/content/materials";
import { UNDERSTAND_FLOOR } from "@aihot/backend/editorial/analyze";
import { queueProcessing } from "@aihot/backend/jobs/content";
import { guardedFetch } from "@aihot/backend/lib/http-fetch";
import { assertAccepted, BudgetExceededError, completeReceipt, paidRequest, ProviderRejectedError } from "@aihot/backend/providers/receipts";

export const SERVICE = "transcribe";
/**
 * The speech model and where it is called; tests point the address at a stub. Whisper writes what is said and no
 * more. Measured 10/10 on episodes whose hosts published transcripts: Gemini 3.5 Flash-Lite, used until then, kept
 * half the words or fewer in six of thirteen and repeated itself up to its output ceiling in two; Gemini 3.8 Flash
 * repeated itself in one of four; Whisper kept 96–98% of the words in all of them, in seconds. Groq's terms keep
 * inputs and outputs from training, on its free tier too (console.groq.com/docs, read 2026-10-10).
 */
export const SPEECH = { base: "https://api.groq.com/openai/v1", model: "whisper-large-v3-turbo" };
const MAX_AUDIO_BYTES = 300 * 1024 * 1024;
/**
 * What one request carries: Groq takes 25MB a file on its free tier (100MB paid), and it cannot fetch a host's
 * address itself (Buzzsprout answered it 403), so the audio is downloaded here and longer audio goes in parts.
 */
export const PART_BYTES = { max: 24 * 1024 * 1024 };

/**
 * Episodes to transcribe next, of sources still collected (one stopped for its terms is not read again): with an audio file and not done; from the archive those whose notes scored at least the
 * understand floor, and every new episode that passed the prefilter, listed or still waiting for its content (notes
 * that only say what the episode will discuss get no summary and wait, prompts/content-understanding.md), first.
 * Those whose host published a transcript come before all: reading one is not paid and not rate-limited, and while
 * the speech service turned the first few away (10/10, a day's ceiling) the same few were asked again every run.
 * A failure is tried again once the model is another than the one it failed with (its error starts with that model).
 */
export async function episodesToTranscribe(limit: number): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    SELECT e.article_id AS id FROM archive_episodes e
    JOIN articles a ON a.id = e.article_id
    JOIN sources s ON s.id = a.source_id AND s.enabled
    JOIN LATERAL (SELECT score, relevance FROM analyses n WHERE n.article_id = a.id AND n.input_revision = a.revision ORDER BY n.id DESC LIMIT 1) n ON true
    WHERE (e.audio_url IS NOT NULL OR e.transcript_url IS NOT NULL) AND (n.score >= ${UNDERSTAND_FLOOR} OR (NOT a.backfill AND n.relevance IN ('pass', 'unknown')))
      AND (e.status = 'imported' OR (e.status = 'failed' AND e.error NOT LIKE ${`${SPEECH.model}:%`}))
    ORDER BY e.transcript_url IS NULL, a.backfill, n.score DESC, a.published_at DESC LIMIT ${limit}`;
  return rows.map((r) => r.id);
}

/** The file name a part goes under: the service reads the format from it. */
const fileName = (mime: string) => `episode.${/mp4|m4a|aac/.test(mime) ? "m4a" : /ogg|opus/.test(mime) ? "ogg" : /wav/.test(mime) ? "wav" : /webm/.test(mime) ? "webm" : /flac/.test(mime) ? "flac" : "mp3"}`;

/** One request: a whole file, or a part of an MP3. */
async function transcribePart(part: Uint8Array, mime: string, key: string): Promise<{ text: string; seconds: number }> {
  const form = new FormData();
  form.set("model", SPEECH.model);
  form.set("file", new Blob([new Uint8Array(part)], { type: mime }), fileName(mime));
  form.set("response_format", "verbose_json");
  const res = await fetch(`${SPEECH.base}/audio/transcriptions`, { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(600_000) });
  // An answer outside 2xx: the service did not take the request (a rate limit or server error may pass, receipts.ts).
  if (!res.ok) assertAccepted(SERVICE, res.status, await res.text());
  const out = (await res.json()) as { text?: string; duration?: number };
  return { text: (out.text ?? "").trim(), seconds: out.duration ?? 0 };
}

/**
 * The audio as text. An MP3 over one request's size goes in parts: its frames stand alone, so a cut costs a word at
 * most. Another format has to fit one request.
 */
async function transcribeAudio(audio: Buffer, mime: string, key: string): Promise<{ text: string; usage: Record<string, unknown> }> {
  if (audio.length > PART_BYTES.max && mime !== "audio/mpeg") throw new ProviderRejectedError(`audio: ${mime} of ${audio.length} bytes is over one request's size`, null, false);
  const texts: string[] = [];
  let seconds = 0;
  for (let at = 0; at < audio.length; at += PART_BYTES.max) {
    const part = await transcribePart(audio.subarray(at, at + PART_BYTES.max), mime, key);
    texts.push(part.text);
    seconds += part.seconds;
  }
  return { text: texts.filter(Boolean).join("\n"), usage: { audio_seconds: Math.round(seconds), parts: texts.length } };
}

/**
 * The spoken text of a transcript file as hosts publish them: WebVTT and SubRip without their cue numbers, times and
 * tags (a voice tag becomes the speaker's name), the JSON form's segments, a page without its markup.
 */
export function transcriptText(raw: string): string {
  const text = raw.replace(/^﻿/, "").trim();
  if (text.startsWith("{")) {
    try {
      const segments = (JSON.parse(text) as { segments?: Array<{ speaker?: string; body?: string; text?: string }> }).segments ?? [];
      let last = "";
      return segments.map((s) => {
        const said = (s.body ?? s.text ?? "").trim();
        const who = s.speaker && s.speaker !== last ? `\n${(last = s.speaker)}：` : "";
        return said ? `${who}${said}` : "";
      }).filter(Boolean).join(" ").trim();
    } catch {
      return "";
    }
  }
  const page = /<\/(?:p|div|html)>/i.test(text);
  const lines = (page ? text.replace(/<(?:script|style)[\s\S]*?<\/(?:script|style)>/gi, " ").replace(/<\/(?:p|div|li|h\d)>|<br\s*\/?>/gi, "\n") : text).split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const said = line.replace(/<v\s+([^>]+)>/g, "$1：").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
    // A cue's number, its times, the file's header and notes say nothing.
    if (!said || /^\d+$/.test(said) || said.includes("-->") || /^(?:WEBVTT|NOTE|STYLE|Kind:|Language:)/.test(said)) continue;
    if (out.at(-1) !== said) out.push(said);
  }
  return out.join("\n").trim();
}

export interface TranscribeResult {
  status: "transcribed" | "failed" | "skipped";
  chars?: number;
  error?: string;
}

/**
 * Makes an episode's transcript its body; the engine analyses the new revision. The transcript its host already made
 * is read where the feed names one (nothing is paid and no audio leaves for a model); else the audio is transcribed.
 */
export async function transcribeEpisode(articleId: string): Promise<TranscribeResult> {
  if (!config.modelCallsEnabled) return { status: "skipped", error: "model calls are off" };
  const [row] = await sql<{ audio_url: string | null; transcript_url: string | null; status: string; source_id: string; url: string; identity_key: string; title: string }[]>`
    SELECT e.audio_url, e.transcript_url, e.status, a.source_id, a.url, a.identity_key, a.title FROM archive_episodes e JOIN articles a ON a.id = e.article_id
    WHERE e.article_id = ${articleId}`;
  if (!row || row.status === "transcribed") return { status: "skipped" };
  if (row.transcript_url) {
    // A transcript that cannot be read or says too little is no failure of the episode: its audio is transcribed.
    const file = await guardedFetch(row.transcript_url, { timeoutMs: 60_000, maxBytes: 10 * 1024 * 1024, maxRedirects: 5 }).catch(() => null);
    const text = file?.status === 200 ? transcriptText(file.text()) : "";
    if (text.length >= 200) {
      await sql.begin(async (tx) => {
        await upsertMaterial({ sourceId: row.source_id, url: row.url, identityKey: row.identity_key, title: row.title, bodyText: text, bodyStatus: "ok", via: "archive" }, tx);
        await tx`UPDATE archive_episodes SET status = 'transcribed', transcript_chars = ${text.length}, error = NULL, updated_at = now() WHERE article_id = ${articleId}`;
      });
      await queueProcessing(articleId);
      return { status: "transcribed", chars: text.length };
    }
  }
  if (!row.audio_url) return { status: "skipped" };
  const [budget] = await sql`SELECT 1 FROM budgets WHERE service = ${SERVICE}`;
  if (!budget) return { status: "skipped", error: `no budget row for ${SERVICE}` };
  const key = credential("models", "GROQ_API_KEY");
  if (!key) return { status: "skipped", error: "GROQ_API_KEY missing" };
  try {
    const receipt = await paidRequest(
      { service: SERVICE, model: SPEECH.model, purpose: "transcribe_episode", subject: `article:${articleId}`, identity: { model: SPEECH.model, audio: row.audio_url }, requestSummary: { audio: row.audio_url } },
      async () => {
        // Nothing reached the service yet: a failed download is a refusal, never an unknown paid outcome.
        const file = await guardedFetch(row.audio_url!, { timeoutMs: 600_000, maxBytes: MAX_AUDIO_BYTES, maxRedirects: 8 })
          .catch((error) => { throw new ProviderRejectedError(`audio: ${String(error)}`, null, true); });
        if (file.status !== 200) throw new ProviderRejectedError(`audio: HTTP ${file.status}`, file.status, file.status === 429 || file.status >= 500);
        const mime = (file.headers.get("content-type") ?? "").split(";")[0]!.trim();
        const out = await transcribeAudio(file.body, /^audio\//.test(mime) && !/mpeg|mp3/.test(mime) ? mime : "audio/mpeg", key);
        return { response: { ...out, bytes: file.body.length }, usage: out.usage };
      },
    );
    const { text } = receipt.response as { text: string };
    if (text.length < 200) throw new Error(`transcript too short (${text.length} chars)`);
    await sql.begin(async (tx) => {
      // Same identity, same source: a new revision of the article, analysed again from the transcript.
      await upsertMaterial({ sourceId: row.source_id, url: row.url, identityKey: row.identity_key, title: row.title, bodyText: text, bodyStatus: "ok", via: "archive" }, tx);
      await tx`UPDATE archive_episodes SET status = 'transcribed', transcript_chars = ${text.length}, receipt_id = ${receipt.receiptId}, error = NULL, updated_at = now() WHERE article_id = ${articleId}`;
      await completeReceipt(tx, receipt.receiptId);
    });
    await queueProcessing(articleId);
    return { status: "transcribed", chars: text.length };
  } catch (error) {
    const cause = (error as Error).cause;
    // The model first: a failure is tried again only under another model (episodesToTranscribe).
    const message = `${SPEECH.model}: ${String((error as Error).message ?? error)}${cause ? ` (${String((cause as Error).message ?? cause)})` : ""}`.slice(0, 1000);
    // A full budget, a rate limit or a server error is no fault of the episode: it stays imported and is tried again later.
    if (error instanceof BudgetExceededError || (error instanceof ProviderRejectedError && error.retryable)) return { status: "skipped", error: message };
    await sql`UPDATE archive_episodes SET status = 'failed', error = ${message}, updated_at = now() WHERE article_id = ${articleId}`;
    return { status: "failed", error: message };
  }
}
