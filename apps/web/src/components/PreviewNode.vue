<template>
  <div class="preview-node" :style="nodeInlineStyle">
    <NodeRenderer v-if="node.type !== 'container'" :node="node" :style="nodeRadiusInlineStyle" />

    <NodeRenderer v-else :node="node" :style="nodeRadiusInlineStyle">
      <PreviewNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :device-mode="deviceMode"
      />
    </NodeRenderer>
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
</script>

<style scoped>
.preview-node {
  margin: 0;
}

.preview-node > :deep(*) {
  border-radius: inherit;
}
</style>
