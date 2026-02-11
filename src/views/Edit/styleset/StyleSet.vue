<template>
  <div class="body">
    <div class="SytleSet">
      <el-tabs v-model="store.activeName" class="tabs" stretch>
        <el-tab-pane label="显示-排版" name="dispaly"></el-tab-pane>
        <el-tab-pane label="尺寸-边框" name="size"></el-tab-pane>
        <el-tab-pane label="外边距-内边距" name="padding"></el-tab-pane>
        <el-tab-pane label="圆角-背景" name="radius"></el-tab-pane>
      </el-tabs>
      <div class="Set-header">
        <div class="dan"></div>
        <div class="activeName">
          {{ store.activeElem }}
        </div>
        <div class="activeID">
          {{ store.activeID }}
        </div>
      </div>
    </div>
    <div class="Set">
      <div>
        <div class="Set-body">
          <component :is="activeComponent" />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import display from "./display.vue";
import size from "./size.vue";
import radius from "./radius.vue";
import padding from "./padding.vue";
import { useStyleSetStore } from "../../../stores/styleSet.ts";

const store = useStyleSetStore();
type TabKey = "dispaly" | "size" | "padding" | "radius";
const map: Record<TabKey, typeof display> = {
  dispaly: display,
  size,
  padding,
  radius,
};
const activeComponent = computed(() => map[store.activeName]);
</script>
<style scoped>
.body {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8f9fa;
  border-left: 1px solid #eef2f6;
}

.SytleSet {
  width: 300px;
}

.tabs {
  width: 100%;
}

.tabs :deep(.el-tabs__header),
.tabs :deep(.el-tabs__nav-wrap) {
  width: 100%;
}

.tabs :deep(.el-tabs__header) {
  margin: 0;
}

.tabs :deep(.el-tabs__item) {
  font-weight: bold;
  padding: 0px 5px;
}

.Set {
  flex: 1 1 auto;
  overflow-y: auto;
  margin: 0;
}

.Set-body {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  padding: 0px 12px;
  margin-bottom: 70px;
}

.Set-header {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  background-color: #fff;
}

.dan {
  background-color: #7faff4;
  width: 8px;
  height: 8px;
  margin: 0px 10px 0px 20px;
  border-radius: 30px;
}

.activeName {
  font-weight: bold;
  width: 140px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.activeID {
  color: #b8b9b9;
  font-size: 12px;
  margin-left: auto;
  margin-right: 20px;
  max-width: 90px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
