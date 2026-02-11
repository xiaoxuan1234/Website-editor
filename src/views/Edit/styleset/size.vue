<template>
  <div class="Size">
    <div class="header">
      <i class="iconfont">&#xe604;</i>
      <div style="font-weight: bold">尺寸</div>
      <el-icon
        style="margin-left: auto"
        @click="store.sizeShow = !store.sizeShow"
      >
        <ArrowUp v-show="store.sizeShow" />
        <ArrowDown v-show="!store.sizeShow" />
      </el-icon>
    </div>

    <div class="Size-form" v-show="store.sizeShow">
      <div v-for="f in sizeFields" :key="f.key" class="field">
        <span class="label">{{ f.label }}</span>
        <el-input
          v-model="store.sizeform[f.key].value"
          style="width: 125px"
          type="number"
          class="has-unit"
        >
          <template #append>
            <el-select
              style="width: 61px"
              class="unit-select"
              v-model="store.sizeform[f.key].unit"
            >
              <el-option
                v-for="opt in f.options"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
          </template>
        </el-input>
      </div>
    </div>
  </div>
  <div class="border">
    <div class="header">
      <i class="iconfont">&#xe87e;</i>
      <div style="font-weight: bold">边框</div>
      <el-icon
        style="margin-left: auto"
        @click="store.borderShow = !store.borderShow"
      >
        <ArrowUp v-show="store.borderShow" />
        <ArrowDown v-show="!store.borderShow" />
      </el-icon>
    </div>

    <div class="border-form" v-show="store.borderShow">
      <div
        v-for="f in borderFields"
        :key="f.key"
        :class="['field', { full: f.type === 'color' }]"
      >
        <span class="label">{{ f.label }}</span>
        <el-input
          v-if="f.type === 'input'"
          v-model="store.borderform[f.key].value"
          style="width: 125px"
          type="number"
          class="has-unit"
        >
          <template #append>
            <el-select
              style="width: 61px"
              class="unit-select"
              v-model="store.borderform[f.key].unit"
            >
              <el-option
                v-for="opt in f.options"
                :key="opt"
                :label="opt"
                :value="opt"
              />
            </el-select>
          </template>
        </el-input>

        <el-select
          v-if="f.type === 'select'"
          v-model="store.borderform[f.key]"
          style="width: 125px"
          class="sel"
        >
          <el-option
            v-for="opt in f.options"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>

        <div v-else-if="f.type === 'color'" class="color-row">
          <el-color-picker
            v-model="store.borderform[f.key]"
            color-format="hex"
            show-alpha
            :show-hex="true"
          />
          <el-input
            v-model="store.borderform[f.key]"
            placeholder="#RRGGBB"
            style="width: 120px"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, ArrowUp } from "@element-plus/icons-vue";
import { useStyleSetStore } from "../../../stores/styleSet.ts";
const store = useStyleSetStore();
const unit = ["px", "%", "vh", "em", "rem", "vw"];

type sizeField = {
  key: string;
  label: string;
  type: "input";
  options: string[];
};

type borderField =
  | {
      key: string;
      label: string;
      type: "input";
      options: string[];
    }
  | { key: string; label: string; type: "color" }
  | {
      key: string;
      label: string;
      type: "select";
      options: { label: string; value: string }[];
    };

const sizeFields: sizeField[] = [
  { key: "width", label: "宽度", type: "input", options: unit },
  { key: "height", label: "高度", type: "input", options: unit },
  { key: "minWidth", label: "最小宽度", type: "input", options: unit },
  { key: "minHeight", label: "最小高度", type: "input", options: unit },
  { key: "maxWidth", label: "最大宽度", type: "input", options: unit },
  { key: "maxHeight", label: "最大高度", type: "input", options: unit },
];

const borderFields: borderField[] = [
  {
    key: "borderWidth",
    label: "边框宽度",
    type: "input",
    options: ["px", "em", "rem", "%"],
  },
  {
    key: "borderStyle",
    label: "边框样式",
    type: "select",
    options: [
      { label: "实线", value: "solid" },
      { label: "无", value: "none" },
      { label: "点线", value: "dotted" },
      { label: "虚线", value: "dashed" },
      { label: "双线", value: "double" },
    ],
  },
  { key: "borderColor", label: "边框颜色", type: "color" },
];
</script>

<style scoped>
.Size,
.border {
  display: flex;
  flex-wrap: wrap;
  margin-top: 10px;
  background-color: #fff;
  border-radius: 10px;
  border: 1px solid #00000028;
  width: 100%;
}

.header {
  display: flex;
  margin: 5px 10px 5px 15px;
  gap: 5px;
  align-items: center;
  width: 100%;
}

.Size-form,
.border-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
  padding: 10px;
  padding-top: 5px;
  width: 100%;
}

.label {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
}

.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.field.full {
  grid-column: 1 / -1;
}

.field {
  display: flex;
  flex-direction: column;
}

:deep(.el-input__wrapper) {
  padding-left: 5px;
  padding-right: 5px;
}

:deep(.el-select__wrapper) {
  padding-left: 8px;
  padding-right: 8px;
  border-radius: 10px;
}

.unit-select :deep(.el-input__inner),
.unit-select :deep(.el-select__selected-item) {
  font-size: 12px;
}

:deep(.el-input__wrapper) {
  border-radius: 10px;
}

.has-unit :deep(.el-input__wrapper) {
  border-radius: 10px 0 0 10px;
}

.has-unit :deep(.el-input-group__append),
.has-unit :deep(.el-select__wrapper) {
  border-radius: 0 10px 10px 0;
}
</style>
