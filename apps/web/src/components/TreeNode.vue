<template>
  <div
    ref="rootRef"
    class="tree-node"
    :data-testid="`tree-node-${node.id}`"
    :data-node-id="node.id"
    :data-node-type="node.type"
    :class="{
      active: editorStore.selectedNodeId === node.id,
      container: node.type === 'container',
    }"
    @click.stop="editorStore.selectNode(node.id)"
  >
    <div
      v-if="node.type !== 'container'"
      ref="contentRef"
      class="node-content"
      :class="{ 'node-content-image': node.type === 'image' }"
      :style="nodeInlineStyle"
    >
      <div class="node-type-tag">{{ nodeTypeLabel }}</div>
      <div v-if="showToolbar" class="node-toolbar" @click.stop>
        <button
          type="button"
          class="tool-btn"
          :disabled="!canMoveUp"
          title="上移"
          @mousedown.prevent
          @click.stop="moveUp"
        >
          ↑
        </button>
        <button
          type="button"
          class="tool-btn drag"
          title="拖拽移动"
          draggable="true"
          @dragstart.stop="onMoveDragStart"
          @dragend.stop="onMoveDragEnd"
        >
          ↕
        </button>
        <button
          type="button"
          class="tool-btn"
          title="复制"
          @mousedown.prevent
          @click.stop="duplicateSelf"
        >
          ⧉
        </button>
        <button
          type="button"
          class="tool-btn danger"
          title="删除"
          @mousedown.prevent
          @click.stop="deleteSelf"
        >
          ×
        </button>
      </div>
      <NodeRenderer :node="node" :style="nodeRadiusInlineStyle" />
    </div>

    <div
      v-if="node.type === 'container'"
      ref="childrenRef"
      class="children-zone"
      :class="{
        'layout-flow': containerLayoutMode === 'flow',
        'layout-flex': containerLayoutMode === 'flex',
        'layout-grid': containerLayoutMode === 'grid',
        'has-custom-height': hasCustomHeight,
      }"
      :style="nodeInlineStyle"
      :data-testid="`container-dropzone-${node.id}`"
      @dragover.prevent.stop="onContainerDragOver"
      @drop.prevent.stop="onContainerDrop"
      @dragleave.stop="onContainerDragLeave"
    >
      <div class="node-type-tag">{{ nodeTypeLabel }}</div>
      <div v-if="showToolbar" class="node-toolbar" @click.stop>
        <button
          type="button"
          class="tool-btn"
          :disabled="!canMoveUp"
          title="上移"
          @mousedown.prevent
          @click.stop="moveUp"
        >
          ↑
        </button>
        <button
          type="button"
          class="tool-btn drag"
          title="拖拽移动"
          draggable="true"
          @dragstart.stop="onMoveDragStart"
          @dragend.stop="onMoveDragEnd"
        >
          ↕
        </button>
        <button
          type="button"
          class="tool-btn"
          title="复制"
          @mousedown.prevent
          @click.stop="duplicateSelf"
        >
          ⧉
        </button>
        <button
          type="button"
          class="tool-btn danger"
          title="删除"
          @mousedown.prevent
          @click.stop="deleteSelf"
        >
          ×
        </button>
      </div>

      <template v-for="(child, index) in node.children" :key="child.id">
        <div v-if="isDropAt(node.id, index)" class="drop-indicator"></div>

        <div
          class="child-item"
          :class="{ 'child-item-container': child.type === 'container' }"
          :data-index="index"
        >
          <TreeNode
            :node="child"
            :parent-id="node.id"
            :index="index"
            :drop-target="dropTarget"
            :is-dragging="isDragging"
            :preview-mode="previewMode"
            @update-drop-target="emit('update-drop-target', $event)"
            @drop-node="emit('drop-node', $event)"
            @clear-drop-target="emit('clear-drop-target')"
            @move-drag-start="emit('move-drag-start', $event)"
            @move-drag-end="emit('move-drag-end')"
          />
        </div>
      </template>

      <div v-if="isDropAt(node.id, node.children.length)" class="drop-indicator"></div>
    </div>

    <div v-if="showSizeBadge" class="size-badge">{{ sizeLabel }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { EditorNode, NodeType } from "@wg/schema";
import NodeRenderer from "@/components/NodeRenderer.vue";
import { useEditorStore } from "@/stores/editor";

defineOptions({
  name: "TreeNode",
});

type DropTarget = {
  parentId: string | null;
  index: number;
  clientX?: number;
  clientY?: number;
};

const props = defineProps<{
  node: EditorNode;
  parentId: string | null;
  index: number;
  dropTarget: DropTarget | null;
  isDragging: boolean;
  previewMode: boolean;
}>();

const emit = defineEmits<{
  (e: "update-drop-target", target: DropTarget): void;
  (e: "drop-node", payload: { event: DragEvent; parentId: string | null; index: number }): void;
  (e: "clear-drop-target"): void;
  (e: "move-drag-start", nodeId: string): void;
  (e: "move-drag-end"): void;
}>();

const editorStore = useEditorStore();
const childrenRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const rootRef = ref<HTMLElement | null>(null);
const nodeSize = ref({ width: 0, height: 0 });
let sizeObserver: ResizeObserver | null = null;

const nodeInlineStyle = computed(
  () => editorStore.getNodeStyleByMode(props.node) as Record<string, string | number>
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
const isSelected = computed(() => editorStore.selectedNodeId === props.node.id);
const nodeTypeLabelMap: Record<NodeType, string> = {
  text: "文本",
  image: "图片",
  title: "标题",
  container: "容器",
  paragraph: "段落",
  button: "按钮",
  input: "输入框",
  link: "超链接",
  table: "表格",
  list: "列表",
  nav: "导航",
  i: "图标",
  li: "列表项",
  ul: "无序列表",
  ol: "有序列表",
};
const nodeTypeLabel = computed(() => nodeTypeLabelMap[props.node.type] ?? props.node.type);
const containerLayoutMode = computed<"flow" | "flex" | "grid">(() => {
  if (props.node.type !== "container") {
    return "flow";
  }
  const display = String(nodeInlineStyle.value.display ?? "").trim().toLowerCase();
  if (display === "flex" || display === "inline-flex") {
    return "flex";
  }
  if (display === "grid" || display === "inline-grid") {
    return "grid";
  }
  return "flow";
});
const hasCustomHeight = computed(() => {
  const heightValue = String(nodeInlineStyle.value.height ?? "").trim().toLowerCase();
  return heightValue !== "" && heightValue !== "auto";
});
const showToolbar = computed(() => !props.previewMode && isSelected.value);
const canMoveUp = computed(() => !props.previewMode && props.index > 0);
const showSizeBadge = computed(() => !props.previewMode && isSelected.value);
const sizeLabel = computed(() => {
  const width = Math.max(0, Math.round(nodeSize.value.width));
  const height = Math.max(0, Math.round(nodeSize.value.height));
  return `${width} × ${height}`;
});

const hasPalettePayload = (transfer: DataTransfer | null) =>
  Boolean(transfer && Array.from(transfer.types).includes("application/x-edit-element"));
const hasNodePayload = (transfer: DataTransfer | null) =>
  Boolean(transfer && Array.from(transfer.types).includes("application/x-edit-node"));
const resolvePayloadKind = (transfer: DataTransfer | null): "palette" | "node" | null => {
  if (hasPalettePayload(transfer)) {
    return "palette";
  }
  if (hasNodePayload(transfer)) {
    return "node";
  }
  return null;
};

const isDropAt = (parentId: string | null, index: number): boolean =>
  Boolean(
    props.isDragging &&
      props.dropTarget &&
      props.dropTarget.parentId === parentId &&
      props.dropTarget.index === index
  );

const getChildItems = (): HTMLElement[] => {
  const host = childrenRef.value;
  if (!host) {
    return [];
  }
  return Array.from(host.children).filter(
    (node): node is HTMLElement => node.classList.contains("child-item")
  );
};

const getInsertIndex = (clientY: number): number => {
  const items = getChildItems();
  if (items.length === 0) {
    return 0;
  }

  for (const item of items) {
    const rect = item.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return Number(item.dataset.index ?? 0);
    }
  }

  return props.node.children.length;
};

const onContainerDragOver = (event: DragEvent) => {
  const kind = resolvePayloadKind(event.dataTransfer);
  if (props.previewMode || !kind) {
    return;
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = kind === "node" ? "move" : "copy";
  }

  emit("update-drop-target", {
    parentId: props.node.id,
    index: getInsertIndex(event.clientY),
    clientX: event.clientX,
    clientY: event.clientY,
  });
};

const onContainerDrop = (event: DragEvent) => {
  if (props.previewMode || !resolvePayloadKind(event.dataTransfer)) {
    emit("clear-drop-target");
    return;
  }

  emit("drop-node", {
    event,
    parentId: props.node.id,
    index: getInsertIndex(event.clientY),
  });
};

const moveUp = () => {
  if (!canMoveUp.value) {
    return;
  }
  editorStore.moveNode(props.node.id, props.parentId, props.index - 1);
  editorStore.selectNode(props.node.id);
};

const duplicateSelf = () => {
  if (props.previewMode) {
    return;
  }
  editorStore.duplicateNode(props.node.id);
};

const deleteSelf = () => {
  if (props.previewMode) {
    return;
  }
  editorStore.deleteNode(props.node.id);
};

const onMoveDragStart = (event: DragEvent) => {
  if (props.previewMode || !event.dataTransfer) {
    return;
  }
  editorStore.selectNode(props.node.id);
  const payload = JSON.stringify({ nodeId: props.node.id });
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("application/x-edit-node", payload);
  event.dataTransfer.setData("text/plain", payload);
  emit("move-drag-start", props.node.id);
};

const onMoveDragEnd = () => {
  emit("move-drag-end");
};

const onContainerDragLeave = (event: DragEvent) => {
  const host = childrenRef.value;
  if (!host) {
    return;
  }

  const rect = host.getBoundingClientRect();
  const outside =
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom;

  if (outside) {
    emit("clear-drop-target");
  }
};

const syncNodeSize = () => {
  const host = childrenRef.value ?? contentRef.value ?? rootRef.value;
  if (!host) {
    return;
  }
  const rect = host.getBoundingClientRect();
  nodeSize.value = {
    width: rect.width,
    height: rect.height,
  };
};

onMounted(() => {
  syncNodeSize();
  if (typeof ResizeObserver !== "function") {
    return;
  }
  sizeObserver = new ResizeObserver(() => {
    syncNodeSize();
  });
  const host = childrenRef.value ?? contentRef.value ?? rootRef.value;
  if (host) {
    sizeObserver.observe(host);
  }
});

onBeforeUnmount(() => {
  if (sizeObserver) {
    sizeObserver.disconnect();
    sizeObserver = null;
  }
});
</script>

<style scoped>
.tree-node {
  position: relative;
  display: block;
  width: fit-content;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  background: transparent;
}

.tree-node.container {
  width: 100%;
}

.node-content {
  position: relative;
  display: block;
  width: fit-content;
  max-width: 100%;
  min-height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.node-content-image {
  padding: 0;
}

.node-content > :deep(*) {
  border-radius: inherit;
}

.children-zone {
  position: relative;
  width: 100%;
  min-height: 130px;
  border: 1px dashed #bcc9de;
  border-radius: 0;
  padding: 0;
  background: transparent;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.children-zone.has-custom-height {
  min-height: 0;
}

.tree-node:hover > .node-content,
.tree-node:hover > .children-zone {
  border-color: #86aaf7;
  box-shadow: 0 0 0 2px rgba(67, 113, 216, 0.1);
}

.tree-node.active > .node-content,
.tree-node.active > .children-zone {
  border-color: #2b6ef5;
  box-shadow: 0 0 0 2px rgba(43, 110, 245, 0.12);
}

.node-type-tag {
  position: absolute;
  top: -11px;
  left: 8px;
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  background: #2b6ef5;
  color: #ffffff;
  font-size: 11px;
  line-height: 20px;
  font-weight: 600;
  pointer-events: none;
  opacity: 0;
  transform: translateY(3px);
  transition: opacity 0.15s ease, transform 0.15s ease;
  z-index: 3;
}

.tree-node:hover > .node-content > .node-type-tag,
.tree-node.active > .node-content > .node-type-tag,
.tree-node:hover > .children-zone > .node-type-tag,
.tree-node.active > .children-zone > .node-type-tag {
  opacity: 1;
  transform: translateY(0);
}

.node-toolbar {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(0, -50%);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px;
  border-radius: 999px;
  border: 1px solid #c9d5ec;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 8px 16px rgba(38, 55, 85, 0.14);
  z-index: 4;
}

.tool-btn {
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #2f3e59;
  font-size: 14px;
  line-height: 24px;
  text-align: center;
  cursor: pointer;
}

.tool-btn:hover {
  background: #edf3ff;
}

.tool-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tool-btn.drag {
  cursor: grab;
}

.tool-btn.drag:active {
  cursor: grabbing;
}

.tool-btn.danger {
  color: #c94242;
}

.tool-btn.danger:hover {
  background: #ffecec;
}

.drop-indicator {
  height: 0;
  border-top: 2px solid #2b6ef5;
  margin: 4px 3px;
}

.child-item {
  margin: 0;
}

.children-zone.layout-flow > .child-item.child-item-container {
  padding: 8px;
}

.children-zone.layout-flex > .child-item > .tree-node,
.children-zone.layout-grid > .child-item > .tree-node {
  width: auto;
  margin: 0;
}

.children-zone > .child-item:first-of-type > .tree-node {
  margin-top: 0;
}

.children-zone > .child-item:last-of-type > .tree-node {
  margin-bottom: 0;
}

.size-badge {
  position: absolute;
  bottom: -10px;
  right: 8px;
  height: 20px;
  width: 86px;
  padding: 0;
  border-radius: 999px;
  background: #2f68d6;
  color: #ffffff;
  font-size: 11px;
  line-height: 20px;
  font-weight: 600;
  text-align: center;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}
</style>
