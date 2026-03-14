import {
  AIContentGenerateResponseSchema,
  type AIContentGenerateRequest,
  type AIContentGenerateResponse,
} from "@wg/schema";

export type AIProvider = {
  generateContentDraft: (
    input: AIContentGenerateRequest
  ) => Promise<AIContentGenerateResponse>;
};

export type OpenAICompatibleConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

const buildPrompt = (input: AIContentGenerateRequest) => {
  const constraints = {
    nodeType: input.nodeType,
    instruction: input.instruction,
    tone: input.tone ?? "default",
    length: input.length ?? "default",
    language: input.language ?? "zh-CN",
    keywords: input.keywords ?? [],
    currentProps: input.currentProps,
  };

  return [
    "你是网页编辑器的内容助手。",
    "你只能输出 JSON，不允许附加解释文本。",
    "必须保持 targetNodeId 与输入一致。",
    "proposedProps 仅包含与文案相关字段。",
    "JSON 格式: {targetNodeId, proposedProps, reasoningSummary, safetyFlags}",
    "输入上下文:",
    JSON.stringify(constraints, null, 2),
  ].join("\n");
};

const fallbackDraft = (input: AIContentGenerateRequest): AIContentGenerateResponse => {
  const text = `${input.instruction}`.trim();
  const proposedProps: Record<string, unknown> = { ...input.currentProps };

  if (["text", "title", "paragraph"].includes(input.nodeType)) {
    proposedProps.content = text || proposedProps.content || "新的文案内容";
  }

  if (input.nodeType === "button") {
    proposedProps.label = text || proposedProps.label || "立即操作";
  }

  if (input.nodeType === "link") {
    proposedProps.label = text || proposedProps.label || "查看详情";
  }

  return {
    targetNodeId: input.targetNodeId,
    proposedProps,
    reasoningSummary: "由 fallback provider 生成，建议人工确认语义。",
    safetyFlags: [],
  };
};

const parseAIResponse = (
  raw: unknown,
  input: AIContentGenerateRequest
): AIContentGenerateResponse => {
  if (!raw || typeof raw !== "object") {
    return fallbackDraft(input);
  }

  const parsed = AIContentGenerateResponseSchema.safeParse(raw);
  if (!parsed.success) {
    return fallbackDraft(input);
  }

  return parsed.data;
};

export const createFallbackProvider = (): AIProvider => ({
  async generateContentDraft(input) {
    return fallbackDraft(input);
  },
});

export const createOpenAICompatibleProvider = (
  config: OpenAICompatibleConfig
): AIProvider => {
  const providerConfig = {
    apiKey: config.apiKey,
    baseUrl: config.baseUrl ?? "https://api.openai.com/v1",
    model: config.model ?? "gpt-4.1-mini",
  };

  return {
    async generateContentDraft(input) {
      if (!providerConfig.apiKey) {
        return fallbackDraft(input);
      }

      const response = await fetch(`${providerConfig.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${providerConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: providerConfig.model,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are a web page editor AI assistant. Always return strict JSON object only.",
            },
            {
              role: "user",
              content: buildPrompt(input),
            },
          ],
        }),
      });

      if (!response.ok) {
        return fallbackDraft(input);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        return fallbackDraft(input);
      }

      try {
        const parsedJson = JSON.parse(content);
        return parseAIResponse(parsedJson, input);
      } catch {
        return fallbackDraft(input);
      }
    },
  };
};
