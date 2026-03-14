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
  generatePageDraft: (
    input: AIPageGenerateRequest,
  ) => Promise<AIPageGenerateResponse>;
};

export type OpenAICompatibleConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const cloneDefaultProps = (type: keyof typeof DefaultNodePropsByType) =>
  JSON.parse(JSON.stringify(DefaultNodePropsByType[type])) as Record<
    string,
    unknown
  >;

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
  children: EditorNode[] = [],
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

/** 根据节点类型规整 props，确保必填字段存在 */
function sanitizeNodeProps(
  type: keyof typeof DefaultNodePropsByType,
  rawProps: Record<string, unknown>,
): Record<string, unknown> {
  const defaults = cloneDefaultProps(type);
  const merged = { ...defaults };
  for (const [k, v] of Object.entries(rawProps)) {
    if (v === undefined) continue;
    if (type === "title" && k === "level") {
      const level = String(v).toLowerCase();
      if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(level)) {
        merged[k] = level;
      }
      continue;
    }
    if (type === "button" && k === "variant") {
      const variant = String(v).toLowerCase();
      if (["primary", "secondary", "outline"].includes(variant)) {
        merged[k] = variant;
      }
      continue;
    }
    if (type === "input" && k === "type") {
      const t = String(v).toLowerCase();
      if (["text", "email", "password", "number", "tel", "url"].includes(t)) {
        merged[k] = t;
      }
      continue;
    }
    if (type === "list" && k === "listStyleType") {
      const s = String(v).toLowerCase();
      if (["disc", "decimal", "none"].includes(s)) {
        merged[k] = s;
      }
      continue;
    }
    merged[k] = v;
  }
  return merged;
}

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

  const props = sanitizeNodeProps(type, rawProps);
  return createNode(type, props, normalizeStyleRecord(raw.style), children);
};

// ---------- 页面模板 ----------
const pageTemplates: Record<string, (primaryColor: string) => EditorNode[]> = {
  home: (primaryColor) => [
    createNode(
      "container",
      { layout: "flow" },
      {
        width: "100%",
        padding: "80px 40px",
        backgroundColor: "#f8f9fa",
        textAlign: "center",
      },
      [
        createNode(
          "title",
          { content: "欢迎来到我们的网站", level: "h1" },
          {
            fontSize: "48px",
            fontWeight: "700",
            color: "#1a1a1a",
            marginBottom: "24px",
          },
        ),
        createNode(
          "paragraph",
          {
            content:
              "我们提供专业的解决方案，帮助您实现业务目标。探索我们的产品和服务，开启成功之旅。",
          },
          {
            fontSize: "18px",
            color: "#666666",
            lineHeight: "1.6",
            maxWidth: "600px",
            margin: "0 auto 32px",
          },
        ),
        createNode(
          "container",
          { layout: "flow" },
          {
            display: "flex",
            gap: "16px",
            justifyContent: "center",
            flexWrap: "wrap",
          },
          [
            createNode(
              "button",
              { label: "立即开始", variant: "primary" },
              {
                padding: "14px 32px",
                backgroundColor: primaryColor,
                color: "#ffffff",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              },
            ),
            createNode(
              "button",
              { label: "了解更多", variant: "outline" },
              {
                padding: "14px 32px",
                backgroundColor: "transparent",
                color: primaryColor,
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              },
            ),
          ],
        ),
      ],
    ),
    createNode(
      "container",
      { layout: "flow" },
      {
        width: "100%",
        padding: "80px 40px",
      },
      [
        createNode(
          "title",
          { content: "我们的优势", level: "h2" },
          {
            fontSize: "36px",
            fontWeight: "700",
            color: "#1a1a1a",
            textAlign: "center",
            marginBottom: "48px",
          },
        ),
        createNode(
          "container",
          { layout: "flow" },
          {
            display: "flex",
            gap: "24px",
            justifyContent: "center",
            flexWrap: "wrap",
          },
          [
            createFeatureCard(
              "专业团队",
              "拥有经验丰富的专业团队",
              primaryColor,
            ),
            createFeatureCard("优质服务", "提供卓越的客户服务", primaryColor),
            createFeatureCard("创新方案", "持续创新的解决方案", primaryColor),
          ],
        ),
      ],
    ),
  ],
  product: (primaryColor) => [
    createNode(
      "container",
      { layout: "flow" },
      {
        width: "100%",
        padding: "80px 40px",
        backgroundColor: "#f8f9fa",
      },
      [
        createNode(
          "title",
          { content: "产品介绍", level: "h1" },
          {
            fontSize: "42px",
            fontWeight: "700",
            color: "#1a1a1a",
            marginBottom: "24px",
          },
        ),
        createNode(
          "paragraph",
          { content: "我们的产品具有卓越的性能和可靠性，满足您的各种需求。" },
          {
            fontSize: "18px",
            color: "#666666",
            lineHeight: "1.6",
            marginBottom: "48px",
          },
        ),
        createNode(
          "list",
          {
            items: [
              "先进的技术架构",
              "用户友好的界面设计",
              "强大的功能特性",
              "竞争力的价格优势",
            ],
            listStyleType: "disc",
          },
          {
            fontSize: "16px",
            color: "#333333",
            lineHeight: "2",
            paddingLeft: "24px",
          },
        ),
      ],
    ),
  ],
  contact: (primaryColor) => [
    createNode(
      "container",
      { layout: "flow" },
      {
        width: "100%",
        padding: "80px 40px",
        maxWidth: "600px",
        margin: "0 auto",
      },
      [
        createNode(
          "title",
          { content: "联系我们", level: "h1" },
          {
            fontSize: "42px",
            fontWeight: "700",
            color: "#1a1a1a",
            textAlign: "center",
            marginBottom: "48px",
          },
        ),
        createNode(
          "container",
          { layout: "flow" },
          {
            padding: "40px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          },
          [
            createNode(
              "input",
              { placeholder: "您的姓名", type: "text" },
              {
                width: "100%",
                padding: "14px",
                marginBottom: "16px",
                borderRadius: "8px",
                fontSize: "16px",
              },
            ),
            createNode(
              "input",
              { placeholder: "您的邮箱", type: "email" },
              {
                width: "100%",
                padding: "14px",
                marginBottom: "16px",
                borderRadius: "8px",
                fontSize: "16px",
              },
            ),
            createNode(
              "input",
              { placeholder: "您的留言", type: "text" },
              {
                width: "100%",
                padding: "14px",
                marginBottom: "24px",
                borderRadius: "8px",
                fontSize: "16px",
              },
            ),
            createNode(
              "button",
              { label: "发送消息", variant: "primary" },
              {
                width: "100%",
                padding: "16px",
                backgroundColor: primaryColor,
                color: "#ffffff",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
              },
            ),
          ],
        ),
      ],
    ),
  ],
};

function createFeatureCard(
  title: string,
  description: string,
  primaryColor: string,
): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      width: "280px",
      padding: "32px",
      backgroundColor: "#ffffff",
      borderRadius: "12px",
      boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      textAlign: "center",
    },
    [
      createNode(
        "title",
        { content: title, level: "h3" },
        {
          fontSize: "20px",
          fontWeight: "600",
          color: "#1a1a1a",
          marginBottom: "12px",
        },
      ),
      createNode(
        "paragraph",
        { content: description },
        {
          fontSize: "14px",
          color: "#666666",
          lineHeight: "1.5",
        },
      ),
    ],
  );
}

/** 从用户描述推断页面类型，用于回退模板选择 */
function inferPageTypeFromInstruction(instruction: string): string {
  const lower = instruction.trim().toLowerCase();
  if (
    /产品|商品|介绍|功能|特性|价格|购买/.test(lower) &&
    !/联系|留言|反馈|联系我们/.test(lower)
  ) {
    return "product";
  }
  if (/联系|留言|反馈|表单|邮箱|电话|联系我们/.test(lower)) {
    return "contact";
  }
  return "home";
}

const adjustNodesByLength = (
  input: AIPageGenerateRequest,
  nodes: EditorNode[],
): EditorNode[] => {
  const length = input.length ?? "medium";

  const cloneNodes = (items: EditorNode[]): EditorNode[] =>
    items.map((node) => ({
      ...node,
      id: createNodeId(),
      children: cloneNodes(node.children ?? []),
    }));

  const base = nodes.length === 0 ? [] : nodes;
  if (base.length === 0) {
    return base;
  }

  const ensureRange = (min: number, max: number): EditorNode[] => {
    const result: EditorNode[] = [];
    // 先复制一轮基础节点
    base.forEach((node) => {
      result.push(node);
    });
    // 不足最小值时重复最后一个区块
    while (result.length < min) {
      const last = result[result.length - 1] ?? base[base.length - 1];
      result.push(...cloneNodes([last]));
    }
    // 超过最大值时裁剪
    if (result.length > max) {
      return result.slice(0, max);
    }
    return result;
  };

  if (length === "short") {
    // 期望 2 屏：2 个左右的大区块
    return ensureRange(2, 3);
  }
  if (length === "long") {
    // 期望 5–6 屏：至少 5 个大区块，上限 6
    return ensureRange(5, 6);
  }
  // 默认 medium：3–4 屏
  return ensureRange(3, 4);
};

const buildFallbackResponse = (
  input: AIPageGenerateRequest,
  pageType: string,
): AIPageGenerateResponse => {
  const title = input.instruction.trim() || "Web Page";
  const primaryColor = input.primaryColor || "#3366ff";
  const templateNodesRaw =
    pageTemplates[pageType]?.(primaryColor) ?? pageTemplates["home"](primaryColor);
  const templateNodes = adjustNodesByLength(input, templateNodesRaw);

  return {
    document: {
      id: input.pageId,
      projectId: input.projectId,
      title,
      status: "draft",
      version: 1,
      updatedAt: new Date().toISOString(),
      root: templateNodes,
      meta: {
        source: "ai-page-template",
        pageStyle: {
          backgroundColor: "#ffffff",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
      },
    },
    reasoningSummary: `已根据「${input.instruction.slice(0, 50)}${input.instruction.length > 50 ? "…" : ""}」使用${pageType}模板生成页面，主色：${primaryColor}。`,
    safetyFlags: [],
  };
};

const fallbackPage = (input: AIPageGenerateRequest): AIPageGenerateResponse => {
  const pageType =
    input.pageType && pageTemplates[input.pageType]
      ? input.pageType
      : inferPageTypeFromInstruction(input.instruction);
  return buildFallbackResponse(input, pageType);
};

const parseAIPageResponse = (
  raw: unknown,
  input: AIPageGenerateRequest,
): AIPageGenerateResponse => {
  const parsed = AIPageModelOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return fallbackPage(input);
  }

  const result = parsed.data;
  const nodesRaw =
    result.nodes
      ?.map((item: unknown) => normalizeNode(item))
      .filter((item: EditorNode | null): item is EditorNode => Boolean(item)) ??
    [];

  if (nodesRaw.length < 2) {
    return fallbackPage(input);
  }

  const nodes = adjustNodesByLength(input, nodesRaw);

  const title =
    String(result.title ?? "").trim() || input.instruction.trim() || "Web Page";

  return {
    document: {
      id: input.pageId,
      projectId: input.projectId,
      title,
      status: "draft",
      version: 1,
      updatedAt: new Date().toISOString(),
      root: nodes,
      meta: {
        source: "ai-page-generate",
        pageStyle: {
          ...(isObject(result.pageStyle) ? result.pageStyle : {}),
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
      },
    },
    reasoningSummary:
      String(result.reasoningSummary ?? "").trim() ||
      "已根据您的描述生成网页，您可以在画布上继续编辑。",
    safetyFlags: Array.isArray(result.safetyFlags) ? result.safetyFlags : [],
  };
};

// ---------- 结构化 Prompt（主） ----------
const SYSTEM_PROMPT = `你是一个网页结构生成器，专门为可视化网页编辑器输出数据。你必须只返回一个合法的 JSON 对象，不要包含任何其他文字、注释或 markdown 代码块。

输出 JSON 必须包含以下字段：
- title: 页面标题（字符串）
- nodes: 节点数组，每个节点格式见下方
- pageStyle: 可选，页面级样式对象
- reasoningSummary: 一句话说明生成逻辑（字符串）
- safetyFlags: 数组，可为空 []

每个节点的格式（不要包含 id，后端会自动生成）：
{
  "type": "节点类型",
  "props": { ... },
  "style": { ... },
  "children": []  // 仅 container 需要，子节点数组
}

支持的节点类型及 props：
- title: { "content": "标题文字", "level": "h1"|"h2"|"h3" }
- paragraph: { "content": "段落文字" }
- button: { "label": "按钮文字", "variant": "primary"|"secondary"|"outline" }
- link: { "label": "链接文字", "href": "https://..." }
- image: { "src": "https://...", "alt": "描述" }
- container: { "layout": "flow" }，必须有 children 数组
- input: { "placeholder": "提示", "type": "text"|"email"|"password" }
- list: { "items": ["项1","项2"], "listStyleType": "disc"|"decimal"|"none" }
- nav: { "content": "导航内容" }
- table: { "rows": 2, "cols": 3 }
- text: { "content": "文本" }

style 中可使用常见 CSS 属性（驼峰）：width, padding, margin, backgroundColor, color, fontSize, fontWeight, lineHeight, textAlign, display, flexDirection, justifyContent, alignItems, gap, borderRadius, boxShadow, border 等。`;

const NODE_EXAMPLE = `示例（仅作格式参考）：
{"title":"示例页","nodes":[{"type":"container","props":{"layout":"flow"},"style":{"width":"100%","padding":"40px","textAlign":"center"},"children":[{"type":"title","props":{"content":"欢迎","level":"h1"},"style":{"fontSize":"36px","color":"#111"},"children":[]},{"type":"paragraph","props":{"content":"这是一段介绍文字。"},"style":{"fontSize":"16px","color":"#666"},"children":[]}]}],"pageStyle":{},"reasoningSummary":"生成了带标题和段落的区块。","safetyFlags":[]}`;

function buildUserPrompt(input: AIPageGenerateRequest): string {
  const ctx = {
    instruction: input.instruction,
    pageType: input.pageType ?? "general",
    style: input.style ?? "modern",
    primaryColor: input.primaryColor ?? "#3366ff",
    tone: input.tone ?? "professional",
    length: input.length ?? "medium",
    language: input.language ?? "zh-CN",
    keywords: input.keywords ?? [],
  };

  const parts = [
    "请根据以下需求生成一页网页结构，直接返回上述格式的 JSON，不要用 markdown 包裹。",
    "",
    "设计要求：",
    "- 布局清晰：用 container 组织区块，先有 hero（标题+副标题+按钮），再内容区，最后可加联系或行动区。",
    "- 主色用于按钮、链接和重点，保持对比度。",
    "- 字体层级：大标题 32–48px，小标题 24–32px，正文 14–18px。",
    "- 留白：区块 padding 建议 24–48px，元素间距用 margin 或 gap。",
    "- 内容需贴合用户描述，使用指定语言。",
    "",
    "用户需求与参数：",
    JSON.stringify(ctx, null, 2),
  ];

  return [parts.join("\n"), "", NODE_EXAMPLE].join("\n");
}

/** 简化版 prompt，用于重试时强调“仅 JSON” */
function buildUserPromptStrict(input: AIPageGenerateRequest): string {
  const ctx = {
    instruction: input.instruction,
    primaryColor: input.primaryColor ?? "#3366ff",
    language: input.language ?? "zh-CN",
  };
  return [
    "只输出一个 JSON 对象，不要任何前后文字。",
    "必须包含: title, nodes, pageStyle, reasoningSummary, safetyFlags。",
    "nodes 中每项要有 type, props, style, children。",
    "用户需求：",
    JSON.stringify(ctx, null, 2),
  ].join("\n");
}

// ---------- Provider 实现 ----------
export const createFallbackProvider = (): AIProvider => ({
  async generatePageDraft(input) {
    return fallbackPage(input);
  },
});

export const createOpenAICompatibleProvider = (
  config: OpenAICompatibleConfig,
): AIProvider => {
  const apiKey = config.apiKey;
  const baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
  const model = config.model ?? "gpt-4.1-mini";

  const callModel = async (
    systemContent: string,
    userContent: string,
  ): Promise<unknown> => {
    if (!apiKey) {
      return null;
    }
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userContent },
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
      let raw: unknown = await callModel(
        SYSTEM_PROMPT,
        buildUserPrompt(input),
      );
      let response = parseAIPageResponse(raw, input);

      const usedFallback =
        !raw || (response.document.meta?.source as string) === "ai-page-template";
      if (usedFallback && apiKey) {
        raw = await callModel(SYSTEM_PROMPT, buildUserPromptStrict(input));
        const retryResponse = parseAIPageResponse(raw, input);
        const retryNodes = retryResponse.document.root?.length ?? 0;
        if (retryNodes >= 2) {
          response = retryResponse;
        }
      }

      return response;
    },
  };
};
