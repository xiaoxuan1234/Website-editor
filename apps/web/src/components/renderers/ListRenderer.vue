<template>
  <div class="list-wrap" @click.stop="handleSelect">
    <div v-if="showTools" class="inline-tools">
      <button type="button" @mousedown.prevent @click.stop="addItem">+ 项</button>
      <button type="button" @mousedown.prevent @click.stop="removeItem">- 项</button>
    </div>

    <component
      :is="listTag"
      ref="listRef"
      class="list"
      :style="{
        listStyleType,
        '--item-gap': `${itemSpacing}px`,
        '--list-indent': listIndent,
      }"
    >
      <li
        v-for="(item, index) in items"
        :key="`${props.node.id}-${index}`"
        :class="{ editable }"
        :contenteditable="editable"
        spellcheck="false"
        @focus="handleSelect"
        @blur="commitItems"
        @keydown.enter.prevent="handleItemEnter"
      >
        {{ item }}
      </li>
    </component>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute } from "vue-router";
import type { EditorNode } from "@wg/schema";
import { useEditorStore } from "@/stores/editor";

const props = defineProps<{ node: EditorNode }>();

const editorStore = useEditorStore();
const route = useRoute();
const listRef = ref<HTMLElement | null>(null);

const fallbackFirst = "列表项 1";
const fallbackItems = [fallbackFirst, "列表项 2", "列表项 3"];
const listTag = computed(() => (props.node.type === "ol" ? "ol" : "ul"));
const listStyleType = computed(() => {
  const defaultType = props.node.type === "ol" ? "decimal" : "disc";
  const value = String(props.node.props.listStyleType ?? defaultType);
  return ["disc", "circle", "square", "decimal", "none"].includes(value)
    ? value
    : defaultType;
});
const listIndent = computed(() => (listStyleType.value === "none" ? "0px" : "20px"));
const itemSpacing = computed(() => {
  const value = Number(props.node.props.itemSpacing ?? 2);
  if (!Number.isFinite(value) || value < 0) {
    return 2;
  }
  return Math.floor(value);
});
const editable = computed(() => !editorStore.previewMode && !route.path.startsWith("/preview/"));
const showTools = computed(() => editable.value && editorStore.selectedNodeId === props.node.id);

const items = computed(() => {
  const raw = props.node.props.items;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((value) => String(value));
  }
  return fallbackItems;
});

const handleSelect = () => {
  if (!editable.value) {
    return;
  }
  editorStore.selectNode(props.node.id);
};

const getDomItems = (): string[] => {
  const host = listRef.value;
  if (!host) {
    return [...items.value];
  }

  const next = Array.from(host.querySelectorAll("li"))
    .map((li) => li.innerText.replace(/\r?\n/g, "").trim())
    .filter(Boolean);

  return next.length > 0 ? next : [fallbackFirst];
};

const syncDomItems = (nextItems: string[]) => {
  const host = listRef.value;
  if (!host) {
    return;
  }

  const liList = Array.from(host.querySelectorAll("li"));
  liList.forEach((li, index) => {
    const next = nextItems[index] ?? "";
    if (document.activeElement !== li && li.innerText !== next) {
      li.innerText = next;
    }
  });
};

const isSameItems = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

const commitItems = () => {
  if (!editable.value) {
    return;
  }

  const next = getDomItems();
  syncDomItems(next);

  if (!isSameItems(next, items.value)) {
    editorStore.selectNode(props.node.id);
    editorStore.updateSelectedProps({ items: next });
  }
};

const addItem = () => {
  if (!editable.value) {
    return;
  }
  const current = getDomItems();
  const next = [...current, `列表项 ${current.length + 1}`];
  editorStore.selectNode(props.node.id);
  editorStore.updateSelectedProps({ items: next });
};

const removeItem = () => {
  if (!editable.value) {
    return;
  }
  const current = getDomItems();
  if (current.length <= 1) {
    return;
  }
  editorStore.selectNode(props.node.id);
  editorStore.updateSelectedProps({ items: current.slice(0, -1) });
};

const handleItemEnter = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  target?.blur();
};

watch(
  items,
  (next) => {
    syncDomItems(next);
  },
  { immediate: true }
);
</script>

<style scoped>
.list-wrap {
  display: inline-flex;
  flex-direction: column;
  gap: 8px;
}

.inline-tools {
  display: inline-flex;
  gap: 6px;
}

.inline-tools button {
  height: 24px;
  border: 1px solid #c4ccda;
  border-radius: 0;
  background: #f5f7fb;
  color: #394356;
  font-size: 12px;
  line-height: 1;
  padding: 0 8px;
  cursor: pointer;
}

.inline-tools button:hover {
  border-color: #aeb8ca;
  background: #edf2fb;
}

.list {
  margin: 0;
  padding-left: var(--list-indent, 20px);
  color: inherit;
  line-height: 1.7;
}

.list li + li {
  margin-top: var(--item-gap, 2px);
}

.list li.editable {
  cursor: text;
}

.list li.editable:focus {
  outline: 1px dashed #8eade8;
  outline-offset: 2px;
  border-radius: 0;
}
</style>
