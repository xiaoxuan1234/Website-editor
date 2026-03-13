<template>
  <span
    class="i-wrap"
    :class="{ editable }"
    @click.stop="handleSelect"
  >
    <img v-if="iconSrc" class="i-image" :src="iconSrc" alt="icon" />
    <i v-else class="iconfont i-node" :class="iconClass"></i>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import type { EditorNode } from "@wg/schema";
import { useEditorStore } from "@/stores/editor";

const props = defineProps<{ node: EditorNode }>();

const editorStore = useEditorStore();
const route = useRoute();

const iconClass = computed(() => {
  const value = String(props.node.props.icon ?? "").trim();
  return value || "icon-zujian";
});
const iconSrc = computed(() => String(props.node.props.iconSrc ?? "").trim());
const editable = computed(() => !editorStore.previewMode && !route.path.startsWith("/preview/"));

const handleSelect = () => {
  if (!editable.value) {
    return;
  }
  editorStore.selectNode(props.node.id);
};
</script>

<style scoped>
.i-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  font-size: inherit;
  line-height: 1;
}

.i-node {
  display: inline-block;
  color: inherit;
  width: 1em;
  height: 1em;
  font-size: inherit;
  line-height: 1;
}

.i-image {
  display: block;
  width: 1em;
  height: 1em;
  min-width: 0;
  min-height: 0;
  object-fit: contain;
}

.i-wrap.editable {
  cursor: pointer;
}

.i-wrap.editable:hover {
  outline: 1px dashed #8eade8;
  outline-offset: 3px;
  border-radius: inherit;
}
</style>
