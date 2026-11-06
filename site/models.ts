// 这个站用哪些模型。框架自带一个 `default`：环境变量 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL 指定的模型。
// 这里再列出具名的模型（每个用自己的地址和密钥环境变量），以及每一步默认用哪个；没写的步骤用 default。
// 部署时还可以用环境变量（PREFILTER_MODEL、SCORE_MODEL……）或后台的“模型与评测”页逐步改选。

import type { ModelPreset } from "@aihot/contracts/site-config";
export type { ModelPreset } from "@aihot/contracts/site-config";

/** 具名的模型示例（每个要配自己的密钥）。用不上可以删掉。 */
export const PRESETS: Record<string, ModelPreset> = {
  // GLM 5.3 Flash always reasons; the lowest effort keeps short structured tasks fast.
  "glm-5.3-flash": {
    service: "zhipu", model: "glm-5.3-flash", baseUrlEnv: "ZHIPU_BASE_URL", apiKeyEnv: "ZHIPU_API_KEY",
    extra: { thinking: { type: "enabled" }, reasoning_effort: "low" }, jsonMode: true, vision: true,
  },
  // The scorer's parameters for glm-5.3-flash: temperature 1 with high reasoning, up to 180 s per call.
  "glm-5.3-flash-selection": {
    service: "zhipu", model: "glm-5.3-flash", baseUrlEnv: "ZHIPU_BASE_URL", apiKeyEnv: "ZHIPU_API_KEY",
    extra: { thinking: { type: "enabled", clear_thinking: false }, reasoning_effort: "high", top_p: 0.95 }, jsonMode: true, vision: true,
    scoreCall: { temperature: 1, maxTokens: 65_536, timeoutMs: 180_000 },
  },
  // DeepSeek Flash reasons by default; structured tasks switch it off. deepseek-flash-think keeps it on,
  // with room in the output for the reasoning.
  "deepseek-flash": {
    service: "deepseek", model: "deepseek-flash", baseUrlEnv: "DEEPSEEK_BASE_URL", apiKeyEnv: "DEEPSEEK_API_KEY",
    extra: { thinking: { type: "disabled" } }, jsonMode: true,
  },
  "deepseek-flash-think": {
    service: "deepseek", model: "deepseek-flash", baseUrlEnv: "DEEPSEEK_BASE_URL", apiKeyEnv: "DEEPSEEK_API_KEY", reasoningTokens: 4000, jsonMode: true,
  },
  // 十一说的试写 on the server's own DeepSeek key (LLM_*; the DEEPSEEK_* pair is not set there). An issue is long, so
  // thinking gets as much room as Opus has (10-09: 5 of 16 items cut off at 4,000).
  "deepseek-flash-think-llm": {
    service: "deepseek", model: "deepseek-flash", baseUrlEnv: "LLM_BASE_URL", apiKeyEnv: "LLM_API_KEY", reasoningTokens: 12000, jsonMode: true,
  },
  // Flash without thinking on the same key: the 综合整理's checker (modules/reference/backend/topic.ts). With thinking it
  // read the 66k characters of a situation's items and thought past 20,000 tokens twice without an answer (11-06).
  "deepseek-flash-llm": {
    service: "deepseek", model: "deepseek-flash", baseUrlEnv: "LLM_BASE_URL", apiKeyEnv: "LLM_API_KEY",
    extra: { thinking: { type: "disabled" } }, jsonMode: true,
  },
  // Only the checker's backup now (CHECK_BACKUP). It wrote 十一说 and picked the daily until 11-05; since then every step
  // runs on flash, which since 10-17 is V4.1-Flash-1017: stronger than Pro on 14 of 16 benchmarks and 1/3 to 1/7 of its
  // price (决定记录 L1409; Kay 11-05: 全部换成 flash).
  "deepseek-v4-pro-llm": {
    service: "deepseek", model: "deepseek-v4-pro", baseUrlEnv: "LLM_BASE_URL", apiKeyEnv: "LLM_API_KEY", reasoningTokens: 12000, jsonMode: true,
    extra: { thinking: { type: "enabled" }, reasoning_effort: "high" },
  },
  "qwen3.7-flash": {
    service: "dashscope", model: "qwen3.7-flash", baseUrlEnv: "DASHSCOPE_BASE_URL", apiKeyEnv: "DASHSCOPE_API_KEY",
    extra: { enable_thinking: false }, jsonMode: true,
  },
  "qwen3.8-flash": {
    service: "dashscope", model: "qwen3.8-flash", baseUrlEnv: "DASHSCOPE_BASE_URL", apiKeyEnv: "DASHSCOPE_API_KEY",
    extra: { enable_thinking: false }, jsonMode: true,
  },
  "mimo-v2.6-flash": {
    service: "mimo", model: "mimo-v2.6-flash", baseUrlEnv: "XIAOMI_MIMO_BASE_URL", apiKeyEnv: "XIAOMI_MIMO_API_KEY",
    extra: { thinking: { type: "disabled" } }, jsonMode: true,
  },
  // Claude through Anthropic's OpenAI-compatible endpoint (CLAUDE_BASE_URL=https://api.anthropic.com/v1), for comparing
  // models (myfnb/HANDOFF.md, 10-16). These models reject any temperature but 1, so extra overrides the framework's 0.2;
  // the endpoint ignores response_format, so no JSON mode (the reply is parsed from its text). Haiku skips thinking;
  // Sonnet thinks only between tool calls, of which there are none here.
  "claude-haiku-5-5": {
    service: "anthropic", model: "claude-haiku-5-5", baseUrlEnv: "CLAUDE_BASE_URL", apiKeyEnv: "CLAUDE_API_KEY",
    extra: { temperature: 1, thinking: { type: "disabled" } }, jsonMode: false,
  },
  "claude-sonnet-5-5": {
    service: "anthropic", model: "claude-sonnet-5-5", baseUrlEnv: "CLAUDE_BASE_URL", apiKeyEnv: "CLAUDE_API_KEY",
    extra: { temperature: 1, thinking: { type: "between_tools" } }, jsonMode: false,
  },
  // 十一说 is checked, mended and picked by Opus (Kay 10-19; DeepSeek writes, 10-23). Opus 5.5 takes no sampling
  // parameters, so extra drops the framework's temperature (undefined is left out of the request); it always thinks,
  // and reasoningTokens leaves room for that.
  "claude-opus-5-5": {
    service: "anthropic", model: "claude-opus-5-5", baseUrlEnv: "CLAUDE_BASE_URL", apiKeyEnv: "CLAUDE_API_KEY",
    extra: { temperature: undefined }, reasoningTokens: 12000, jsonMode: false,
  },
  "qwen3-vl-flash": {
    service: "dashscope", model: "qwen3-vl-flash", baseUrlEnv: "DASHSCOPE_BASE_URL", apiKeyEnv: "DASHSCOPE_API_KEY",
    extra: { enable_thinking: false }, jsonMode: false, vision: true,
  },
};

/**
 * 每一步默认用的模型（步骤见后台“模型与评测”页），值是上面的名字或 default。没写的步骤用 default。
 * 例：{ score: "glm-5.3-flash-selection", groupReview: "mimo-v2.6-flash" }
 */
export const DEFAULTS: Record<string, string> = {
  // DeepSeek 一律用 flash（V4.1，比 Pro 强也比 Pro 省；Kay 11-05）。
  // 要点的核对员：10-24 起服务器后台就选了 flash（决定记录 L984），这里跟着改，免得后台那行一删就回到 Pro。
  check: "deepseek-flash-think-llm",
  // 十一说 (modules/reference): flash writes, Opus checks and mends.
  referenceIssue: "deepseek-flash-think-llm",
  referenceIssueCheck: "claude-opus-5-5",
  // 参考页的综合整理 (modules/reference/backend/topic.ts)：flash 写，不思考的 flash 核对。
  referenceTopic: "deepseek-flash-think-llm",
  referenceTopicCheck: "deepseek-flash-llm",
  // 日报正文整天一起挑 (modules/dailypick)。
  dailyPick: "deepseek-flash-think-llm",
};

/**
 * 核对员拿不出能用的结果（写满输出上限还在想、JSON 坏了）时，同一份稿改用这个模型再核一次（十一 10-24，为改用
 * deepseek-flash 准备：考试里 20 份有 2 份它一直在想、写不出结果）。核对员本来就是它时不再重问。
 * 和框架的 fallbackFor 不同：那个只管服务商不可用、而且要换一家；这里是同一家的另一个模型接手输出坏掉的那一次。
 */
export const CHECK_BACKUP = "deepseek-v4-pro-llm";
