<template>
  <div
    v-if="node.type !== 'container'"
    class="preview-node preview-leaf"
    :style="nodeInlineStyle"
  >
    <NodeRenderer :node="node" :style="nodeRadiusInlineStyle" />
  </div>

  <div
    v-else
    class="preview-node preview-container"
    :class="{
      'layout-flow': containerLayoutMode === 'flow',
      'layout-flex': containerLayoutMode === 'flex',
      'layout-grid': containerLayoutMode === 'grid',
      'has-custom-height': hasCustomHeight,
    }"
    :style="nodeInlineStyle"
  >
    <div
      v-for="child in node.children"
      :key="child.id"
      class="preview-child-item"
      :class="{ 'preview-child-item-container': child.type === 'container' }"
      :style="getChildItemStyle(child)"
    >
      <PreviewNode
        :node="child"
        :device-mode="deviceMode"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { EditorNode } from "@wg/schema";
import NodeRenderer from "@/components/NodeRenderer.vue";
import { resolveNodeStyleByDevice, type DeviceMode } from "@/lib/style";

defineOptions({
  name: "PreviewNode",
});

const props = defineProps<{ node: EditorNode; deviceMode: DeviceMode }>();
const nodeInlineStyle = computed(
  () => resolveNodeStyleByDevice(props.node, props.deviceMode) as Record<string, string | number>
);
const nodeRadiusInlineStyle = computed<Record<string, string | number>>(() => {
  const style = nodeInlineStyle.value;
  const next: Record<string, string | number> = {};
  const keys = [
    "borderRadius",
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomRightRadius",
    "borderBottomLeftRadius",
  ] as const;
  keys.forEach((key) => {
    const value = style[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      next[key] = value;
    }
  });
  return next;
});

const containerLayoutMode = computed<"flow" | "flex" | "grid">(() => {
  if (props.node.type !== "container") {
    return "flow";
  }
  const display = String(nodeInlineStyle.value.display ?? "").trim().toLowerCase();
  if (display === "flex" || display === "inline-flex") {
    return "flex";
  }
  if (display === "grid" || display === "inline-grid") {
    return "grid";
  }
  return "flow";
});

const containerFlexDirection = computed(() =>
  String(nodeInlineStyle.value.flexDirection ?? "row").trim().toLowerCase()
);

const isColumnFlexContainer = computed(
  () =>
    containerLayoutMode.value === "flex" &&
    (containerFlexDirection.value === "column" ||
      containerFlexDirection.value === "column-reverse")
);

const hasCustomHeight = computed(() => {
  const heightValue = String(nodeInlineStyle.value.height ?? "").trim().toLowerCase();
  return heightValue !== "" && heightValue !== "auto";
});

const getChildItemStyle = (child: EditorNode): Record<string, string | number> => {
  const childStyle = resolveNodeStyleByDevice(child, props.deviceMode) as Record<string, unknown>;
  const next: Record<string, string | number> = {
    minWidth: "0",
    minHeight: isColumnFlexContainer.value ? "auto" : "0",
    maxWidth: "100%",
  };

  [
    "flex",
    "flexGrow",
    "flexShrink",
    "flexBasis",
    "width",
    "minWidth",
    "maxWidth",
    "alignSelf",
    "justifySelf",
    "order",
    "gridColumn",
    "gridColumnStart",
    "gridColumnEnd",
    "gridRow",
    "gridRowStart",
    "gridRowEnd",
  ].forEach((key) => {
    const value = childStyle[key];
    if (typeof value === "string" || typeof value === "number") {
      next[key] = value;
    }
  });

  if (containerLayoutMode.value === "grid" && next.width === undefined) {
    next.width = "100%";
  }

  return next;
};
</script>

<style scoped>
.preview-node {
  margin: 0;
  min-width: 0;
  max-width: 100%;
}

.preview-leaf {
  display: block;
  width: fit-content;
  max-width: 100%;
  min-height: 28px;
  box-sizing: border-box;
}

.preview-leaf > :deep(*) {
  border-radius: inherit;
}

.preview-container {
  position: relative;
  width: 100%;
  min-height: 130px;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 0;
  box-sizing: border-box;
}

.preview-container.has-custom-height {
  min-height: 0;
}

.preview-child-item {
  margin: 0;
  min-width: 0;
  min-height: 0;
  max-width: 100%;
}

.preview-container.layout-flow > .preview-child-item.preview-child-item-container {
  padding: 8px;
}

.preview-container.layout-flex > .preview-child-item > .preview-node,
.preview-container.layout-grid > .preview-child-item > .preview-node {
  margin: 0;
  min-width: 0;
  max-width: 100%;
}

.preview-container > .preview-child-item:first-of-type > .preview-node {
  margin-top: 0;
}

.preview-container > .preview-child-item:last-of-type > .preview-node {
  margin-bottom: 0;
}
</style>
