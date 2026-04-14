<template>
  <div class="unit-input">
    <el-input
      v-model="inputValue"
      :disabled="disabled || isKeywordUnit"
      :placeholder="placeholder"
      @input="emitValue"
    />
    <el-select v-model="selectedUnit" class="unit-select" :disabled="disabled" @change="emitValue">
      <el-option v-for="unit in unitOptions" :key="unit" :label="unit" :value="unit" />
      <el-option
        v-for="keyword in keywordOptions"
        :key="keyword.value"
        :label="keyword.label"
        :value="keyword.value"
      />
    </el-select>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    disabled?: boolean;
    placeholder?: string;
    units?: string[];
    allowAuto?: boolean;
    allowFitContent?: boolean;
  }>(),
  {
    disabled: false,
    placeholder: "",
    units: () => ["px", "%", "em", "rem", "vw", "vh"],
    allowAuto: false,
    allowFitContent: false,
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const selectedUnit = ref("px");
const inputValue = ref("");
const syncing = ref(false);

const unitOptions = computed(() => props.units);
const keywordOptions = computed(() => {
  const options: Array<{ value: string; label: string }> = [];
  if (props.allowAuto) {
    options.push({ value: "auto", label: "自动" });
  }
  if (props.allowFitContent) {
    options.push({ value: "fit-content", label: "适应内容" });
  }
  return options;
});
const keywordValues = computed(() => keywordOptions.value.map((item) => item.value));
const isKeywordUnit = computed(() => keywordValues.value.includes(selectedUnit.value));
const isCompleteNumber = (value: string) => /^-?\d*\.?\d+$/.test(value);
const isIncompleteNumber = (value: string) =>
  value === "-" || value === "." || value === "-.";

const parseModel = (raw: string) => {
  const value = raw.trim();

  if (keywordValues.value.includes(value)) {
    inputValue.value = "";
    selectedUnit.value = value;
    return;
  }

  const unitGroup = props.units.join("|");
  const match = value.match(new RegExp(`^(-?\\d*\\.?\\d+)\\s*(${unitGroup})$`));

  if (match) {
    inputValue.value = match[1] ?? "";
    selectedUnit.value = match[2] ?? props.units[0] ?? "px";
    return;
  }

  if (/^-?\d*\.?\d+$/.test(value)) {
    inputValue.value = value;
    selectedUnit.value = props.units[0] ?? "px";
    return;
  }

  inputValue.value = value;
  selectedUnit.value = props.units[0] ?? "px";
};

const emitValue = () => {
  if (syncing.value) {
    return;
  }

  if (keywordValues.value.includes(selectedUnit.value)) {
    emit("update:modelValue", selectedUnit.value);
    return;
  }

  const nextValue = inputValue.value.trim();
  if (!nextValue) {
    emit("update:modelValue", "");
    return;
  }

  if (isIncompleteNumber(nextValue)) {
    return;
  }

  if (isCompleteNumber(nextValue)) {
    emit("update:modelValue", `${nextValue}${selectedUnit.value}`);
    return;
  }

  emit("update:modelValue", nextValue);
};

watch(
  () => props.modelValue,
  (value) => {
    syncing.value = true;
    parseModel(value);
    syncing.value = false;
  },
  { immediate: true }
);
</script>

<style scoped>
.unit-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 76px;
  gap: 0;
  align-items: center;
}

.unit-select {
  width: 76px;
}

.unit-input :deep(.el-input__wrapper) {
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
  border-right: 0 !important;
}

.unit-input :deep(.el-select__wrapper) {
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
  margin-left: -1px;
}

.unit-input :deep(.el-input__wrapper.is-focus) {
  position: relative;
  z-index: 2;
}

.unit-input :deep(.el-select__wrapper.is-focused) {
  position: relative;
  z-index: 2;
}
</style>
