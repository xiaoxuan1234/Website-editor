<template>
  <div class="preview-page">
    <div class="header">
      <h1>{{ doc?.title ?? "预览" }}</h1>
      <button
        type="button"
        class="back-link"
        data-testid="preview-back-editor"
        @click="backToEditor"
      >
        返回编辑器
      </button>
    </div>

    <div v-if="loading" class="state">加载中...</div>
    <div v-else-if="error" class="state error">{{ error }}</div>

    <div
      v-else-if="doc"
      class="canvas"
      :class="[`device-${deviceMode}`]"
      :style="canvasStyle"
    >
      <PreviewNode
        v-for="node in doc.root"
        :key="node.id"
        :node="node"
        :device-mode="deviceMode"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import type { PageDocumentV2 } from "@wg/schema";
import PreviewNode from "@/components/PreviewNode.vue";
import { apiClient } from "@/lib/api";
import type { DeviceMode } from "@/lib/style";

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref("");
const doc = ref<PageDocumentV2 | null>(null);

const deviceMode = computed<DeviceMode>(() => {
  const value = String(route.query.device ?? "desktop");
  if (value === "tablet" || value === "mobile") {
    return value;
  }
  return "desktop";
});

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

const canvasStyle = computed(() => {
  const raw = doc.value?.meta?.pageStyle;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      backgroundColor: "#ffffff",
      backgroundImage: "none",
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center center",
      backgroundAttachment: "scroll",
    };
  }
  const style = raw as Record<string, unknown>;
  return {
    backgroundColor: String(style.backgroundColor ?? "#ffffff"),
    backgroundImage: toBackgroundImageValue(style.backgroundImage),
    backgroundSize: String(style.backgroundSize ?? "cover"),
    backgroundRepeat: String(style.backgroundRepeat ?? "no-repeat"),
    backgroundPosition: String(style.backgroundPosition ?? "center center"),
    backgroundAttachment: String(style.backgroundAttachment ?? "scroll"),
  };
});

const backToEditor = async () => {
  const opener = window.opener as Window | null;
  if (opener && !opener.closed) {
    try {
      if (opener.location.origin === window.location.origin) {
        opener.location.href = "/editor";
        opener.focus();
        window.close();
        return;
      }
    } catch {
      // 浏览器安全策略下可能无法读取 opener
    }
  }

  await router.push("/editor");
};

onMounted(async () => {
  const slug = String(route.params.slug ?? "");
  try {
    const payload = await apiClient.getPreview(slug);
    doc.value = payload.document;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "预览加载失败";
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.preview-page {
  min-height: 100%;
  background: #f4f7fb;
  padding: 20px;
  box-sizing: border-box;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.back-link {
  border: 0;
  background: transparent;
  color: #315cb7;
  font-size: 14px;
  cursor: pointer;
}

.back-link:hover {
  text-decoration: underline;
}

h1 {
  margin: 0;
  font-size: 22px;
}

.canvas {
  width: min(1160px, 100%);
  min-height: 360px;
  margin: 0 auto;
  border: 1px solid #d8deea;
  border-radius: 0;
  background: #fff;
  padding: 0;
  box-sizing: border-box;
}

.canvas.device-tablet {
  width: min(860px, 88%);
}

.canvas.device-mobile {
  width: min(440px, 92%);
}

.canvas > :first-child {
  margin-top: 0;
}

.canvas > :last-child {
  margin-bottom: 0;
}

.state {
  text-align: center;
  color: #68748d;
}

.state.error {
  color: #d04f4f;
}
</style>
