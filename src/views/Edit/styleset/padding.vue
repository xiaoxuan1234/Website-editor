<template>
  <div class="margin">
    <div class="header">
      <i class="iconfont icon">&#xe7e0;</i>
      <div style="font-weight: bold">外边距</div>
      <el-icon
        style="margin-left: auto"
        @click="store.marginShow = !store.marginShow"
      >
        <ArrowUp v-show="store.marginShow" />
        <ArrowDown v-show="!store.marginShow" />
      </el-icon>
    </div>

    <div class="margin-form" v-show="store.marginShow">
      <div v-for="f in marginFields" :key="f.key" class="field">
        <span class="label">{{ f.label }}</span>
        <el-input
          v-model="store.marginform[f.key].value"
          style="width: 125px"
          type="number"
          class="has-unit"
        >
          <template #append>
            <el-select
              style="width: 61px"
              class="unit-select"
              v-model="store.marginform[f.key].unit"
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
  <div class="padding">
    <div class="header">
      <i class="iconfont icon">&#xe63b;</i>
      <div style="font-weight: bold">内边距</div>
      <el-icon
        style="margin-left: auto"
        @click="store.paddingShow = !store.paddingShow"
      >
        <ArrowUp v-show="store.paddingShow" />
        <ArrowDown v-show="!store.paddingShow" />
      </el-icon>
    </div>

    <div class="padding-form" v-show="store.paddingShow">
      <div v-for="f in paddingFields" :key="f.key" class="field">
        <span class="label">{{ f.label }}</span>
        <el-input
          v-model="store.paddingform[f.key].value"
          style="width: 125px"
          type="number"
          class="has-unit"
        >
          <template #append>
            <el-select
              style="width: 61px"
              class="unit-select"
              v-model="store.paddingform[f.key].unit"
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
</template>
<script setup lang="ts">
import { ArrowDown, ArrowUp } from "@element-plus/icons-vue";
import { useStyleSetStore } from "../../../stores/styleSet.ts";
const store = useStyleSetStore();
const unit = ["px", "%", "em", "rem"];

type Field = {
  key: string;
  label: string;
  type: "input";
  options: string[];
};
const marginFields: Field[] = [
  { key: "top", label: "上", type: "input", options: unit },
  { key: "left", label: "左", type: "input", options: unit },
  { key: "bottom", label: "下", type: "input", options: unit },
  { key: "right", label: "右", type: "input", options: unit },
];

const paddingFields: Field[] = [
  { key: "top", label: "上", type: "input", options: unit },
  { key: "left", label: "左", type: "input", options: unit },
  { key: "bottom", label: "下", type: "input", options: unit },
  { key: "right", label: "右", type: "input", options: unit },
];
</script>
<style scoped>
.margin,
.padding {
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

.margin-form,
.padding-form {
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
