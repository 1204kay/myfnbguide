// 十一说's Claude steps through Anthropic's own Messages API, so the check can read the originals from the prompt cache
// (Kay 11-02 06:56 「你们讨论决定」; plan: Core System Studio artifact 24ernjsuzJtJtgD57TRBSs). The framework's chatJson
// talks to every model through the OpenAI-compatible endpoint, and Anthropic's page for that endpoint says 「Prompt
// caching is not supported」 (platform.claude.com/docs/en/api/openai-sdk, read 11-02). Issue 6 (10-30) checked one draft
// ten times, each time with the same ~30,000 tokens of originals, read at full price.
//
// Kept in the module, not in packages/: the framework stays the original's (myfnb/DIFFERENCES.md). It is chatJson's
// chatOnce with another endpoint, through the same receipts, budget and switch (MODEL_CALLS_ENABLED); what the model is
// asked does not change. Thinking: the compatible endpoint sends none and Opus 5.5 thinks adaptively at its default
// effort, which is what a request with no `thinking` and no `effort` gets here too; a preset's own `thinking` (Haiku,
// Sonnet) goes through as it did. Sampling settings are left out: API version 2026-10-21 refuses any.
import { setTimeout as sleep } from "node:timers/promises";
import type { z } from "zod";
import { config, credential } from "@aihot/backend/config";
import { sha256 } from "@aihot/backend/lib/ids";
import { escapeControlCharsInStrings, MODELS, type ChatJsonResult, type ModelSpec } from "@aihot/backend/providers/llm";
import { assertAccepted, type CallOutcome, ModelOutputError, ModelUnavailableError, paidRequest, ProviderRejectedError, receiptState, ReceiptUnknownError, rejectReceivedResponse } from "@aihot/backend/providers/receipts";

/**
 * A user message in two parts: what several calls in a row send the same (the originals) comes first and is cached,
 * then what changes from call to call (the draft). A cache hit needs the whole prefix byte for byte, system prompt
 * included, so what changes has to come after.
 */
export interface Parts { cached: string; rest: string }
export const joined = (user: string | Parts) => (typeof user === "string" ? user : `${user.cached}\n\n${user.rest}`);

/**
 * One hour, not the default five minutes. A read refreshes the entry, but the lifetime runs from the start of each
 * request, and between two checks of one draft come the check's own thinking and often an editor's (each a minute or
 * more at 8,000 + 12,000 tokens): a five-minute entry missed would be written again at 1.25 times the price. Written
 * at twice the price, read at 0.05 times (Opus 5.5: US$8 and US$0.20 a million against US$4; pricing page, 11-02), it
 * pays from the third check that reads it.
 */
export const CACHE_TTL = "1h";
const API_VERSION = "2026-10-21";

/**
 * One run's calls through Message Batches, at half the price of every token, cache reads and writes included (pricing
 * page and batch-processing page, read 11-13: 「All usage is charged at 50 percent」, and the cache multipliers stack).
 * The request is the same one, so what the model is asked and how it answers do not change; only when the answer comes
 * does. Nobody waits on 十一说's check at 05:00, but the issue is due at 08:00 and a batch has no promised time (most end
 * within the hour, the page says; 11-09 two sat for three hours with nothing done). So each call is a batch of one that
 * is waited on for BATCH_TIMES.wait, and a run that has a call miss that, or has spent BATCH_TIMES.run in batches, sends
 * the rest of its calls straight to the Messages API as before: the worst morning costs what every morning did, one wait later.
 * A call is paid for twice, once at half price, only when its batch is answered after it was given up: not ended a
 * minute after the cancel, the submit's own answer lost on the way, or the worker stopped while it waited (nobody cancels that one).
 */
export interface BatchLane { off: boolean; waitedMs: number }
export const batchLane = (): BatchLane => ({ off: false, waitedMs: 0 });
/**
 * Milliseconds. `wait`, with the minute a cancel may take (`cancel`), stays under the receipts' ten (PENDING_STALE_MS),
 * after which a placeholder counts as lost. `run`: a run's calls took about 25 minutes sent straight (issue 14, 11-07:
 * 06:47–07:12); past this much spent in batches, the rest go straight.
 */
export const BATCH_TIMES = { wait: 7 * 60_000, run: 45 * 60_000, poll: 5_000, cancel: 60_000 };
export const laneOpen = (lane: BatchLane | undefined): lane is BatchLane => !!lane && !lane.off && lane.waitedMs < BATCH_TIMES.run;

export interface ClaudeJsonOptions<S extends z.ZodType> {
  model: string; purpose: string; subject: string; promptVersion: string;
  system: string; user: string | Parts; schema: S; maxTokens: number; timeoutMs: number; attemptTag?: string;
  /** The run's lane through Message Batches; without one the call goes straight. */
  batch?: BatchLane;
}

/** The Messages request: the system prompt, then the user message, its cached part first and marked. */
export function messagesBody(spec: ModelSpec, system: string, user: string | Parts, maxTokens: number): Record<string, unknown> {
  const content = typeof user === "string" ? [{ type: "text", text: user }] : [
    { type: "text", text: user.cached, cache_control: { type: "ephemeral", ttl: CACHE_TTL } },
    { type: "text", text: user.rest },
  ];
  const thinking = (spec.extra as { thinking?: unknown } | undefined)?.thinking;
  return {
    model: spec.model,
    // As chatOnce: never below 512, and room for thinking on top.
    max_tokens: Math.max(maxTokens, 512) + (spec.reasoningTokens ?? 0),
    ...(system ? { system } : {}),
    messages: [{ role: "user", content }],
    ...(thinking ? { thinking } : {}),
  };
}

interface MessagesResponse {
  content?: Array<{ type: string; text?: string }>;
  stop_reason?: string;
  usage?: Record<string, unknown>;
}

/**
 * Usage as the rest of the site reads it (credit.ts, the receipts pages, modelAsk's onUsage): prompt_tokens is all
 * that was read in, cached or not, as the compatible endpoint counted it; Anthropic's own fields stay beside it.
 */
export function usageOf(usage: Record<string, unknown> | undefined, batch = false): Record<string, unknown> | null {
  if (!usage) return null;
  const n = (k: string) => Number(usage[k] ?? 0) || 0;
  return {
    ...usage,
    prompt_tokens: n("input_tokens") + n("cache_creation_input_tokens") + n("cache_read_input_tokens"),
    completion_tokens: n("output_tokens"),
    // What credit.ts and gate.sh `board` halve the price by.
    ...(batch ? { batch: true } : {}),
  };
}

/** A batch of the one request (batch-processing page: `requests: [{ custom_id, params }]`, params a Messages request). */
export const batchBody = (body: Record<string, unknown>) => ({ requests: [{ custom_id: "r", params: body }] });

/** The message in a batch's results (one JSON object a line), or why there is none: errored, canceled and expired are not billed. */
export function batchMessage(results: string): { message: Record<string, unknown> } | { failed: string } {
  const line = results.split("\n").find((x) => x.trim());
  if (!line) return { failed: "no result" };
  const { result } = JSON.parse(line) as { result?: { type?: string; message?: Record<string, unknown>; error?: unknown } };
  if (result?.type === "succeeded" && result.message) return { message: result.message };
  return { failed: `${result?.type ?? "no result"}${result?.error ? ` ${JSON.stringify(result.error).slice(0, 300)}` : ""}` };
}

/** The answer's text: thinking blocks (empty unless asked for) are not the answer. */
export const answerText = (res: MessagesResponse) => (res.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");

function extractJson(text: string): unknown {
  let t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  if (fence) t = fence[1]!;
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1) throw new ModelOutputError("No JSON object in model output");
  const body = t.slice(start, end + 1);
  try {
    return JSON.parse(body);
  } catch {
    return JSON.parse(escapeControlCharsInStrings(body));
  }
}

export async function claudeJson<S extends z.ZodType>(opts: ClaudeJsonOptions<S>): Promise<ChatJsonResult<z.infer<S>>> {
  const spec = MODELS[opts.model];
  if (!spec) throw new Error(`Unknown model ${opts.model}`);
  if (!config.modelCallsEnabled) throw new ModelUnavailableError("Model calls are disabled (MODEL_CALLS_ENABLED=false)");
  const baseUrl = credential("models", spec.baseUrlEnv);
  const apiKey = credential("models", spec.apiKeyEnv);
  if (!baseUrl || !apiKey || !spec.model) throw new ModelUnavailableError(`Model ${opts.model} is not configured (${spec.baseUrlEnv}, ${spec.apiKeyEnv})`);

  const body = messagesBody(spec, opts.system, opts.user, opts.maxTokens);
  const userText = joined(opts.user);
  const cached = typeof opts.user === "string" ? null : sha256(opts.user.cached);
  const base = baseUrl.replace(/\/$/, "");
  const headers = { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": API_VERSION };
  const request = (api: "messages" | "batches") => ({
    service: spec.service, model: spec.model, purpose: opts.purpose, subject: opts.subject,
    identity: { api, model: spec.model, promptVersion: opts.promptVersion, system: sha256(opts.system), user: sha256(userText), cached, maxTokens: body.max_tokens, thinking: body.thinking ?? null },
    requestSummary: { api, promptVersion: opts.promptVersion, systemHash: sha256(opts.system), userHash: sha256(userText), userChars: userText.length, cachedChars: typeof opts.user === "string" ? 0 : opts.user.cached.length, maxTokens: body.max_tokens },
    attemptTag: opts.attemptTag,
  });
  const outcome = (json: Record<string, unknown>, started: number, requestId: string | null, batch = false): CallOutcome => {
    const usage = usageOf(json.usage as Record<string, unknown> | undefined, batch);
    return { response: { ...json, usage, _latencyMs: Math.round(performance.now() - started) }, requestId: (json.id as string | undefined) ?? requestId, usage, cost: null };
  };
  /** One call to the API; a refusal is the provider's, and a connection never made was not sent. */
  const api = async (method: "GET" | "POST", url: string, payload: unknown, timeoutMs: number): Promise<{ text: string; requestId: string | null }> => {
    try {
      const res = await fetch(url, { method, headers, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }), signal: AbortSignal.timeout(timeoutMs) });
      const text = await res.text();
      assertAccepted(spec.service, res.status, text);
      return { text, requestId: res.headers.get("request-id") };
    } catch (error) {
      const code = (error as { cause?: { code?: string } })?.cause?.code;
      if (["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"].includes(code ?? "")) throw new ProviderRejectedError(`connect failed: ${String(error)}`, null, true);
      throw error;
    }
  };

  const straight = () => paidRequest(request("messages"), async () => {
    const started = performance.now();
    // CLAUDE_BASE_URL is https://api.anthropic.com/v1, the same address the compatible endpoint hangs under.
    const { text, requestId } = await api("POST", `${base}/messages`, body, opts.timeoutMs);
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
      if (!json || typeof json !== "object" || Array.isArray(json)) throw new Error("Expected a response object");
    } catch {
      json = { unparsable: text.slice(0, 20000) };
    }
    return outcome(json, started, requestId);
  });

  const batched = (lane: BatchLane) => paidRequest(request("batches"), async () => {
    const started = performance.now();
    type Batch = { id: string; processing_status: string; results_url: string | null };
    try {
      let batch = JSON.parse((await api("POST", `${base}/messages/batches`, batchBody(body), 60_000)).text) as Batch;
      const at = `${base}/messages/batches/${batch.id}`;
      // A poll that fails is asked again at the next; only the batch not ending in time sends the call straight.
      const poll = async (until: number) => {
        while (batch.processing_status !== "ended" && performance.now() < until) {
          await sleep(BATCH_TIMES.poll);
          batch = await api("GET", at, undefined, 30_000).then((r) => JSON.parse(r.text) as Batch, () => batch);
        }
      };
      await poll(started + BATCH_TIMES.wait);
      if (batch.processing_status !== "ended") {
        // Canceled before it reached the model it is not billed; one that was answered meanwhile still has its result.
        // A cancel that fails is not the end either: the batch is watched as long as a canceled one, and read if it ended.
        await api("POST", `${at}/cancel`, undefined, 30_000).catch(() => undefined);
        await poll(performance.now() + BATCH_TIMES.cancel);
        if (batch.processing_status !== "ended") throw new ProviderRejectedError(`batch ${batch.id} not ended ${BATCH_TIMES.cancel / 1000}s after cancel: it may still be answered and billed`, null, true);
      }
      if (!batch.results_url) throw new ProviderRejectedError(`batch ${batch.id} ended without results`, null, true);
      const got = batchMessage((await api("GET", batch.results_url, undefined, 60_000)).text);
      if ("failed" in got) throw new ProviderRejectedError(`batch ${batch.id}: ${got.failed}`, null, true);
      return outcome(got.message, started, batch.id, true);
    } finally {
      lane.waitedMs += performance.now() - started;
    }
  });

  let receipt: Awaited<ReturnType<typeof straight>> | undefined;
  // A run started again finds the answers it already has: a call that went straight last time is not sent as a batch now.
  if (laneOpen(opts.batch) && !["received", "completed"].includes((await receiptState(request("messages"))) ?? "")) {
    receipt = await batched(opts.batch).catch((error: unknown) => {
      // Not answered as a batch (not in time, refused, lost on the way): this call and the rest of the run go straight.
      if (!(error instanceof ProviderRejectedError) && !(error instanceof ReceiptUnknownError)) throw error;
      opts.batch!.off = true;
      console.warn(`Claude batch for ${opts.subject} ${opts.purpose}: ${error.message.slice(0, 300)}; the rest of this run goes straight`);
      return undefined;
    });
  }
  receipt ??= await straight();

  const response = receipt.response as MessagesResponse;
  try {
    return { data: opts.schema.parse(extractJson(answerText(response))), receiptId: receipt.receiptId, reused: receipt.reused, model: spec.key, usage: response.usage ?? null };
  } catch (error) {
    const detail = response.stop_reason === "max_tokens"
      ? `output token limit reached (stop_reason=max_tokens): give it room with reasoningTokens on preset ${spec.key}. ${String(error)}`
      : response.stop_reason === "refusal" ? `refused (stop_reason=refusal). ${String(error)}` : String(error);
    await rejectReceivedResponse(receipt.receiptId, `unusable output: ${detail.slice(0, 500)}`);
    throw new ModelOutputError(`Model ${opts.model} returned unusable output for ${opts.subject}: ${detail.slice(0, 300)}`, receipt.receiptId);
  }
}
