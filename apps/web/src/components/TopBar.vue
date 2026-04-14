<template>
  <header class="topbar">
    <div class="project">
      <div class="brand"><span>WG</span></div>
      <div class="project-info">
        <div class="project-name-row">
          <el-dropdown trigger="click" :hide-on-click="false" @command="onProjectMenuCommand">
            <button class="project-switch-btn" type="button" :disabled="projectActionLoading">
              <span class="project-name">项目：{{ currentProjectName }}</span>
              <el-icon class="project-switch-icon"><ArrowDown /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu class="project-dropdown-menu">
                <el-dropdown-item
                  v-for="project in editorStore.projects"
                  :key="project.id"
                  :command="`switch:${project.id}`"
                  :disabled="projectActionLoading || project.id === editorStore.currentProjectId"
                >
                  {{ project.name }}
                </el-dropdown-item>
                <el-dropdown-item
                  divided
                  command="create"
                  :disabled="projectActionLoading"
                >
                  新增项目
                </el-dropdown-item>
                <el-dropdown-item
                  command="rename"
                  :disabled="projectActionLoading || !editorStore.currentProjectId"
                >
                  编辑项目名
                </el-dropdown-item>
                <el-dropdown-item
                  command="delete"
                  :disabled="projectActionLoading || !editorStore.currentProjectId"
                >
                  删除当前项目
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
        <div class="project-meta-line">
          <div class="project-page">页面：{{ editorStore.doc.title || "未命名页面" }}</div>
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
import { ElMessage, ElMessageBox } from "element-plus";
import {
  ArrowDown,
  Cellphone,
  CopyDocument,
  Delete,
  Iphone,
  Monitor,
  RefreshLeft,
  RefreshRight,
} from "@element-plus/icons-vue";
import { computed, ref } from "vue";
import { useEditorStore } from "@/stores/editor";

const editorStore = useEditorStore();
const projectActionLoading = ref(false);

const userInitial = computed(() => (editorStore.user?.username?.slice(0, 1) ?? "U").toUpperCase());
const currentProjectName = computed(
  () => editorStore.currentProject?.name || "未命名项目"
);
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

const runProjectAction = async (action: () => Promise<void>) => {
  if (projectActionLoading.value) {
    return;
  }

  projectActionLoading.value = true;
  try {
    await action();
  } finally {
    projectActionLoading.value = false;
  }
};

const switchProjectById = async (projectId: string) => {
  const target = editorStore.projects.find((project) => project.id === projectId);
  if (!target || target.id === editorStore.currentProjectId) {
    return;
  }

  await runProjectAction(async () => {
    const switched = await editorStore.switchProject(projectId);
    if (!switched) {
      ElMessage.error(editorStore.autoSaveError || "切换项目失败");
      return;
    }
    ElMessage.success(`已切换到项目：${target.name}`);
  });
};

const createProjectFromPrompt = async () => {
  await runProjectAction(async () => {
    const promptResult = await ElMessageBox.prompt("请输入新项目名称", "新增项目", {
      confirmButtonText: "创建并切换",
      cancelButtonText: "取消",
      inputPlaceholder: "例如：官网改版",
      inputValue: "新项目",
    });

    const name = String((promptResult as { value?: string }).value ?? "").trim();
    if (!name) {
      ElMessage.warning("项目名不能为空");
      return;
    }

    const created = await editorStore.createProject(name);
    if (!created) {
      ElMessage.error(editorStore.autoSaveError || "新增项目失败");
      return;
    }

    ElMessage.success(`项目已创建：${created.name}`);
  });
};

const renameCurrentProject = async () => {
  const current = editorStore.currentProject;
  if (!current) {
    ElMessage.warning("当前没有可编辑的项目");
    return;
  }

  await runProjectAction(async () => {
    const promptResult = await ElMessageBox.prompt("请输入新的项目名称", "编辑项目名", {
      confirmButtonText: "保存",
      cancelButtonText: "取消",
      inputPlaceholder: "项目名称",
      inputValue: current.name,
    });

    const name = String((promptResult as { value?: string }).value ?? "").trim();
    if (!name) {
      ElMessage.warning("项目名不能为空");
      return;
    }

    const renamed = await editorStore.renameProject(current.id, name);
    if (!renamed) {
      ElMessage.error("项目名更新失败");
      return;
    }

    ElMessage.success("项目名已更新");
  });
};

const deleteCurrentProject = async () => {
  const current = editorStore.currentProject;
  if (!current) {
    ElMessage.warning("当前没有可删除的项目");
    return;
  }

  await runProjectAction(async () => {
    await ElMessageBox.confirm(
      `确认删除项目「${current.name}」？删除后该项目下页面会一并删除。`,
      "删除项目",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
      }
    );

    const deleted = await editorStore.deleteProject(current.id);
    if (!deleted) {
      ElMessage.error(editorStore.autoSaveError || "删除项目失败");
      return;
    }

    ElMessage.success("项目已删除");
  });
};

const onProjectMenuCommand = async (command: string | number | object) => {
  const value = String(command ?? "");
  if (!value) {
    return;
  }

  try {
    if (value.startsWith("switch:")) {
      await switchProjectById(value.slice("switch:".length));
      return;
    }

    if (value === "create") {
      await createProjectFromPrompt();
      return;
    }

    if (value === "rename") {
      await renameCurrentProject();
      return;
    }

    if (value === "delete") {
      await deleteCurrentProject();
    }
  } catch {
    // MessageBox cancel/close: do nothing.
  }
};

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
  gap: 2px;
  min-width: 0;
}

.project-name-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.project-switch-btn {
  border: 1px solid transparent;
  background: transparent;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  padding: 0;
  color: inherit;
  cursor: pointer;
}

.project-switch-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.project-switch-btn:hover:not(:disabled) .project-name {
  color: #2d5fca;
}

.project-name {
  font-size: 13px;
  font-weight: 700;
  color: #2f3440;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-switch-icon {
  font-size: 12px;
  color: #73809a;
}

.project-sub {
  font-size: 11px;
  color: #7a8396;
}

.project-meta-line {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 16px;
}

.project-page {
  font-size: 11px;
  color: #7a8396;
  max-width: 220px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
