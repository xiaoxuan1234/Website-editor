<template>
  <span
    ref="editableRef"
    class="text-node"
    :class="{ editable }"
    :contenteditable="editable"
    spellcheck="false"
    @click.stop="handleSelect"
    @focus="handleSelect"
    @blur="handleBlur"
    @keydown.enter.prevent="handleEnter"
    :style="nodeStyle"
  >
    {{ content }}
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { EditorNode } from "@wg/schema";
import { useEditorStore } from "@/stores/editor";
import { resolveNodeStyleByDevice } from "@/lib/style";

const props = defineProps<{ node: EditorNode }>();

const editorStore = useEditorStore();
const route = useRoute();
const editableRef = ref<HTMLElement | null>(null);

const content = computed(() => (props.node.props.content as string) || "单行文本");
const editable = computed(() => !editorStore.previewMode && !route.path.startsWith("/preview/"));
const nodeStyle = computed(() => resolveNodeStyleByDevice(props.node, "desktop"));

const handleSelect = () => {
  if (!editable.value) {
    return;
  }
  editorStore.selectNode(props.node.id);
};

const commitValue = () => {
  const host = editableRef.value;
  if (!host || !editable.value) {
    return;
  }

  const next = host.innerText.replace(/\r?\n/g, "").trim() || "单行文本";
  host.innerText = next;

  if (next !== content.value) {
    editorStore.selectNode(props.node.id);
    editorStore.updateSelectedProps({ content: next });
  }
};

const handleBlur = () => {
  commitValue();
};

const handleEnter = () => {
  editableRef.value?.blur();
};

watch(
  content,
  (value) => {
    const host = editableRef.value;
    if (!host) {
      return;
    }

    if (document.activeElement !== host && host.innerText !== value) {
      host.innerText = value;
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.text-node {
  display: inline-block;
  max-width: 100%;
  color: inherit;
  font-size: 15px;
  line-height: 1.55;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.text-node.editable {
  cursor: text;
}

.text-node.editable:focus {
  outline: 1px dashed #8eade8;
  outline-offset: 2px;
  border-radius: 0;
}
</style>
