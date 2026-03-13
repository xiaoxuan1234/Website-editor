import { z } from "zod";
import {
  DefaultNodePropsByType,
  NodeTypeSchema,
  type AIPageGenerateRequest,
  type AIPageGenerateResponse,
  type EditorNode,
} from "@wg/schema";

type StyleValue = string | number | boolean | null;
type StyleRecord = Record<string, StyleValue>;

const AIPageModelOutputSchema = z.object({
  title: z.string().optional(),
  nodes: z.array(z.any()).optional(),
  pageStyle: z.record(z.string(), z.any()).optional(),
  reasoningSummary: z.string().optional(),
  safetyFlags: z.array(z.string()).optional(),
});

export type AIProvider = {
  generatePageDraft: (input: AIPageGenerateRequest) => Promise<AIPageGenerateResponse>;
};

export type OpenAICompatibleConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const cloneDefaultProps = (type: keyof typeof DefaultNodePropsByType) =>
  JSON.parse(JSON.stringify(DefaultNodePropsByType[type])) as Record<string, unknown>;

const normalizeStyleRecord = (raw: unknown): StyleRecord => {
  if (!isObject(raw)) {
    return {};
  }

  const next: StyleRecord = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null
    ) {
      next[key] = value;
    }
  });
  return next;
};

const createNodeId = () => `node_${Math.random().toString(36).slice(2, 10)}`;

const createNode = (
  type: keyof typeof DefaultNodePropsByType,
  patch: Record<string, unknown> = {},
  style: StyleRecord = {},
  children: EditorNode[] = []
): EditorNode => ({
  id: createNodeId(),
  type,
  props: {
    ...cloneDefaultProps(type),
    ...patch,
  },
  style,
  children,
  aiMeta: {},
});

const normalizeNode = (raw: unknown): EditorNode | null => {
  if (!isObject(raw)) {
    return null;
  }

  const typeParsed = NodeTypeSchema.safeParse(String(raw.type ?? ""));
  if (!typeParsed.success) {
    return null;
  }

  const type = typeParsed.data;
  const rawProps = isObject(raw.props) ? raw.props : {};
  const rawChildren = Array.isArray(raw.children) ? raw.children : [];
  const children = rawChildren
    .map((child: unknown) => normalizeNode(child))
    .filter((child): child is EditorNode => Boolean(child));

  return createNode(type, rawProps, normalizeStyleRecord(raw.style), children);
};

const fallbackPage = (input: AIPageGenerateRequest): AIPageGenerateResponse => {
  const title = input.instruction.trim() || "Landing Page";
  const subtitle =
    "A generated static web page draft with title, intro, CTA, and highlights.";

  return {
    document: {
      id: input.pageId,
      projectId: input.projectId,
      title,
      status: "draft",
      version: 1,
      updatedAt: new Date().toISOString(),
      root: [
        createNode(
          "title",
          { content: title, level: "h1" },
          {
            width: "100%",
            paddingTop: "48px",
            paddingBottom: "16px",
            fontSize: "42px",
            fontWeight: "700",
          }
        ),
        createNode(
          "paragraph",
          { content: subtitle },
          {
            width: "100%",
            paddingBottom: "28px",
            fontSize: "18px",
            lineHeight: "1.8",
          }
        ),
        createNode(
          "container",
          { layout: "flow" },
          {
            display: "flex",
            gap: "12px",
            width: "100%",
            paddingBottom: "24px",
          },
          [
            createNode(
              "button",
              {
                label: "Get Started",
                variant: "primary",
                size: "md",
              },
              {
                padding: "12px 18px",
              }
            ),
            createNode(
              "link",
              {
                label: "Learn More",
                href: "#",
                target: "_self",
                underline: true,
              },
              {
                padding: "12px 0",
              }
            ),
          ]
        ),
        createNode(
          "list",
          {
            items: [
              "Fast content generation",
              "Visual editing and preview",
              "Publish and ZIP export",
            ],
            listStyleType: "disc",
            itemSpacing: 8,
          },
          {
            width: "100%",
            paddingBottom: "36px",
          }
        ),
      ],
      meta: {
        source: "ai-page-fallback",
        pageStyle: {
          backgroundColor: "#ffffff",
        },
      },
    },
    reasoningSummary:
      "Generated a baseline page with hero title, intro text, CTA actions, and highlights.",
    safetyFlags: [],
  };
};

const parseAIPageResponse = (
  raw: unknown,
  input: AIPageGenerateRequest
): AIPageGenerateResponse => {
  const parsed = AIPageModelOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return fallbackPage(input);
  }

  const result = parsed.data;
  const nodes =
    result.nodes
      ?.map((item: unknown) => normalizeNode(item))
      .filter((item: EditorNode | null): item is EditorNode => Boolean(item)) ?? [];
  const fallback = fallbackPage(input);
  const title = String(result.title ?? "").trim() || fallback.document.title;

  return {
    document: {
      ...fallback.document,
      title,
      updatedAt: new Date().toISOString(),
      root: nodes.length > 0 ? nodes : fallback.document.root,
      meta: {
        ...fallback.document.meta,
        source: "ai-page-generate",
        pageStyle: {
          ...(isObject(fallback.document.meta?.pageStyle)
            ? (fallback.document.meta?.pageStyle as Record<string, unknown>)
            : {}),
          ...(isObject(result.pageStyle) ? result.pageStyle : {}),
        },
      },
    },
    reasoningSummary:
      String(result.reasoningSummary ?? "").trim() ||
      "AI generated a full-page draft. You can continue editing on canvas.",
    safetyFlags: Array.isArray(result.safetyFlags) ? result.safetyFlags : [],
  };
};

const buildPagePrompt = (input: AIPageGenerateRequest) => {
  const payload = {
    instruction: input.instruction,
    tone: input.tone ?? "default",
    length: input.length ?? "default",
    language: input.language ?? "zh-CN",
    keywords: input.keywords ?? [],
  };

  return [
    "You are a full-page generator for a visual web editor.",
    "Return JSON only.",
    "JSON output format:",
    '{"title":"Page title","nodes":[{"type":"title|paragraph|button|link|image|container|list|table|text|nav|input|i|ul|ol|li","props":{},"style":{},"children":[]}],"pageStyle":{},"reasoningSummary":"one sentence","safetyFlags":[]}',
    "Rules:",
    "- each node must have type",
    "- props/style/children are optional",
    "- content must align with instruction",
    "- include at least title, paragraph, and action guidance",
    "Input context:",
    JSON.stringify(payload, null, 2),
  ].join("\n");
};

export const createFallbackProvider = (): AIProvider => ({
  async generatePageDraft(input) {
    return fallbackPage(input);
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

  const callModel = async (prompt: string): Promise<unknown> => {
    if (!providerConfig.apiKey) {
      return null;
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
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  };

  return {
    async generatePageDraft(input) {
      const raw = await callModel(buildPagePrompt(input));
      return parseAIPageResponse(raw, input);
    },
  };
};
