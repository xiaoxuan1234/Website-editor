<template>
  <input
    ref="inputRef"
    class="input"
    :class="{ editable: editable && !inputDisabled, disabled: inputDisabled }"
    :readonly="!editable || inputDisabled"
    :disabled="inputDisabled"
    :type="inputType"
    :name="inputName || undefined"
    :required="inputRequired"
    :maxlength="inputMaxLength || undefined"
    :value="editable ? draftValue : previewValue"
    :placeholder="editable ? '' : placeholder"
    @click.stop="handleClick"
    @focus="handleFocus"
    @input="handleInput"
    @blur="handleBlur"
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
const inputRef = ref<HTMLInputElement | null>(null);
const draftValue = ref("");

const placeholder = computed(() => (props.node.props.placeholder as string) || "请输入内容");
const inputType = computed(() => {
  const value = String(props.node.props.type ?? "text");
  return ["text", "email", "password", "number", "tel", "url"].includes(value)
    ? value
    : "text";
});
const inputDisabled = computed(() => Boolean(props.node.props.disabled ?? false));
const inputName = computed(() => String(props.node.props.name ?? "").trim());
const inputRequired = computed(() => Boolean(props.node.props.required ?? false));
const inputMaxLength = computed(() => {
  const value = Number(props.node.props.maxLength ?? 0);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value);
});
const previewValue = computed(() => String(props.node.props.value ?? ""));
const editable = computed(() => !editorStore.previewMode && !route.path.startsWith("/preview/"));

const syncDraft = (value: string) => {
  draftValue.value = value;
  if (inputRef.value && document.activeElement !== inputRef.value) {
    inputRef.value.value = value;
  }
};

const commitValue = () => {
  if (!editable.value || inputDisabled.value) {
    return;
  }

  const next = draftValue.value.trim() || "请输入内容";
  syncDraft(next);

  if (next !== placeholder.value) {
    editorStore.selectNode(props.node.id);
    editorStore.updateSelectedProps({ placeholder: next });
  }
};

const handleClick = () => {
  if (!editable.value || inputDisabled.value) {
    return;
  }
  editorStore.selectNode(props.node.id);
};

const handleFocus = () => {
  if (!editable.value || inputDisabled.value) {
    return;
  }
  editorStore.selectNode(props.node.id);
};

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement;
  draftValue.value = target.value;
};

const handleBlur = () => {
  commitValue();
};

watch(
  placeholder,
  (value) => {
    syncDraft(value);
  },
  { immediate: true }
);
</script>

<style scoped>
.input {
  width: 100%;
  min-width: 180px;
  max-width: 100%;
  height: 38px;
  border: 1px solid #c8d1e2;
  border-radius: inherit;
  padding: 0 12px;
  box-sizing: border-box;
  color: inherit;
  background: transparent;
  cursor: text;
}

.input.editable {
  box-shadow: 0 0 0 1px #d6deeb inset;
}

.input.editable:focus {
  box-shadow: 0 0 0 1px #8eade8 inset;
}

.input.disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.input::placeholder {
  color: #9aa6bb;
}
</style>
