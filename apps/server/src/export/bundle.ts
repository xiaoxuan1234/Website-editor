import type { EditorNode, PageDocumentV2 } from "@wg/schema";

type StyleValue = string | number;
type StyleRecord = Record<string, StyleValue>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const toKebabCase = (value: string): string =>
  value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

const normalizeStyleRecord = (raw: unknown): StyleRecord => {
  if (!isObject(raw)) {
    return {};
  }

  const next: StyleRecord = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (typeof value === "number") {
      next[key] = value;
      return;
    }
    if (typeof value !== "string") {
      return;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    next[key] = trimmed;
  });
  return next;
};

const readDesktopResponsiveStyle = (node: EditorNode): StyleRecord => {
  if (!isObject(node.props.responsiveStyle)) {
    return {};
  }
  const map = node.props.responsiveStyle as Record<string, unknown>;
  return normalizeStyleRecord(map.desktop);
};

const resolveNodeStyle = (node: EditorNode): StyleRecord => ({
  ...normalizeStyleRecord(node.style),
  ...readDesktopResponsiveStyle(node),
});

const styleRecordToCss = (style: StyleRecord): string =>
  Object.entries(style)
    .map(([key, value]) => `${toKebabCase(key)}: ${String(value)};`)
    .join(" ");

const styleToInlineAttr = (style: StyleRecord): string => {
  const css = styleRecordToCss(style);
  if (!css) {
    return "";
  }
  return ` style="${escapeHtml(css)}"`;
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

const readString = (value: unknown, fallback = ""): string => {
  const next = String(value ?? "").trim();
  return next || fallback;
};

const readBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === "boolean" ? value : fallback;

const readInt = (value: unknown, fallback: number, min = 1): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.floor(parsed));
};

const renderChildren = (nodes: EditorNode[]): string => nodes.map(renderNode).join("\n");

const renderListItems = (items: string[], itemSpacing: number): string =>
  items
    .map((item, index) => {
      const spacingStyle = index > 0 ? ` style="margin-top: ${itemSpacing}px;"` : "";
      return `<li${spacingStyle}>${escapeHtml(item)}</li>`;
    })
    .join("");

const renderNode = (node: EditorNode): string => {
  const id = escapeHtml(node.id);
  const styleAttr = styleToInlineAttr(resolveNodeStyle(node));
  const baseAttr = `id="${id}" data-node-id="${id}"`;

  switch (node.type) {
    case "text": {
      const content = escapeHtml(readString(node.props.content, "单行文本"));
      return `<span ${baseAttr} class="wg-node wg-text"${styleAttr}>${content}</span>`;
    }
    case "title": {
      const content = escapeHtml(readString(node.props.content, "标题文本"));
      const level = readString(node.props.level, "h2").toLowerCase();
      const tag = ["h1", "h2", "h3", "h4", "h5", "h6"].includes(level) ? level : "h2";
      return `<${tag} ${baseAttr} class="wg-node wg-title"${styleAttr}>${content}</${tag}>`;
    }
    case "paragraph": {
      const content = escapeHtml(readString(node.props.content, "这是一段段落内容"));
      return `<p ${baseAttr} class="wg-node wg-paragraph"${styleAttr}>${content}</p>`;
    }
    case "nav": {
      const content = escapeHtml(readString(node.props.content, "导航栏"));
      return `<nav ${baseAttr} class="wg-node wg-nav"${styleAttr}>${content}</nav>`;
    }
    case "button": {
      const label = escapeHtml(readString(node.props.label, "按钮"));
      const variant = readString(node.props.variant, "primary");
      const size = readString(node.props.size, "md");
      const disabled = readBoolean(node.props.disabled);
      const variantClass = ["primary", "outline", "soft"].includes(variant)
        ? variant
        : "primary";
      const sizeClass = ["sm", "md", "lg"].includes(size) ? size : "md";
      const disabledAttr = disabled ? " disabled" : "";
      return `<button ${baseAttr} class="wg-node wg-button variant-${variantClass} size-${sizeClass}" type="button"${disabledAttr}${styleAttr}>${label}</button>`;
    }
    case "input": {
      const type = readString(node.props.type, "text");
      const inputType = ["text", "email", "password", "number", "tel", "url"].includes(type)
        ? type
        : "text";
      const placeholder = escapeHtml(readString(node.props.placeholder, "请输入内容"));
      const value = escapeHtml(readString(node.props.value, ""));
      const name = readString(node.props.name, "");
      const required = readBoolean(node.props.required);
      const disabled = readBoolean(node.props.disabled);
      const maxLength = readInt(node.props.maxLength, 0, 0);
      const nameAttr = name ? ` name="${escapeHtml(name)}"` : "";
      const requiredAttr = required ? " required" : "";
      const disabledAttr = disabled ? " disabled" : "";
      const maxLengthAttr = maxLength > 0 ? ` maxlength="${maxLength}"` : "";
      return `<input ${baseAttr} class="wg-node wg-input" type="${inputType}" placeholder="${placeholder}" value="${value}"${nameAttr}${requiredAttr}${disabledAttr}${maxLengthAttr}${styleAttr} />`;
    }
    case "link": {
      const label = escapeHtml(readString(node.props.label, "超链接"));
      const href = escapeHtml(readString(node.props.href, "https://example.com"));
      const target = readString(node.props.target, "_blank");
      const safeTarget = target === "_self" ? "_self" : "_blank";
      const title = readString(node.props.title, "");
      const noFollow = readBoolean(node.props.nofollow);
      const underline = node.props.underline !== false;
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
      const relParts = ["noreferrer", "noopener"];
      if (noFollow) {
        relParts.push("nofollow");
      }
      const underlineClass = underline ? "" : " no-underline";
      return `<a ${baseAttr} class="wg-node wg-link${underlineClass}" href="${href}" target="${safeTarget}" rel="${relParts.join(
        " "
      )}"${titleAttr}${styleAttr}>${label}</a>`;
    }
    case "image": {
      const src = readString(node.props.src, "");
      const alt = escapeHtml(readString(node.props.alt, "图片"));
      const fit = readString(node.props.fit, "cover");
      const position = readString(node.props.position, "center center");
      if (!src) {
        return `<div ${baseAttr} class="wg-node wg-image-placeholder"${styleAttr}><span>图片</span></div>`;
      }
      return `<img ${baseAttr} class="wg-node wg-image" src="${escapeHtml(
        src
      )}" alt="${alt}" loading="lazy" style="object-fit: ${escapeHtml(
        fit
      )}; object-position: ${escapeHtml(position)}; ${styleRecordToCss(
        resolveNodeStyle(node)
      )}" />`;
    }
    case "container": {
      const children = renderChildren(node.children);
      return `<div ${baseAttr} class="wg-node wg-container"${styleAttr}>${children}</div>`;
    }
    case "table": {
      const rows = readInt(node.props.rows, 2);
      const cols = readInt(node.props.cols, 2);
      const striped = readBoolean(node.props.striped);
      const showHeader = readBoolean(node.props.showHeader);
      const rawCells = Array.isArray(node.props.cells) ? (node.props.cells as unknown[]) : [];
      const rowHtml = Array.from({ length: rows }, (_, rowIndex) => {
        const currentRow = Array.isArray(rawCells[rowIndex]) ? (rawCells[rowIndex] as unknown[]) : [];
        const colHtml = Array.from({ length: cols }, (_, colIndex) => {
          const value = currentRow[colIndex];
          const text = typeof value === "string" ? value : "单元格";
          return `<td>${escapeHtml(text)}</td>`;
        }).join("");
        const headerClass = showHeader && rowIndex === 0 ? " is-header" : "";
        return `<tr class="${headerClass.trim()}">${colHtml}</tr>`;
      }).join("");
      const stripedClass = striped ? " is-striped" : "";
      return `<div ${baseAttr} class="wg-node wg-table-wrap"${styleAttr}><table class="wg-table${stripedClass}"><tbody>${rowHtml}</tbody></table></div>`;
    }
    case "list":
    case "ul":
    case "ol": {
      const tag = node.type === "ol" ? "ol" : "ul";
      const rawItems = Array.isArray(node.props.items) ? (node.props.items as unknown[]) : [];
      const items = rawItems
        .map((value) => String(value ?? "").trim())
        .filter(Boolean);
      const resolvedItems = items.length > 0 ? items : ["列表项 1", "列表项 2", "列表项 3"];
      const listStyleType = readString(
        node.props.listStyleType,
        tag === "ol" ? "decimal" : "disc"
      );
      const itemSpacing = readInt(node.props.itemSpacing, 2, 0);
      return `<${tag} ${baseAttr} class="wg-node wg-list" style="list-style-type: ${escapeHtml(
        listStyleType
      )}; ${styleRecordToCss(resolveNodeStyle(node))}">${renderListItems(
        resolvedItems,
        itemSpacing
      )}</${tag}>`;
    }
    case "li": {
      const content = escapeHtml(readString(node.props.content, "列表项"));
      return `<li ${baseAttr} class="wg-node wg-li"${styleAttr}>${content}</li>`;
    }
    case "i": {
      const iconSrc = readString(node.props.iconSrc, "");
      if (iconSrc) {
        return `<span ${baseAttr} class="wg-node wg-icon"${styleAttr}><img class="wg-icon-image" src="${escapeHtml(
          iconSrc
        )}" alt="icon" /></span>`;
      }
      return `<span ${baseAttr} class="wg-node wg-icon"${styleAttr}><span class="wg-icon-fallback">☆</span></span>`;
    }
    default: {
      const children = renderChildren(node.children);
      return `<div ${baseAttr} class="wg-node"${styleAttr}>${children}</div>`;
    }
  }
};

const collectNodeStyleRules = (nodes: EditorNode[], rules: string[] = []): string[] => {
  nodes.forEach((node) => {
    const style = resolveNodeStyle(node);
    const styleCss = styleRecordToCss(style);
    if (styleCss) {
      rules.push(`#${node.id} { ${styleCss} }`);
    }
    if (node.children.length > 0) {
      collectNodeStyleRules(node.children, rules);
    }
  });
  return rules;
};

const buildBaseCss = (document: PageDocumentV2): string => {
  const rawPageStyle = isObject(document.meta.pageStyle)
    ? (document.meta.pageStyle as Record<string, unknown>)
    : {};

  const backgroundColor = readString(rawPageStyle.backgroundColor, "#ffffff");
  const backgroundImage = toBackgroundImageValue(rawPageStyle.backgroundImage);
  const backgroundSize = readString(rawPageStyle.backgroundSize, "cover");
  const backgroundRepeat = readString(rawPageStyle.backgroundRepeat, "no-repeat");
  const backgroundPosition = readString(rawPageStyle.backgroundPosition, "center center");
  const backgroundAttachment = readString(rawPageStyle.backgroundAttachment, "scroll");

  return `
* { box-sizing: border-box; }
html, body { width: 100%; min-height: 100%; margin: 0; padding: 0; }
body {
  width: 100%;
  min-height: 100vh;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  color: #1f2739;
  line-height: 1.5;
  background-color: ${backgroundColor};
  background-image: ${backgroundImage};
  background-size: ${backgroundSize};
  background-repeat: ${backgroundRepeat};
  background-position: ${backgroundPosition};
  background-attachment: ${backgroundAttachment};
}
.wg-page {
  width: 100%;
  min-height: 100vh;
  margin: 0;
  padding: 0;
}
.wg-page > :first-child { margin-top: 0; }
.wg-page > :last-child { margin-bottom: 0; }
.wg-node { max-width: 100%; }
.wg-text { display: inline-block; font-size: 15px; line-height: 1.55; }
.wg-title { margin: 0; line-height: 1.28; font-weight: 700; letter-spacing: -0.01em; }
.wg-paragraph { margin: 0; font-size: 15px; line-height: 1.7; }
.wg-nav { display: block; margin: 0; min-height: 40px; padding: 8px 12px; line-height: 1.6; }
.wg-button {
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  border-radius: 0;
  padding: 9px 16px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  cursor: pointer;
}
.wg-button.variant-primary { background: #2f68d6; border-color: #2f68d6; }
.wg-button.variant-outline { border-color: #2f68d6; }
.wg-button.variant-soft { background: #eaf1ff; border-color: #c4d5ff; }
.wg-button.size-sm { padding: 6px 12px; font-size: 13px; }
.wg-button.size-md { padding: 9px 16px; font-size: 14px; }
.wg-button.size-lg { padding: 12px 20px; font-size: 15px; }
.wg-button:disabled { cursor: not-allowed; opacity: 0.62; }
.wg-input {
  min-width: 180px;
  max-width: 100%;
  height: 38px;
  border: 1px solid #c8d1e2;
  padding: 0 12px;
  color: inherit;
  background: transparent;
}
.wg-link { color: inherit; text-decoration: none; border-bottom: 1px solid currentColor; }
.wg-link.no-underline { border-bottom: 0; }
.wg-image { display: block; width: 100%; height: auto; min-height: 0; }
.wg-image-placeholder {
  min-height: 150px;
  display: grid;
  place-items: center;
  color: #5f6d86;
  border: 1px solid #cad4e3;
}
.wg-container { display: block; width: 100%; min-height: 0; }
.wg-table-wrap { width: 100%; max-width: 100%; }
.wg-table {
  border-collapse: collapse;
  width: 100%;
  max-width: 100%;
  border: 1px solid #cdd6e4;
}
.wg-table td { border: 1px solid #d7deea; padding: 9px 12px; font-size: 13px; }
.wg-table.is-striped tr:nth-child(even) td { background: rgba(130, 152, 190, 0.08); }
.wg-table tr.is-header td { font-weight: 700; background: rgba(94, 125, 190, 0.14); }
.wg-list { margin: 0; padding-left: 20px; line-height: 1.7; }
.wg-li { margin: 0; }
.wg-icon { display: inline-flex; align-items: center; justify-content: center; line-height: 1; }
.wg-icon-image { width: 1em; height: 1em; object-fit: contain; display: block; }
.wg-icon-fallback { font-size: 1em; line-height: 1; display: inline-block; }
`.trim();
};

const buildIndexHtml = (document: PageDocumentV2): string => {
  const pageTitle = escapeHtml(readString(document.title, "页面导出"));
  const body = renderChildren(document.root);
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${pageTitle}</title>
    <link rel="stylesheet" href="./css/style.css" />
  </head>
  <body>
    <main class="wg-page">
${body}
    </main>
  </body>
</html>`;
};

export const buildHtmlExportBundle = (
  document: PageDocumentV2
): { indexHtml: string; styleCss: string } => {
  const baseCss = buildBaseCss(document);
  const nodeRules = collectNodeStyleRules(document.root);
  return {
    indexHtml: buildIndexHtml(document),
    styleCss: `${baseCss}\n\n${nodeRules.join("\n")}\n`,
  };
};
