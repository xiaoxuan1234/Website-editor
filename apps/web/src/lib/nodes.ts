import {
  DefaultNodePropsByType,
  TextLikeNodeTypes,
  type EditorNode,
  type NodeType,
  type PaletteElement,
} from "@wg/schema";

export const paletteElements: PaletteElement[] = [
  { type: "text", label: "文本", icon: "icon-danhangwenben" },
  { type: "image", label: "图片", icon: "icon-tupian" },
  { type: "title", label: "标题", icon: "icon-biaotizhengwenqiehuan" },
  { type: "container", label: "容器", icon: "icon-yk_fangkuai" },
  { type: "paragraph", label: "段落", icon: "icon-duanluo" },
  { type: "button", label: "按钮", icon: "icon-button" },
  { type: "input", label: "输入框", icon: "icon-shurukuang" },
  { type: "link", label: "超链接", icon: "icon-chaolianjie" },
  { type: "table", label: "表格", icon: "icon-biaoge" },
  { type: "i", label: "图标", icon: "icon-zujian" },
  { type: "li", label: "列表项", icon: "icon-duanluo" },
  { type: "ul", label: "无序列表", icon: "icon-liebiao" },
  { type: "ol", label: "有序列表", icon: "icon-liebiao" },
];

export const createNodeId = (): string =>
  `node_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const createNode = (type: NodeType): EditorNode => ({
  id: createNodeId(),
  type,
  props: { ...DefaultNodePropsByType[type] },
  style: {},
  children: [],
  aiMeta: {},
});

export const isTextLikeType = (type: NodeType): boolean => TextLikeNodeTypes.includes(type);
