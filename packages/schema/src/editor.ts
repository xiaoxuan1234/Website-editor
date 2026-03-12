import { z } from "zod";

export const NodeTypeSchema = z.enum([
  "text",
  "image",
  "title",
  "container",
  "paragraph",
  "button",
  "input",
  "link",
  "table",
  "list",
  "nav",
  "i",
  "li",
  "ul",
  "ol",
]);

export type NodeType = z.infer<typeof NodeTypeSchema>;

export const TextLikePropsSchema = z.object({
  content: z.string(),
});

export const ButtonPropsSchema = z.object({
  label: z.string(),
});

export const LinkPropsSchema = z.object({
  label: z.string(),
  href: z.string(),
});

export const InputPropsSchema = z.object({
  placeholder: z.string(),
});

export const ImagePropsSchema = z.object({
  src: z.string(),
  alt: z.string(),
});

export const ContainerPropsSchema = z.object({
  layout: z.literal("flow"),
});

export const TablePropsSchema = z.object({
  rows: z.number().int().min(1),
  cols: z.number().int().min(1),
});

export const ListPropsSchema = z.object({
  items: z.array(z.string()),
});

export const IconPropsSchema = z.object({
  icon: z.string(),
});

export type TextLikeProps = z.infer<typeof TextLikePropsSchema>;
export type ButtonProps = z.infer<typeof ButtonPropsSchema>;
export type LinkProps = z.infer<typeof LinkPropsSchema>;
export type InputProps = z.infer<typeof InputPropsSchema>;
export type ImageProps = z.infer<typeof ImagePropsSchema>;
export type ContainerProps = z.infer<typeof ContainerPropsSchema>;
export type TableProps = z.infer<typeof TablePropsSchema>;
export type ListProps = z.infer<typeof ListPropsSchema>;
export type IconProps = z.infer<typeof IconPropsSchema>;

export type NodePropsByType = {
  text: TextLikeProps;
  image: ImageProps;
  title: TextLikeProps;
  container: ContainerProps;
  paragraph: TextLikeProps;
  button: ButtonProps;
  input: InputProps;
  link: LinkProps;
  table: TableProps;
  list: ListProps;
  nav: TextLikeProps;
  i: IconProps;
  li: TextLikeProps;
  ul: ListProps;
  ol: ListProps;
};

const NodeStyleValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const NodeStyleSchema = z.record(z.string(), NodeStyleValueSchema).default({});

export const NodePropsSchema = z.record(z.string(), z.any()).default({});

export const AIMetaSchema = z
  .object({
    lastAppliedAt: z.string().optional(),
    lastPrompt: z.string().optional(),
  })
  .default({});

export type AIMeta = z.infer<typeof AIMetaSchema>;

export type EditorNode = {
  id: string;
  type: NodeType;
  props: Record<string, unknown>;
  style: Record<string, string | number | boolean | null>;
  children: EditorNode[];
  aiMeta: AIMeta;
};

export const EditorNodeSchema: z.ZodType<EditorNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: NodeTypeSchema,
    props: NodePropsSchema,
    style: NodeStyleSchema,
    children: z.array(EditorNodeSchema).default([]),
    aiMeta: AIMetaSchema,
  })
);

export const PageStatusSchema = z.enum(["draft", "published"]);

export const PageDocumentV2Schema = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string().min(1),
  status: PageStatusSchema,
  version: z.number().int().positive(),
  updatedAt: z.string(),
  root: z.array(EditorNodeSchema).default([]),
  meta: z.record(z.string(), z.any()).default({}),
});

export type PageDocumentV2 = z.infer<typeof PageDocumentV2Schema>;

export const PaletteElementSchema = z.object({
  type: NodeTypeSchema,
  label: z.string(),
  icon: z.string(),
});

export type PaletteElement = z.infer<typeof PaletteElementSchema>;

export const TextLikeNodeTypes: NodeType[] = [
  "text",
  "title",
  "paragraph",
  "button",
  "link",
];

export const DefaultNodePropsByType: NodePropsByType = {
  text: { content: "单行文本" },
  title: { content: "标题文本" },
  paragraph: { content: "这是一段段落内容" },
  button: { label: "按钮" },
  link: { label: "超链接", href: "https://example.com" },
  input: { placeholder: "请输入内容" },
  image: { src: "", alt: "图片" },
  container: { layout: "flow" },
  table: { rows: 2, cols: 2 },
  list: { items: ["列表项 1", "列表项 2", "列表项 3"] },
  nav: { content: "导航栏" },
  i: { icon: "icon-zujian" },
  li: { content: "列表项" },
  ul: { items: ["列表项 1", "列表项 2", "列表项 3"] },
  ol: { items: ["列表项 1", "列表项 2", "列表项 3"] },
};
