<template>
  <div v-if="node.type !== 'container'" class="preview-node" :style="nodeInlineStyle">
    <NodeRenderer :node="node" :style="nodeRenderableInlineStyle" />
  </div>

  <NodeRenderer v-else class="preview-node container" :node="node" :style="nodeInlineStyle">
    <PreviewNode
      v-for="child in node.children"
      :key="child.id"
      :node="child"
      :device-mode="deviceMode"
    />
  </NodeRenderer>
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
const nodeRenderableInlineStyle = computed<Record<string, string | number>>(() => {
  const style = nodeInlineStyle.value;
  const next: Record<string, string | number> = {};
  const keys = [
    "backgroundColor",
    "color",
    "fontSize",
    "fontWeight",
    "fontFamily",
    "fontStyle",
    "lineHeight",
    "letterSpacing",
    "textAlign",
    "verticalAlign",
    "textDecoration",
    "textTransform",
    "whiteSpace",
    "wordBreak",
    "borderWidth",
    "borderStyle",
    "borderColor",
    "boxShadow",
    "cursor",
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
</script>

<style scoped>
.preview-node {
  display: block;
  width: fit-content;
  max-width: 100%;
  min-width: 0;
  margin: 0;
}

.preview-node.container {
  width: 100%;
}
</style>
