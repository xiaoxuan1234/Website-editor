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

function createHeroSection(
  title: string,
  subtitle: string,
  primaryColor: string,
  backgroundColor: string = "#f8f9fa",
): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "120px 40px",
      backgroundColor,
      textAlign: "center",
      minHeight: "600px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
      overflow: "hidden",
    },
    [
      createNode(
        "title",
        { content: title, level: "h1" },
        {
          fontSize: "56px",
          fontWeight: "700",
          color: "#1a1a1a",
          marginBottom: "28px",
          lineHeight: "1.15",
          letterSpacing: "-0.02em",
        },
      ),
      createNode(
        "paragraph",
        { content: subtitle },
        {
          fontSize: "20px",
          color: "#666666",
          lineHeight: "1.8",
          maxWidth: "720px",
          margin: "0 auto 48px",
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
          createNode(
            "button",
            { label: "立即开始", variant: "primary" },
            {
              padding: "18px 48px",
              backgroundColor: primaryColor,
              color: "#ffffff",
              borderRadius: "12px",
              fontSize: "18px",
              fontWeight: "600",
              cursor: "pointer",
              boxShadow: `0 6px 20px ${primaryColor}50`,
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            },
          ),
          createNode(
            "button",
            { label: "了解更多", variant: "outline" },
            {
              padding: "18px 48px",
              backgroundColor: "transparent",
              color: primaryColor,
              borderRadius: "12px",
              fontSize: "18px",
              fontWeight: "600",
              cursor: "pointer",
              border: `2px solid ${primaryColor}`,
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            },
          ),
        ],
      ),
    ],
  );
}

function createFeatureCard(
  title: string,
  description: string,
  primaryColor: string,
  icon: string = "✓",
): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      width: "340px",
      padding: "48px 36px",
      backgroundColor: "#ffffff",
      borderRadius: "20px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
      textAlign: "center",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    },
    [
      createNode(
        "title",
        { content: icon, level: "h2" },
        {
          fontSize: "56px",
          marginBottom: "24px",
          color: primaryColor,
          lineHeight: "1",
        },
      ),
      createNode(
        "title",
        { content: title, level: "h3" },
        {
          fontSize: "22px",
          fontWeight: "600",
          color: "#1a1a1a",
          marginBottom: "16px",
          letterSpacing: "-0.01em",
        },
      ),
      createNode(
        "paragraph",
        { content: description },
        {
          fontSize: "15px",
          color: "#666666",
          lineHeight: "1.7",
        },
      ),
    ],
  );
}

function createFeaturesSection(
  primaryColor: string,
  features: Array<{ title: string; description: string; icon?: string }>,
): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "100px 40px",
      backgroundColor: "#ffffff",
    },
    [
      createNode(
        "title",
        { content: "我们的优势", level: "h2" },
        {
          fontSize: "40px",
          fontWeight: "700",
          color: "#1a1a1a",
          textAlign: "center",
          marginBottom: "20px",
        },
      ),
      createNode(
        "paragraph",
        { content: "探索我们提供的专业服务和解决方案" },
        {
          fontSize: "18px",
          color: "#666666",
          textAlign: "center",
          marginBottom: "60px",
        },
      ),
      createNode(
        "container",
        { layout: "flow" },
        {
          display: "flex",
          gap: "32px",
          justifyContent: "center",
          flexWrap: "wrap",
        },
        features.map((f) =>
          createFeatureCard(f.title, f.description, primaryColor, f.icon),
        ),
      ),
    ],
  );
}

function createAboutSection(primaryColor: string): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "100px 40px",
      backgroundColor: "#f8f9fa",
    },
    [
      createNode(
        "container",
        { layout: "flow" },
        {
          maxWidth: "900px",
          margin: "0 auto",
          textAlign: "center",
        },
        [
          createNode(
            "title",
            { content: "关于我们", level: "h2" },
            {
              fontSize: "40px",
              fontWeight: "700",
              color: "#1a1a1a",
              marginBottom: "32px",
            },
          ),
          createNode(
            "paragraph",
            {
              content:
                "我们是一支充满激情的团队，致力于为客户提供最优质的产品和服务。凭借多年的行业经验，我们帮助众多企业实现了数字化转型，提升了业务效率。",
            },
            {
              fontSize: "18px",
              color: "#555555",
              lineHeight: "1.8",
              marginBottom: "40px",
            },
          ),
          createNode(
            "container",
            { layout: "flow" },
            {
              display: "flex",
              gap: "60px",
              justifyContent: "center",
              flexWrap: "wrap",
            },
            [
              createStatCard("10+", "年行业经验", primaryColor),
              createStatCard("500+", "成功案例", primaryColor),
              createStatCard("98%", "客户满意度", primaryColor),
            ],
          ),
        ],
      ),
    ],
  );
}

function createStatCard(
  number: string,
  label: string,
  primaryColor: string,
): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      textAlign: "center",
    },
    [
      createNode(
        "title",
        { content: number, level: "h2" },
        {
          fontSize: "48px",
          fontWeight: "700",
          color: primaryColor,
          marginBottom: "8px",
        },
      ),
      createNode(
        "paragraph",
        { content: label },
        {
          fontSize: "16px",
          color: "#666666",
        },
      ),
    ],
  );
}

function createContactSection(primaryColor: string): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "100px 40px",
      backgroundColor: "#ffffff",
    },
    [
      createNode(
        "title",
        { content: "联系我们", level: "h2" },
        {
          fontSize: "40px",
          fontWeight: "700",
          color: "#1a1a1a",
          textAlign: "center",
          marginBottom: "60px",
        },
      ),
      createNode(
        "container",
        { layout: "flow" },
        {
          maxWidth: "700px",
          margin: "0 auto",
          padding: "48px",
          backgroundColor: "#f8f9fa",
          borderRadius: "16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        },
        [
          createNode(
            "input",
            { placeholder: "您的姓名", type: "text" },
            {
              width: "100%",
              padding: "16px",
              marginBottom: "20px",
              borderRadius: "10px",
              fontSize: "16px",
              border: "2px solid #e0e0e0",
              backgroundColor: "#ffffff",
            },
          ),
          createNode(
            "input",
            { placeholder: "您的邮箱", type: "email" },
            {
              width: "100%",
              padding: "16px",
              marginBottom: "20px",
              borderRadius: "10px",
              fontSize: "16px",
              border: "2px solid #e0e0e0",
              backgroundColor: "#ffffff",
            },
          ),
          createNode(
            "input",
            { placeholder: "您的留言内容", type: "text" },
            {
              width: "100%",
              padding: "16px",
              marginBottom: "28px",
              borderRadius: "10px",
              fontSize: "16px",
              border: "2px solid #e0e0e0",
              backgroundColor: "#ffffff",
              minHeight: "120px",
            },
          ),
          createNode(
            "button",
            { label: "发送消息", variant: "primary" },
            {
              width: "100%",
              padding: "18px",
              backgroundColor: primaryColor,
              color: "#ffffff",
              borderRadius: "10px",
              fontSize: "18px",
              fontWeight: "600",
              cursor: "pointer",
            },
          ),
        ],
      ),
    ],
  );
}

function createCTASection(
  primaryColor: string,
  title: string = "准备开始了吗？",
  subtitle: string = "立即联系我们，获取专属解决方案",
): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "100px 40px",
      backgroundColor: primaryColor,
      textAlign: "center",
    },
    [
      createNode(
        "title",
        { content: title, level: "h2" },
        {
          fontSize: "40px",
          fontWeight: "700",
          color: "#ffffff",
          marginBottom: "20px",
        },
      ),
      createNode(
        "paragraph",
        { content: subtitle },
        {
          fontSize: "20px",
          color: "#ffffffcc",
          marginBottom: "40px",
        },
      ),
      createNode(
        "button",
        { label: "立即咨询", variant: "secondary" },
        {
          padding: "16px 48px",
          backgroundColor: "#ffffff",
          color: primaryColor,
          borderRadius: "10px",
          fontSize: "18px",
          fontWeight: "600",
          cursor: "pointer",
        },
      ),
    ],
  );
}

function createTestimonialsSection(primaryColor: string): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "100px 40px",
      backgroundColor: "#ffffff",
    },
    [
      createNode(
        "title",
        { content: "客户评价", level: "h2" },
        {
          fontSize: "40px",
          fontWeight: "700",
          color: "#1a1a1a",
          textAlign: "center",
          marginBottom: "60px",
        },
      ),
      createNode(
        "container",
        { layout: "flow" },
        {
          display: "flex",
          gap: "32px",
          justifyContent: "center",
          flexWrap: "wrap",
        },
        [
          createTestimonialCard(
            "非常专业的团队，为我们提供了卓越的解决方案。",
            "张先生",
            "CEO",
            primaryColor,
          ),
          createTestimonialCard(
            "服务态度很好，响应速度快，产品质量超出预期。",
            "李女士",
            "产品经理",
            primaryColor,
          ),
          createTestimonialCard(
            "合作非常愉快，强烈推荐！",
            "王先生",
            "技术总监",
            primaryColor,
          ),
        ],
      ),
    ],
  );
}

function createTestimonialCard(
  quote: string,
  name: string,
  role: string,
  primaryColor: string,
): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      width: "360px",
      padding: "48px",
      backgroundColor: "#ffffff",
      borderRadius: "20px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
      position: "relative",
    },
    [
      createNode(
        "title",
        { content: '"', level: "h2" },
        {
          fontSize: "64px",
          color: primaryColor,
          lineHeight: "1",
          marginBottom: "20px",
        },
      ),
      createNode(
        "paragraph",
        { content: quote },
        {
          fontSize: "16px",
          color: "#555555",
          lineHeight: "1.8",
          marginBottom: "28px",
        },
      ),
      createNode(
        "title",
        { content: name, level: "h4" },
        {
          fontSize: "18px",
          fontWeight: "600",
          color: "#1a1a1a",
          marginBottom: "6px",
          letterSpacing: "-0.01em",
        },
      ),
      createNode(
        "paragraph",
        { content: role },
        {
          fontSize: "14px",
          color: primaryColor,
          fontWeight: "500",
        },
      ),
    ],
  );
}

function createServicesSection(primaryColor: string): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "100px 40px",
      backgroundColor: "#f8f9fa",
    },
    [
      createNode(
        "title",
        { content: "我们的服务", level: "h2" },
        {
          fontSize: "40px",
          fontWeight: "700",
          color: "#1a1a1a",
          textAlign: "center",
          marginBottom: "20px",
        },
      ),
      createNode(
        "paragraph",
        { content: "全方位的专业服务，满足您的各种需求" },
        {
          fontSize: "18px",
          color: "#666666",
          textAlign: "center",
          marginBottom: "60px",
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
          createServiceCard(
            "网站设计",
            "专业的UI/UX设计，打造美观实用的网站",
            "🎨",
            primaryColor,
          ),
          createServiceCard(
            "前端开发",
            "现代化的前端技术栈，高性能的用户体验",
            "💻",
            primaryColor,
          ),
          createServiceCard(
            "后端开发",
            "稳定可靠的后端架构，数据安全有保障",
            "⚙️",
            primaryColor,
          ),
          createServiceCard(
            "移动端开发",
            "响应式设计，完美适配各种设备",
            "📱",
            primaryColor,
          ),
          createServiceCard(
            "SEO优化",
            "搜索引擎优化，提升网站排名",
            "🔍",
            primaryColor,
          ),
          createServiceCard(
            "技术支持",
            "7x24小时技术支持，随时为您服务",
            "🛠️",
            primaryColor,
          ),
        ],
      ),
    ],
  );
}

function createServiceCard(
  title: string,
  description: string,
  icon: string,
  primaryColor: string,
): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      width: "340px",
      padding: "40px",
      backgroundColor: "#ffffff",
      borderRadius: "16px",
      boxShadow: "0 6px 24px rgba(0,0,0,0.06)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    },
    [
      createNode(
        "title",
        { content: icon, level: "h2" },
        {
          fontSize: "48px",
          marginBottom: "24px",
          color: primaryColor,
        },
      ),
      createNode(
        "title",
        { content: title, level: "h3" },
        {
          fontSize: "20px",
          fontWeight: "600",
          color: "#1a1a1a",
          marginBottom: "12px",
          letterSpacing: "-0.01em",
        },
      ),
      createNode(
        "paragraph",
        { content: description },
        {
          fontSize: "15px",
          color: "#666666",
          lineHeight: "1.7",
        },
      ),
    ],
  );
}

function createGallerySection(primaryColor: string): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "100px 40px",
      backgroundColor: "#ffffff",
    },
    [
      createNode(
        "title",
        { content: "作品展示", level: "h2" },
        {
          fontSize: "40px",
          fontWeight: "700",
          color: "#1a1a1a",
          textAlign: "center",
          marginBottom: "60px",
        },
      ),
      createNode(
        "container",
        { layout: "flow" },
        {
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "24px",
          maxWidth: "1200px",
          margin: "0 auto",
        },
        [
          createGalleryItem("项目一", primaryColor),
          createGalleryItem("项目二", primaryColor),
          createGalleryItem("项目三", primaryColor),
          createGalleryItem("项目四", primaryColor),
          createGalleryItem("项目五", primaryColor),
          createGalleryItem("项目六", primaryColor),
        ],
      ),
    ],
  );
}

function createGalleryItem(title: string, primaryColor: string): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      aspectRatio: "1",
      backgroundColor: "#f0f0f0",
      borderRadius: "12px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: "32px",
      minHeight: "280px",
    },
    [
      createNode(
        "title",
        { content: "🖼️", level: "h2" },
        {
          fontSize: "48px",
          marginBottom: "16px",
          color: primaryColor,
        },
      ),
      createNode(
        "title",
        { content: title, level: "h3" },
        {
          fontSize: "18px",
          fontWeight: "600",
          color: "#1a1a1a",
        },
      ),
    ],
  );
}

function createFAQSection(primaryColor: string): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "100px 40px",
      backgroundColor: "#f8f9fa",
    },
    [
      createNode(
        "title",
        { content: "常见问题", level: "h2" },
        {
          fontSize: "40px",
          fontWeight: "700",
          color: "#1a1a1a",
          textAlign: "center",
          marginBottom: "60px",
        },
      ),
      createNode(
        "container",
        { layout: "flow" },
        {
          maxWidth: "800px",
          margin: "0 auto",
        },
        [
          createFAQItem(
            "如何开始使用？",
            "您可以通过我们的网站注册账号，然后选择适合您的套餐即可开始使用。",
            primaryColor,
          ),
          createFAQItem(
            "支持哪些支付方式？",
            "我们支持支付宝、微信支付、银行卡等多种支付方式。",
            primaryColor,
          ),
          createFAQItem(
            "有免费试用期吗？",
            "是的，我们提供7天免费试用期，让您充分体验我们的产品。",
            primaryColor,
          ),
          createFAQItem(
            "如何联系客服？",
            "您可以通过在线客服、电话或邮件联系我们，我们将在24小时内回复。",
            primaryColor,
          ),
        ],
      ),
    ],
  );
}

function createFAQItem(
  question: string,
  answer: string,
  primaryColor: string,
): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      padding: "24px",
      backgroundColor: "#ffffff",
      borderRadius: "12px",
      marginBottom: "16px",
    },
    [
      createNode(
        "title",
        { content: question, level: "h4" },
        {
          fontSize: "18px",
          fontWeight: "600",
          color: primaryColor,
          marginBottom: "12px",
        },
      ),
      createNode(
        "paragraph",
        { content: answer },
        {
          fontSize: "15px",
          color: "#666666",
          lineHeight: "1.6",
        },
      ),
    ],
  );
}

function createTeamSection(primaryColor: string): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      width: "100%",
      padding: "100px 40px",
      backgroundColor: "#ffffff",
    },
    [
      createNode(
        "title",
        { content: "我们的团队", level: "h2" },
        {
          fontSize: "40px",
          fontWeight: "700",
          color: "#1a1a1a",
          textAlign: "center",
          marginBottom: "20px",
        },
      ),
      createNode(
        "paragraph",
        { content: "专业、热情、创新的团队" },
        {
          fontSize: "18px",
          color: "#666666",
          textAlign: "center",
          marginBottom: "60px",
        },
      ),
      createNode(
        "container",
        { layout: "flow" },
        {
          display: "flex",
          gap: "32px",
          justifyContent: "center",
          flexWrap: "wrap",
        },
        [
          createTeamMember("张三", "创始人 & CEO", "👨‍💼", primaryColor),
          createTeamMember("李四", "技术总监", "👨‍💻", primaryColor),
          createTeamMember("王五", "设计总监", "👩‍🎨", primaryColor),
          createTeamMember("赵六", "产品经理", "👨‍💼", primaryColor),
        ],
      ),
    ],
  );
}

function createTeamMember(
  name: string,
  role: string,
  avatar: string,
  primaryColor: string,
): EditorNode {
  return createNode(
    "container",
    { layout: "flow" },
    {
      width: "260px",
      padding: "40px 24px",
      textAlign: "center",
      backgroundColor: "#f8f9fa",
      borderRadius: "16px",
    },
    [
      createNode(
        "title",
        { content: avatar, level: "h2" },
        {
          fontSize: "64px",
          marginBottom: "20px",
        },
      ),
      createNode(
        "title",
        { content: name, level: "h3" },
        {
          fontSize: "20px",
          fontWeight: "600",
          color: "#1a1a1a",
          marginBottom: "8px",
        },
      ),
      createNode(
        "paragraph",
        { content: role },
        {
          fontSize: "14px",
          color: primaryColor,
          fontWeight: "500",
        },
      ),
    ],
  );
}

const sectionBuilders: Record<
  string,
  (primaryColor: string, backgroundColor?: string) => EditorNode
> = {
  hero: (primaryColor, backgroundColor) =>
    createHeroSection(
      "欢迎来到我们的网站",
      "我们提供专业的解决方案，帮助您实现业务目标",
      primaryColor,
      backgroundColor,
    ),
  features: (primaryColor) =>
    createFeaturesSection(primaryColor, [
      { title: "专业团队", description: "拥有经验丰富的专业团队", icon: "🎯" },
      { title: "优质服务", description: "提供卓越的客户服务", icon: "⭐" },
      { title: "创新方案", description: "持续创新的解决方案", icon: "💡" },
    ]),
  about: createAboutSection,
  services: createServicesSection,
  contact: createContactSection,
  cta: createCTASection,
  testimonials: createTestimonialsSection,
  gallery: createGallerySection,
  faq: createFAQSection,
  team: createTeamSection,
};

const pageTemplates: Record<
  string,
  (
    primaryColor: string,
    backgroundColor: string,
    sections?: string[],
  ) => EditorNode[]
> = {
  home: (primaryColor, backgroundColor, sections) => {
    const defaultSections = ["hero", "features", "about", "cta"];
    const selectedSections =
      sections && sections.length > 0 ? sections : defaultSections;
    return selectedSections
      .filter((s) => sectionBuilders[s])
      .map((s) => sectionBuilders[s](primaryColor, backgroundColor));
  },
  product: (primaryColor, backgroundColor, sections) => {
    const defaultSections = [
      "hero",
      "features",
      "services",
      "testimonials",
      "cta",
    ];
    const selectedSections =
      sections && sections.length > 0 ? sections : defaultSections;
    return selectedSections
      .filter((s) => sectionBuilders[s])
      .map((s) => sectionBuilders[s](primaryColor, backgroundColor));
  },
  contact: (primaryColor, backgroundColor, sections) => {
    const defaultSections = ["hero", "contact", "faq"];
    const selectedSections =
      sections && sections.length > 0 ? sections : defaultSections;
    return selectedSections
      .filter((s) => sectionBuilders[s])
      .map((s) => sectionBuilders[s](primaryColor, backgroundColor));
  },
  landing: (primaryColor, backgroundColor, sections) => {
    const defaultSections = ["hero", "features", "testimonials", "cta"];
    const selectedSections =
      sections && sections.length > 0 ? sections : defaultSections;
    return selectedSections
      .filter((s) => sectionBuilders[s])
      .map((s) => sectionBuilders[s](primaryColor, backgroundColor));
  },
  portfolio: (primaryColor, backgroundColor, sections) => {
    const defaultSections = ["hero", "gallery", "testimonials", "cta"];
    const selectedSections =
      sections && sections.length > 0 ? sections : defaultSections;
    return selectedSections
      .filter((s) => sectionBuilders[s])
      .map((s) => sectionBuilders[s](primaryColor, backgroundColor));
  },
  business: (primaryColor, backgroundColor, sections) => {
    const defaultSections = [
      "hero",
      "about",
      "services",
      "team",
      "contact",
      "cta",
    ];
    const selectedSections =
      sections && sections.length > 0 ? sections : defaultSections;
    return selectedSections
      .filter((s) => sectionBuilders[s])
      .map((s) => sectionBuilders[s](primaryColor, backgroundColor));
  },
};

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
  if (/作品集|案例|展示|作品/.test(lower)) {
    return "portfolio";
  }
  if (/企业|公司|商业|业务/.test(lower)) {
    return "business";
  }
  if (/落地页|营销|推广/.test(lower)) {
    return "landing";
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
    base.forEach((node) => {
      result.push(node);
    });
    while (result.length < min) {
      const last = result[result.length - 1] ?? base[base.length - 1];
      result.push(...cloneNodes([last]));
    }
    if (result.length > max) {
      return result.slice(0, max);
    }
    return result;
  };

  if (length === "short") {
    return ensureRange(2, 3);
  }
  if (length === "long") {
    return ensureRange(5, 7);
  }
  return ensureRange(3, 5);
};

function extractContentFromInstruction(instruction: string): {
  heroTitle: string;
  heroSubtitle: string;
  pageTitle: string;
} {
  const trimmed = instruction.trim();
  let heroTitle = "欢迎来到我们的网站";
  let heroSubtitle = "我们提供专业的解决方案，帮助您实现业务目标";
  let pageTitle = trimmed || "Web Page";

  if (trimmed) {
    const shortTitle =
      trimmed.length > 30 ? trimmed.slice(0, 30) + "…" : trimmed;
    pageTitle = shortTitle;

    if (trimmed.includes("设计") || trimmed.includes("工作室")) {
      heroTitle = trimmed.includes("工作室")
        ? "创意设计工作室"
        : "专业设计服务";
      heroSubtitle = "打造独特的视觉体验，让您的品牌脱颖而出";
    } else if (trimmed.includes("科技") || trimmed.includes("公司")) {
      heroTitle = "创新科技公司";
      heroSubtitle = "用技术驱动创新，为您的业务赋能";
    } else if (trimmed.includes("电商") || trimmed.includes("购物")) {
      heroTitle = "优质电商平台";
      heroSubtitle = "精选好物，品质生活，尽在掌握";
    } else if (trimmed.includes("教育") || trimmed.includes("培训")) {
      heroTitle = "专业教育平台";
      heroSubtitle = "终身学习，持续成长，开启无限可能";
    } else if (trimmed.includes("医疗") || trimmed.includes("健康")) {
      heroTitle = "专业医疗健康";
      heroSubtitle = "守护健康，关爱生命，我们与您同行";
    } else if (trimmed.includes("餐厅") || trimmed.includes("美食")) {
      heroTitle = "特色美食餐厅";
      heroSubtitle = "用心烹制每一道美味，满足您的味蕾";
    } else if (trimmed.includes("咖啡") || trimmed.includes("咖啡馆")) {
      heroTitle = "温馨咖啡馆";
      heroSubtitle = "一杯咖啡，一段时光，享受慢生活";
    } else if (trimmed.includes("健身") || trimmed.includes("运动")) {
      heroTitle = "专业健身中心";
      heroSubtitle = "释放激情，挥洒汗水，塑造更好的自己";
    } else if (trimmed.includes("摄影") || trimmed.includes("照片")) {
      heroTitle = "专业摄影服务";
      heroSubtitle = "捕捉精彩瞬间，记录美好回忆";
    } else if (trimmed.includes("旅行") || trimmed.includes("旅游")) {
      heroTitle = "精彩旅行体验";
      heroSubtitle = "探索世界，发现美好，开启您的旅程";
    } else {
      heroTitle = trimmed.length > 20 ? trimmed.slice(0, 20) + "…" : trimmed;
      heroSubtitle = trimmed.length > 50 ? trimmed.slice(0, 50) + "…" : trimmed;
    }
  }

  return { heroTitle, heroSubtitle, pageTitle };
}

const buildFallbackResponse = (
  input: AIPageGenerateRequest,
  pageType: string,
): AIPageGenerateResponse => {
  const primaryColor = input.primaryColor || "#3366ff";
  const secondaryColor = input.secondaryColor || "#666666";
  const backgroundColor = input.backgroundColor || "#ffffff";

  const { heroTitle, heroSubtitle, pageTitle } = extractContentFromInstruction(
    input.instruction,
  );

  let templateNodesRaw: EditorNode[];

  if (pageTemplates[pageType]) {
    templateNodesRaw = pageTemplates[pageType](
      primaryColor,
      backgroundColor,
      input.sections,
    );

    const heroSection = templateNodesRaw.find((node) => {
      const firstChild = node.children?.[0];
      return firstChild?.type === "title" && firstChild.props?.level === "h1";
    });

    if (heroSection) {
      const heroIndex = templateNodesRaw.indexOf(heroSection);
      const updatedHero = createHeroSection(
        heroTitle,
        heroSubtitle,
        primaryColor,
        backgroundColor,
      );
      templateNodesRaw[heroIndex] = updatedHero;
    }
  } else {
    templateNodesRaw = pageTemplates["home"](
      primaryColor,
      backgroundColor,
      input.sections,
    );

    const updatedHero = createHeroSection(
      heroTitle,
      heroSubtitle,
      primaryColor,
      backgroundColor,
    );
    templateNodesRaw[0] = updatedHero;
  }

  const templateNodes = adjustNodesByLength(input, templateNodesRaw);

  return {
    document: {
      id: input.pageId,
      projectId: input.projectId,
      title: pageTitle,
      status: "draft",
      version: 1,
      updatedAt: new Date().toISOString(),
      root: templateNodes,
      meta: {
        source: "ai-page-template",
        pageStyle: {
          backgroundColor,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
      },
    },
    reasoningSummary: `已根据「${input.instruction.slice(0, 50)}${input.instruction.length > 50 ? "…" : ""}」使用${pageType}模板生成页面，主色：${primaryColor}。（温馨提示：配置 API key 可获得更智能的生成效果）`,
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
  console.log("Parsing AI response:", raw);

  const parsed = AIPageModelOutputSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("Schema validation failed:", parsed.error);
    throw new Error("AI response format is invalid: " + parsed.error.message);
  }

  const result = parsed.data;
  const nodesRaw =
    result.nodes
      ?.map((item: unknown) => normalizeNode(item))
      .filter((item: EditorNode | null): item is EditorNode => Boolean(item)) ??
    [];

  console.log("Normalized nodes count:", nodesRaw.length);

  if (nodesRaw.length < 2) {
    throw new Error("AI generated too few nodes");
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

const SYSTEM_PROMPT = `你是一个网页生成器，只返回JSON。

返回格式：
{"title":"页面标题","nodes":[{"type":"container","props":{"layout":"flow"},"style":{"width":"100%","padding":"100px 40px","backgroundColor":"#f8f9fa"},"children":[{"type":"title","props":{"content":"大标题","level":"h1"},"style":{"fontSize":"52px","fontWeight":"700"},"children":[]},{"type":"paragraph","props":{"content":"介绍文字"},"style":{"fontSize":"18px"},"children":[]},{"type":"button","props":{"label":"按钮","variant":"primary"},"style":{"padding":"16px 40px","backgroundColor":"#3366ff","color":"#fff"},"children":[]}]}],"pageStyle":{"backgroundColor":"#ffffff","fontFamily":"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"},"reasoningSummary":"已生成","safetyFlags":[]}

节点类型：container, title, paragraph, button
要求：至少3个container，内容贴合用户描述
只返回JSON，不要其他文字`;

const NODE_EXAMPLE = `示例（仅作格式参考）：
{"title":"示例页","nodes":[{"type":"container","props":{"layout":"flow"},"style":{"width":"100%","padding":"100px 40px","backgroundColor":"#f8f9fa","textAlign":"center","display":"flex","flexDirection":"column","justifyContent":"center","alignItems":"center"},"children":[{"type":"title","props":{"content":"欢迎","level":"h1"},"style":{"fontSize":"52px","fontWeight":"700","color":"#1a1a1a","marginBottom":"24px","lineHeight":"1.2"},"children":[]},{"type":"paragraph","props":{"content":"这是一段介绍文字，说明我们的价值主张。"},"style":{"fontSize":"20px","color":"#666666","lineHeight":"1.7","maxWidth":"700px","margin":"0 auto 40px"},"children":[]},{"type":"container","props":{"layout":"flow"},"style":{"display":"flex","gap":"20px","justifyContent":"center","flexWrap":"wrap"},"children":[{"type":"button","props":{"label":"立即开始","variant":"primary"},"style":{"padding":"16px 40px","backgroundColor":"#3366ff","color":"#ffffff","borderRadius":"10px","fontSize":"18px","fontWeight":"600","cursor":"pointer"},"children":[]}]}]}],"pageStyle":{"backgroundColor":"#ffffff","fontFamily":"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"},"reasoningSummary":"生成了包含Hero区块的首页。","safetyFlags":[]}`;

function buildUserPrompt(input: AIPageGenerateRequest): string {
  return [
    "用户需求：",
    input.instruction,
    "",
    "主色：" + (input.primaryColor ?? "#3366ff"),
    "",
    "只返回JSON，不要其他文字",
  ].join("\n");
}

function buildUserPromptStrict(input: AIPageGenerateRequest): string {
  const ctx = {
    instruction: input.instruction,
    primaryColor: input.primaryColor ?? "#3366ff",
    language: input.language ?? "zh-CN",
  };
  return [
    "只输出一个JSON对象，不要任何前后文字。",
    "必须包含: title, nodes, pageStyle, reasoningSummary, safetyFlags。",
    "nodes中每项要有type, props, style, children。",
    "确保nodes数组至少有3个container区块。",
    "用户需求：",
    JSON.stringify(ctx, null, 2),
  ].join("\n");
}

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
      console.log("No API key, skipping AI call");
      return null;
    }

    const isDeepSeek = baseUrl.includes("deepseek");
    const requestBody: any = {
      model: isDeepSeek ? (config.model ?? "deepseek-chat") : model,
      temperature: 0.1,
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
      ],
    };

    if (!isDeepSeek) {
      requestBody.response_format = { type: "json_object" };
    }

    console.log("Calling AI API...", { baseUrl, model: requestBody.model });

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API request failed:", response.status, errorText);
        return null;
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        console.error("No content in API response:", payload);
        return null;
      }

      try {
        console.log("Parsing AI response...");
        console.log("Raw content:", content);

        let cleanContent = content.trim();

        if (cleanContent.startsWith("```json")) {
          cleanContent = cleanContent.slice(7);
        } else if (cleanContent.startsWith("```")) {
          cleanContent = cleanContent.slice(3);
        }

        if (cleanContent.endsWith("```")) {
          cleanContent = cleanContent.slice(0, -3);
        }

        cleanContent = cleanContent.trim();
        console.log("Cleaned content:", cleanContent);

        return JSON.parse(cleanContent);
      } catch (e) {
        console.error("Failed to parse JSON:", content);
        return null;
      }
    } catch (error) {
      console.error("AI API call exception:", error);
      return null;
    }
  };

  return {
    async generatePageDraft(input) {
      console.log("Starting AI page generation...");

      let raw: unknown = await callModel(SYSTEM_PROMPT, buildUserPrompt(input));
      let response = parseAIPageResponse(raw, input);

      const usedFallback =
        !raw ||
        (response.document.meta?.source as string) === "ai-page-template";

      if (usedFallback && apiKey) {
        console.log(
          "First attempt used fallback, retrying with strict prompt...",
        );
        raw = await callModel(SYSTEM_PROMPT, buildUserPromptStrict(input));
        const retryResponse = parseAIPageResponse(raw, input);
        const retryNodes = retryResponse.document.root?.length ?? 0;
        if (retryNodes >= 2) {
          response = retryResponse;
        }
      }

      console.log(
        "AI page generation complete, nodes count:",
        response.document.root?.length,
      );
      return response;
    },
  };
};
