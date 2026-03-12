<template>
  <div class="editor-shell">
    <TopBar />

    <div v-if="editorStore.publishPreviewUrl" class="preview-hint">
      最新预览：
      <a
        data-testid="publish-preview-link"
        :href="toPreviewUrl(editorStore.publishPreviewUrl)"
        target="_blank"
        rel="noreferrer"
      >
        {{ toPreviewUrl(editorStore.publishPreviewUrl) }}
      </a>
    </div>

    <div ref="bodyRef" class="body" :class="{ resizing: Boolean(resizeSide) }" :style="bodyStyle">
      <div class="left"><PalettePanel :preview-mode="editorStore.previewMode" /></div>
      <div
        class="resizer"
        role="separator"
        aria-label="调整左侧面板宽度"
        @mousedown.prevent="startResize('left')"
      ></div>
      <div class="middle"><CanvasPanel /></div>
      <div
        class="resizer"
        role="separator"
        aria-label="调整右侧面板宽度"
        @mousedown.prevent="startResize('right')"
      ></div>
      <div class="right"><PropertyPanel /></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useEditorStore } from "@/stores/editor";
import CanvasPanel from "@/components/CanvasPanel.vue";
import PalettePanel from "@/components/PalettePanel.vue";
import PropertyPanel from "@/components/PropertyPanel.vue";
import TopBar from "@/components/TopBar.vue";

const editorStore = useEditorStore();
const bodyRef = ref<HTMLElement | null>(null);
const leftWidth = ref(320);
const rightWidth = ref(340);
const resizeSide = ref<"left" | "right" | null>(null);

const RESIZER_WIDTH = 8;
const MIN_LEFT = 260;
const MIN_RIGHT = 300;
const MIN_MIDDLE = 480;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const bodyStyle = computed(() => ({
  gridTemplateColumns: `${leftWidth.value}px ${RESIZER_WIDTH}px minmax(0, 1fr) ${RESIZER_WIDTH}px ${rightWidth.value}px`,
}));

const toPreviewUrl = (url: string) => {
  const slug = url.split("/").pop();
  return slug ? `/preview/${slug}?device=${editorStore.deviceMode}` : "/";
};

const isInputLikeTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("input, textarea, [contenteditable='true'], .el-input, .el-textarea"));
};

const handleSaveShortcut = async () => {
  try {
    const success = await editorStore.saveNow();
    if (success) {
      ElMessage.success("保存成功");
      return;
    }
    ElMessage.error("保存失败");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "保存失败");
  }
};

const promptLocalDraftRecovery = async () => {
  if (!editorStore.hasLocalDraftCandidate) {
    return;
  }

  try {
    await ElMessageBox.confirm(
      "检测到上次未成功保存的本地草稿，是否恢复？",
      "恢复草稿",
      {
        confirmButtonText: "恢复",
        cancelButtonText: "丢弃",
        type: "warning",
      }
    );

    const restored = editorStore.restoreLocalDraft();
    if (restored) {
      ElMessage.success("本地草稿已恢复");
    }
  } catch {
    editorStore.discardLocalDraft();
    ElMessage.info("已丢弃本地草稿");
  }
};

const normalizePanelWidths = () => {
  const host = bodyRef.value;
  if (!host) {
    return;
  }

  const total = host.clientWidth;
  const available = total - RESIZER_WIDTH * 2;

  const maxLeftByCurrentRight = available - rightWidth.value - MIN_MIDDLE;
  leftWidth.value = clamp(leftWidth.value, MIN_LEFT, Math.max(MIN_LEFT, maxLeftByCurrentRight));

  const maxRightByCurrentLeft = available - leftWidth.value - MIN_MIDDLE;
  rightWidth.value = clamp(
    rightWidth.value,
    MIN_RIGHT,
    Math.max(MIN_RIGHT, maxRightByCurrentLeft)
  );
};

const onResizeMove = (event: MouseEvent) => {
  if (!resizeSide.value || !bodyRef.value) {
    return;
  }

  const rect = bodyRef.value.getBoundingClientRect();
  const total = rect.width;
  const available = total - RESIZER_WIDTH * 2;

  if (resizeSide.value === "left") {
    const raw = event.clientX - rect.left;
    const max = available - rightWidth.value - MIN_MIDDLE;
    leftWidth.value = clamp(raw, MIN_LEFT, Math.max(MIN_LEFT, max));
    return;
  }

  const raw = rect.right - event.clientX;
  const max = available - leftWidth.value - MIN_MIDDLE;
  rightWidth.value = clamp(raw, MIN_RIGHT, Math.max(MIN_RIGHT, max));
};

const stopResize = () => {
  resizeSide.value = null;
  window.removeEventListener("mousemove", onResizeMove);
  window.removeEventListener("mouseup", stopResize);
};

const startResize = (side: "left" | "right") => {
  if (!bodyRef.value) {
    return;
  }
  resizeSide.value = side;
  window.addEventListener("mousemove", onResizeMove);
  window.addEventListener("mouseup", stopResize);
};

const onWindowResize = () => {
  normalizePanelWidths();
};

const onWindowKeyDown = async (event: KeyboardEvent) => {
  const key = event.key.toLowerCase();
  const useMeta = event.metaKey || event.ctrlKey;
  const typing = isInputLikeTarget(event.target);

  if (useMeta && key === "s") {
    event.preventDefault();
    await handleSaveShortcut();
    return;
  }

  if (typing) {
    return;
  }

  if (useMeta && key === "z" && !event.shiftKey) {
    event.preventDefault();
    editorStore.undo();
    return;
  }

  if ((useMeta && key === "y") || (useMeta && event.shiftKey && key === "z")) {
    event.preventDefault();
    editorStore.redo();
    return;
  }

  if (useMeta && key === "c") {
    if (!editorStore.selectedNodeId) {
      return;
    }
    event.preventDefault();
    editorStore.duplicateNode(editorStore.selectedNodeId);
    ElMessage.success("已复制组件");
    return;
  }

  if ((event.key === "Delete" || event.key === "Backspace") && editorStore.selectedNodeId) {
    event.preventDefault();
    editorStore.deleteNode(editorStore.selectedNodeId);
    ElMessage.success("已删除组件");
  }
};

onMounted(() => {
  window.addEventListener("keydown", onWindowKeyDown);
  window.addEventListener("resize", onWindowResize);
  requestAnimationFrame(() => {
    normalizePanelWidths();
  });
  void promptLocalDraftRecovery();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onWindowKeyDown);
  window.removeEventListener("resize", onWindowResize);
  stopResize();
});
</script>

<style scoped>
.editor-shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #e9edf3;
}

.preview-hint {
  background: #f7f9fc;
  border-bottom: 1px solid #d8dde5;
  padding: 8px 16px;
  font-size: 12px;
  color: #5d6679;
}

.preview-hint a {
  color: #315cb7;
  font-weight: 600;
}

.body {
  flex: 1;
  min-height: 0;
  display: grid;
  gap: 0;
}

.body.resizing {
  user-select: none;
}

.left,
.middle,
.right {
  min-width: 0;
  min-height: 0;
}

.resizer {
  width: 8px;
  cursor: col-resize;
  background: transparent;
  position: relative;
}

.resizer::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background: #d4dbe7;
}

.resizer:hover::before {
  background: #7fa1e2;
}
</style>
