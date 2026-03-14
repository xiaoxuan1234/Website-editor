<template>
  <div class="ai-panel">
    <h4>AI 文案</h4>

    <div v-if="!supported" class="hint">当前组件类型不支持 AI 文案生成</div>

    <template v-else>
      <el-input
        v-model="instruction"
        data-testid="ai-instruction"
        type="textarea"
        :rows="4"
        placeholder="输入你的需求，例如：改成更有行动力的按钮文案"
        :disabled="disabled"
      />

      <div class="options">
        <el-input v-model="tone" placeholder="语气（可选）" :disabled="disabled" />
        <el-input v-model="length" placeholder="长度（可选）" :disabled="disabled" />
        <el-input v-model="language" placeholder="语言（可选）" :disabled="disabled" />
        <el-input
          v-model="keywords"
          placeholder="关键词，逗号分隔（可选）"
          :disabled="disabled"
        />
      </div>

      <el-button
        type="primary"
        plain
        data-testid="ai-generate"
        :disabled="disabled || !instruction.trim()"
        @click="handleGenerate"
      >
        生成草案
      </el-button>

      <div v-if="editorStore.aiError" class="error">{{ editorStore.aiError }}</div>

      <div v-if="editorStore.aiDraft" class="draft" data-testid="ai-draft">
        <h5>草案差异预览</h5>
        <div
          v-for="(nextValue, key) in editorStore.aiDraft.proposedProps"
          :key="key"
          class="diff-row"
        >
          <div class="diff-key">{{ key }}</div>
          <div class="diff-before">{{ getCurrentValue(key) }}</div>
          <div class="diff-arrow">→</div>
          <div class="diff-after">{{ String(nextValue) }}</div>
        </div>

        <div class="summary">{{ editorStore.aiDraft.reasoningSummary }}</div>

        <div class="actions">
          <el-button
            type="primary"
            data-testid="ai-apply"
            :disabled="disabled"
            @click="editorStore.applyAIDraft()"
          >
            应用
          </el-button>
          <el-button data-testid="ai-reject" :disabled="disabled" @click="editorStore.rejectAIDraft()">
            拒绝
          </el-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useEditorStore } from "@/stores/editor";

const props = defineProps<{
  disabled: boolean;
  supported: boolean;
}>();

const editorStore = useEditorStore();

const instruction = ref("");
const tone = ref("");
const length = ref("");
const language = ref("");
const keywords = ref("");

const keywordList = computed(() =>
  keywords.value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
);

const getCurrentValue = (key: string) => {
  const node = editorStore.selectedNode;
  if (!node) {
    return "";
  }
  const value = node.props[key as keyof typeof node.props];
  return value === undefined ? "" : String(value);
};

const handleGenerate = async () => {
  await editorStore.generateAIDraft({
    instruction: instruction.value,
    tone: tone.value || undefined,
    length: length.value || undefined,
    language: language.value || undefined,
    keywords: keywordList.value.length > 0 ? keywordList.value : undefined,
  });
};
</script>

<style scoped>
.ai-panel {
  border-top: 1px solid #edf1f7;
  margin-top: 16px;
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

h4 {
  margin: 0;
  font-size: 14px;
}

.options {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.hint {
  color: #7b879f;
  font-size: 12px;
}

.error {
  color: #d04f4f;
  font-size: 12px;
}

.draft {
  border: 1px solid #dae3f2;
  border-radius: 10px;
  background: #f7f9ff;
  padding: 10px;
}

h5 {
  margin: 0 0 8px;
  font-size: 13px;
}

.diff-row {
  display: grid;
  grid-template-columns: 64px 1fr auto 1fr;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
}

.diff-key {
  color: #5a6888;
}

.diff-before {
  color: #7a8296;
  text-decoration: line-through;
}

.diff-after {
  color: #1f6e43;
  font-weight: 600;
}

.summary {
  margin-top: 8px;
  font-size: 12px;
  color: #5f6a80;
}

.actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
}
</style>
