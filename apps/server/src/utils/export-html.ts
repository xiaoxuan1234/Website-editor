import type { EditorNode, PageDocumentV2 } from "@wg/schema";

type StyleValue = string | number | boolean | null;
type StyleRecord = Record<string, StyleValue>;
type ResponsiveMode = "tablet" | "mobile";
type ResponsiveStyleMap = Partial<Record<ResponsiveMode, StyleRecord>>;

type RenderContext = {
  classCounter: number;
  baseRules: string[];
  tabletRules: string[];
  mobileRules: string[];
};

const DEFAULT_CSS_FILE_NAME = "styles.css";

const UNIT_LESS_PROPERTIES = new Set([
  "flex-grow",
  "flex-shrink",
  "font-weight",
  "line-height",
  "opacity",
  "order",
  "z-index",
  "zoom",
]);

const EXPORT_BASE_CSS = `:root {
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  line-height: 1.5;
  color: #1f2739;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
}

body {
  background: #f4f7fb;
  color: #1f2739;
  padding: 0;
}

.wg-page {
  width: 100%;
  min-height: 360px;
  margin: 0;
  border: 1px solid #d8deea;
  border-radius: 0;
  padding: 0;
}

.wg-page > :first-child {
  margin-top: 0;
}

.wg-page > :last-child {
  margin-bottom: 0;
}

.wg-node {
  max-width: 100%;
  min-width: 0;
}

.wg-container {
  position: relative;
  width: 100%;
  min-height: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 0;
}

.wg-container > :first-child {
  margin-top: 0;
}

.wg-container > :last-child {
  margin-bottom: 0;
}

.wg-text {
  display: inline-block;
  max-width: 100%;
  color: inherit;
  font-size: 15px;
  line-height: 1.55;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.wg-title {
  margin: 0;
  max-width: 100%;
  color: inherit;
  line-height: 1.28;
  letter-spacing: -0.01em;
  font-weight: 700;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.wg-title-h1 {
  font-size: 42px;
}

.wg-title-h2 {
  font-size: 34px;
}

.wg-title-h3 {
  font-size: 28px;
}

.wg-title-h4 {
  font-size: 24px;
}

.wg-title-h5 {
  font-size: 20px;
}

.wg-title-h6 {
  font-size: 16px;
}

.wg-paragraph {
  margin: 0;
  max-width: 100%;
  color: inherit;
  font-size: 15px;
  line-height: 1.75;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.wg-btn {
  border: 1px solid transparent;
  border-radius: inherit;
  background: transparent;
  color: inherit;
  max-width: 100%;
  padding: 9px 16px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  box-shadow: none;
  cursor: pointer;
}

.wg-btn.variant-primary {
  background: #2f68d6;
  border-color: #2f68d6;
  color: #ffffff;
}

.wg-btn.variant-outline {
  background: transparent;
  border-color: #2f68d6;
}

.wg-btn.variant-soft {
  background: #eaf1ff;
  border-color: #c4d5ff;
}

.wg-btn.size-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.wg-btn.size-md {
  padding: 9px 16px;
  font-size: 14px;
}

.wg-btn.size-lg {
  padding: 12px 20px;
  font-size: 15px;
}

.wg-btn.is-disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.wg-btn.suppress-inner-chrome {
  border-color: transparent;
  background: transparent;
  padding: 0;
}

.wg-btn.suppress-inner-chrome.variant-primary,
.wg-btn.suppress-inner-chrome.variant-outline,
.wg-btn.suppress-inner-chrome.variant-soft {
  border-color: transparent;
  background: transparent;
}

.wg-btn-text {
  display: inline-block;
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.wg-input {
  width: 100%;
  min-width: 180px;
  max-width: 100%;
  height: 38px;
  border: 1px solid #c8d1e2;
  border-radius: inherit;
  padding: 0 12px;
  color: inherit;
  background: transparent;
}

.wg-input::placeholder {
  color: #9aa6bb;
}

.wg-link {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid currentColor;
  line-height: 1.4;
}

.wg-link.no-underline {
  border-bottom: 0;
}

.wg-link:hover {
  opacity: 0.85;
}

.wg-image-wrapper {
  width: 100%;
  height: 100%;
  min-width: 0;
  max-width: 100%;
  min-height: 0;
  border: 1px solid #cad4e3;
  border-radius: inherit;
  overflow: hidden;
  background: transparent;
}

.wg-image {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: block;
}

.wg-image-placeholder {
  min-height: 150px;
  height: 100%;
  display: grid;
  place-items: center;
  gap: 4px;
  background: transparent;
}

.wg-image-placeholder-mark {
  font-size: 13px;
  color: #5f6d86;
  font-weight: 700;
}

.wg-image-placeholder-text {
  font-size: 11px;
  color: #8a96ac;
}

.wg-table-wrap {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  gap: 8px;
}

.wg-table {
  border-collapse: collapse;
  width: 100%;
  max-width: 100%;
  min-width: 240px;
  border: 1px solid #cdd6e4;
  border-radius: inherit;
  overflow: hidden;
  background: transparent;
}

.wg-table td {
  border: 1px solid #d7deea;
  padding: 9px 12px;
  color: inherit;
  font-size: 13px;
}

.wg-table.striped tr:nth-child(even) td {
  background: rgba(130, 152, 190, 0.08);
}

.wg-table tr.header td {
  font-weight: 700;
  background: rgba(94, 125, 190, 0.14);
}

.wg-list {
  margin: 0;
  padding-left: var(--list-indent, 20px);
  color: inherit;
  line-height: 1.7;
}

.wg-list > li + li {
  margin-top: var(--item-gap, 2px);
}

.wg-nav {
  display: block;
  width: 100%;
  min-height: 40px;
  margin: 0;
  padding: 8px 12px;
  border-radius: inherit;
  color: inherit;
  line-height: 1.6;
  background: transparent;
}

.wg-nav.with-children {
  min-height: 0;
}

.wg-i-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  min-height: 20px;
}

.wg-i-node {
  display: inline-block;
  color: inherit;
  font-size: 18px;
  line-height: 1;
}

.wg-i-image {
  display: block;
  width: 1em;
  height: 1em;
  min-width: 18px;
  min-height: 18px;
  object-fit: contain;
}

.wg-li {
  display: list-item;
  list-style-position: inside;
  margin: 0;
  color: inherit;
  line-height: 1.6;
}`;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escapeAttr = (value: string): string =>
  escapeHtml(value).replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const toKebabCase = (property: string): string => {
  if (property.startsWith("--")) {
    return property;
  }
  return property.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const normalizeStyleRecord = (value: unknown): StyleRecord => {
  if (!isPlainObject(value)) {
    return {};
  }

  const next: StyleRecord = {};
  Object.entries(value).forEach(([key, item]) => {
    if (
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === null
    ) {
      next[key] = item;
    }
  });
  return next;
};

const toBackgroundImageValue = (raw: unknown): string => {
  const value = String(raw ?? "").trim();
  if (!value) {
    return "none";
  }
  if (value.startsWith("url(")) {
    return value;
  }
  return `url("${value}")`;
};

const toCssValue = (property: string, value: string | number): string => {
  if (typeof value === "string") {
    return value;
  }
  if (value === 0) {
    return "0";
  }
  if (UNIT_LESS_PROPERTIES.has(property)) {
    return String(value);
  }
  return `${value}px`;
};

const serializeStyleDeclarations = (style: StyleRecord): string[] => {
  const declarations: string[] = [];

  Object.entries(style).forEach(([rawKey, rawValue]) => {
    if (rawValue === null || rawValue === undefined) {
      return;
    }

    if (typeof rawValue === "boolean") {
      return;
    }

    const key = toKebabCase(rawKey.trim());
    if (!key) {
      return;
    }

    if (typeof rawValue === "string") {
      const normalized = rawValue.trim();
      if (!normalized) {
        return;
      }
      declarations.push(`${key}: ${normalized};`);
      return;
    }

    if (isFiniteNumber(rawValue)) {
      declarations.push(`${key}: ${toCssValue(key, rawValue)};`);
    }
  });

  return declarations;
};

const buildStyleRule = (selector: string, style: StyleRecord): string | null => {
  const declarations = serializeStyleDeclarations(style);
  if (declarations.length === 0) {
    return null;
  }

  return `${selector} {\n${declarations.map((item) => `  ${item}`).join("\n")}\n}`;
};

const toInt = (value: unknown, fallback: number): number => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1) {
    return fallback;
  }
  return Math.floor(num);
};

const toStringSafe = (value: unknown, fallback = ""): string => {
  if (typeof value === "string") {
    return value;
  }
  if (value === undefined || value === null) {
    return fallback;
  }
  return String(value);
};

const sanitizeClassTokens = (value: string): string => {
  const tokens = value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => token.replace(/[^a-zA-Z0-9_-]/g, ""));
  return tokens.length > 0 ? tokens.join(" ") : "";
};

const readResponsiveStyleMap = (node: EditorNode): ResponsiveStyleMap => {
  if (!isPlainObject(node.props)) {
    return {};
  }
  const raw = node.props.responsiveStyle;
  if (!isPlainObject(raw)) {
    return {};
  }

  const map: ResponsiveStyleMap = {};
  (["tablet", "mobile"] as ResponsiveMode[]).forEach((mode) => {
    const normalized = normalizeStyleRecord(raw[mode]);
    if (Object.keys(normalized).length > 0) {
      map[mode] = normalized;
    }
  });

  return map;
};

const hasVisibleBorderValue = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (normalized === "none" || normalized === "0" || normalized === "0px") {
    return false;
  }
  return true;
};

const hasVisibleSpacingValue = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (normalized === "0" || normalized === "0px") {
    return false;
  }
  return true;
};

const hasVisibleBackgroundValue = (value: unknown): boolean => {
  if (value === undefined || value === null) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return normalized !== "none" && normalized !== "transparent";
};

const hasOuterChromeInStyle = (style: StyleRecord): boolean => {
  const borderKeys = [
    "border",
    "borderWidth",
    "borderTop",
    "borderRight",
    "borderBottom",
    "borderLeft",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
  ] as const;
  const spacingKeys = [
    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
  ] as const;
  const backgroundKeys = ["background", "backgroundColor", "backgroundImage"] as const;
  const shadowKeys = ["boxShadow"] as const;

  return (
    borderKeys.some((key) => hasVisibleBorderValue(style[key])) ||
    spacingKeys.some((key) => hasVisibleSpacingValue(style[key])) ||
    backgroundKeys.some((key) => hasVisibleBackgroundValue(style[key])) ||
    shadowKeys.some((key) => hasVisibleBackgroundValue(style[key]))
  );
};

const shouldSuppressButtonInnerChrome = (
  baseStyle: StyleRecord,
  responsiveStyleMap: ResponsiveStyleMap,
): boolean => {
  if (hasOuterChromeInStyle(baseStyle)) {
    return true;
  }

  return Object.values(responsiveStyleMap).some((style) => hasOuterChromeInStyle(style));
};

const nextNodeClass = (ctx: RenderContext): string => {
  ctx.classCounter += 1;
  return `wg-node-${ctx.classCounter}`;
};

const pushNodeStyleRules = (
  ctx: RenderContext,
  className: string,
  baseStyle: StyleRecord,
  responsiveMap: ResponsiveStyleMap,
) => {
  const baseRule = buildStyleRule(`.${className}`, baseStyle);
  if (baseRule) {
    ctx.baseRules.push(baseRule);
  }

  const tabletRule = buildStyleRule(`.${className}`, responsiveMap.tablet ?? {});
  if (tabletRule) {
    ctx.tabletRules.push(tabletRule);
  }

  const mobileRule = buildStyleRule(`.${className}`, responsiveMap.mobile ?? {});
  if (mobileRule) {
    ctx.mobileRules.push(mobileRule);
  }
};

const resolveContainerLayoutClass = (style: StyleRecord): string => {
  const display = String(style.display ?? "").trim().toLowerCase();
  if (display === "flex" || display === "inline-flex") {
    return "wg-layout-flex";
  }
  if (display === "grid" || display === "inline-grid") {
    return "wg-layout-grid";
  }
  return "wg-layout-flow";
};

const renderChildren = (node: EditorNode, ctx: RenderContext): string =>
  node.children.map((child) => renderNode(child, ctx)).join("\n");

const renderText = (node: EditorNode, nodeClass: string): string => {
  const content = toStringSafe(node.props.content, "单行文本");
  return `<span class="wg-node wg-text ${nodeClass}">${escapeHtml(content)}</span>`;
};

const renderTitle = (node: EditorNode, nodeClass: string): string => {
  const content = toStringSafe(node.props.content, "标题文本");
  const levelRaw = toStringSafe(node.props.level, "h2").trim().toLowerCase();
  const level = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(levelRaw) ? levelRaw : "h2";
  return `<${level} class="wg-node wg-title wg-title-${level} ${nodeClass}">${content}</${level}>`;
};

const renderParagraph = (node: EditorNode, nodeClass: string): string => {
  const content = toStringSafe(node.props.content, "这是一段段落内容");
  return `<p class="wg-node wg-paragraph ${nodeClass}">${content}</p>`;
};

const renderButton = (
  node: EditorNode,
  nodeClass: string,
  baseStyle: StyleRecord,
  responsiveMap: ResponsiveStyleMap,
): string => {
  const label = toStringSafe(node.props.label, "按钮");
  const variantRaw = toStringSafe(node.props.variant, "primary").trim().toLowerCase();
  const variant = ["primary", "outline", "soft"].includes(variantRaw) ? variantRaw : "primary";
  const sizeRaw = toStringSafe(node.props.size, "md").trim().toLowerCase();
  const size = ["sm", "md", "lg"].includes(sizeRaw) ? sizeRaw : "md";
  const disabled = Boolean(node.props.disabled ?? false);
  const suppress = shouldSuppressButtonInnerChrome(baseStyle, responsiveMap);

  const classTokens = [
    "wg-node",
    "wg-btn",
    `variant-${variant}`,
    `size-${size}`,
    disabled ? "is-disabled" : "",
    suppress ? "suppress-inner-chrome" : "",
    nodeClass,
  ]
    .filter(Boolean)
    .join(" ");

  return `<button type="button" class="${classTokens}"${disabled ? " disabled" : ""}><span class="wg-btn-text">${escapeHtml(label)}</span></button>`;
};

const renderInput = (node: EditorNode, nodeClass: string): string => {
  const placeholder = toStringSafe(node.props.placeholder, "请输入内容");
  const inputTypeRaw = toStringSafe(node.props.type, "text").trim().toLowerCase();
  const inputType = ["text", "email", "password", "number", "tel", "url"].includes(inputTypeRaw)
    ? inputTypeRaw
    : "text";
  const inputName = toStringSafe(node.props.name, "").trim();
  const required = Boolean(node.props.required ?? false);
  const disabled = Boolean(node.props.disabled ?? false);
  const maxLength = Number(node.props.maxLength ?? 0);
  const value = toStringSafe(node.props.value, "");

  return `<input class="wg-node wg-input ${nodeClass}" type="${escapeAttr(inputType)}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}"${inputName ? ` name="${escapeAttr(inputName)}"` : ""}${required ? " required" : ""}${disabled ? " disabled" : ""}${Number.isFinite(maxLength) && maxLength > 0 ? ` maxlength="${Math.floor(maxLength)}"` : ""} />`;
};

const renderLink = (node: EditorNode, nodeClass: string): string => {
  const label = toStringSafe(node.props.label, "超链接");
  const href = toStringSafe(node.props.href, "https://example.com");
  const target = toStringSafe(node.props.target, "_blank") === "_self" ? "_self" : "_blank";
  const title = toStringSafe(node.props.title, "").trim();
  const noFollow = Boolean(node.props.nofollow ?? false);
  const underline = node.props.underline !== false;
  const relTokens = ["noreferrer", "noopener"];
  if (noFollow) {
    relTokens.push("nofollow");
  }
  const rel = relTokens.join(" ");

  return `<a class="wg-node wg-link ${underline ? "" : "no-underline"} ${nodeClass}" href="${escapeAttr(href)}" target="${escapeAttr(target)}" rel="${escapeAttr(rel)}"${title ? ` title="${escapeAttr(title)}"` : ""}>${escapeHtml(label)}</a>`;
};

const buildTableMatrix = (node: EditorNode): string[][] => {
  const rows = toInt(node.props.rows, 2);
  const cols = toInt(node.props.cols, 2);
  const raw = node.props.cells;

  if (Array.isArray(raw)) {
    return Array.from({ length: rows }, (_, rowIndex) =>
      Array.from({ length: cols }, (_, colIndex) => {
        const row = Array.isArray(raw[rowIndex]) ? raw[rowIndex] : [];
        const value = row[colIndex];
        return toStringSafe(value, "单元格");
      }),
    );
  }

  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => "单元格"),
  );
};

const renderTable = (node: EditorNode, nodeClass: string): string => {
  const striped = Boolean(node.props.striped ?? false);
  const showHeader = Boolean(node.props.showHeader ?? false);
  const matrix = buildTableMatrix(node);

  const rows = matrix
    .map((row, rowIndex) => {
      const rowClass = showHeader && rowIndex === 0 ? ` class="header"` : "";
      const cells = row
        .map((cell) => `<td>${escapeHtml(toStringSafe(cell, "单元格"))}</td>`)
        .join("");
      return `<tr${rowClass}>${cells}</tr>`;
    })
    .join("");

  return `<div class="wg-node wg-table-wrap ${nodeClass}"><table class="wg-table${striped ? " striped" : ""}"><tbody>${rows}</tbody></table></div>`;
};

const resolveListTag = (node: EditorNode): "ul" | "ol" => (node.type === "ol" ? "ol" : "ul");

const renderList = (node: EditorNode, nodeClass: string): string => {
  const listTag = resolveListTag(node);
  const defaultType = listTag === "ol" ? "decimal" : "disc";
  const listStyleRaw = toStringSafe(node.props.listStyleType, defaultType).trim().toLowerCase();
  const listStyleType = ["disc", "circle", "square", "decimal", "none"].includes(listStyleRaw)
    ? listStyleRaw
    : defaultType;
  const itemSpacing = toInt(node.props.itemSpacing, 2);
  const listIndent = listStyleType === "none" ? "0px" : "20px";

  const rawItems = node.props.items;
  const items = Array.isArray(rawItems)
    ? rawItems.map((item) => toStringSafe(item, "").trim()).filter(Boolean)
    : [];
  const finalItems = items.length > 0 ? items : ["列表项 1", "列表项 2", "列表项 3"];
  const listItems = finalItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("");

  return `<${listTag} class="wg-node wg-list ${nodeClass}" style="list-style-type: ${escapeAttr(listStyleType)}; --item-gap: ${itemSpacing}px; --list-indent: ${listIndent};">${listItems}</${listTag}>`;
};

const renderNav = (node: EditorNode, nodeClass: string, ctx: RenderContext): string => {
  if (node.children.length > 0) {
    return `<nav class="wg-node wg-nav with-children ${nodeClass}">${renderChildren(node, ctx)}</nav>`;
  }
  const content = toStringSafe(node.props.content, "导航栏");
  return `<nav class="wg-node wg-nav ${nodeClass}">${escapeHtml(content)}</nav>`;
};

const renderImage = (node: EditorNode, nodeClass: string): string => {
  const src = toStringSafe(node.props.src, "").trim();
  const alt = toStringSafe(node.props.alt, "图片");
  const fitRaw = toStringSafe(node.props.fit, "cover").trim().toLowerCase();
  const fit = ["cover", "contain", "fill", "none", "scale-down"].includes(fitRaw)
    ? fitRaw
    : "cover";
  const position = toStringSafe(node.props.position, "center center").trim() || "center center";
  const loadingRaw = toStringSafe(node.props.loading, "lazy").trim().toLowerCase();
  const loading = loadingRaw === "eager" ? "eager" : "lazy";

  if (src) {
    return `<div class="wg-node wg-image-wrapper ${nodeClass}"><img class="wg-image" src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="${escapeAttr(loading)}" style="object-fit: ${escapeAttr(fit)}; object-position: ${escapeAttr(position)};" /></div>`;
  }

  return `<div class="wg-node wg-image-wrapper ${nodeClass}"><div class="wg-image-placeholder"><div class="wg-image-placeholder-mark">图片</div><div class="wg-image-placeholder-text">点击上传替换图片</div></div></div>`;
};

const renderIcon = (node: EditorNode, nodeClass: string): string => {
  const iconSrc = toStringSafe(node.props.iconSrc, "").trim();
  if (iconSrc) {
    return `<span class="wg-node wg-i-wrap ${nodeClass}"><img class="wg-i-image" src="${escapeAttr(iconSrc)}" alt="icon" /></span>`;
  }

  const iconClassRaw = toStringSafe(node.props.icon, "icon-zujian").trim();
  const iconClass = sanitizeClassTokens(iconClassRaw) || "icon-zujian";
  return `<span class="wg-node wg-i-wrap ${nodeClass}"><i class="iconfont wg-i-node ${iconClass}"></i></span>`;
};

const renderLi = (node: EditorNode, nodeClass: string): string => {
  const content = toStringSafe(node.props.content, "列表项");
  return `<li class="wg-node wg-li ${nodeClass}">${escapeHtml(content)}</li>`;
};

const renderContainer = (node: EditorNode, nodeClass: string, baseStyle: StyleRecord, ctx: RenderContext): string => {
  const layoutClass = resolveContainerLayoutClass(baseStyle);
  return `<div class="wg-node wg-container ${layoutClass} ${nodeClass}">${renderChildren(node, ctx)}</div>`;
};

const renderNode = (node: EditorNode, ctx: RenderContext): string => {
  const className = nextNodeClass(ctx);
  const baseStyle = normalizeStyleRecord(node.style);
  const responsiveMap = readResponsiveStyleMap(node);

  pushNodeStyleRules(ctx, className, baseStyle, responsiveMap);

  switch (node.type) {
    case "text":
      return renderText(node, className);
    case "title":
      return renderTitle(node, className);
    case "paragraph":
      return renderParagraph(node, className);
    case "button":
      return renderButton(node, className, baseStyle, responsiveMap);
    case "input":
      return renderInput(node, className);
    case "link":
      return renderLink(node, className);
    case "image":
      return renderImage(node, className);
    case "table":
      return renderTable(node, className);
    case "list":
    case "ul":
    case "ol":
      return renderList(node, className);
    case "nav":
      return renderNav(node, className, ctx);
    case "i":
      return renderIcon(node, className);
    case "li":
      return renderLi(node, className);
    case "container":
      return renderContainer(node, className, baseStyle, ctx);
    default:
      return `<div class="wg-node ${className}">${renderChildren(node, ctx)}</div>`;
  }
};

const resolvePageStyle = (document: PageDocumentV2): StyleRecord => {
  const meta = isPlainObject(document.meta) ? document.meta : {};
  const rawPageStyle = normalizeStyleRecord(meta.pageStyle);
  const style: StyleRecord = {
    ...rawPageStyle,
  };

  style.backgroundColor = toStringSafe(style.backgroundColor, "#ffffff");
  style.backgroundImage = toBackgroundImageValue(style.backgroundImage);
  style.backgroundSize = toStringSafe(style.backgroundSize, "cover");
  style.backgroundRepeat = toStringSafe(style.backgroundRepeat, "no-repeat");
  style.backgroundPosition = toStringSafe(style.backgroundPosition, "center center");
  style.backgroundAttachment = toStringSafe(style.backgroundAttachment, "scroll");

  return style;
};

const buildPageStyleRule = (document: PageDocumentV2): string | null =>
  buildStyleRule(".wg-page", resolvePageStyle(document));

const buildMediaBlock = (query: string, rules: string[]): string =>
  `${query} {\n${rules.map((rule) => rule.split("\n").map((line) => `  ${line}`).join("\n")).join("\n\n")}\n}`;

const normalizeCssFileName = (fileName?: string): string => {
  if (!fileName) {
    return DEFAULT_CSS_FILE_NAME;
  }
  const trimmed = fileName.trim();
  if (!trimmed) {
    return DEFAULT_CSS_FILE_NAME;
  }
  return trimmed;
};

export const renderDocumentToHtmlCss = (
  document: PageDocumentV2,
  options?: { cssFileName?: string },
): { html: string; css: string } => {
  const cssFileName = normalizeCssFileName(options?.cssFileName);
  const ctx: RenderContext = {
    classCounter: 0,
    baseRules: [],
    tabletRules: [],
    mobileRules: [],
  };

  const body = document.root.map((node) => renderNode(node, ctx)).join("\n");
  const pageStyleRule = buildPageStyleRule(document);
  const baseRules = pageStyleRule ? [pageStyleRule, ...ctx.baseRules] : ctx.baseRules;

  const cssSections = [EXPORT_BASE_CSS];
  if (baseRules.length > 0) {
    cssSections.push(baseRules.join("\n\n"));
  }
  if (ctx.tabletRules.length > 0) {
    cssSections.push(buildMediaBlock("@media (max-width: 1024px)", ctx.tabletRules));
  }
  if (ctx.mobileRules.length > 0) {
    cssSections.push(buildMediaBlock("@media (max-width: 768px)", ctx.mobileRules));
  }

  const css = cssSections.join("\n\n");
  const title = escapeHtml(toStringSafe(document.title, "Page Export"));
  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <link rel="stylesheet" href="${escapeAttr(cssFileName)}" />
  </head>
  <body>
    <main class="wg-page">
${body
  .split("\n")
  .map((line) => `      ${line}`)
  .join("\n")}
    </main>
  </body>
</html>`;

  return { html, css };
};
