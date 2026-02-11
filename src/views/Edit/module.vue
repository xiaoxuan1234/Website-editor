<template>
  <div class="body">
    <div class="module">
      <el-menu
        class="module-menu"
        default-active="elements"
        background-color="transparent"
        text-color="#6b7280"
        active-text-color="#2b6ef5"
        @select="handleSelect"
      >
        <el-menu-item index="elements">
          <el-icon><Plus /></el-icon>
          <span>元素</span>
        </el-menu-item>
        <el-menu-item index="layers">
          <el-icon><Files /></el-icon>
          <span>图层</span>
        </el-menu-item>
        <el-menu-item index="media">
          <el-icon><Picture /></el-icon>
          <span>媒体库</span>
        </el-menu-item>
        <el-menu-item index="pages">
          <el-icon><Document /></el-icon>
          <span>站点页面</span>
        </el-menu-item>
        <el-menu-item index="settings">
          <el-icon><Setting /></el-icon>
          <span>项目设置</span>
        </el-menu-item>
      </el-menu>
    </div>

    <div class="element">
      <div v-show="active === 'elements'">
        <div
          class="element-box"
          v-for="value in store.elements"
          :key="value.text"
          draggable="true"
        >
          <i class="iconfont" :class="value.icon"></i>
          <div style="font-size: 12px">{{ value.text }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Document,
  Files,
  Picture,
  Plus,
  Setting,
} from "@element-plus/icons-vue";
import { ref } from "vue";
import { usemoduleStore } from "../../stores/module";

const active = ref("elements");
const store = usemoduleStore();

const handleSelect = (index: string) => {
  active.value = index;
};
</script>

<style scoped>
.module {
  width: 300px;
  padding: 8px 8px;
}

.module-menu {
  border-right: none;
  overflow: hidden;
  width: 100%;
}

.module-menu :deep(.el-menu) {
  border-right: none;
  width: 100%;
}

.module-menu :deep(.el-menu-item) {
  height: 40px;
  line-height: 40px;
  border-radius: 10px;
  margin: 4px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  width: 100%;
  box-sizing: border-box;
}

.module-menu :deep(.el-menu-item.is-active) {
  background: #dbe9ff;
  color: #2b6ef5;
}

.module-menu :deep(.el-menu-item .el-icon) {
  background: #eaf1ff;
  color: #2b6ef5;
  width: 22px;
  height: 22px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  font-size: 14px;
  flex: 0 0 22px;
}

.module-menu :deep(.el-menu-item.is-active .el-icon) {
  background: #2b6ef5;
  color: #ffffff;
}

.element {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 0px 12px;
  margin-bottom: 80px;
  padding-top: 10px;
  border-top: 1px solid #00000027;
}

.element > div {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin: 0 5px 0 15px;
}

.element-box {
  width: 100px;
  height: 70px;
  border: 1px solid #cac9c9;
  border-radius: 5px;
  display: grid;
  place-items: center;
  font-size: 14px;
  cursor: grab;
}

.element-box:hover {
  border: 1px solid #2b6ef5;
  background-color: #2b6ef51f;
}

.iconfont {
  width: 36px;
  height: 36px;
  border-radius: 5px;
  margin-top: 5px;
  display: grid;
  place-items: center;
  background: #eaf1ff;
  color: #2b6ef5;
  font-size: 18px;
  line-height: 2;
}

.body {
  display: flex;
  flex-direction: column;
  height: 100%;
  border-right: 1px solid #eef2f6;
  background: #f8f9fa;
}
</style>
