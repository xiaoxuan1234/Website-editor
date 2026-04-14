<template>
  <p
    ref="editableRef"
    class="paragraph"
    :class="{ editable }"
    :contenteditable="editable"
    spellcheck="false"
    @click.stop="handleSelect"
    @focus="handleSelect"
    @blur="handleBlur"
    v-html="content"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { EditorNode } from "@wg/schema";
import { useEditorStore } from "@/stores/editor";

const props = defineProps<{ node: EditorNode }>();

const editorStore = useEditorStore();
const route = useRoute();
const editableRef = ref<HTMLElement | null>(null);

const content = computed(() => (props.node.props.content as string) || "这是一段段落内容");
const editable = computed(() => !editorStore.previewMode && !route.path.startsWith("/preview/"));

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

  const next = host.innerHTML.trim() || "这是一段段落内容";

  if (next !== content.value) {
    editorStore.selectNode(props.node.id);
    editorStore.updateSelectedProps({ content: next });
  }
};

const handleBlur = () => {
  commitValue();
};

watch(
  content,
  (value) => {
    const host = editableRef.value;
    if (!host) {
      return;
    }

    if (document.activeElement !== host && host.innerHTML !== value) {
      host.innerHTML = value;
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.paragraph {
  margin: 0;
  max-width: 100%;
  color: inherit;
  font-size: 15px;
  line-height: 1.75;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.paragraph.editable {
  cursor: text;
}

.paragraph.editable:focus {
  outline: 1px dashed #8eade8;
  outline-offset: 2px;
  border-radius: 0;
}
</style>
