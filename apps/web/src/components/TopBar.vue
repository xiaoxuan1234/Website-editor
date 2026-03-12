<template>
  <header class="topbar">
    <div class="project">
      <div class="brand"><span>WG</span></div>
      <div class="project-info">
        <div class="project-name">项目：{{ editorStore.doc.title || "未命名页面" }}</div>
        <div class="project-meta-line">
          <div
            v-if="saveStateText"
            class="save-state"
            :class="{ error: Boolean(editorStore.autoSaveError) }"
          >
            {{ saveStateText }}
          </div>
          <div v-else class="project-sub">协同网页编辑器</div>
        </div>
      </div>
    </div>

    <div class="device-group">
      <button
        class="icon-btn"
        type="button"
        aria-label="桌面"
        :class="{ active: editorStore.deviceMode === 'desktop' }"
        @click="editorStore.setDeviceMode('desktop')"
      >
        <el-icon><Monitor /></el-icon>
      </button>
      <button
        class="icon-btn"
        type="button"
        aria-label="平板"
        :class="{ active: editorStore.deviceMode === 'tablet' }"
        @click="editorStore.setDeviceMode('tablet')"
      >
        <el-icon><Iphone /></el-icon>
      </button>
      <button
        class="icon-btn"
        type="button"
        aria-label="手机"
        :class="{ active: editorStore.deviceMode === 'mobile' }"
        @click="editorStore.setDeviceMode('mobile')"
      >
        <el-icon><Cellphone /></el-icon>
      </button>
    </div>

    <div class="divider"></div>

    <div class="tool-group">
      <button class="icon-btn" type="button" aria-label="撤销" data-testid="topbar-undo" :disabled="!editorStore.canUndo" @click="editorStore.undo()">
        <el-icon><RefreshLeft /></el-icon>
      </button>
      <button class="icon-btn" type="button" aria-label="重做" data-testid="topbar-redo" :disabled="!editorStore.canRedo" @click="editorStore.redo()">
        <el-icon><RefreshRight /></el-icon>
      </button>
      <button class="icon-btn" data-testid="topbar-duplicate" type="button" aria-label="复制" :disabled="!editorStore.selectedNodeId" @click="duplicateSelected()">
        <el-icon><CopyDocument /></el-icon>
      </button>
      <button class="icon-btn danger" data-testid="topbar-delete" type="button" aria-label="删除" :disabled="!editorStore.selectedNodeId" @click="deleteSelected()">
        <el-icon><Delete /></el-icon>
      </button>
    </div>

    <div class="spacer"></div>

    <div class="actions">
      <el-button size="small" data-testid="topbar-create-preview" @click="handlePreview()">预览</el-button>
      <el-button size="small" data-testid="topbar-save" :loading="editorStore.saving" @click="handleSave()">保存</el-button>
      <el-button size="small" data-testid="topbar-publish" type="primary" @click="handlePublish()">发布</el-button>
      <el-button size="small" data-testid="topbar-export-json" @click="editorStore.exportJson()">导出</el-button>
    </div>

    <el-dropdown trigger="click">
      <div class="avatar">{{ userInitial }}</div>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item disabled>{{ editorStore.user?.username ?? "访客" }}</el-dropdown-item>
          <el-dropdown-item divided @click="editorStore.logout()">退出登录</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </header>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import {
  Cellphone,
  CopyDocument,
  Delete,
  Iphone,
  Monitor,
  RefreshLeft,
  RefreshRight,
} from "@element-plus/icons-vue";
import { computed } from "vue";
import { useEditorStore } from "@/stores/editor";

const editorStore = useEditorStore();

const userInitial = computed(() => (editorStore.user?.username?.slice(0, 1) ?? "U").toUpperCase());
const saveStateText = computed(() => {
  if (editorStore.autoSaveError) {
    return editorStore.autoSaveError;
  }
  if (!editorStore.lastSavedAt) {
    return "";
  }
  const date = new Date(editorStore.lastSavedAt);
  if (Number.isNaN(date.getTime())) {
    return "已保存";
  }
  return `已保存 ${date.toLocaleTimeString()}`;
});

const duplicateSelected = () => {
  if (!editorStore.selectedNodeId) {
    return;
  }
  editorStore.duplicateNode(editorStore.selectedNodeId);
};

const deleteSelected = () => {
  if (!editorStore.selectedNodeId) {
    return;
  }
  editorStore.deleteNode(editorStore.selectedNodeId);
};

const toPreviewRoute = (url: string) => {
  const slug = url.split("/").pop();
  return slug ? `/preview/${slug}?device=${editorStore.deviceMode}` : "";
};

const handleSave = async () => {
  try {
    const success = await editorStore.saveNow();
    if (success) {
      ElMessage.success("保存成功");
      return;
    }
    ElMessage.error(editorStore.autoSaveError || "保存失败");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "保存失败");
  }
};

const handlePreview = async () => {
  const previewWindow = window.open("", "_blank");
  try {
    const previewUrl = await editorStore.createPreview();
    if (!previewUrl) {
      previewWindow?.close();
      ElMessage.warning(editorStore.autoSaveError || "预览生成失败");
      return;
    }

    const route = toPreviewRoute(previewUrl);
    if (route) {
      if (previewWindow) {
        previewWindow.location.href = route;
      } else {
        window.open(route, "_blank", "noopener,noreferrer");
      }
    } else if (previewWindow) {
      previewWindow.location.href = previewUrl;
    }
    ElMessage.success("预览已生成");
  } catch (error) {
    previewWindow?.close();
    ElMessage.error(error instanceof Error ? error.message : "预览生成失败");
  }
};

const handlePublish = async () => {
  try {
    const previewUrl = await editorStore.publish();
    if (!previewUrl) {
      ElMessage.warning(editorStore.autoSaveError || "发布失败");
      return;
    }

    ElMessage.success("发布成功");
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : "发布失败");
  }
};
</script>

<style scoped>
.topbar {
  height: 60px;
  border-bottom: 1px solid #dbe1ea;
  border-top: 2px solid #2f75db;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  background: #f9fbfd;
}

.project {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-right: 10px;
  border-right: 1px solid #dde2ea;
  min-width: 245px;
}

.brand {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: linear-gradient(145deg, #4c8fff, #2a6de8);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 700;
}

.project-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.project-name {
  font-size: 13px;
  font-weight: 700;
  color: #2f3440;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-sub {
  font-size: 11px;
  color: #7a8396;
}

.project-meta-line {
  min-height: 16px;
}
.device-group,
.tool-group {
  align-items: center;
  display: flex;
  gap: 6px;
}

.device-group {
  padding: 6px;
  border: 1px solid #dbe1ea;
  border-radius: 10px;
  background: #ffffff;
}

.tool-group {
  padding-left: 2px;
}

.divider {
  width: 1px;
  height: 26px;
  background: #dde3ec;
}

.icon-btn {
  width: 30px;
  height: 30px;
  border: 1px solid #ccd4e1;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #f7f9fc 100%);
  color: #48536a;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.icon-btn:hover:not(:disabled) {
  border-color: #9fb6e8;
  color: #2c5bc0;
  box-shadow: 0 4px 12px rgba(62, 93, 148, 0.15);
  transform: translateY(-1px);
}

.icon-btn.active {
  border-color: #88a8e8;
  color: #2d5fca;
  background: #eaf2ff;
  box-shadow: none;
}

.icon-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.icon-btn.danger:hover:not(:disabled) {
  border-color: #d98d8d;
  color: #c04747;
}

.spacer {
  flex: 1;
}

.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.save-state {
  font-size: 11px;
  color: #5f6b83;
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.save-state.error {
  color: #c14848;
}

.actions :deep(.el-button) {
  height: 34px;
  border-radius: 10px;
  min-width: 76px;
  border-color: #d7dee9;
  color: #3f4d68;
  background: #ffffff;
  font-weight: 600;
}

.actions :deep(.el-button:hover) {
  border-color: #a9bfe7;
  color: #2d58bb;
}

.actions :deep(.el-button--primary) {
  border-color: #2f67d6;
  background: linear-gradient(180deg, #3e79e3 0%, #2f67d6 100%);
  color: #fff;
}

.actions :deep(.el-button--primary:hover),
.actions :deep(.el-button--primary:focus-visible),
.actions :deep(.el-button--primary:active) {
  border-color: #2f67d6;
  background: linear-gradient(180deg, #3e79e3 0%, #2f67d6 100%);
  color: #fff;
  box-shadow: none;
  transform: none;
}

.avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: linear-gradient(145deg, #ffcd8d, #f39f46);
  color: #6b3f08;
  font-size: 12px;
  font-weight: 700;
  display: grid;
  place-items: center;
  cursor: pointer;
  margin-left: 2px;
}

@media (max-width: 1450px) {
  .project {
    min-width: 220px;
  }

  .project-sub {
    display: none;
  }
}
</style>
