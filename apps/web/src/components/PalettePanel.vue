<template>
  <aside class="wg-palette">
    <div class="panel-body">
      <nav class="module-nav">
        <button
          v-for="item in modules"
          :key="item.key"
          type="button"
          class="module-btn"
          :title="item.label"
          :aria-label="item.label"
          :class="{ active: active === item.key }"
          @click="active = item.key"
        >
          <el-icon><component :is="item.icon" /></el-icon>
        </button>
      </nav>

      <section class="library-body">
        <div class="library-title">{{ activeModuleLabel }}</div>

        <template v-if="active === 'elements'">
          <el-input
            v-model="keyword"
            class="search"
            clearable
            placeholder="搜索组件"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>

          <div class="element-grid">
            <div
              v-for="item in filteredElements"
              :key="item.type"
              class="element-box"
              :data-testid="`palette-item-${item.type}`"
              :class="{ disabled: previewMode }"
              :draggable="!previewMode"
              @dragstart="onDragStart($event, item)"
            >
              <div class="icon-wrap">
                <i class="iconfont" :class="item.icon"></i>
              </div>
              <div class="element-text">{{ item.label }}</div>
            </div>
          </div>

          <div v-if="filteredElements.length === 0" class="placeholder">
            未找到匹配组件
          </div>
        </template>

        <template v-else-if="active === 'layers'">
          <div v-if="layerItems.length === 0" class="placeholder">
            当前没有图层
          </div>

          <div v-else class="layer-list">
            <div
              v-for="item in layerItems"
              :key="item.id"
              class="layer-item"
              :class="{
                active: item.id === editorStore.selectedNodeId,
                'dragging-source': item.id === draggingLayerNodeId,
                'drop-before':
                  layerDropTarget?.anchorId === item.id &&
                  layerDropTarget?.placement === 'before',
                'drop-after':
                  layerDropTarget?.anchorId === item.id &&
                  layerDropTarget?.placement === 'after',
              }"
              :style="{ paddingLeft: `${item.depth * 14 + 8}px` }"
              :draggable="!previewMode"
              @click="editorStore.selectNode(item.id)"
              @dragstart="onLayerDragStart($event, item)"
              @dragover.prevent="onLayerDragOver($event, item)"
              @drop.prevent="onLayerDrop($event, item)"
              @dragend="onLayerDragEnd"
            >
              <button
                v-if="item.isContainer"
                class="layer-toggle"
                type="button"
                draggable="false"
                @click.stop="toggleLayer(item.id)"
              >
                {{ isCollapsed(item.id) ? "+" : "-" }}
              </button>
              <span v-else class="layer-toggle placeholder-toggle"></span>

              <i
                class="iconfont layer-icon"
                :class="typeIconMap[item.type] || 'icon-danhangwenben'"
              ></i>
              <span class="layer-name">{{ typeLabelMap[item.type] }}</span>
              <span class="layer-id">{{ item.id.slice(-6) }}</span>

              <div class="layer-actions">
                <button
                  class="mini-btn"
                  type="button"
                  title="上移"
                  draggable="false"
                  :disabled="item.index === 0"
                  @click.stop="moveLayer(item, -1)"
                >
                  ^
                </button>
                <button
                  class="mini-btn"
                  type="button"
                  title="下移"
                  draggable="false"
                  :disabled="item.index >= item.siblingCount - 1"
                  @click.stop="moveLayer(item, 1)"
                >
                  v
                </button>
                <button
                  class="mini-btn danger"
                  type="button"
                  title="删除"
                  draggable="false"
                  @click.stop="editorStore.deleteNode(item.id)"
                >
                  x
                </button>
              </div>
            </div>
            <div
              class="layer-tail-drop"
              :class="{ active: layerDropTarget?.anchorId === tailAnchorId }"
              @dragover.prevent="onLayerTailDragOver"
              @drop.prevent="onLayerTailDrop"
            ></div>
          </div>
        </template>

        <template v-else-if="active === 'ai'">
          <div class="ai-chat-panel">
            <section class="ai-section">
              <div class="ai-section-title">AI智能网页生成</div>
              <div class="ai-chat-sub">
                输入一段需求即可生成整页。输入过长时系统会自动压缩重点，避免生成失败。
              </div>

              <el-input
                v-model="aiPageInstruction"
                type="textarea"
                :rows="7"
                placeholder="例如：生成一个科技公司的产品介绍页，整体简洁明亮，首屏有大标题和按钮，下方有产品优势、案例和联系区域。"
                :disabled="previewMode"
              />

              <div class="ai-chat-actions">
                <el-button
                  type="primary"
                  :loading="editorStore.aiPageGenerating"
                  :disabled="previewMode || !aiPageInstruction.trim()"
                  @click="generateAIPage"
                >
                  {{ editorStore.aiPageGenerating ? "生成中..." : "生成整页" }}
                </el-button>
              </div>

              <div v-if="editorStore.aiPageSummary" class="ai-draft">
                <div class="ai-draft-title">生成说明</div>
                <div class="ai-draft-summary">
                  {{ editorStore.aiPageSummary }}
                </div>
              </div>
              <div v-if="editorStore.aiPageError" class="error">
                {{ editorStore.aiPageError }}
              </div>
            </section>

            <section class="ai-section">
              <div class="ai-section-title">AI对话修改</div>
              <div class="ai-chat-sub">
                先在画布中选中一个元素，再通过下方独立输入框继续和 AI 对话修改当前部分。
              </div>

              <div class="ai-node-target" :class="{ empty: !selectedNodeLabel }">
                <span class="ai-node-tag">
                  {{ selectedNodeLabel || "未选择元素" }}
                </span>
                <span v-if="selectedNodeShortId" class="ai-node-id">
                  #{{ selectedNodeShortId }}
                </span>
              </div>

              <el-input
                v-model="aiNodeInstruction"
                type="textarea"
                :rows="4"
                placeholder="例如：把这个按钮改成圆角主按钮，文案改成“立即咨询”，颜色更醒目一些。"
                :disabled="previewMode || !editorStore.selectedNode"
              />

              <div
                v-if="currentNodeConversation.length > 0"
                class="ai-conversation"
              >
                <div
                  v-for="(message, index) in currentNodeConversation"
                  :key="`${message.role}-${index}`"
                  class="ai-message"
                  :class="message.role"
                >
                  <div class="ai-message-role">
                    {{ message.role === "user" ? "你" : "AI" }}
                  </div>
                  <div class="ai-message-content">
                    {{ message.content }}
                  </div>
                </div>
              </div>
              <div v-else class="ai-empty">当前元素还没有对话记录。</div>

              <div class="ai-chat-actions">
                <el-button
                  :loading="editorStore.aiNodeGenerating"
                  :disabled="previewMode || !editorStore.selectedNode || !aiNodeInstruction.trim()"
                  @click="modifySelectedPart"
                >
                  {{ editorStore.aiNodeGenerating ? "修改中..." : "修改选中部分" }}
                </el-button>
                <el-button
                  plain
                  :disabled="!editorStore.selectedNode || currentNodeConversation.length === 0"
                  @click="clearCurrentConversation"
                >
                  清空当前对话
                </el-button>
              </div>

              <div v-if="editorStore.aiNodeSummary" class="ai-draft">
                <div class="ai-draft-title">修改说明</div>
                <div class="ai-draft-summary">
                  {{ editorStore.aiNodeSummary }}
                </div>
              </div>
              <div v-if="editorStore.aiNodeError" class="error">
                {{ editorStore.aiNodeError }}
              </div>
            </section>
          </div>
        </template>
        <div v-else class="placeholder">该面板暂未开放</div>
      </section>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, type Component } from "vue";
import { ChatDotRound, Files, Plus, Search } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import type {
  AIChatMessage,
  EditorNode,
  NodeType,
  PaletteElement,
} from "@wg/schema";
import { paletteElements } from "@/lib/nodes";
import { useEditorStore } from "@/stores/editor";

defineProps<{ previewMode: boolean }>();

const modules: Array<{ key: string; label: string; icon: Component }> = [
  { key: "elements", label: "组件库", icon: Plus },
  { key: "layers", label: "图层", icon: Files },
  { key: "ai", label: "AI智能网页生成", icon: ChatDotRound },
];

const active = ref("elements");
const keyword = ref("");
const aiPageInstruction = ref("");
const aiNodeInstruction = ref("");
const collapsedLayers = ref<Set<string>>(new Set());
const editorStore = useEditorStore();
const nodeConversationMap = ref<Record<string, AIChatMessage[]>>({});

const generateAIPage = async () => {
  const success = await editorStore.generateAIPage({
    instruction: aiPageInstruction.value.trim(),
  });

  if (success) {
    ElMessage.success("AI 网页已生成");
  } else {
    ElMessage.error(editorStore.aiPageError || "网页生成失败");
  }
};

type LayerItem = {
  id: string;
  type: NodeType;
  depth: number;
  parentId: string | null;
  index: number;
  siblingCount: number;
  isContainer: boolean;
};

type LayerDropPlacement = "before" | "after";
type LayerDropTarget = {
  anchorId: string;
  parentId: string | null;
  index: number;
  placement: LayerDropPlacement;
};

type NodeLocation = {
  node: EditorNode;
  parentId: string | null;
  index: number;
};

const tailAnchorId = "__layer-tail__";
const draggingLayerNodeId = ref("");
const layerDropTarget = ref<LayerDropTarget | null>(null);

const typeLabelMap: Record<NodeType, string> = {
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

const typeIconMap = {
  list: "icon-liebiao",
  ...Object.fromEntries(paletteElements.map((item) => [item.type, item.icon])),
} as Record<NodeType, string>;
const currentSelectedNodeId = computed(
  () => editorStore.selectedNode?.id ?? "",
);

const currentNodeConversation = computed(
  () => nodeConversationMap.value[currentSelectedNodeId.value] ?? [],
);

const selectedNodeLabel = computed(() => {
  const node = editorStore.selectedNode;
  return node ? typeLabelMap[node.type] : "";
});

const selectedNodeShortId = computed(() =>
  currentSelectedNodeId.value
    ? currentSelectedNodeId.value.slice(-6)
    : "",
);

const clearCurrentConversation = () => {
  if (!currentSelectedNodeId.value) {
    return;
  }

  const next = { ...nodeConversationMap.value };
  delete next[currentSelectedNodeId.value];
  nodeConversationMap.value = next;
};

const modifySelectedPart = async () => {
  const node = editorStore.selectedNode;
  if (!node) {
    ElMessage.warning("请先选中一个元素");
    return;
  }

  const instruction = aiNodeInstruction.value.trim();
  if (!instruction) {
    ElMessage.warning("请输入修改要求");
    return;
  }

  const history = currentNodeConversation.value;
  const success = await editorStore.modifySelectedNodeWithAI({
    instruction,
    conversation: history,
  });

  if (!success) {
    ElMessage.error(editorStore.aiNodeError || "AI 修改失败");
    return;
  }

  const nextHistory = [
    ...history,
    { role: "user", content: instruction } as AIChatMessage,
    {
      role: "assistant",
      content: editorStore.aiNodeSummary || "已根据要求更新当前元素",
    } as AIChatMessage,
  ].slice(-8);

  nodeConversationMap.value = {
    ...nodeConversationMap.value,
    [node.id]: nextHistory,
  };
  aiNodeInstruction.value = "";
  ElMessage.success("已更新选中元素");
};

const filteredElements = computed(() => {
  const query = keyword.value.trim().toLowerCase();
  if (!query) {
    return paletteElements;
  }

  return paletteElements.filter(
    (item) =>
      item.label.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query),
  );
});

const activeModuleLabel = computed(
  () => modules.find((item) => item.key === active.value)?.label ?? "",
);

const isCollapsed = (id: string) => collapsedLayers.value.has(id);

const toggleLayer = (id: string) => {
  const next = new Set(collapsedLayers.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  collapsedLayers.value = next;
};

const layerItems = computed<LayerItem[]>(() => {
  const result: LayerItem[] = [];

  const walk = (
    nodes: EditorNode[],
    depth: number,
    parentId: string | null,
  ) => {
    nodes.forEach((node, index) => {
      const isContainer = node.type === "container";
      result.push({
        id: node.id,
        type: node.type,
        depth,
        parentId,
        index,
        siblingCount: nodes.length,
        isContainer,
      });

      if (isContainer && !collapsedLayers.value.has(node.id)) {
        walk(node.children, depth + 1, node.id);
      }
    });
  };

  walk(editorStore.doc.root, 0, null);
  return result;
});

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

const findNodeLocation = (
  nodes: EditorNode[],
  nodeId: string,
  parentId: string | null = null,
): NodeLocation | null => {
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    if (!node) {
      continue;
    }

    if (node.id === nodeId) {
      return {
        node,
        parentId,
        index,
      };
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
  toIndex: number,
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
  toIndex: number,
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

const clearLayerDrag = () => {
  draggingLayerNodeId.value = "";
  layerDropTarget.value = null;
};

const resolveRowDropTarget = (
  event: DragEvent,
  item: LayerItem,
): LayerDropTarget | null => {
  const host = event.currentTarget as HTMLElement | null;
  if (!host) {
    return null;
  }

  const rect = host.getBoundingClientRect();
  const placement: LayerDropPlacement =
    event.clientY < rect.top + rect.height / 2 ? "before" : "after";

  return {
    anchorId: item.id,
    parentId: item.parentId,
    index: item.index + (placement === "after" ? 1 : 0),
    placement,
  };
};

const moveLayer = (item: LayerItem, offset: -1 | 1) => {
  const targetIndex = item.index + offset;
  if (targetIndex < 0 || targetIndex >= item.siblingCount) {
    return;
  }
  editorStore.moveNode(item.id, item.parentId, targetIndex);
  editorStore.selectNode(item.id);
};

const onLayerDragStart = (event: DragEvent, item: LayerItem) => {
  if (!event.dataTransfer) {
    return;
  }

  const payload = JSON.stringify({ nodeId: item.id });
  draggingLayerNodeId.value = item.id;
  layerDropTarget.value = null;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("application/x-edit-node", payload);
  event.dataTransfer.setData("text/plain", payload);
};

const onLayerDragOver = (event: DragEvent, item: LayerItem) => {
  const payloadNodeId =
    parseMovePayload(event)?.nodeId ?? draggingLayerNodeId.value;
  if (!payloadNodeId || payloadNodeId === item.id) {
    layerDropTarget.value = null;
    return;
  }

  const target = resolveRowDropTarget(event, item);
  if (
    !target ||
    isInvalidMoveTarget(payloadNodeId, target.parentId, target.index)
  ) {
    layerDropTarget.value = null;
    return;
  }

  event.dataTransfer!.dropEffect = "move";
  layerDropTarget.value = target;
};

const onLayerDrop = (event: DragEvent, item: LayerItem) => {
  const payloadNodeId =
    parseMovePayload(event)?.nodeId ?? draggingLayerNodeId.value;
  const target = resolveRowDropTarget(event, item);
  if (!payloadNodeId || !target) {
    clearLayerDrag();
    return;
  }

  const source = findNodeLocation(editorStore.doc.root, payloadNodeId);
  if (!source) {
    clearLayerDrag();
    return;
  }

  const targetIndex = normalizeMoveIndex(source, target.parentId, target.index);
  if (source.parentId === target.parentId && source.index === targetIndex) {
    clearLayerDrag();
    return;
  }

  editorStore.moveNode(payloadNodeId, target.parentId, targetIndex);
  editorStore.selectNode(payloadNodeId);
  clearLayerDrag();
};

const onLayerTailDragOver = (event: DragEvent) => {
  const payloadNodeId =
    parseMovePayload(event)?.nodeId ?? draggingLayerNodeId.value;
  if (!payloadNodeId) {
    layerDropTarget.value = null;
    return;
  }

  const source = findNodeLocation(editorStore.doc.root, payloadNodeId);
  if (!source) {
    layerDropTarget.value = null;
    return;
  }

  const targetIndex = normalizeMoveIndex(
    source,
    null,
    editorStore.doc.root.length,
  );
  if (source.parentId === null && source.index === targetIndex) {
    layerDropTarget.value = null;
    return;
  }

  event.dataTransfer!.dropEffect = "move";
  layerDropTarget.value = {
    anchorId: tailAnchorId,
    parentId: null,
    index: editorStore.doc.root.length,
    placement: "after",
  };
};

const onLayerTailDrop = (event: DragEvent) => {
  const payloadNodeId =
    parseMovePayload(event)?.nodeId ?? draggingLayerNodeId.value;
  if (!payloadNodeId) {
    clearLayerDrag();
    return;
  }

  const source = findNodeLocation(editorStore.doc.root, payloadNodeId);
  if (!source) {
    clearLayerDrag();
    return;
  }

  const targetIndex = normalizeMoveIndex(
    source,
    null,
    editorStore.doc.root.length,
  );
  if (source.parentId === null && source.index === targetIndex) {
    clearLayerDrag();
    return;
  }

  editorStore.moveNode(payloadNodeId, null, targetIndex);
  editorStore.selectNode(payloadNodeId);
  clearLayerDrag();
};

const onLayerDragEnd = () => {
  clearLayerDrag();
};

const onDragStart = (event: DragEvent, item: PaletteElement) => {
  if (!event.dataTransfer) {
    return;
  }

  const payload = JSON.stringify(item);
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("application/x-edit-element", payload);
  event.dataTransfer.setData("text/plain", payload);
};

void [
  Search,
  typeIconMap,
  filteredElements,
  activeModuleLabel,
  isCollapsed,
  toggleLayer,
  layerItems,
  moveLayer,
  onLayerDragStart,
  onLayerDragOver,
  onLayerDrop,
  onLayerTailDragOver,
  onLayerTailDrop,
  onLayerDragEnd,
  onDragStart,
];
</script>
<style scoped>
.wg-palette {
  --vv-bg: #eceff3;
  --vv-panel: #f3f4f6;
  --vv-card: #ffffff;
  --vv-border: #d5d9df;
  --vv-border-strong: #c6ccd5;
  --vv-text: #2f3440;
  --vv-muted: #667086;
  --vv-primary: #2b6ef5;

  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vv-bg);
  border-right: 1px solid #d8dde5;
}

.panel-header {
  padding: 14px 14px 10px;
  border-bottom: 1px solid #d8dde5;
  background: linear-gradient(180deg, #f7f8fb 0%, #f0f2f5 100%);
}

.panel-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--vv-text);
}

.panel-header p {
  margin: 3px 0 0;
  font-size: 12px;
  color: var(--vv-muted);
}

.panel-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
}

.module-nav {
  border-right: 1px solid #d8dde5;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
}

.module-btn {
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--vv-muted);
  width: 38px;
  height: 38px;
  font-size: 14px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.module-btn:hover {
  background: #e9edf3;
  border-color: #d5dbe3;
  color: var(--vv-text);
}

.module-btn.active {
  background: #dde7ff;
  border-color: #b8cdfc;
  color: #214fb5;
  font-weight: 600;
}

.library-body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 8px 10px 88px;
  overflow-y: auto;
}

.library-title {
  font-size: 13px;
  font-weight: 700;
  color: #2f3440;
  margin: 2px 0 10px;
}

.search {
  margin-bottom: 12px;
}

.search :deep(.el-input__wrapper) {
  border-radius: 8px;
  box-shadow: 0 0 0 1px var(--vv-border) inset;
  background: var(--vv-card);
}

.search :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #9dbaf8 inset;
}

.element-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.element-box {
  border: 1px solid var(--vv-border);
  border-radius: 10px;
  min-height: 82px;
  background: var(--vv-card);
  cursor: grab;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 7px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.element-box:hover {
  border-color: #9dbaf8;
  box-shadow: 0 6px 18px rgba(53, 91, 156, 0.12);
  transform: translateY(-1px);
}

.element-box.disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: #eff4ff;
  display: grid;
  place-items: center;
  color: var(--vv-primary);
}

.iconfont {
  font-size: 18px;
  line-height: 1;
}

.element-text {
  font-size: 12px;
  color: var(--vv-text);
}

.ai-chat-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-section {
  border: 1px solid #d6dde8;
  border-radius: 10px;
  background: #f8fafd;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-section-title {
  font-size: 12px;
  font-weight: 700;
  color: #3d4c67;
}

.ai-chat-sub {
  font-size: 12px;
  color: #6d788f;
}

.ai-options-grid {
  margin: 10px 0;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 10px;
  background: #fafafa;
}

.ai-options-grid :deep(.el-form) {
  width: 100%;
}

.ai-options-grid :deep(.el-form-item) {
  margin-bottom: 10px;
}

.ai-options-grid :deep(.el-select),
.ai-options-grid :deep(.el-color-picker) {
  width: 100%;
}

.section-checklist {
  width: 100%;
}

.section-checklist :deep(.el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

.section-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 100%;
}

.section-row :deep(.el-checkbox) {
  margin-right: 0;
  margin-bottom: 4px;
}

.section-row :deep(.el-checkbox__label) {
  font-size: 12px;
}

.ai-chat-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.ai-chat-actions :deep(.el-button) {
  border-radius: 8px;
  width: 100%;
}

.ai-node-target {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: 1px dashed #c7d6eb;
  background: #f6f9ff;
  border-radius: 10px;
  padding: 10px 12px;
}

.ai-node-target.empty {
  background: #f8fafc;
  border-color: #d7dde8;
}

.ai-node-tag {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: #dbe8ff;
  color: #31588f;
  font-size: 12px;
  font-weight: 700;
}

.ai-node-id {
  font-size: 11px;
  color: #70809a;
}

.ai-conversation {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid #d9e1ef;
  background: #ffffff;
}

.ai-message.user {
  background: #f6f9ff;
}

.ai-message-role {
  font-size: 11px;
  font-weight: 700;
  color: #496aa8;
}

.ai-message-content {
  font-size: 12px;
  line-height: 1.6;
  color: #364256;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-empty {
  border: 1px dashed #d7dde8;
  border-radius: 10px;
  padding: 14px 12px;
  background: #fafbfd;
  font-size: 12px;
  color: #7b879d;
}

.ai-tip {
  width: 100%;
  font-size: 11px;
  color: #738099;
  margin-top: 6px;
  line-height: 1.4;
}

.error {
  color: #c64a4a;
  font-size: 12px;
}

.ai-draft {
  border: 1px solid #d7e2f5;
  border-radius: 10px;
  background: #f6f9ff;
  padding: 10px;
}

.ai-draft-title {
  font-size: 12px;
  color: #496aa8;
  font-weight: 700;
  margin-bottom: 6px;
}

.ai-draft-summary {
  font-size: 12px;
  line-height: 1.6;
  color: #3f4d67;
}

.placeholder {
  min-height: 140px;
  border: 1px dashed #cfd4dc;
  border-radius: 10px;
  background: #f8f9fb;
  color: #738099;
  font-size: 12px;
  display: grid;
  place-items: center;
}

.layer-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.layer-item {
  position: relative;
  min-height: 34px;
  border: 1px solid #d5dce7;
  border-radius: 8px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 6px;
  padding-right: 6px;
  cursor: grab;
  user-select: none;
}

.layer-item:hover {
  border-color: #b9c8e5;
  background: #f9fbff;
}

.layer-item.active {
  border-color: #89a8ea;
  background: #eaf1ff;
}

.layer-item.dragging-source {
  opacity: 0.5;
}

.layer-item.drop-before::before,
.layer-item.drop-after::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: #2b6ef5;
  pointer-events: none;
}

.layer-item.drop-before::before {
  top: -1px;
}

.layer-item.drop-after::after {
  bottom: -1px;
}

.layer-toggle {
  width: 18px;
  height: 18px;
  border: 0;
  background: transparent;
  color: #58647b;
  cursor: pointer;
  padding: 0;
}

.placeholder-toggle {
  display: inline-block;
  width: 18px;
  height: 18px;
}

.layer-icon {
  font-size: 14px;
  color: #5b6ea0;
}

.layer-name {
  font-size: 12px;
  color: #2c3442;
}

.layer-id {
  margin-left: auto;
  font-size: 11px;
  color: #7e8aa3;
}

.layer-actions {
  display: flex;
  gap: 4px;
  cursor: default;
}

.mini-btn {
  width: 20px;
  height: 20px;
  border: 1px solid #d0d8e5;
  border-radius: 6px;
  background: #fff;
  color: #5a6881;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.mini-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.mini-btn.danger:hover {
  border-color: #d88787;
  color: #c34747;
}

.layer-tail-drop {
  height: 14px;
  border: 1px dashed transparent;
  border-radius: 6px;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.layer-tail-drop.active {
  border-color: #94b2f3;
  background: rgba(43, 110, 245, 0.08);
}

@media (max-width: 1360px) {
  .panel-body {
    grid-template-columns: 54px minmax(0, 1fr);
  }

  .module-btn {
    width: 34px;
    height: 34px;
    font-size: 13px;
  }
}
</style>
