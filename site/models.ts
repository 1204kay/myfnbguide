// 这个站用哪些模型。框架自带一个 `default`：环境变量 LLM_BASE_URL / LLM_API_KEY / LLM_MODEL 指定的模型。
// 这里再列出具名的模型（每个用自己的地址和密钥环境变量），以及每一步默认用哪个；没写的步骤用 default。
// 部署时还可以用环境变量（PREFILTER_MODEL、SCORE_MODEL……）或后台的“模型与评测”页逐步改选。

export interface ModelPreset {
  service: string;
  model: string;
  baseUrlEnv: string;
  apiKeyEnv: string;
  /** 额外的请求字段，比如短小的结构化任务关掉推理。 */
  extra?: Record<string, unknown>;
  /** 推理模型先想再答，额外给推理留的输出额度（token），加在每一步自己的额度上。default 用环境变量 LLM_REASONING_TOKENS。 */
  reasoningTokens?: number;
  /** 接口支持 JSON 模式。 */
  jsonMode: boolean;
  /** 能看图。 */
  vision?: boolean;
}

/** 具名的模型示例（每个要配自己的密钥）。用不上可以删掉。 */
export const PRESETS: Record<string, ModelPreset> = {
  // GLM 5.3 Flash always reasons; the lowest effort keeps short structured tasks fast.
  "glm-5.3-flash": {
    service: "zhipu", model: "glm-5.3-flash", baseUrlEnv: "ZHIPU_BASE_URL", apiKeyEnv: "ZHIPU_API_KEY",
    extra: { thinking: { type: "enabled" }, reasoning_effort: "low" }, jsonMode: true, vision: true,
  },
  // The scorer's parameters for glm-5.3-flash (score calls; temperature 1 is set per call).
  "glm-5.3-flash-selection": {
    service: "zhipu", model: "glm-5.3-flash", baseUrlEnv: "ZHIPU_BASE_URL", apiKeyEnv: "ZHIPU_API_KEY",
    extra: { thinking: { type: "enabled", clear_thinking: false }, reasoning_effort: "high", top_p: 0.95 }, jsonMode: true, vision: true,
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
  // 十一说's writer (Kay 10-19: DeepSeek's strongest, thinking as deep as it goes): Pro still leads Flash on reasoning.
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
  // 十一说 (modules/reference): DeepSeek's strongest writes, Opus checks and mends (Kay 10-19; trial round 3, 10-13 to 10-15).
  referenceIssue: "deepseek-v4-pro-llm",
  referenceIssueCheck: "claude-opus-5-5",
};
