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
import type { z } from "zod";
import { config, credential } from "@aihot/backend/config";
import { sha256 } from "@aihot/backend/lib/ids";
import { escapeControlCharsInStrings, MODELS, type ChatJsonResult, type ModelSpec } from "@aihot/backend/providers/llm";
import { assertAccepted, ModelOutputError, ModelUnavailableError, paidRequest, ProviderRejectedError, rejectReceivedResponse } from "@aihot/backend/providers/receipts";

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

export interface ClaudeJsonOptions<S extends z.ZodType> {
  model: string; purpose: string; subject: string; promptVersion: string;
  system: string; user: string | Parts; schema: S; maxTokens: number; timeoutMs: number; attemptTag?: string;
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
export function usageOf(usage: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!usage) return null;
  const n = (k: string) => Number(usage[k] ?? 0) || 0;
  return {
    ...usage,
    prompt_tokens: n("input_tokens") + n("cache_creation_input_tokens") + n("cache_read_input_tokens"),
    completion_tokens: n("output_tokens"),
  };
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
  const receipt = await paidRequest(
    {
      service: spec.service, model: spec.model, purpose: opts.purpose, subject: opts.subject,
      identity: { api: "messages", model: spec.model, promptVersion: opts.promptVersion, system: sha256(opts.system), user: sha256(userText), cached, maxTokens: body.max_tokens, thinking: body.thinking ?? null },
      requestSummary: { api: "messages", promptVersion: opts.promptVersion, systemHash: sha256(opts.system), userHash: sha256(userText), userChars: userText.length, cachedChars: typeof opts.user === "string" ? 0 : opts.user.cached.length, maxTokens: body.max_tokens },
      attemptTag: opts.attemptTag,
    },
    async () => {
      const started = performance.now();
      let res: Response;
      let text: string;
      try {
        // CLAUDE_BASE_URL is https://api.anthropic.com/v1, the same address the compatible endpoint hangs under.
        res = await fetch(`${baseUrl.replace(/\/$/, "")}/messages`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": API_VERSION },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(opts.timeoutMs),
        });
        text = await res.text();
        assertAccepted(spec.service, res.status, text);
      } catch (error) {
        const code = (error as { cause?: { code?: string } })?.cause?.code;
        if (["ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "UND_ERR_CONNECT_TIMEOUT"].includes(code ?? "")) throw new ProviderRejectedError(`connect failed: ${String(error)}`, null, true);
        throw error;
      }
      let json: Record<string, unknown>;
      try {
        json = JSON.parse(text);
        if (!json || typeof json !== "object" || Array.isArray(json)) throw new Error("Expected a response object");
      } catch {
        json = { unparsable: text.slice(0, 20000) };
      }
      const usage = usageOf(json.usage as Record<string, unknown> | undefined);
      return { response: { ...json, usage, _latencyMs: Math.round(performance.now() - started) }, requestId: (json.id as string | undefined) ?? res.headers.get("request-id"), usage, cost: null };
    },
  );

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
