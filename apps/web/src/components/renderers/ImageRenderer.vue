<template>
  <div class="image-wrapper" :class="{ editable }" @click.stop="handleClick">
    <img v-if="src" class="image" :src="src" :alt="alt" :loading="loadingMode" :style="imageStyle" />
    <div v-else class="placeholder">
      <div class="placeholder-mark">图片</div>
      <div class="placeholder-text">点击上传替换图片</div>
    </div>

    <input ref="fileRef" class="file-input" type="file" accept="image/*" @change="onFileChange" />
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { computed, ref, type CSSProperties } from "vue";
import { useRoute } from "vue-router";
import type { EditorNode } from "@wg/schema";
import { useEditorStore } from "@/stores/editor";

const props = defineProps<{ node: EditorNode }>();

const editorStore = useEditorStore();
const route = useRoute();
const fileRef = ref<HTMLInputElement | null>(null);

const src = computed(() => (props.node.props.src as string) || "");
const alt = computed(() => (props.node.props.alt as string) || "图片");
const fit = computed(() => {
  const value = String(props.node.props.fit ?? "cover");
  return ["cover", "contain", "fill", "none", "scale-down"].includes(value)
    ? value
    : "cover";
});
const position = computed(() => String(props.node.props.position ?? "center center"));
const loadingMode = computed<"lazy" | "eager">(() =>
  props.node.props.loading === "eager" ? "eager" : "lazy"
);
const imageStyle = computed<CSSProperties>(() => ({
  objectFit: fit.value as CSSProperties["objectFit"],
  objectPosition: position.value as CSSProperties["objectPosition"],
}));
const editable = computed(() => !editorStore.previewMode && !route.path.startsWith("/preview/"));

const handleClick = () => {
  if (!editable.value) {
    return;
  }

  if (editorStore.selectedNodeId !== props.node.id) {
    editorStore.selectNode(props.node.id);
    return;
  }

  fileRef.value?.click();
};

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    ElMessage.warning("只能上传图片文件");
    input.value = "";
    return;
  }

  if (file.size > 8 * 1024 * 1024) {
    ElMessage.warning("图片大小不能超过 8MB");
    input.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result ?? "");
    if (!dataUrl) {
      ElMessage.error("图片读取失败");
      input.value = "";
      return;
    }

    editorStore.selectNode(props.node.id);
    editorStore.updateSelectedProps({
      src: dataUrl,
      alt: alt.value || file.name,
    });
    ElMessage.success("图片已更新");
    input.value = "";
  };

  reader.onerror = () => {
    ElMessage.error("图片读取失败");
    input.value = "";
  };

  reader.readAsDataURL(file);
};
</script>

<style scoped>
.image-wrapper {
  width: 100%;
  height: 100%;
  min-width: 0;
  max-width: 100%;
  min-height: 0;
  border: 1px solid #cad4e3;
  border-radius: inherit;
  overflow: hidden;
  background: transparent;
  box-sizing: border-box;
}

.image-wrapper.editable {
  cursor: pointer;
}

.image-wrapper.editable:hover {
  border-color: #9fb8e8;
  box-shadow: 0 0 0 2px rgba(69, 111, 194, 0.12);
}

.image {
  width: 100%;
  height: 100%;
  min-height: 0;
  object-fit: cover;
  display: block;
}

.placeholder {
  min-height: 150px;
  height: 100%;
  display: grid;
  place-items: center;
  gap: 4px;
  background: transparent;
}

.placeholder-mark {
  font-size: 13px;
  color: #5f6d86;
  font-weight: 700;
}

.placeholder-text {
  font-size: 11px;
  color: #8a96ac;
}

.file-input {
  display: none;
}
</style>
