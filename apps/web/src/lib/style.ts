import type { EditorNode } from "@wg/schema";

export type DeviceMode = "desktop" | "tablet" | "mobile";
export type StyleValue = string | number | boolean | null;
export type StyleRecord = Record<string, StyleValue>;
export type ResponsiveStyleMap = Partial<Record<DeviceMode, StyleRecord>>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

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

export const readResponsiveStyleMap = (node: EditorNode): ResponsiveStyleMap => {
  const raw = node.props.responsiveStyle;
  if (!isPlainObject(raw)) {
    return {};
  }

  const map: ResponsiveStyleMap = {};
  (["desktop", "tablet", "mobile"] as DeviceMode[]).forEach((mode) => {
    const value = raw[mode];
    const normalized = normalizeStyleRecord(value);
    if (Object.keys(normalized).length > 0) {
      map[mode] = normalized;
    }
  });
  return map;
};

export const resolveNodeStyleByDevice = (
  node: EditorNode,
  mode: DeviceMode
): StyleRecord => {
  const result: StyleRecord = normalizeStyleRecord(node.style);
  const map = readResponsiveStyleMap(node);
  const scoped = map[mode];
  if (!scoped) {
    return result;
  }

  Object.entries(scoped).forEach(([key, value]) => {
    if (value === null || value === "") {
      return;
    }
    result[key] = value;
  });

  return result;
};

export const mergeResponsiveStylePatch = (
  node: EditorNode,
  mode: Exclude<DeviceMode, "desktop">,
  patch: StyleRecord
): ResponsiveStyleMap => {
  const map = readResponsiveStyleMap(node);
  const scoped = normalizeStyleRecord(map[mode] ?? {});
  const nextScoped: StyleRecord = { ...scoped };

  Object.entries(patch).forEach(([key, value]) => {
    nextScoped[key] = value;
  });

  map[mode] = nextScoped;
  return map;
};
