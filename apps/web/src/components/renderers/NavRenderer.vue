<template>
  <nav
    ref="editableRef"
    class="nav-node"
    :class="{
      editable,
      'with-children': hasChildren,
    }"
    :contenteditable="hasChildren ? undefined : editable"
    spellcheck="false"
    @click.stop="handleSelect"
    @focus="handleSelect"
    @blur="hasChildren ? undefined : handleBlur"
    @keydown.enter.prevent="handleEnter"
  >
    <slot v-if="hasChildren" />
    <template v-else>{{ content }}</template>
  </nav>
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

const content = computed(() => (props.node.props.content as string) || "导航栏");
const hasChildren = computed(() => props.node.children.length > 0);
const selectable = computed(
  () => !editorStore.previewMode && !route.path.startsWith("/preview/")
);
const editable = computed(
  () => !hasChildren.value && selectable.value
);

const handleSelect = () => {
  if (!selectable.value) {
    return;
  }
  editorStore.selectNode(props.node.id);
};

const commitValue = () => {
  const host = editableRef.value;
  if (!host || !editable.value) {
    return;
  }

  const next = host.innerText.replace(/\r?\n/g, "").trim() || "导航栏";
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
    if (hasChildren.value) {
      return;
    }
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
.nav-node {
  display: block;
  width: 100%;
  min-height: 40px;
  margin: 0;
  padding: 8px 12px;
  box-sizing: border-box;
  border-radius: inherit;
  color: inherit;
  line-height: 1.6;
  background: transparent;
}

.nav-node.with-children {
  min-height: 0;
}

.nav-node.editable {
  cursor: text;
}

.nav-node.editable:focus {
  outline: 1px dashed #8eade8;
  outline-offset: 2px;
}
</style>
