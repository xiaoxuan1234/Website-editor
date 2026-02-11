<template>
  <div class="radius">
    <div class="header">
      <i class="iconfont">&#xe672;</i>
      <div style="font-weight: bold">圆角</div>
      <el-icon
        style="margin-left: auto"
        @click="store.radiusShow = !store.radiusShow"
      >
        <ArrowUp v-show="store.radiusShow" />
        <ArrowDown v-show="!store.radiusShow" />
      </el-icon>
    </div>

    <div class="radius-form" v-show="store.radiusShow">
      <div v-for="f in radiusFields" :key="f.key" class="field">
        <span class="label">{{ f.label }}</span>
        <el-input
          v-model="store.radiusform[f.key].value"
          style="width: 125px"
          type="number"
          class="has-unit"
        >
          <template #append>
            <el-select
              style="width: 61px"
              class="unit-select"
              v-model="store.radiusform[f.key].unit"
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
  <div class="background">
    <div class="header">
      <i class="iconfont">&#xe8ba;</i>
      <div style="font-weight: bold">背景</div>
      <el-icon
        style="margin-left: auto"
        @click="store.backgroundShow = !store.backgroundShow"
      >
        <ArrowUp v-show="store.backgroundShow" />
        <ArrowDown v-show="!store.backgroundShow" />
      </el-icon>
    </div>
    <div class="background-form" v-show="store.backgroundShow">
      <span class="label">背景颜色</span>
      <div class="color-row">
        <el-color-picker
          v-model="store.backgroundform['color']"
          color-format="hex"
          show-alpha
          :show-hex="true"
        />
        <el-input
          v-model="store.backgroundform['color']"
          placeholder="#RRGGBB"
          style="width: 120px"
        />
      </div>
      <span class="label">背景图片</span>
      <el-upload
        class="avatar-uploader full-row"
        action="https://run.mocky.io/v3/9d059bf9-4660-45f2-925d-ce80ad6c4d15"
        :show-file-list="false"
        :on-change="handleImageChange"
        accept="image/*"
      >
        <img v-if="imageUrl" :src="imageUrl" class="avatar" />
        <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
      </el-upload>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ArrowDown, ArrowUp, Plus } from "@element-plus/icons-vue";
import { useStyleSetStore } from "../../../stores/styleSet.ts";
import { ref } from "vue";
const store = useStyleSetStore();
const unit = ["px", "%", "em", "rem"];
const imageUrl = ref("");

const handleImageChange = (file: any) => {
  const raw = file?.raw;
  if (raw) {
    imageUrl.value = URL.createObjectURL(raw);
  }
};
type Field = {
  key: string;
  label: string;
  type: "input";
  options: string[];
};
const radiusFields: Field[] = [
  { key: "leftTop", label: "左上", type: "input", options: unit },
  { key: "rightTop", label: "右上", type: "input", options: unit },
  { key: "leftBottom", label: "左下", type: "input", options: unit },
  { key: "rightBottom", label: "右下", type: "input", options: unit },
];
</script>
<style scoped>
.radius,
.background {
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

.radius-form,
.background-form {
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
  grid-column: 1 / -1;
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

.avatar-uploader :deep(.el-upload) {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

.avatar-uploader :deep(.el-upload:hover) {
  border-color: var(--el-color-primary);
}

.avatar-uploader :deep(.avatar-uploader-icon) {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  text-align: center;
}

.avatar-uploader :deep(.avatar) {
  width: 178px;
  height: 178px;
  display: block;
}

.full-row {
  grid-column: 1 / -1;
  justify-self: center;
}
</style>
