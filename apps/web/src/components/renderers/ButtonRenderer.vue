<template>
  <button
    class="btn"
    :class="[`variant-${buttonVariant}`, `size-${buttonSize}`, { disabled: buttonDisabled }]"
    type="button"
    :disabled="buttonDisabled"
    @click.stop="handleClick"
  >
    <span
      ref="editableRef"
      class="btn-text"
      :class="{ editable }"
      :contenteditable="editable"
      spellcheck="false"
      @focus="handleSelect"
      @blur="handleBlur"
      @keydown.enter.prevent="handleEnter"
    >
      {{ label }}
    </span>
  </button>
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

const label = computed(() => (props.node.props.label as string) || "按钮");
const buttonVariant = computed(() => {
  const value = String(props.node.props.variant ?? "primary");
  return ["primary", "outline", "soft"].includes(value) ? value : "primary";
});
const buttonSize = computed(() => {
  const value = String(props.node.props.size ?? "md");
  return ["sm", "md", "lg"].includes(value) ? value : "md";
});
const buttonDisabled = computed(() => Boolean(props.node.props.disabled ?? false));
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

  const next = host.innerText.replace(/\r?\n/g, "").trim() || "按钮";
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
  if (buttonDisabled.value) {
    return;
  }
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
.btn {
  border: none;
  border-radius: inherit;
  background: transparent;
  color: inherit;
  padding: 9px 16px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.01em;
  box-shadow: none;
  cursor: pointer;
  transition: background-color 0.16s ease, color 0.16s ease;
}

.btn.variant-primary {
  background: #2f68d6;
}

.btn.variant-outline {
  background: transparent;
}

.btn.variant-soft {
  background: #eaf1ff;
}

.btn.size-sm {
  padding: 6px 12px;
  font-size: 13px;
}

.btn.size-md {
  padding: 9px 16px;
  font-size: 14px;
}

.btn.size-lg {
  padding: 12px 20px;
  font-size: 15px;
}

.btn.disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.btn-text {
  display: inline-block;
}

.btn-text.editable {
  cursor: text;
}

.btn-text.editable:focus {
  outline: 1px dashed #8eade8;
  outline-offset: 2px;
  border-radius: inherit;
}
</style>
