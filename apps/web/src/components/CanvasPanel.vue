<template>
  <section class="canvas-wrap">
    <div
      ref="canvasRef"
      class="canvas"
      data-testid="canvas-root"
      :style="pageCanvasStyle"
      :class="[
        `device-${editorStore.deviceMode}`,
        { dragging: isDragging, readonly: editorStore.previewMode },
      ]"
      @click="onCanvasClick"
      @dragover.prevent="onRootDragOver"
      @drop.prevent="onRootDrop"
      @dragleave="onRootDragLeave"
    >
      <div
        v-if="dragGuide.showVertical"
        class="align-guide vertical"
        :style="{ left: `${dragGuide.left}px` }"
      ></div>
      <div
        v-if="dragGuide.showHorizontal"
        class="align-guide horizontal"
        :style="{ top: `${dragGuide.top}px` }"
      ></div>

      <div v-if="editorStore.doc.root.length === 0" class="canvas-empty">
        拖拽组件到此处开始编辑
      </div>

      <template v-for="(node, index) in editorStore.doc.root" :key="node.id">
        <div v-if="isDropAt(null, index)" class="drop-indicator"></div>

        <div class="root-item" :data-index="index" :data-testid="`root-item-${node.id}`">
          <TreeNode
            :node="node"
            :parent-id="null"
            :index="index"
            :drop-target="dropTarget"
            :is-dragging="isDragging"
            :preview-mode="editorStore.previewMode"
            @update-drop-target="onUpdateDropTarget"
            @drop-node="onDropNode"
            @clear-drop-target="clearDrop"
            @move-drag-start="onMoveDragStart"
            @move-drag-end="onMoveDragEnd"
          />
        </div>
      </template>

      <div
        v-if="isDropAt(null, editorStore.doc.root.length)"
        class="drop-indicator"
      ></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { NodeTypeSchema, type EditorNode, type PaletteElement } from "@wg/schema";
import TreeNode from "@/components/TreeNode.vue";
import { useEditorStore } from "@/stores/editor";

type DropTarget = {
  parentId: string | null;
  index: number;
  clientX?: number;
  clientY?: number;
};

const editorStore = useEditorStore();
const canvasRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const dropTarget = ref<DropTarget | null>(null);
const dragPoint = ref<{ x: number; y: number } | null>(null);
const draggingNodeId = ref("");

const toBackgroundImageValue = (raw: unknown) => {
  const value = String(raw ?? "").trim();
  if (!value) {
    return "none";
  }
  if (value.startsWith("url(")) {
    return value;
  }
  return `url("${value}")`;
};

const pageCanvasStyle = computed(() => ({
  backgroundColor: String(editorStore.pageStyle.backgroundColor ?? "#ffffff"),
  backgroundImage: toBackgroundImageValue(editorStore.pageStyle.backgroundImage),
  backgroundSize: String(editorStore.pageStyle.backgroundSize ?? "cover"),
  backgroundRepeat: String(editorStore.pageStyle.backgroundRepeat ?? "no-repeat"),
  backgroundPosition: String(editorStore.pageStyle.backgroundPosition ?? "center center"),
  backgroundAttachment: String(editorStore.pageStyle.backgroundAttachment ?? "scroll"),
}));

const hasPalettePayload = (transfer: DataTransfer | null) =>
  Boolean(transfer && Array.from(transfer.types).includes("application/x-edit-element"));
const hasMovePayload = (transfer: DataTransfer | null) =>
  Boolean(transfer && Array.from(transfer.types).includes("application/x-edit-node"));
const resolvePayloadKind = (transfer: DataTransfer | null): "palette" | "move" | null => {
  if (hasPalettePayload(transfer)) {
    return "palette";
  }
  if (hasMovePayload(transfer)) {
    return "move";
  }
  return null;
};

const parsePayload = (event: DragEvent): PaletteElement | null => {
  const raw =
    event.dataTransfer?.getData("application/x-edit-element") ||
    event.dataTransfer?.getData("text/plain");
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PaletteElement>;
    if (
      typeof parsed.type !== "string" ||
      !NodeTypeSchema.safeParse(parsed.type).success ||
      typeof parsed.label !== "string" ||
      typeof parsed.icon !== "string"
    ) {
      return null;
    }

    return parsed as PaletteElement;
  } catch {
    return null;
  }
};

const parseMovePayload = (event: DragEvent): { nodeId: string } | null => {
  const raw =
    event.dataTransfer?.getData("application/x-edit-node") ||
    event.dataTransfer?.getData("text/plain");
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { nodeId?: unknown };
    if (typeof parsed.nodeId !== "string" || !parsed.nodeId.trim()) {
      return null;
    }
    return { nodeId: parsed.nodeId.trim() };
  } catch {
    return null;
  }
};

type NodeLocation = {
  node: EditorNode;
  parentId: string | null;
  index: number;
};

const findNodeLocation = (
  nodes: EditorNode[],
  nodeId: string,
  parentId: string | null = null
): NodeLocation | null => {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!node) {
      continue;
    }
    if (node.id === nodeId) {
      return { node, parentId, index };
    }
    const nested = findNodeLocation(node.children, nodeId, node.id);
    if (nested) {
      return nested;
    }
  }
  return null;
};

const containsNodeId = (node: EditorNode, targetId: string): boolean => {
  if (node.id === targetId) {
    return true;
  }
  return node.children.some((child) => containsNodeId(child, targetId));
};

const normalizeMoveIndex = (
  source: NodeLocation,
  toParentId: string | null,
  toIndex: number
) => {
  let nextIndex = Math.max(0, toIndex);
  if (source.parentId === toParentId && source.index < nextIndex) {
    nextIndex -= 1;
  }
  return Math.max(0, nextIndex);
};

const isInvalidMoveTarget = (
  nodeId: string,
  toParentId: string | null,
  toIndex: number
): boolean => {
  const source = findNodeLocation(editorStore.doc.root, nodeId);
  if (!source) {
    return true;
  }

  if (toParentId && containsNodeId(source.node, toParentId)) {
    return true;
  }

  const normalizedIndex = normalizeMoveIndex(source, toParentId, toIndex);
  return source.parentId === toParentId && source.index === normalizedIndex;
};

const isDropAt = (parentId: string | null, index: number) =>
  Boolean(
    isDragging.value &&
      dropTarget.value &&
      dropTarget.value.parentId === parentId &&
      dropTarget.value.index === index
  );

const clearDrop = () => {
  isDragging.value = false;
  dropTarget.value = null;
  dragPoint.value = null;
  draggingNodeId.value = "";
};

const dragGuide = computed(() => {
  if (!isDragging.value || !dragPoint.value || !canvasRef.value) {
    return {
      showVertical: false,
      showHorizontal: false,
      left: 0,
      top: 0,
    };
  }

  const rect = canvasRef.value.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const threshold = 8;
  const showVertical = Math.abs(dragPoint.value.x - centerX) <= threshold;
  const showHorizontal = Math.abs(dragPoint.value.y - centerY) <= threshold;

  return {
    showVertical,
    showHorizontal,
    left: rect.width / 2,
    top: rect.height / 2,
  };
});

const getRootItems = () => {
  const canvas = canvasRef.value;
  if (!canvas) {
    return [] as HTMLElement[];
  }

  return Array.from(canvas.children).filter(
    (element): element is HTMLElement => element.classList.contains("root-item")
  );
};

const getRootInsertIndex = (clientY: number) => {
  const items = getRootItems();
  if (items.length === 0) {
    return 0;
  }

  for (const item of items) {
    const rect = item.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return Number(item.dataset.index ?? 0);
    }
  }

  return editorStore.doc.root.length;
};

const onRootDragOver = (event: DragEvent) => {
  const payloadKind = resolvePayloadKind(event.dataTransfer);
  if (editorStore.previewMode || !payloadKind) {
    return;
  }

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = payloadKind === "move" ? "move" : "copy";
  }

  isDragging.value = true;
  dragPoint.value = { x: event.clientX, y: event.clientY };
  const nextTarget = {
    parentId: null,
    index: getRootInsertIndex(event.clientY),
    clientX: event.clientX,
    clientY: event.clientY,
  };
  if (draggingNodeId.value && isInvalidMoveTarget(draggingNodeId.value, null, nextTarget.index)) {
    dropTarget.value = null;
    return;
  }
  dropTarget.value = nextTarget;
};

const handleDrop = (event: DragEvent, parentId: string | null, index: number) => {
  const palettePayload = parsePayload(event);
  if (palettePayload) {
    editorStore.addNode(palettePayload.type, parentId, index);
    clearDrop();
    return;
  }

  const movePayload = parseMovePayload(event);
  if (!movePayload) {
    clearDrop();
    return;
  }

  const source = findNodeLocation(editorStore.doc.root, movePayload.nodeId);
  if (!source) {
    clearDrop();
    return;
  }

  if (parentId && containsNodeId(source.node, parentId)) {
    clearDrop();
    return;
  }

  const nextIndex = normalizeMoveIndex(source, parentId, index);
  if (source.parentId === parentId && source.index === nextIndex) {
    clearDrop();
    return;
  }

  editorStore.moveNode(movePayload.nodeId, parentId, nextIndex);
  editorStore.selectNode(movePayload.nodeId);
  clearDrop();
};

const onRootDrop = (event: DragEvent) => {
  if (editorStore.previewMode || !resolvePayloadKind(event.dataTransfer)) {
    clearDrop();
    return;
  }

  handleDrop(event, null, getRootInsertIndex(event.clientY));
};

const onDropNode = (payload: { event: DragEvent; parentId: string | null; index: number }) => {
  handleDrop(payload.event, payload.parentId, payload.index);
};

const onUpdateDropTarget = (target: DropTarget) => {
  if (
    draggingNodeId.value &&
    isInvalidMoveTarget(draggingNodeId.value, target.parentId, target.index)
  ) {
    dropTarget.value = null;
    return;
  }
  isDragging.value = true;
  dropTarget.value = target;
  if (typeof target.clientX === "number" && typeof target.clientY === "number") {
    dragPoint.value = {
      x: target.clientX,
      y: target.clientY,
    };
  }
};

const onMoveDragStart = (nodeId: string) => {
  if (editorStore.previewMode) {
    return;
  }
  draggingNodeId.value = nodeId;
  isDragging.value = true;
};

const onMoveDragEnd = () => {
  clearDrop();
};

const onRootDragLeave = (event: DragEvent) => {
  const host = canvasRef.value;
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
    clearDrop();
  }
};

const onCanvasClick = (event: MouseEvent) => {
  if (editorStore.previewMode) {
    return;
  }

  const target = event.target as HTMLElement;
  if (target.closest(".tree-node")) {
    return;
  }

  editorStore.selectPage();
};
</script>

<style scoped>
.canvas-wrap {
  height: 100%;
  padding: 20px 0;
  overflow-y: auto;
  background: #e9edf3;
  box-sizing: border-box;
}

.canvas {
  position: relative;
  width: min(1160px, 100%);
  min-height: 100%;
  margin: 0 auto;
  border: 1px dashed #c4ccda;
  border-radius: 0;
  background: #fff;
  padding: 0;
  box-sizing: border-box;
  box-shadow: 0 18px 44px rgba(45, 61, 88, 0.08);
}

.canvas.device-tablet {
  width: min(860px, 88%);
}

.canvas.device-mobile {
  width: min(440px, 92%);
}

.canvas.dragging {
  border-color: #3e6ecf;
  box-shadow: 0 0 0 3px rgba(43, 110, 245, 0.12);
}

.canvas > .tree-node:first-child {
  margin-top: 0;
}

.canvas > .tree-node:last-child {
  margin-bottom: 0;
}

.canvas.readonly {
  border-style: solid;
}

.canvas-empty {
  min-height: 180px;
  border: 1px dashed #d2d9e6;
  border-radius: 0;
  display: grid;
  place-items: center;
  color: #7e8ca8;
}

.drop-indicator {
  height: 0;
  border-top: 2px solid #2b6ef5;
  margin: 6px 2px;
}

.align-guide {
  position: absolute;
  pointer-events: none;
  z-index: 2;
}

.align-guide.vertical {
  top: 0;
  bottom: 0;
  width: 0;
  border-left: 1px dashed rgba(47, 104, 214, 0.65);
}

.align-guide.horizontal {
  left: 0;
  right: 0;
  height: 0;
  border-top: 1px dashed rgba(47, 104, 214, 0.65);
}

.root-item {
  margin: 0;
}
</style>
