import { z } from "zod";
import {
  DefaultNodePropsByType,
  NodeTypeSchema,
  type AIChatMessage,
  type AINodeModifyRequest,
  type AINodeModifyResponse,
  type AIPageGenerateRequest,
  type AIPageGenerateResponse,
  type EditorNode,
  type PageDocumentV2,
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

const AINodeModelOutputSchema = z.object({
  node: z.any().optional(),
  reasoningSummary: z.string().optional(),
  safetyFlags: z.array(z.string()).optional(),
});

export type AIProvider = {
  generatePageDraft: (
    input: AIPageGenerateRequest,
  ) => Promise<AIPageGenerateResponse>;
  modifyNodeDraft: (
    input: AINodeModifyProviderInput,
  ) => Promise<AINodeModifyResponse>;
};

export type AINodeModifyProviderInput = AINodeModifyRequest & {
  pageTitle: string;
  targetNode: EditorNode;
};

export type OpenAICompatibleConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
};

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const cloneDefaultProps = (type: keyof typeof DefaultNodePropsByType) =>
  JSON.parse(JSON.stringify(DefaultNodePropsByType[type])) as Record<
    string,
    unknown
  >;

const cloneNode = (node: EditorNode): EditorNode =>
  JSON.parse(JSON.stringify(node)) as EditorNode;

const cloneNodeWithFreshIds = (node: EditorNode): EditorNode => {
  const next = cloneNode(node);
  const refresh = (target: EditorNode) => {
    target.id = createNodeId();
    target.children.forEach(refresh);
  };
  refresh(next);
  return next;
};

const createNodeId = () => `node_${Math.random().toString(36).slice(2, 10)}`;

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

const AI_PAGE_SOURCE_PREFIX = "ai-page";
const UNSAFE_GENERATED_POSITIONS = new Set(["absolute", "fixed", "sticky"]);
const POSITION_STYLE_KEYS = ["position", "top", "right", "bottom", "left", "inset", "zIndex"] as const;

const hasRenderableStyleValue = (
  value: StyleValue | undefined,
): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  return String(value).trim() !== "";
};

const sanitizeGeneratedNodeStyle = (
  style: StyleRecord,
  options: {
    depth: number;
    parentDisplay: string;
    nodeType: EditorNode["type"];
  },
): StyleRecord => {
  const next: StyleRecord = { ...style };
  const position = String(next.position ?? "").trim().toLowerCase();

  if (UNSAFE_GENERATED_POSITIONS.has(position)) {
    POSITION_STYLE_KEYS.forEach((key) => {
      delete next[key];
    });
  }

  if (options.depth === 0 && !hasRenderableStyleValue(next.width)) {
    next.width = "100%";
  }

  if (options.parentDisplay === "flex") {
    if (!hasRenderableStyleValue(next.minWidth)) {
      next.minWidth = "0";
    }

    if (
      options.nodeType === "container" &&
      !hasRenderableStyleValue(next.width) &&
      !hasRenderableStyleValue(next.flex)
    ) {
      next.flex = "1 1 0";
    }
  }

  if (options.parentDisplay === "grid") {
    if (!hasRenderableStyleValue(next.minWidth)) {
      next.minWidth = "0";
    }
    if (!hasRenderableStyleValue(next.width)) {
      next.width = "100%";
    }
  }

  return next;
};

const normalizeGeneratedNodeTree = (
  node: EditorNode,
  options: {
    depth: number;
    parentDisplay?: string;
  },
): EditorNode => {
  const normalizeAsContainer = node.type === "nav" && node.children.length > 0;
  const parentDisplay = String(options.parentDisplay ?? "").trim().toLowerCase();
  const style = sanitizeGeneratedNodeStyle(normalizeStyleRecord(node.style), {
    depth: options.depth,
    parentDisplay,
    nodeType: normalizeAsContainer ? "container" : node.type,
  });
  const ownDisplay = String(style.display ?? "").trim().toLowerCase();
  const props = normalizeAsContainer
    ? {
        ...cloneDefaultProps("container"),
        layout: "flow",
      }
    : node.props;

  return {
    ...node,
    type: normalizeAsContainer ? "container" : node.type,
    props,
    style,
    children: node.children.map((child) =>
      normalizeGeneratedNodeTree(child, {
        depth: options.depth + 1,
        parentDisplay: ownDisplay,
      }),
    ),
  };
};

const buildNodeContentSignature = (node: EditorNode): string =>
  JSON.stringify({
    type: node.type,
    content:
      typeof node.props.content === "string"
        ? collapseWhitespace(node.props.content)
        : typeof node.props.label === "string"
          ? collapseWhitespace(node.props.label)
          : Array.isArray(node.props.items)
            ? node.props.items.map((item) => collapseWhitespace(String(item ?? "")))
            : "",
    display: String(node.style.display ?? ""),
    flexDirection: String(node.style.flexDirection ?? ""),
    gridTemplateColumns: String(node.style.gridTemplateColumns ?? ""),
    childCount: node.children.length,
    children: node.children.map((child) => buildNodeContentSignature(child)),
  });

const dedupeAdjacentTopLevelSections = (nodes: EditorNode[]): EditorNode[] => {
  const next: EditorNode[] = [];
  let previousSignature = "";

  nodes.forEach((node) => {
    const signature = buildNodeContentSignature(node);
    if (signature === previousSignature) {
      return;
    }
    next.push(node);
    previousSignature = signature;
  });

  return next;
};

export const normalizeAIPageDocument = (
  document: PageDocumentV2,
): PageDocumentV2 => {
  const source = String(document.meta?.source ?? "").trim().toLowerCase();
  if (!source.startsWith(AI_PAGE_SOURCE_PREFIX)) {
    return document;
  }

  return {
    ...document,
    root: dedupeAdjacentTopLevelSections(
      sanitizeGeneratedNodeCopy(
        document.root.map((node) =>
        normalizeGeneratedNodeTree(node, {
          depth: 0,
        }),
        ),
      ),
    ),
  };
};

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

function sanitizeNodeProps(
  type: keyof typeof DefaultNodePropsByType,
  rawProps: Record<string, unknown>,
): Record<string, unknown> {
  const defaults = cloneDefaultProps(type);
  const merged = { ...defaults };

  for (const [key, value] of Object.entries(rawProps)) {
    if (value === undefined) {
      continue;
    }

    if (type === "title" && key === "level") {
      const level = String(value).toLowerCase();
      if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(level)) {
        merged[key] = level;
      }
      continue;
    }

    if (type === "button" && key === "variant") {
      const variant = String(value).toLowerCase();
      const normalizedVariant =
        variant === "secondary" ? "soft" : variant;
      if (["primary", "outline", "soft"].includes(normalizedVariant)) {
        merged[key] = normalizedVariant;
      }
      continue;
    }

    if (type === "input" && key === "type") {
      const inputType = String(value).toLowerCase();
      if (["text", "email", "password", "number", "tel", "url"].includes(inputType)) {
        merged[key] = inputType;
      }
      continue;
    }

    if (type === "list" && key === "listStyleType") {
      const listStyleType = String(value).toLowerCase();
      if (["disc", "circle", "square", "decimal", "none"].includes(listStyleType)) {
        merged[key] = listStyleType;
      }
      continue;
    }

    if (type === "table" && (key === "rows" || key === "cols")) {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) {
        merged[key] = Math.max(1, Math.min(12, Math.round(numeric)));
      }
      continue;
    }

    merged[key] = value;
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
    .map((child) => normalizeNode(child))
    .filter((child): child is EditorNode => Boolean(child));

  return createNode(
    type,
    sanitizeNodeProps(type, rawProps),
    normalizeStyleRecord(raw.style),
    children,
  );
};

const inferPageTypeFromInstruction = (instruction: string): string => {
  const lower = instruction.trim().toLowerCase();
  if (/product|shop|store/.test(lower)) {
    return "product";
  }
  if (/contact|service|support/.test(lower)) {
    return "contact";
  }
  if (/portfolio|case|work/.test(lower)) {
    return "portfolio";
  }
  if (/business|company|enterprise/.test(lower)) {
    return "business";
  }
  if (/landing|campaign|promo/.test(lower)) {
    return "landing";
  }
  return "home";
};

const createHeroSection = (
  title: string,
  subtitle: string,
  primaryColor: string,
  backgroundColor: string,
): EditorNode =>
  createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      minHeight: "520px",
      padding: "96px 40px",
      backgroundColor,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      textAlign: "center",
      gap: "20px",
    },
    [
      createNode(
        "title",
        { content: title, level: "h1" },
        {
          fontSize: "52px",
          fontWeight: "700",
          color: "#1a1a1a",
          lineHeight: "1.15",
          maxWidth: "860px",
        },
      ),
      createNode(
        "paragraph",
        { content: subtitle },
        {
          fontSize: "18px",
          lineHeight: "1.8",
          color: "#566074",
          maxWidth: "760px",
        },
      ),
      createNode(
        "button",
        { label: "Get started", variant: "primary" },
        {
          width: "fit-content",
          padding: "14px 28px",
          backgroundColor: primaryColor,
          color: "#ffffff",
        },
      ),
    ],
  );

const createFeatureCard = (
  title: string,
  description: string,
): EditorNode =>
  createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "24px",
      border: "1px solid #e4e7ec",
      backgroundColor: "#ffffff",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    },
    [
      createNode(
        "title",
        { content: title, level: "h3" },
        { fontSize: "24px", fontWeight: "600", color: "#182230" },
      ),
      createNode(
        "paragraph",
        { content: description },
        { fontSize: "15px", lineHeight: "1.7", color: "#475467" },
      ),
    ],
  );

const createFeatureSection = (
  titles: string[],
  primaryColor: string,
): EditorNode => {
  const cards = titles.slice(0, 3).map((title, index) =>
    createFeatureCard(
      title,
      [
        "Clear structure that is easy to keep editing.",
        "Responsive layout and concise copy for static pages.",
        "Consistent visual hierarchy with editable content blocks.",
      ][index] ?? "A focused section aligned with the requested goal.",
    ),
  );

  return createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "72px 40px",
      display: "flex",
      flexDirection: "column",
      gap: "28px",
      backgroundColor: "#ffffff",
    },
    [
      createNode(
        "title",
        { content: "Key sections", level: "h2" },
        { fontSize: "36px", fontWeight: "700", color: "#111827" },
      ),
      createNode(
        "container",
        { layout: "flow" },
        {
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: "20px",
        },
        cards.length > 0
          ? cards
          : [
              createFeatureCard("Feature", "A focused section aligned with the requested goal."),
              createFeatureCard("Value", "A focused section aligned with the requested goal."),
              createFeatureCard("Action", "A focused section aligned with the requested goal."),
            ],
      ),
      createNode(
        "button",
        { label: "Explore more", variant: "outline" },
        {
          width: "fit-content",
          padding: "12px 24px",
          border: `1px solid ${primaryColor}`,
          color: primaryColor,
          backgroundColor: "#ffffff",
        },
      ),
    ],
  );
};

const createContentSection = (
  title: string,
  body: string,
  backgroundColor = "#f8fafc",
): EditorNode =>
  createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "72px 40px",
      backgroundColor,
      display: "flex",
      flexDirection: "column",
      gap: "16px",
    },
    [
      createNode(
        "title",
        { content: title, level: "h2" },
        { fontSize: "34px", fontWeight: "700", color: "#101828" },
      ),
      createNode(
        "paragraph",
        { content: body },
        {
          fontSize: "16px",
          lineHeight: "1.8",
          color: "#475467",
          maxWidth: "760px",
        },
      ),
    ],
  );

const createCtaSection = (
  primaryColor: string,
  title: string,
  body: string,
  buttonLabel = "Contact us",
): EditorNode =>
  createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "72px 40px",
      backgroundColor: primaryColor,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: "18px",
    },
    [
      createNode(
        "title",
        { content: title, level: "h2" },
        { fontSize: "36px", fontWeight: "700", color: "#ffffff" },
      ),
      createNode(
        "paragraph",
        { content: body },
        {
          fontSize: "16px",
          lineHeight: "1.8",
          color: "#e8efff",
          maxWidth: "680px",
        },
      ),
      createNode(
        "button",
        { label: buttonLabel, variant: "soft" },
        {
          width: "fit-content",
          padding: "14px 28px",
          backgroundColor: "#ffffff",
          color: primaryColor,
        },
      ),
    ],
  );

const createNavigationSection = (
  brand: string,
  labels: {
    links: string[];
    secondaryAction: string;
    primaryAction: string;
  },
  primaryColor: string,
): EditorNode =>
  createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "22px 40px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "24px",
      backgroundColor: "#ffffff",
      borderBottom: "1px solid #e8edf5",
    },
    [
      createNode(
        "title",
        { content: brand, level: "h3" },
        {
          fontSize: "26px",
          fontWeight: "700",
          color: "#0f172a",
          lineHeight: "1.2",
        },
      ),
      createNode(
        "container",
        { layout: "flow" },
        {
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "14px",
          flexWrap: "wrap",
          minWidth: "0",
        },
        [
          ...labels.links.map((label) =>
            createNode(
              "link",
              {
                label,
                href: "https://example.com",
                underline: false,
                target: "_self",
              },
              {
                color: "#334155",
                fontSize: "15px",
              },
            ),
          ),
          createNode(
            "button",
            { label: labels.secondaryAction, variant: "outline", size: "md" },
            {
              padding: "10px 18px",
              border: `1px solid ${primaryColor}`,
              color: primaryColor,
              backgroundColor: "#ffffff",
              borderRadius: "12px",
            },
          ),
          createNode(
            "button",
            { label: labels.primaryAction, variant: "primary", size: "md" },
            {
              padding: "10px 18px",
              backgroundColor: primaryColor,
              color: "#ffffff",
              borderRadius: "12px",
            },
          ),
        ],
      ),
    ],
  );

const createHeroShowcaseSection = (
  title: string,
  subtitle: string,
  labels: {
    eyebrow: string;
    primaryAction: string;
    secondaryAction: string;
    quickPoints: string[];
    metricTitle: string;
    metricBody: string;
    sideCards: Array<{ title: string; body: string }>;
  },
  primaryColor: string,
  secondaryColor: string,
  backgroundColor: string,
): EditorNode =>
  createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "72px 40px 88px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "32px",
      background: `linear-gradient(180deg, ${backgroundColor} 0%, #ffffff 100%)`,
      backgroundColor,
    },
    [
      createNode(
        "container",
        { layout: "flow" },
        {
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "18px",
          flex: "1 1 0",
          minWidth: "0",
        },
        [
          createNode(
            "text",
            { content: labels.eyebrow },
            {
              fontSize: "14px",
              fontWeight: "600",
              color: primaryColor,
              letterSpacing: "0.08em",
            },
          ),
          createNode(
            "title",
            { content: title, level: "h1" },
            {
              fontSize: "52px",
              fontWeight: "800",
              color: "#0f172a",
              lineHeight: "1.12",
            },
          ),
          createNode(
            "paragraph",
            { content: subtitle },
            {
              fontSize: "18px",
              lineHeight: "1.8",
              color: "#526072",
              maxWidth: "640px",
            },
          ),
          createNode(
            "container",
            { layout: "flow" },
            {
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "center",
            },
            [
              createNode(
                "button",
                { label: labels.primaryAction, variant: "primary", size: "lg" },
                {
                  padding: "14px 28px",
                  backgroundColor: primaryColor,
                  color: "#ffffff",
                  borderRadius: "14px",
                  boxShadow: "0 12px 24px rgba(37, 99, 235, 0.18)",
                },
              ),
              createNode(
                "button",
                { label: labels.secondaryAction, variant: "outline", size: "lg" },
                {
                  padding: "14px 28px",
                  border: "1px solid #c8d4e8",
                  color: "#1e293b",
                  backgroundColor: "#ffffff",
                  borderRadius: "14px",
                },
              ),
            ],
          ),
          createNode(
            "container",
            { layout: "flow" },
            {
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              minWidth: "0",
            },
            labels.quickPoints.map((item) =>
              createNode(
                "container",
                { layout: "flow" },
                {
                  width: "fit-content",
                  padding: "10px 14px",
                  borderRadius: "999px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #d9e3f2",
                },
                [
                  createNode(
                    "text",
                    { content: item },
                    {
                      fontSize: "13px",
                      color: "#334155",
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      createNode(
        "container",
        { layout: "flow" },
        {
          flex: "1 1 0",
          minWidth: "0",
          padding: "22px",
          borderRadius: "28px",
          background: `linear-gradient(135deg, ${primaryColor}18 0%, ${secondaryColor}14 100%)`,
          backgroundColor: "#edf4ff",
          boxShadow: "0 26px 60px rgba(15, 23, 42, 0.12)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        },
        [
          createNode(
            "container",
            { layout: "flow" },
            {
              padding: "20px",
              borderRadius: "22px",
              backgroundColor: "#ffffff",
              boxShadow: "0 10px 28px rgba(15, 23, 42, 0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            },
            [
              createNode(
                "title",
                { content: labels.metricTitle, level: "h3" },
                { fontSize: "24px", fontWeight: "700", color: "#0f172a" },
              ),
              createNode(
                "paragraph",
                { content: labels.metricBody },
                { fontSize: "14px", lineHeight: "1.7", color: "#526072" },
              ),
            ],
          ),
          createNode(
            "container",
            { layout: "flow" },
            {
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "14px",
            },
            labels.sideCards.map((item, index) =>
              createNode(
                "container",
                { layout: "flow" },
                {
                  padding: "18px",
                  borderRadius: "20px",
                  backgroundColor: index === 0 ? "#ffffff" : "#f8fbff",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                },
                [
                  createNode(
                    "title",
                    { content: item.title, level: "h4" },
                    { fontSize: "18px", fontWeight: "700", color: "#0f172a" },
                  ),
                  createNode(
                    "paragraph",
                    { content: item.body },
                    { fontSize: "13px", lineHeight: "1.6", color: "#526072" },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ],
  );

const createEnhancedFeatureSection = (
  sectionTitle: string,
  cards: Array<{ eyebrow: string; title: string; body: string }>,
  primaryColor: string,
): EditorNode =>
  createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "80px 40px",
      display: "flex",
      flexDirection: "column",
      gap: "28px",
      backgroundColor: "#ffffff",
    },
    [
      createNode(
        "title",
        { content: sectionTitle, level: "h2" },
        { fontSize: "36px", fontWeight: "700", color: "#111827" },
      ),
      createNode(
        "container",
        { layout: "flow" },
        {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "18px",
        },
        cards.map((card) =>
          createNode(
            "container",
            { layout: "flow" },
            {
              padding: "24px",
              borderRadius: "20px",
              border: "1px solid #e5eaf3",
              backgroundColor: "#ffffff",
              boxShadow: "0 10px 28px rgba(15, 23, 42, 0.06)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            },
            [
              createNode(
                "text",
                { content: card.eyebrow },
                { fontSize: "12px", fontWeight: "600", color: primaryColor },
              ),
              createNode(
                "title",
                { content: card.title, level: "h3" },
                { fontSize: "22px", fontWeight: "700", color: "#182230" },
              ),
              createNode(
                "paragraph",
                { content: card.body },
                { fontSize: "15px", lineHeight: "1.75", color: "#475467" },
              ),
            ],
          ),
        ),
      ),
    ],
  );

const createSocialProofSection = (
  title: string,
  cards: Array<{ title: string; body: string }>,
): EditorNode =>
  createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "80px 40px",
      backgroundColor: "#f8fafc",
      display: "flex",
      flexDirection: "column",
      gap: "24px",
    },
    [
      createNode(
        "title",
        { content: title, level: "h2" },
        { fontSize: "34px", fontWeight: "700", color: "#101828" },
      ),
      createNode(
        "container",
        { layout: "flow" },
        {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "18px",
        },
        cards.map((item) =>
          createNode(
            "container",
            { layout: "flow" },
            {
              padding: "22px",
              borderRadius: "20px",
              backgroundColor: "#ffffff",
              border: "1px solid #e5eaf3",
              boxShadow: "0 10px 26px rgba(15, 23, 42, 0.05)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            },
            [
              createNode(
                "title",
                { content: item.title, level: "h3" },
                { fontSize: "22px", fontWeight: "700", color: "#182230" },
              ),
              createNode(
                "paragraph",
                { content: item.body },
                { fontSize: "15px", lineHeight: "1.75", color: "#475467" },
              ),
            ],
          ),
        ),
      ),
    ],
  );

const buildFallbackSections = (input: AIPageGenerateRequest): EditorNode[] => {
  const primaryColor = input.primaryColor || "#3366ff";
  const secondaryColor = input.secondaryColor || "#f97316";
  const backgroundColor = input.backgroundColor || "#f5f7fb";
  const pageType = input.pageType || inferPageTypeFromInstruction(input.instruction);
  const preferChinese = /[\u4e00-\u9fff]/u.test(input.instruction);
  const highlights = buildInstructionHighlights(input.instruction, 5, 56).filter(
    (item) => !isInstructionalCopy(item),
  );
  const fallbackTitle = preferChinese
    ? /教育|课程|学习/u.test(input.instruction)
      ? "搭建更清晰的在线教育首页"
      : pageType === "contact"
        ? "让沟通入口更直接清晰"
        : "打造清晰专业的品牌首页"
    : /education|course|learning/i.test(input.instruction)
      ? "Build a clearer online learning homepage"
      : pageType === "contact"
        ? "Make the contact path clearer"
        : "Build a polished brand homepage";
  const fallbackSubtitle = preferChinese
    ? "围绕核心价值、重点内容和行动按钮组织页面，保证结构清晰、分区稳定，并适合后续继续编辑。"
    : "Organize the page around value, key sections, and a clear CTA while keeping the layout stable and editable.";
  const mainTitle =
    compactText(highlights[0] ?? "", 48) || fallbackTitle;
  const subtitle =
    compactText(
      highlights.slice(1).join(". ") || fallbackSubtitle,
      180,
    ) || fallbackSubtitle;
  const featureTitles = sanitizeStringList(input.sections, 4, 24) ?? [];

  const copy = preferChinese
    ? {
        brand: "品牌空间",
        navLinks: ["首页", "方案", "案例", "关于我们"],
        secondaryAction: "了解更多",
        primaryAction: "立即咨询",
        eyebrow: "清晰结构 / 易于编辑 / 适合展示",
        quickPoints: ["模块清晰", "重点突出", "便于继续编辑"],
        metricTitle: "内容结构已搭好",
        metricBody: "首屏、核心卖点、信任背书和转化动作都保持在正常文档流中，更适合可视化编辑。",
        sideCards: [
          { title: "核心卖点", body: "把最重要的价值放在首屏附近，用户一眼能看懂。" },
          { title: "信息分层", body: "标题、说明、按钮和卡片层次清楚，不依赖复杂定位。" },
          { title: "继续编辑", body: "后续可以直接在画布中修改文案、样式和区块顺序。" },
          { title: "更稳布局", body: "Flex 和 Grid 负责排版，不再依赖漂浮或叠放。 " },
        ],
        featureSectionTitle: "核心内容模块",
        featureCards: [
          { eyebrow: "01", title: featureTitles[0] || "核心价值", body: "把最需要用户记住的信息放在卡片里，内容短、重点清晰。"},
          { eyebrow: "02", title: featureTitles[1] || "服务能力", body: "展示方案亮点、流程优势或产品价值，方便继续扩写。"},
          { eyebrow: "03", title: featureTitles[2] || "信任背书", body: "补充案例、评价、数据或团队信息，增强说服力。"},
          { eyebrow: "04", title: featureTitles[3] || "行动引导", body: "用明确按钮或联系入口承接转化，减少页面理解成本。"},
        ],
        proofTitle: pageType === "contact" ? "联系与沟通方式" : "补充说明与信任展示",
        proofCards:
          pageType === "contact"
            ? [
                { title: "快速联系", body: "可以在这里放电话、邮箱、微信或表单入口，减少沟通路径。" },
                { title: "服务时间", body: "明确响应时间和服务范围，让用户知道下一步如何推进。" },
                { title: "沟通价值", body: "强调咨询后能获得什么，提升点击和提交意愿。" },
              ]
            : [
                { title: "案例展示", body: "用简短摘要说明代表性成果，让页面更有真实感。" },
                { title: "用户评价", body: "通过评价或数据建立信任，不需要复杂布局也能成立。" },
                { title: "后续行动", body: "在这一屏继续承接咨询、预约、试用或了解更多。" },
              ],
        ctaTitle: "把下一步动作说清楚",
        ctaBody: "用一个明确按钮承接咨询、预约、试用或注册，让页面不仅能看，还能转化。",
        ctaAction: "立即咨询",
      }
    : {
        brand: "Brand Space",
        navLinks: ["Home", "Solutions", "Cases", "About"],
        secondaryAction: "Learn more",
        primaryAction: "Get started",
        eyebrow: "Clear structure / Easy editing / Better conversion",
        quickPoints: ["Clear modules", "Strong hierarchy", "Easy follow-up edits"],
        metricTitle: "A stable page foundation",
        metricBody: "Hero, value blocks, trust signals, and CTA stay in normal flow and remain easy to edit.",
        sideCards: [
          { title: "Value first", body: "Lead with the clearest promise and keep it visible above the fold." },
          { title: "Readable hierarchy", body: "Titles, descriptions, buttons, and cards are separated cleanly." },
          { title: "Editable layout", body: "The page remains easy to refine in the visual editor afterward." },
          { title: "Stable rendering", body: "Layout uses flex and grid instead of risky overlapping positioning." },
        ],
        featureSectionTitle: "Core content blocks",
        featureCards: [
          { eyebrow: "01", title: featureTitles[0] || "Core value", body: "Summarize the main message in a concise, scannable card." },
          { eyebrow: "02", title: featureTitles[1] || "Service strength", body: "Show the most convincing capability or product advantage." },
          { eyebrow: "03", title: featureTitles[2] || "Trust signal", body: "Add proof points such as cases, reviews, or numbers." },
          { eyebrow: "04", title: featureTitles[3] || "Action path", body: "Make the next step obvious with a clear CTA." },
        ],
        proofTitle: pageType === "contact" ? "Ways to connect" : "Extra proof and context",
        proofCards:
          pageType === "contact"
            ? [
                { title: "Fast contact", body: "Place phone, email, or form entry points here." },
                { title: "Service window", body: "Clarify response time and support scope." },
                { title: "Why reach out", body: "Explain what the visitor gets after contacting you." },
              ]
            : [
                { title: "Featured cases", body: "Use concise outcomes or examples to build trust." },
                { title: "Client feedback", body: "Short testimonials or numbers make the page more convincing." },
                { title: "Next step", body: "Use this section to lead into trial, booking, or contact." },
              ],
        ctaTitle: "Make the next action obvious",
        ctaBody: "Use one clear button to guide visitors toward contact, signup, booking, or trial.",
        ctaAction: "Get started",
      };

  const sections: EditorNode[] = [
    createNavigationSection(
      copy.brand,
      {
        links: copy.navLinks,
        secondaryAction: copy.secondaryAction,
        primaryAction: copy.primaryAction,
      },
      primaryColor,
    ),
    createHeroShowcaseSection(
      mainTitle,
      subtitle,
      {
        eyebrow: copy.eyebrow,
        primaryAction: copy.primaryAction,
        secondaryAction: copy.secondaryAction,
        quickPoints: copy.quickPoints,
        metricTitle: copy.metricTitle,
        metricBody: copy.metricBody,
        sideCards: copy.sideCards,
      },
      primaryColor,
      secondaryColor,
      backgroundColor,
    ),
    createEnhancedFeatureSection(copy.featureSectionTitle, copy.featureCards, primaryColor),
  ];

  sections.push(createSocialProofSection(copy.proofTitle, copy.proofCards));

  sections.push(
    createCtaSection(
      primaryColor,
      copy.ctaTitle,
      copy.ctaBody,
      copy.ctaAction,
    ),
  );

  return sections;
};

const adjustNodesByLength = (
  input: AIPageGenerateRequest,
  nodes: EditorNode[],
): EditorNode[] => {
  const length = input.length ?? "medium";
  const target =
    length === "short"
      ? { min: 2, max: 3 }
      : length === "long"
        ? { min: 5, max: 7 }
        : { min: 3, max: 5 };

  const result = nodes.map((node) => cloneNodeWithFreshIds(node));
  while (result.length < target.min && result.length > 0) {
    result.push(cloneNodeWithFreshIds(result[result.length - 1]));
  }

  return result.slice(0, target.max);
};

const buildFallbackResponse = (
  input: AIPageGenerateRequest,
): AIPageGenerateResponse => {
  const sections = adjustNodesByLength(input, buildFallbackSections(input));
  const title =
    compactText(
      buildInstructionHighlights(input.instruction, 1, 48)[0] ?? input.instruction,
      48,
    ) || "Generated page";
  const primaryColor = input.primaryColor || "#3366ff";

  const document = normalizeAIPageDocument({
    id: input.pageId,
    projectId: input.projectId,
    title,
    status: "draft",
    version: 1,
    updatedAt: new Date().toISOString(),
    root: sections,
    meta: {
      source: "ai-page-template",
      pageStyle: {
        backgroundColor: input.backgroundColor || "#ffffff",
        fontFamily: FONT_STACK,
      },
    },
  });

  return {
    document,
    reasoningSummary: `Generated a fallback ${inferPageTypeFromInstruction(input.instruction)} page using the requested primary color ${primaryColor}.`,
    safetyFlags: [],
  };
};

const fallbackPage = (input: AIPageGenerateRequest): AIPageGenerateResponse =>
  buildFallbackResponse(input);

const wrapTopLevelNodeInContainer = (node: EditorNode): EditorNode =>
  createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "32px 24px",
    },
    [node],
  );

const normalizeTopLevelNodes = (nodes: EditorNode[]): EditorNode[] =>
  nodes.map((node) =>
    node.type === "container" ? node : wrapTopLevelNodeInContainer(node),
  );

const parseAIPageResponse = (
  raw: unknown,
  input: AIPageGenerateRequest,
): AIPageGenerateResponse => {
  const parsed = AIPageModelOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("AI response format is invalid");
  }

  const result = parsed.data;
  const nodesRaw =
    result.nodes
      ?.map((item: unknown) => normalizeNode(item))
      .filter((item): item is EditorNode => Boolean(item)) ?? [];

  const normalizedNodes = normalizeTopLevelNodes(nodesRaw);
  if (normalizedNodes.length < 1) {
    throw new Error("AI generated no nodes");
  }

  const nodes = sanitizeGeneratedNodeCopy(adjustNodesByLength(input, normalizedNodes));
  const title =
    String(result.title ?? "").trim() || compactText(input.instruction, 48) || "Web Page";

  const lowQualityHint = isLowQualityAIPage(title, nodes, input.instruction);

  const document = normalizeAIPageDocument({
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
        fontFamily: FONT_STACK,
      },
    },
  });

  return {
    document,
    reasoningSummary:
      String(result.reasoningSummary ?? "").trim() ||
      "Generated a page based on your request. You can continue editing on the canvas.",
    safetyFlags: [
      ...(Array.isArray(result.safetyFlags) ? result.safetyFlags : []),
      ...(lowQualityHint ? ["LOW_QUALITY_HINT"] : []),
    ],
  };
};


const MAX_PAGE_PROMPT_CHARS = 1800;
const MAX_NODE_PROMPT_CHARS = 1200;
const MAX_CHAT_MESSAGES = 6;
const MAX_CHAT_MESSAGE_CHARS = 320;
const MAX_KEYWORDS = 6;
const MAX_SECTIONS = 6;

const PROMPT_PROP_KEYS = [
  "content",
  "label",
  "href",
  "placeholder",
  "alt",
  "items",
  "layout",
  "icon",
  "level",
  "variant",
  "type",
  "rows",
  "cols",
] as const;

const PROMPT_STYLE_KEYS = [
  "width",
  "height",
  "maxWidth",
  "minHeight",
  "padding",
  "margin",
  "display",
  "flexDirection",
  "justifyContent",
  "alignItems",
  "gap",
  "color",
  "backgroundColor",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "border",
  "borderRadius",
  "gridTemplateColumns",
  "gridTemplateRows",
] as const;

const SUPPORTED_AI_NODE_TYPES = [
  "container",
  "title",
  "paragraph",
  "text",
  "button",
  "image",
  "link",
  "list",
  "input",
  "table",
  "nav",
  "i",
  "li",
  "ul",
  "ol",
] as const;

const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const splitPromptSegments = (value: string): string[] =>
  value
    .split(/\r?\n|[\u3002\uFF01\uFF1F!?\uFF1B;]+/u)
    .map((part) => collapseWhitespace(part))
    .filter(Boolean);

const compactText = (value: string, maxChars: number): string => {
  const normalized = collapseWhitespace(value);
  if (!normalized) {
    return "";
  }
  if (normalized.length <= maxChars) {
    return normalized;
  }
  return `${normalized.slice(0, maxChars).trimEnd()}...`;
};

const INSTRUCTIONAL_COPY_PATTERN =
  /^(?:生成|创建|设计|制作|搭建)|^(?:build|create|design|generate)\b|(?:整体风格|主色|辅助色|背景以|页面结构|正常文档流|文档流|禁止使用|顶层内容|宽度\s*100%|fixed|absolute|sticky|top|left|right|bottom|primary color|secondary color|background color|normal document flow|do not use)/iu;

const normalizeContentToken = (value: string): string =>
  collapseWhitespace(String(value ?? "")).toLowerCase();

const isInstructionalCopy = (value: string): boolean =>
  INSTRUCTIONAL_COPY_PATTERN.test(collapseWhitespace(value));

const PLACEHOLDER_TEXT_TOKENS = new Set(
  [
    "标题文本",
    "按钮",
    "单行文本",
    "导航栏",
    "这是一段段落内容",
    "超链接",
    "图片",
    "列表项",
    "列表项 1",
    "列表项 2",
    "列表项 3",
    "title",
    "title text",
    "button",
    "text",
    "navigation",
    "paragraph",
    "image",
    "link",
    "list item",
  ].map((value) => normalizeContentToken(value)),
);

const flattenNodes = (nodes: EditorNode[]): EditorNode[] =>
  nodes.flatMap((node) => [node, ...flattenNodes(node.children)]);

const readPrimaryNodeCopy = (node: EditorNode): string => {
  if (["title", "paragraph", "text", "nav", "li"].includes(node.type)) {
    return String(node.props.content ?? "");
  }
  if (node.type === "button" || node.type === "link") {
    return String(node.props.label ?? "");
  }
  if (node.type === "input") {
    return String(node.props.placeholder ?? "");
  }
  if (node.type === "image") {
    return String(node.props.alt ?? "");
  }
  if (node.type === "list" || node.type === "ul" || node.type === "ol") {
    const items = Array.isArray(node.props.items) ? node.props.items : [];
    return String(items[0] ?? "");
  }
  return "";
};

const isLowQualityAIPage = (
  title: string,
  nodes: EditorNode[],
  instruction: string,
): boolean => {
  const allNodes = flattenNodes(nodes);
  const textValues = [title, ...allNodes.map((node) => readPrimaryNodeCopy(node))]
    .map((value) => collapseWhitespace(value))
    .filter(Boolean);
  const normalizedInstruction = normalizeContentToken(instruction);
  const instructionSegments = Array.from(
    new Set(
      splitPromptSegments(instruction)
        .map((value) => normalizeContentToken(value))
        .filter((value) => value.length >= 10),
    ),
  );

  if (textValues.length < 4) {
    return true;
  }

  const placeholderCount = textValues.filter((value) =>
    PLACEHOLDER_TEXT_TOKENS.has(normalizeContentToken(value)),
  ).length;

  if (placeholderCount / textValues.length >= 0.35) {
    return true;
  }

  const instructionalCount = textValues.filter((value) => isInstructionalCopy(value)).length;
  if (instructionalCount >= 2) {
    return true;
  }

  const promptEchoCount = textValues.filter((value) => {
    const normalized = normalizeContentToken(value);
    if (normalized.length < 10) {
      return false;
    }
    if (
      instructionSegments.some(
        (segment) => segment.includes(normalized) || normalized.includes(segment),
      )
    ) {
      return true;
    }
    return (
      normalizedInstruction.length >= 18 &&
      normalizedInstruction.includes(normalized) &&
      normalized.length >= Math.min(36, Math.floor(normalizedInstruction.length * 0.35))
    );
  }).length;

  if (promptEchoCount >= 3 || promptEchoCount / textValues.length >= 0.3) {
    return true;
  }

  const meaningfulTitleCount = allNodes.filter((node) => {
    if (node.type !== "title") {
      return false;
    }
    return !PLACEHOLDER_TEXT_TOKENS.has(normalizeContentToken(String(node.props.content ?? "")));
  }).length;

  return meaningfulTitleCount < 2;
};

const compactOptionalText = (
  value: unknown,
  maxChars: number,
): string | undefined => {
  const normalized = compactText(String(value ?? ""), maxChars);
  return normalized || undefined;
};

const compactInstructionText = (
  value: string,
  maxChars: number,
  maxSegments: number,
): string => {
  const normalized = collapseWhitespace(value);
  if (!normalized) {
    return "";
  }

  const segments = Array.from(new Set(splitPromptSegments(value)));
  if (segments.length <= 1) {
    return compactText(normalized, maxChars);
  }

  return compactText(segments.slice(0, maxSegments).join("; "), maxChars);
};

const sanitizeStringList = (
  values: string[] | undefined,
  maxItems: number,
  maxChars: number,
): string[] | undefined => {
  if (!values || values.length === 0) {
    return undefined;
  }

  const next = values
    .map((value) => compactText(String(value ?? ""), maxChars))
    .filter(Boolean)
    .slice(0, maxItems);

  return next.length > 0 ? next : undefined;
};

const clampGeneratedNodeCopy = (node: EditorNode): EditorNode => {
  const next = cloneNode(node);

  if (typeof next.props.content === "string") {
    const maxChars =
      next.type === "paragraph"
        ? 220
        : next.type === "title"
          ? 56
          : next.type === "nav"
            ? 28
            : 64;
    next.props.content = compactText(next.props.content, maxChars);
  }

  if (typeof next.props.label === "string") {
    const maxChars = next.type === "link" ? 22 : 18;
    next.props.label = compactText(next.props.label, maxChars);
  }

  if (typeof next.props.placeholder === "string") {
    next.props.placeholder = compactText(next.props.placeholder, 36);
  }

  if (typeof next.props.alt === "string") {
    next.props.alt = compactText(next.props.alt, 48);
  }

  if (Array.isArray(next.props.items)) {
    next.props.items = next.props.items
      .map((item) => compactText(String(item ?? ""), 48))
      .filter(Boolean)
      .slice(0, 8);
  }

  next.children = next.children.map((child) => clampGeneratedNodeCopy(child));
  return next;
};

const sanitizeGeneratedNodeCopy = (nodes: EditorNode[]): EditorNode[] =>
  nodes.map((node) => clampGeneratedNodeCopy(node));

const sanitizeConversation = (
  values?: AIChatMessage[],
): AIChatMessage[] | undefined => {
  if (!values || values.length === 0) {
    return undefined;
  }

  const next = values
    .map((value) => ({
      role: value.role,
      content: compactText(value.content, MAX_CHAT_MESSAGE_CHARS),
    }))
    .filter((value) => value.content.length > 0)
    .slice(-MAX_CHAT_MESSAGES);

  return next.length > 0 ? next : undefined;
};

const sanitizePageInput = (
  input: AIPageGenerateRequest,
): AIPageGenerateRequest => ({
  ...input,
  instruction: compactInstructionText(input.instruction, MAX_PAGE_PROMPT_CHARS, 8),
  pageType: compactOptionalText(input.pageType, 24),
  style: compactOptionalText(input.style, 24),
  primaryColor: compactOptionalText(input.primaryColor, 24),
  secondaryColor: compactOptionalText(input.secondaryColor, 24),
  backgroundColor: compactOptionalText(input.backgroundColor, 24),
  tone: compactOptionalText(input.tone, 24),
  length: compactOptionalText(input.length, 24),
  language: compactOptionalText(input.language, 24),
  complexity: compactOptionalText(input.complexity, 24),
  layout: compactOptionalText(input.layout, 24),
  contentFocus: compactOptionalText(input.contentFocus, 32),
  audience: compactOptionalText(input.audience, 32),
  industry: compactOptionalText(input.industry, 32),
  keywords: sanitizeStringList(input.keywords, MAX_KEYWORDS, 24),
  sections: sanitizeStringList(input.sections, MAX_SECTIONS, 24),
});

const sanitizeNodeInput = (
  input: AINodeModifyProviderInput,
): AINodeModifyProviderInput => ({
  ...input,
  instruction: compactInstructionText(input.instruction, MAX_NODE_PROMPT_CHARS, 6),
  pageTitle: compactText(input.pageTitle, 80) || "Untitled Page",
  language: compactOptionalText(input.language, 24),
  conversation: sanitizeConversation(input.conversation),
  targetNode: cloneNode(input.targetNode),
});

const resolvePromptLanguage = (
  language: string | undefined,
  fallbackText: string,
): string => {
  const normalized = compactOptionalText(language, 24);
  if (normalized) {
    return normalized;
  }
  return /[\u4e00-\u9fff]/u.test(fallbackText) ? "zh-CN" : "en";
};

const resolveSectionTarget = (value?: string): string => {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "short":
      return "2-3";
    case "long":
      return "5-7";
    default:
      return "3-5";
  }
};

const resolveComplexityHint = (value?: string): string => {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "simple":
    case "low":
      return "Keep the structure simple and easy to edit.";
    case "complex":
    case "high":
      return "You may add hierarchy, but avoid deep nesting.";
    default:
      return "Use medium complexity and keep the structure easy to edit.";
  }
};

const resolveCopyHint = (value?: string): string => {
  switch (String(value ?? "").trim().toLowerCase()) {
    case "short":
      return "Keep each section concise, with short copy only.";
    case "long":
      return "You may add more complete sections, but keep each paragraph concise.";
    default:
      return "Use concise copy and avoid long paragraphs.";
  }
};

const buildInstructionHighlights = (
  instruction: string,
  maxItems = 6,
  maxChars = 72,
): string[] =>
  splitPromptSegments(instruction)
    .map((value) => compactText(value, maxChars))
    .filter(Boolean)
    .slice(0, maxItems);

const buildPageRequirementList = (
  input: AIPageGenerateRequest,
  language: string,
): string[] => {
  const requirements = [
    input.pageType ? `pageType: ${input.pageType}` : undefined,
    input.style ? `style: ${input.style}` : undefined,
    input.tone ? `tone: ${input.tone}` : undefined,
    input.layout ? `layout: ${input.layout}` : undefined,
    input.contentFocus ? `contentFocus: ${input.contentFocus}` : undefined,
    input.audience ? `audience: ${input.audience}` : undefined,
    input.industry ? `industry: ${input.industry}` : undefined,
    `language: ${language}`,
    `targetSections: ${resolveSectionTarget(input.length)}`,
    resolveComplexityHint(input.complexity),
    resolveCopyHint(input.length),
  ];

  return requirements.filter((item): item is string => Boolean(item));
};

const PAGE_PROMPT_JSON_EXAMPLE = {
  title: "Sample Landing Page",
  nodes: [
    {
      type: "container",
      props: { layout: "flow" },
      style: {
        width: "100%",
        padding: "48px 40px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      },
      children: [
        {
          type: "title",
          props: { content: "Clear headline", level: "h1" },
          style: {
            fontSize: "40px",
            fontWeight: "700",
            color: "#111827",
          },
          children: [],
        },
        {
          type: "paragraph",
          props: { content: "Short supporting paragraph." },
          style: {
            fontSize: "16px",
            lineHeight: "1.7",
            color: "#475467",
          },
          children: [],
        },
      ],
    },
  ],
  pageStyle: {
    backgroundColor: "#ffffff",
    fontFamily: FONT_STACK,
  },
  reasoningSummary: "Generated a stable editable page draft.",
  safetyFlags: [],
};

const buildPagePromptPayload = (input: AIPageGenerateRequest) => {
  const language = resolvePromptLanguage(input.language, input.instruction);
  return {
    request: {
      instructionSummary: compactText(input.instruction, 220),
      keyGoals: buildInstructionHighlights(input.instruction, 5, 60).filter(
        (item) => !isInstructionalCopy(item),
      ),
      pageType: input.pageType,
      audience: input.audience,
      industry: input.industry,
      tone: input.tone,
      style: input.style,
      layout: input.layout,
      contentFocus: input.contentFocus,
      language,
      preferredSections: input.sections ?? [],
      keywords: input.keywords ?? [],
      colors: {
        primaryColor: input.primaryColor ?? "#3366ff",
        secondaryColor: input.secondaryColor,
        backgroundColor: input.backgroundColor,
      },
    },
    spec: {
      requiredKeys: ["title", "nodes", "pageStyle", "reasoningSummary", "safetyFlags"],
      nodeShape: {
        type: "string",
        props: "object",
        style: "object",
        children: "array",
      },
      topLevelNodeType: "container",
      allowedNodeTypes: SUPPORTED_AI_NODE_TYPES,
      allowedButtonVariants: ["primary", "outline", "soft"],
      minimumTopLevelSections: 2,
      targetSectionCount: resolveSectionTarget(input.length),
      explicitRequirements: buildPageRequirementList(input, language),
    },
    quality: {
      prioritize: [
        "valid JSON",
        "renderable structure",
        "editable content",
        "visual coherence",
      ],
      doNot: [
        "Do not echo the user's request as visible headings, paragraphs, card titles, or button labels.",
        "Do not output placeholder copy such as 标题文本, 单行文本, 按钮, 导航栏, or lorem ipsum.",
        "Do not output editor rules or layout instructions as user-facing content.",
        "Do not use fixed, absolute, or sticky positioning for page sections.",
        "Do not leave key text props empty, generic, or meaningless.",
      ],
      prefer: [
        "Use concise real website copy.",
        "Use normal-flow layouts with flex or grid.",
        "Use clear section hierarchy and realistic CTA labels.",
        "Prefer a recognizable landing-page structure when suitable.",
        "Keep the result easy to edit in a visual editor.",
      ],
      imageRule:
        "Use image nodes only when they clearly support the section. alt must be concise and meaningful.",
      textRule:
        "Visible text should read like real website copy, not prompt instructions or schema labels.",
    },
    exampleShape: PAGE_PROMPT_JSON_EXAMPLE,
  };
};

const buildPagePrompt = (input: AIPageGenerateRequest): string => {
  const safeInput = sanitizePageInput(input);
  return [
    "Generate a page draft for a visual web editor.",
    "Return exactly one JSON object and nothing else.",
    "Plan the page structure first internally, then produce the final JSON.",
    "Follow the example for structure shape only, not for wording or layout duplication.",
    "Every node must include type, props, style, and children.",
    JSON.stringify(buildPagePromptPayload(safeInput), null, 2),
  ].join("\n");
};

const buildPagePromptStrict = (input: AIPageGenerateRequest): string => {
  const safeInput = sanitizePageInput(input);
  const language = resolvePromptLanguage(safeInput.language, safeInput.instruction);
  return [
    "Repair mode.",
    "Return exactly one valid JSON object and nothing else.",
    "Do not explain. Do not use markdown. Do not use code fences.",
    "If content quality and structure conflict, prioritize valid renderable structure.",
    "Use only container nodes at the top level.",
    "Use only supported node types and valid button variants.",
    "Keep the page in normal document flow using flex or grid.",
    "Use concise user-facing copy. Do not repeat the user's request as visible content.",
    JSON.stringify(
      {
        instructionSummary: compactText(safeInput.instruction, 160),
        instructionHighlights: buildInstructionHighlights(safeInput.instruction, 4, 56).filter(
          (item) => !isInstructionalCopy(item),
        ),
        requiredKeys: ["title", "nodes", "pageStyle", "reasoningSummary", "safetyFlags"],
        topLevelNodeType: "container",
        minimumTopLevelSections: 2,
        targetSectionCount: resolveSectionTarget(safeInput.length),
        allowedNodeTypes: SUPPORTED_AI_NODE_TYPES,
        allowedButtonVariants: ["primary", "outline", "soft"],
        language,
        colorHints: {
          primaryColor: safeInput.primaryColor ?? "#3366ff",
          secondaryColor: safeInput.secondaryColor,
          backgroundColor: safeInput.backgroundColor,
        },
      },
      null,
      2,
    ),
  ].join("\n");
};

const pickPromptProps = (node: EditorNode): Record<string, unknown> => {
  const next: Record<string, unknown> = {};
  PROMPT_PROP_KEYS.forEach((key) => {
    if (key in node.props) {
      next[key] = node.props[key];
    }
  });
  return next;
};

const pickPromptStyle = (
  node: EditorNode,
): Record<string, string | number | boolean | null> => {
  const next: Record<string, string | number | boolean | null> = {};
  PROMPT_STYLE_KEYS.forEach((key) => {
    if (key in node.style) {
      next[key] = node.style[key];
    }
  });
  return next;
};

const summarizeNodeForPrompt = (
  node: EditorNode,
  depth = 0,
): Record<string, unknown> => ({
  type: node.type,
  props: pickPromptProps(node),
  style: pickPromptStyle(node),
  children:
    depth >= 1
      ? node.children.length
      : node.children
          .slice(0, 3)
          .map((child) => summarizeNodeForPrompt(child, depth + 1)),
});

const buildNodePromptPayload = (input: AINodeModifyProviderInput) => {
  const language = resolvePromptLanguage(input.language, input.instruction);
  return {
    latestInstruction: input.instruction,
    instructionHighlights: buildInstructionHighlights(input.instruction, 4, 64),
    conversation: input.conversation ?? [],
    targetNode: summarizeNodeForPrompt(input.targetNode),
    outputRules: {
      language,
      keepNodeType: input.targetNode.type,
      preserveId: input.targetNode.id,
      scope: "Modify the selected node only. Do not regenerate the whole page.",
      preserveRule:
        "Preserve the current structure, links, and major sizing unless the user explicitly asks to change them.",
    },
    pageContext: {
      pageTitle: input.pageTitle,
    },
  };
};

const buildNodePrompt = (input: AINodeModifyProviderInput): string => {
  const safeInput = sanitizeNodeInput(input);
  return [
    "Task: modify the selected node only.",
    "Return exactly one valid JSON object and nothing else.",
    "Required keys: node, reasoningSummary, safetyFlags.",
    "node.type must match targetNode.type exactly.",
    "Preserve existing structure unless the latest instruction explicitly requests structural change.",
    "Do not copy the user's instruction directly into visible node content unless the instruction itself is intended to be shown to end users.",
    "If the conversation is long, prioritize latestInstruction and the most recent messages.",
    JSON.stringify(buildNodePromptPayload(safeInput), null, 2),
  ].join("\n");
};

const tryParseJsonCandidate = (candidate: string): unknown => {
  const normalized = candidate
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/,\s*([}\]])/g, "$1");

  if (!normalized) {
    return null;
  }

  try {
    return JSON.parse(normalized);
  } catch {
    return null;
  }
};

const parseModelJson = (content: string): unknown => {
  const stripped = content
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/i, "")
    .replace(/```$/i, "")
    .trim();

  const candidates = new Set<string>();
  if (stripped) {
    candidates.add(stripped);
  }

  const objectStart = stripped.indexOf("{");
  const objectEnd = stripped.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.add(stripped.slice(objectStart, objectEnd + 1));
  }

  const arrayStart = stripped.indexOf("[");
  const arrayEnd = stripped.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.add(stripped.slice(arrayStart, arrayEnd + 1));
  }

  for (const candidate of candidates) {
    const parsed = tryParseJsonCandidate(candidate);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
};

const parseAIPageResponseSafe = (
  raw: unknown,
  input: AIPageGenerateRequest,
): AIPageGenerateResponse => {
  const safeInput = sanitizePageInput(input);
  try {
    return parseAIPageResponse(raw, safeInput);
  } catch {
    return fallbackPage(safeInput);
  }
};

const splitInstructionLines = (instruction: string): string[] =>
  splitPromptSegments(instruction)
    .map((value) => compactText(value, 120))
    .filter(Boolean);

const extractUrl = (
  instruction: string,
  fallback = "https://example.com",
): string => {
  const matched = instruction.match(/https?:\/\/\S+/i);
  return matched?.[0] ?? fallback;
};

const buildListItems = (instruction: string): string[] => {
  const items = splitInstructionLines(instruction)
    .map((value) => compactText(value, 42))
    .filter(Boolean)
    .slice(0, 5);

  if (items.length > 0) {
    return items;
  }

  return [compactText(instruction, 42) || "List item 1"];
};

const pickButtonLabel = (
  instruction: string,
  fallback = "Learn more",
): string =>
  compactText(splitInstructionLines(instruction)[0] ?? instruction, 16) || fallback;

const updateContainerChildren = (
  node: EditorNode,
  instruction: string,
): EditorNode => {
  const lines = splitInstructionLines(instruction);
  const heading = compactText(lines[0] ?? instruction, 36) || "Content block";
  const body =
    compactText(lines[1] ?? instruction, 160) ||
    "Continue refining the content of this section.";
  const buttonLabel = pickButtonLabel(lines[2] ?? "Learn more");

  let updatedTitle = false;
  let updatedParagraph = false;
  let updatedButton = false;

  const children = node.children.map((child) => {
    const nextChild = cloneNode(child);

    if (!updatedTitle && nextChild.type === "title") {
      nextChild.props = {
        ...nextChild.props,
        content: heading,
        level:
          typeof nextChild.props.level === "string" ? nextChild.props.level : "h2",
      };
      updatedTitle = true;
      return nextChild;
    }

    if (!updatedParagraph && ["paragraph", "text"].includes(nextChild.type)) {
      nextChild.props = {
        ...nextChild.props,
        content: body,
      };
      updatedParagraph = true;
      return nextChild;
    }

    if (!updatedButton && ["button", "link"].includes(nextChild.type)) {
      if (nextChild.type === "button") {
        nextChild.props = {
          ...nextChild.props,
          label: buttonLabel,
        };
      } else {
        nextChild.props = {
          ...nextChild.props,
          label: buttonLabel,
          href: extractUrl(instruction, String(nextChild.props.href ?? "")),
        };
      }
      updatedButton = true;
      return nextChild;
    }

    return nextChild;
  });

  if (!updatedTitle) {
    children.unshift(
      createNode(
        "title",
        { content: heading, level: "h2" },
        { fontSize: "32px", fontWeight: "700", marginBottom: "12px" },
      ),
    );
  }

  if (!updatedParagraph) {
    children.splice(
      Math.min(children.length, 1),
      0,
      createNode(
        "paragraph",
        { content: body },
        { fontSize: "16px", lineHeight: "1.7", color: "#5b6270" },
      ),
    );
  }

  if (!updatedButton) {
    children.push(
      createNode(
        "button",
        { label: buttonLabel, variant: "primary" },
        { padding: "12px 24px", width: "fit-content" },
      ),
    );
  }

  return {
    ...node,
    children,
  };
};

const buildFallbackNodeResponse = (
  input: AINodeModifyProviderInput,
): AINodeModifyResponse => {
  const safeInput = sanitizeNodeInput(input);
  const nextNode = cloneNode(safeInput.targetNode);
  const instruction = safeInput.instruction;

  switch (nextNode.type) {
    case "title":
      nextNode.props = {
        ...nextNode.props,
        content: compactText(instruction, 64) || "Updated title",
        level: typeof nextNode.props.level === "string" ? nextNode.props.level : "h2",
      };
      break;
    case "paragraph":
    case "text":
    case "nav":
    case "li":
      nextNode.props = {
        ...nextNode.props,
        content: compactText(instruction, 220) || "Updated content",
      };
      break;
    case "button":
      nextNode.props = {
        ...nextNode.props,
        label: pickButtonLabel(instruction, "Take action"),
      };
      break;
    case "link":
      nextNode.props = {
        ...nextNode.props,
        label: pickButtonLabel(instruction, "View details"),
        href: extractUrl(instruction, String(nextNode.props.href ?? "")),
      };
      break;
    case "input":
      nextNode.props = {
        ...nextNode.props,
        placeholder: compactText(instruction, 40) || "Enter content",
      };
      break;
    case "image":
      nextNode.props = {
        ...nextNode.props,
        alt: compactText(instruction, 72) || "Image description",
      };
      break;
    case "list":
    case "ul":
    case "ol":
      nextNode.props = {
        ...nextNode.props,
        items: buildListItems(instruction),
      };
      break;
    case "container":
      return {
        node: {
          ...updateContainerChildren(nextNode, instruction),
          id: safeInput.targetNode.id,
          aiMeta: {
            ...nextNode.aiMeta,
            lastAppliedAt: new Date().toISOString(),
            lastPrompt: instruction,
          },
        },
        reasoningSummary:
          "Updated the main content of the selected container based on the latest instruction.",
        safetyFlags: [],
      };
    default:
      break;
  }

  nextNode.id = safeInput.targetNode.id;
  nextNode.aiMeta = {
    ...nextNode.aiMeta,
    lastAppliedAt: new Date().toISOString(),
    lastPrompt: instruction,
  };

  return {
    node: nextNode,
    reasoningSummary: `Updated the selected ${safeInput.targetNode.type} node.`,
    safetyFlags: [],
  };
};

const resolveAINodeResponse = (
  raw: unknown,
  input: AINodeModifyProviderInput,
): AINodeModifyResponse => {
  const safeInput = sanitizeNodeInput(input);
  const parsed = AINodeModelOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return buildFallbackNodeResponse(safeInput);
  }

  const normalizedNode = normalizeNode(parsed.data.node);
  if (!normalizedNode || normalizedNode.type !== safeInput.targetNode.type) {
    return buildFallbackNodeResponse(safeInput);
  }

  normalizedNode.id = safeInput.targetNode.id;
  normalizedNode.aiMeta = {
    ...safeInput.targetNode.aiMeta,
    ...normalizedNode.aiMeta,
    lastAppliedAt: new Date().toISOString(),
    lastPrompt: safeInput.instruction,
  };

  return {
    node: normalizedNode,
    reasoningSummary:
      compactText(String(parsed.data.reasoningSummary ?? ""), 120) ||
      `Updated the selected ${safeInput.targetNode.type} node.`,
    safetyFlags: Array.isArray(parsed.data.safetyFlags)
      ? parsed.data.safetyFlags
      : [],
  };
};

export const createFallbackProvider = (): AIProvider => ({
  async generatePageDraft(input) {
    return fallbackPage(sanitizePageInput(input));
  },
  async modifyNodeDraft(input) {
    return buildFallbackNodeResponse(sanitizeNodeInput(input));
  },
});

export const createOpenAICompatibleProvider = (
  config: OpenAICompatibleConfig,
): AIProvider => {
  const apiKey = config.apiKey;
  const baseUrl = config.baseUrl ?? "https://api.openai.com/v1";
  const model = config.model ?? "gpt-4.1-mini";

  const pageSystemPrompt = [
    "You are a page generation engine for a visual web editor.",
    "Return exactly one JSON object and nothing else.",
    "The JSON must follow the required schema and be directly renderable.",
    "Top-level nodes must be container nodes only.",
    "Use only supported node types and valid props.",
    "Do not output markdown, code fences, explanations, HTML strings, or placeholder text.",
    "Do not copy the user's request or editor rules into visible page content.",
    "Prefer stable normal-flow layouts using flex or grid.",
    "When requirements conflict, prioritize: valid JSON > renderable structure > editable content > visual coherence.",
  ].join("\n");

  const nodeSystemPrompt = [
    "You are the JSON node-modification engine for a visual web editor.",
    "Return exactly one JSON object and nothing else.",
    "The response must include node, reasoningSummary, safetyFlags.",
    "node.type must remain exactly the same as the target node type.",
    "Unless the user explicitly asks for it, preserve the original structure, sizing, and editable content.",
    "Do not transform editor instructions into visible UI copy unless the instruction is clearly intended as user-facing text.",
  ].join("\n");

  const callModel = async (
    systemContent: string,
    userContent: string,
    temperature = 0.1,
  ): Promise<unknown> => {
    if (!apiKey) {
      return null;
    }

    const isDeepSeek = baseUrl.includes("deepseek");
    const requestBodyBase: Record<string, unknown> = {
      model: isDeepSeek ? (config.model ?? "deepseek-chat") : model,
      temperature,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
      ],
    };

    const parseCompletion = (payload: unknown): unknown => {
      const typed = payload as {
        choices?: Array<{
          message?: {
            content?:
              | string
              | Array<
                  | string
                  | {
                      type?: string;
                      text?: string | { value?: string };
                      content?: string;
                    }
                >;
          };
        }>;
      };
      const content = typed.choices?.[0]?.message?.content;

      if (typeof content === "string") {
        return parseModelJson(content);
      }

      if (!Array.isArray(content) || content.length === 0) {
        return null;
      }

      const merged = content
        .map((item) => {
          if (typeof item === "string") {
            return item;
          }
          if (!isObject(item)) {
            return "";
          }
          if (typeof item.content === "string") {
            return item.content;
          }
          if (typeof item.text === "string") {
            return item.text;
          }
          if (isObject(item.text) && typeof item.text.value === "string") {
            return item.text.value;
          }
          return "";
        })
        .join("\n")
        .trim();

      if (!merged) {
        return null;
      }

      return parseModelJson(merged);
    };

    const postCompletion = async (
      requestBody: Record<string, unknown>,
    ): Promise<{ ok: boolean; parsed: unknown }> => {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        return { ok: false, parsed: null };
      }

      const payload = await response.json();
      return { ok: true, parsed: parseCompletion(payload) };
    };

    try {
      const withJsonFormat = {
        ...requestBodyBase,
        response_format: { type: "json_object" as const },
      };
      const firstTry = await postCompletion(withJsonFormat);
      if (firstTry.parsed) {
        return firstTry.parsed;
      }

      const secondTry = await postCompletion(requestBodyBase);
      if (secondTry.parsed) {
        return secondTry.parsed;
      }

      return null;
    } catch {
      return null;
    }
  };

  return {
    async generatePageDraft(input) {
      const safeInput = sanitizePageInput(input);
      let raw = await callModel(pageSystemPrompt, buildPagePrompt(safeInput), 0.15);
      let response = parseAIPageResponseSafe(raw, safeInput);

      const isLowQuality = (value: AIPageGenerateResponse) =>
        value.safetyFlags.includes("LOW_QUALITY_HINT");
      const isTemplateFallback = (value: AIPageGenerateResponse) =>
        (value.document.meta?.source as string) === "ai-page-template";
      const needsRetry =
        !raw ||
        isTemplateFallback(response) ||
        isLowQuality(response);

      if (needsRetry) {
        raw = await callModel(pageSystemPrompt, buildPagePromptStrict(safeInput), 0);
        const retryResponse = parseAIPageResponseSafe(raw, safeInput);
        const retryNodes = retryResponse.document.root?.length ?? 0;
        const retryAccepted =
          Boolean(raw) &&
          retryNodes >= 2 &&
          !isTemplateFallback(retryResponse) &&
          !isLowQuality(retryResponse);

        if (retryAccepted) {
          response = retryResponse;
        } else if (isTemplateFallback(response) || isLowQuality(response)) {
          response = fallbackPage(safeInput);
          response.safetyFlags = Array.from(
            new Set([...response.safetyFlags, "MODEL_QUALITY_FALLBACK"]),
          );
          response.reasoningSummary =
            "Replaced low-quality model output with a stable editable draft based on your request.";
        }
      }

      return response;
    },
    async modifyNodeDraft(input) {
      const safeInput = sanitizeNodeInput(input);
      const raw = await callModel(nodeSystemPrompt, buildNodePrompt(safeInput));
      return resolveAINodeResponse(raw, safeInput);
    },
  };
};



