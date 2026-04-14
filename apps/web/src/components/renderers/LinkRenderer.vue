<template>
  <a
    class="link"
    :class="{ 'no-underline': !underline }"
    :href="editable ? 'javascript:void(0)' : href"
    :target="editable ? undefined : linkTarget"
    :rel="editable ? undefined : linkRel"
    :title="linkTitle || undefined"
    @click.prevent.stop="handleClick"
  >
    <span
      ref="editableRef"
      class="link-text"
      :class="{ editable }"
      :contenteditable="editable"
      spellcheck="false"
      @focus="handleSelect"
      @blur="handleBlur"
      @keydown.enter.prevent="handleEnter"
    >
      {{ label }}
    </span>
  </a>
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

const label = computed(() => (props.node.props.label as string) || "超链接");
const href = computed(() => (props.node.props.href as string) || "https://example.com");
const linkTarget = computed(() => {
  const value = String(props.node.props.target ?? "_blank");
  return value === "_self" ? "_self" : "_blank";
});
const linkTitle = computed(() => String(props.node.props.title ?? ""));
const noFollow = computed(() => Boolean(props.node.props.nofollow ?? false));
const linkRel = computed(() => {
  const parts = ["noreferrer", "noopener"];
  if (noFollow.value) {
    parts.push("nofollow");
  }
  return parts.join(" ");
});
const underline = computed(() => props.node.props.underline !== false);
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

  const next = host.innerText.replace(/\r?\n/g, "").trim() || "超链接";
  host.innerText = next;

  if (next !== label.value) {
    editorStore.selectNode(props.node.id);
    editorStore.updateSelectedProps({ label: next });
  }
};

const handleBlur = () => {
  commitValue();
};

const handleEnter = () => {
  editableRef.value?.blur();
};

const handleClick = () => {
  if (!editable.value) {
    return;
  }

  handleSelect();
  if (document.activeElement !== editableRef.value) {
    editableRef.value?.focus();
  }
};

watch(
  label,
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
.link {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid currentColor;
  line-height: 1.4;
}

.link:hover {
  opacity: 0.85;
}

.link.no-underline {
  border-bottom: 0;
}

.link-text {
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.link-text.editable {
  cursor: text;
}

.link-text.editable:focus {
  outline: 1px dashed #8eade8;
  outline-offset: 2px;
  border-radius: 0;
}
</style>
