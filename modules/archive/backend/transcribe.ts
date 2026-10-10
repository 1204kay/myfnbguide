// Transcribing a podcast episode for the writers: the audio goes to Gemini's Files API and comes back as the
// spoken text, which becomes the article's body (a new revision, analysed again). The transcript is read by the
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
 * Gemini's address and model; tests point the address at a stub. Free tier (no card): no charge, Google may use the
 * audio. 2.5 models are only open to projects that used them before (ai.google.dev/gemini-api/docs/models, 2026-10-04).
 */
export const GEMINI = { base: "https://generativelanguage.googleapis.com", model: "gemini-3.5-flash-lite" };
const MAX_AUDIO_BYTES = 300 * 1024 * 1024;

const PROMPT = [
  "请把这段播客音频转写成文字。",
  "保持原来的语言，不翻译；逐句照录说话的内容，不总结、不改写、不评论。",
  "按说话的人分段，能分辨时在段首写说话人的名字或身份（例如“主持人：”）。",
  "片头片尾的音乐和与节目内容无关的广告不必转写。",
  "只输出转写的文字。",
].join("\n");

/**
 * Episodes to transcribe next, of sources still collected (one stopped for its terms is not read again): with an audio file and not done; from the archive those whose notes scored at least the
 * understand floor, and every new episode that passed the prefilter, listed or still waiting for its content (notes
 * that only say what the episode will discuss get no summary and wait, prompts/content-understanding.md), first.
 * A failure is tried again once the model is another than the one it failed with (its error starts with that model).
 */
export async function episodesToTranscribe(limit: number): Promise<string[]> {
  const rows = await sql<{ id: string }[]>`
    SELECT e.article_id AS id FROM archive_episodes e
    JOIN articles a ON a.id = e.article_id
    JOIN sources s ON s.id = a.source_id AND s.enabled
    JOIN LATERAL (SELECT score, relevance FROM analyses n WHERE n.article_id = a.id AND n.input_revision = a.revision ORDER BY n.id DESC LIMIT 1) n ON true
    WHERE (e.audio_url IS NOT NULL OR e.transcript_url IS NOT NULL) AND (n.score >= ${UNDERSTAND_FLOOR} OR (NOT a.backfill AND n.relevance IN ('pass', 'unknown')))
      AND (e.status = 'imported' OR (e.status = 'failed' AND e.error NOT LIKE ${`${GEMINI.model}:%`}))
    ORDER BY a.backfill, n.score DESC, a.published_at DESC LIMIT ${limit}`;
  return rows.map((r) => r.id);
}

async function gemini(path: string, init: RequestInit & { headers?: Record<string, string> }, key: string): Promise<Response> {
  const res = await fetch(`${GEMINI.base}${path}`, { ...init, headers: { "x-goog-api-key": key, ...init.headers }, signal: AbortSignal.timeout(600_000) });
  // An answer outside 2xx: Gemini did not take the request (a rate limit or server error may pass, receipts.ts).
  if (!res.ok) assertAccepted(SERVICE, res.status, await res.text());
  return res;
}

/** The audio as text: upload, wait until the file is ready, transcribe, delete the file. */
async function transcribeAudio(audio: Buffer, mimeType: string, name: string, key: string): Promise<{ text: string; usage: Record<string, unknown> | null; finish: string | null }> {
  const start = await gemini("/upload/v1beta/files", {
    method: "POST",
    headers: { "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start", "X-Goog-Upload-Header-Content-Length": String(audio.length), "X-Goog-Upload-Header-Content-Type": mimeType, "Content-Type": "application/json" },
    body: JSON.stringify({ file: { display_name: name } }),
  }, key);
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("gemini: no upload url");
  // fetch sets Content-Length from the body itself (undici refuses one given by hand).
  const done = await fetch(uploadUrl, { method: "POST", headers: { "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" }, body: new Uint8Array(audio), signal: AbortSignal.timeout(600_000) });
  if (!done.ok) assertAccepted(SERVICE, done.status, await done.text());
  let file = ((await done.json()) as { file: { name: string; uri: string; state?: string } }).file;
  try {
    for (let i = 0; file.state && file.state !== "ACTIVE"; i++) {
      if (file.state === "FAILED" || i > 60) throw new Error(`gemini file ${file.state}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      file = (await (await gemini(`/v1beta/${file.name}`, {}, key)).json()) as typeof file;
    }
    const res = await gemini(`/v1beta/models/${GEMINI.model}:generateContent`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT }, { file_data: { mime_type: mimeType, file_uri: file.uri } }] }], generationConfig: { temperature: 0, maxOutputTokens: 65536 } }),
    }, key);
    const out = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>; usageMetadata?: Record<string, unknown> };
    const text = (out.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    return { text, usage: out.usageMetadata ?? null, finish: out.candidates?.[0]?.finishReason ?? null };
  } finally {
    await gemini(`/v1beta/${file.name}`, { method: "DELETE" }, key).catch(() => undefined);
  }
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
  // The site's own Google AI Studio key (free tier). Grouping does not use it: transcripts used up the free quota the
  // embeddings shared, and grouping failed on almost every item (10/2–10/8), so the engine compares texts instead.
  const key = credential("models", "GEMINI_API_KEY");
  if (!key) return { status: "skipped", error: "GEMINI_API_KEY missing" };
  try {
    const receipt = await paidRequest(
      { service: SERVICE, model: GEMINI.model, purpose: "transcribe_episode", subject: `article:${articleId}`, identity: { model: GEMINI.model, audio: row.audio_url, prompt: PROMPT }, requestSummary: { audio: row.audio_url } },
      async () => {
        // Nothing reached Gemini yet: a failed download is a refusal, never an unknown paid outcome.
        const file = await guardedFetch(row.audio_url!, { timeoutMs: 600_000, maxBytes: MAX_AUDIO_BYTES, maxRedirects: 8 })
          .catch((error) => { throw new ProviderRejectedError(`audio: ${String(error)}`, null, true); });
        if (file.status !== 200) throw new ProviderRejectedError(`audio: HTTP ${file.status}`, file.status, file.status === 429 || file.status >= 500);
        const mime = (file.headers.get("content-type") ?? "").split(";")[0]!.trim();
        const out = await transcribeAudio(file.body, /^audio\//.test(mime) ? mime : "audio/mpeg", articleId, key);
        return { response: { ...out, bytes: file.body.length }, usage: out.usage };
      },
    );
    const { text, finish } = receipt.response as { text: string; finish: string | null };
    if (text.length < 200) throw new Error(`transcript too short (${text.length} chars, finish ${finish})`);
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
    const message = `${GEMINI.model}: ${String((error as Error).message ?? error)}${cause ? ` (${String((cause as Error).message ?? cause)})` : ""}`.slice(0, 1000);
    // A full budget, a rate limit or a server error is no fault of the episode: it stays imported and is tried again later.
    if (error instanceof BudgetExceededError || (error instanceof ProviderRejectedError && error.retryable)) return { status: "skipped", error: message };
    await sql`UPDATE archive_episodes SET status = 'failed', error = ${message}, updated_at = now() WHERE article_id = ${articleId}`;
    return { status: "failed", error: message };
  }
}
