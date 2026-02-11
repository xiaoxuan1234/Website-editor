<template>
  <div class="dispaly">
    <div class="header">
      <i class="iconfont">&#xe7ed;</i>
      <div style="font-weight: bold">显示</div>
      <el-icon
        style="margin-left: auto"
        @click="store.displayShow = !store.displayShow"
      >
        <ArrowUp v-show="store.displayShow" />
        <ArrowDown v-show="!store.displayShow" />
      </el-icon>
    </div>

    <div class="dispaly-form" v-show="store.displayShow">
      <div
        v-for="f in dispalyfields"
        :key="f.key"
        :class="[
          'field',
          {
            full:
              f.type === 'slider' ||
              f.type === 'segmented' ||
              f.type === 'color',
          },
        ]"
      >
        <span class="label">{{ f.label }}</span>

        <el-select
          v-if="f.type === 'select'"
          v-model="store.dispalyform[f.key]"
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

        <el-input
          v-else-if="f.type === 'input'"
          v-model="store.dispalyform[f.key].value"
          style="width: 125px"
          placeholder="auto"
          type="number"
          class="has-unit"
        >
          <template #append>
            <el-select
              style="width: 61px"
              class="unit-select"
              v-model="store.dispalyform[f.key].unit"
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

        <el-slider
          v-else-if="f.type === 'slider'"
          v-model="store.dispalyform[f.key]"
          :min="f.min"
          :max="f.max"
          :step="f.step || 1"
          class="full-width"
          show-input
        />

        <el-segmented
          v-else-if="f.type === 'segmented'"
          v-model="store.dispalyform[f.key]"
          :options="f.options"
          class="full-width"
        />

        <div v-else-if="f.type === 'color'" class="color-row">
          <el-color-picker
            v-model="store.dispalyform[f.key]"
            color-format="hex"
            show-alpha
            :show-hex="true"
          />
          <el-input
            v-model="store.dispalyform[f.key]"
            placeholder="#RRGGBB"
            style="width: 120px"
          />
        </div>
      </div>
    </div>
  </div>

  <div class="typography">
    <div class="header">
      <i class="iconfont">&#xe603;</i>
      <div style="font-weight: bold">排版</div>
      <el-icon
        style="margin-left: auto"
        @click="store.typographyShow = !store.typographyShow"
      >
        <ArrowUp v-show="store.typographyShow" />
        <ArrowDown v-show="!store.typographyShow" />
      </el-icon>
    </div>

    <div class="typography-form" v-show="store.typographyShow">
      <div
        v-for="f in typographyfields"
        :key="f.key"
        :class="[
          'field',
          { full: f.type === 'segmented' || f.type === 'color' },
        ]"
      >
        <span class="label">{{ f.label }}</span>

        <el-select
          v-if="f.type === 'select'"
          v-model="store.typographyform[f.key]"
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

        <el-input
          v-else-if="f.type === 'input'"
          v-model="store.typographyform[f.key].value"
          style="width: 125px"
          type="number"
          class="has-unit"
        >
          <template #append>
            <el-select
              style="width: 61px"
              class="unit-select"
              v-model="store.typographyform[f.key].unit"
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

        <el-segmented
          v-else-if="f.type === 'segmented'"
          v-model="store.typographyform[f.key]"
          :options="f.options"
          class="full-width"
        />

        <div v-else-if="f.type === 'color'" class="color-row">
          <el-color-picker
            v-model="store.typographyform[f.key]"
            color-format="hex"
            show-alpha
            :show-hex="true"
          />
          <el-input
            v-model="store.typographyform[f.key]"
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
const unit = ["px", "%", "vh", "em", "rem"];

type DisplayField =
  | {
      key: string;
      label: string;
      type: "select";
      options: { label: string; value: string }[];
    }
  | { key: string; label: string; type: "input"; options: string[] }
  | {
      key: string;
      label: string;
      type: "slider";
      min: number;
      max: number;
      step?: number;
    }
  | {
      key: string;
      label: string;
      type: "segmented";
      options: { label: string; value: string }[];
    }
  | { key: string; label: string; type: "color" };

const dispalyfields: DisplayField[] = [
  {
    key: "display",
    label: "显示方式",
    type: "select",
    options: [
      { label: "block", value: "block" },
      { label: "inline-block", value: "inline-block" },
      { label: "inline", value: "inline" },
      { label: "flex", value: "flex" },
      { label: "none", value: "none" },
    ],
  },
  {
    key: "position",
    label: "位置",
    type: "select",
    options: [
      { label: "绝对定位", value: "absolute" },
      { label: "相对定位", value: "relative" },
      { label: "吸附", value: "fixed" },
      { label: "默认", value: "static" },
    ],
  },
  { key: "top", label: "顶部", type: "input", options: unit },
  { key: "left", label: "左边", type: "input", options: unit },
  { key: "bottom", label: "底部", type: "input", options: unit },
  { key: "right", label: "右边", type: "input", options: unit },
  {
    key: "float",
    label: "浮动",
    type: "segmented",
    options: [
      { label: "无", value: "none" },
      { label: "左边", value: "left" },
      { label: "右边", value: "right" },
    ],
  },
  {
    key: "opacity",
    label: "透明度",
    type: "slider",
    min: 0,
    max: 1,
    step: 0.05,
  },
  { key: "background", label: "背景颜色", type: "color" },
  { key: "textColor", label: "字体颜色", type: "color" },
];

type TypographyField =
  | {
      key: string;
      label: string;
      type: "select";
      options: { label: string; value: string }[];
    }
  | { key: string; label: string; type: "input"; options: string[] }
  | {
      key: string;
      label: string;
      type: "segmented";
      options: { label: string; value: string }[];
    }
  | { key: string; label: string; type: "color" };

const typographyfields: TypographyField[] = [
  {
    key: "fontSize",
    label: "字体大小",
    type: "input",
    options: ["px", "em", "rem"],
  },
  {
    key: "fontWeight",
    label: "字体粗细",
    type: "select",
    options: [
      { label: "极细", value: "100" },
      { label: "很细", value: "200" },
      { label: "较细", value: "300" },
      { label: "默认", value: "500" },
      { label: "中等", value: "600" },
      { label: "半粗", value: "700" },
      { label: "粗体", value: "800" },
      { label: "加粗", value: "bold" },
    ],
  },
  {
    key: "fontFamily",
    label: "字体",
    type: "select",
    options: [
      { label: "Arial", value: "Arial" },
      { label: "Times New Roman", value: "Times New Roman" },
      { label: "微软雅黑", value: "微软雅黑" },
      { label: "黑体", value: "黑体" },
      { label: "宋体", value: "宋体" },
    ],
  },
  {
    key: "fontStyle",
    label: "字体样式",
    type: "select",
    options: [
      { label: "默认", value: "normal" },
      { label: "斜体", value: "italic" },
    ],
  },
  {
    key: "textAlign",
    label: "文本对齐",
    type: "segmented",
    options: [
      { label: "居左", value: "left" },
      { label: "居中", value: "center" },
      { label: "居右", value: "right" },
    ],
  },
  {
    key: "lineHeight",
    label: "行高",
    type: "input",
    options: ["px", "em", "rem"],
  },
  {
    key: "letterSpacing",
    label: "字间距",
    type: "input",
    options: ["px", "em", "rem"],
  },
  {
    key: "textDecoration",
    label: "文本装饰",
    type: "select",
    options: [
      { label: "默认", value: "none" },
      { label: "下划线", value: "underline" },
      { label: "双下划线", value: "double" },
      { label: "点下划线", value: "dotted" },
      { label: "虚线下划线", value: "dashed" },
      { label: "波浪下划线", value: "wavy" },
      { label: "删除线", value: "line-through" },
      { label: "上划线", value: "overline" },
    ],
  },
  { key: "decorationColor", label: "装饰颜色", type: "color" },
];
</script>

<style scoped>
.dispaly,
.typography {
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

.dispaly-form,
.typography-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 14px;
  padding: 10px;
  padding-top: 5px;
  width: 100%;
}

.field {
  display: flex;
  flex-direction: column;
}

.field.full {
  grid-column: 1 / -1;
}

.full-width {
  width: 100%;
}

.label {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
}

.sel :deep(.el-input__inner),
.sel :deep(.el-select__selected-item) {
  font-size: 12px;
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

.color-row {
  display: flex;
  align-items: center;
  gap: 10px;
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
