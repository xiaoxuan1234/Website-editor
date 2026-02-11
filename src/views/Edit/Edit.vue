<template>
  <div class="common-layout">
    <el-container>
      <el-header>
        <Header_edit />
      </el-header>
      <el-container>
        <el-aside width="280px"><module /></el-aside>
        <el-main>Main</el-main>
        <el-aside width="310px"><style-set /></el-aside>
      </el-container>
    </el-container>
  </div>
</template>
<script setup lang="ts">
import Header_edit from "./header.vue";
import module from "./module.vue";
import StyleSet from "./styleset/StyleSet.vue";
</script>
<style scoped>
.common-layout {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.common-layout :deep(.el-container) {
  height: 100%;
}

.el-header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #0000002c;
}

.common-layout :deep(.el-main),
.common-layout :deep(.el-aside) {
  overflow: hidden;
}

.common-layout :deep(.el-main) {
  padding: 0;
}
</style>
