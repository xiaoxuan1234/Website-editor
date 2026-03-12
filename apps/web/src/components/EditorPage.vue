<template>
  <div class="editor-page">
    <div v-if="editorStore.loading" class="state">加载工作区...</div>
    <EditorShell v-else-if="editorStore.initialized" />
    <div v-else class="state">初始化失败，请重新登录</div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import EditorShell from "@/components/EditorShell.vue";
import { useEditorStore } from "@/stores/editor";

const router = useRouter();
const editorStore = useEditorStore();

onMounted(async () => {
  if (!editorStore.initialized) {
    await editorStore.boot();
  }

  if (!editorStore.isAuthed || !editorStore.initialized) {
    await router.replace("/login");
  }
});
</script>

<style scoped>
.editor-page {
  height: 100%;
}

.state {
  height: 100%;
  display: grid;
  place-items: center;
  color: #69758d;
}
</style>
