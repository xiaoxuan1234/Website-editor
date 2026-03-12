<template>
  <component
    :is="headingTag"
    ref="editableRef"
    class="title"
    :class="[headingTag, { editable }]"
    :contenteditable="editable"
    spellcheck="false"
    @click.stop="handleSelect"
    @focus="handleSelect"
    @blur="handleBlur"
    @keydown.enter.prevent="handleEnter"
  >
    {{ content }}
  </component>
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

const content = computed(() => (props.node.props.content as string) || "标题文本");
const headingTag = computed(() => {
  const value = String(props.node.props.level ?? "h2").toLowerCase();
  return ["h1", "h2", "h3", "h4", "h5", "h6"].includes(value) ? value : "h2";
});
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

  const next = host.innerText.replace(/\r?\n/g, "").trim() || "标题文本";
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
.title {
  margin: 0;
  color: inherit;
  line-height: 1.28;
  letter-spacing: -0.01em;
  font-weight: 700;
}

.title.h1 {
  font-size: 42px;
}

.title.h2 {
  font-size: 34px;
}

.title.h3 {
  font-size: 28px;
}

.title.h4 {
  font-size: 24px;
}

.title.h5 {
  font-size: 20px;
}

.title.h6 {
  font-size: 16px;
}

.title.editable {
  cursor: text;
}

.title.editable:focus {
  outline: 1px dashed #8eade8;
  outline-offset: 2px;
  border-radius: 0;
}
</style>
