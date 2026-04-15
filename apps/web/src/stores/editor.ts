import { computed, ref } from "vue";
import { defineStore } from "pinia";
import {
  createAddNodeCommand,
  createDeleteNodeCommand,
  createDuplicateNodeCommand,
  createHistoryState,
  createMoveNodeCommand,
  createReplaceNodeCommand,
  createUpdateDocumentMetaCommand,
  createUpdateNodePropsCommand,
  createUpdateNodeStyleCommand,
  executeCommand,
  findNodeById,
  redoCommand,
  undoCommand,
  type EditorState,
  type HistoryState,
} from "@wg/editor-core";
import type {
  AIChatMessage,
  EditorNode,
  NodeType,
  PageDocumentV2,
  PageSummary,
  Project,
} from "@wg/schema";
import { ApiError, apiClient, type AuthTokens } from "@/lib/api";
import { createNode, createNodeId } from "@/lib/nodes";
import {
  mergeResponsiveStylePatch,
  resolveNodeStyleByDevice,
  type DeviceMode as ResponsiveDeviceMode,
  type StyleRecord,
} from "@/lib/style";

type User = {
  id: string;
  username: string;
};

type DeviceMode = ResponsiveDeviceMode;
type PageStyle = Record<string, string | number | boolean | null>;
type LocalDraftEntry = {
  pageId: string;
  savedAt: string;
  document: PageDocumentV2;
};

const AUTH_STORAGE_KEY = "wg_auth_v2";
const LOCAL_DRAFT_KEY = "wg_local_draft_v2";

const createEmptyDoc = (): PageDocumentV2 => ({
  id: "",
  projectId: "",
  title: "",
  status: "draft",
  version: 1,
  updatedAt: new Date().toISOString(),
  root: [],
  meta: {},
});

export const useEditorStore = defineStore("editor", () => {
  const user = ref<User | null>(null);
  const tokens = ref<AuthTokens | null>(null);
  const projects = ref<Project[]>([]);
  const pages = ref<PageSummary[]>([]);
  const currentProjectId = ref<string>("");
  const currentPageId = ref<string>("");
  const doc = ref<PageDocumentV2>(createEmptyDoc());
  const selectedNodeId = ref<string>("");
  const previewMode = ref(false);
  const deviceMode = ref<DeviceMode>("desktop");
  const styleScope = ref<DeviceMode>("desktop");
  const loading = ref(false);
  const saving = ref(false);
  const initialized = ref(false);
  const publishPreviewUrl = ref<string>("");
  const aiPageSummary = ref<string>("");
  const aiPageError = ref<string>("");
  const aiPageGenerating = ref(false);
  const aiNodeSummary = ref<string>("");
  const aiNodeError = ref<string>("");
  const aiNodeGenerating = ref(false);
  const autoSaveError = ref<string>("");
  const lastSavedAt = ref<string>("");
  const localDraftCandidate = ref<LocalDraftEntry | null>(null);

  const history = ref<HistoryState>(createHistoryState());

  let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
  let propsCommitTimer: ReturnType<typeof setTimeout> | null = null;
  let styleCommitTimer: ReturnType<typeof setTimeout> | null = null;
  let isFlushingPending = false;
  const pendingPropsPatch = ref<{
    nodeId: string;
    patch: Record<string, unknown>;
  } | null>(null);
  const pendingStylePatch = ref<{
    nodeId: string;
    patch: StyleRecord;
  } | null>(null);

  const selectedNode = computed<EditorNode | null>(() => {
    if (!selectedNodeId.value) {
      return null;
    }
    return findNodeById(doc.value, selectedNodeId.value);
  });

  const pageStyle = computed<PageStyle>(() => {
    const raw = doc.value.meta?.pageStyle;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return {};
    }
    return raw as PageStyle;
  });

  const getNodeStyleByMode = (
    node: EditorNode,
    mode: DeviceMode = deviceMode.value,
  ) => resolveNodeStyleByDevice(node, mode);

  const canUndo = computed(() => history.value.canUndo);
  const canRedo = computed(() => history.value.canRedo);
  const isAuthed = computed(() => Boolean(tokens.value?.accessToken));
  const hasLocalDraftCandidate = computed(() =>
    Boolean(localDraftCandidate.value),
  );
  const currentProject = computed<Project | null>(() => {
    const projectId = currentProjectId.value;
    if (!projectId) {
      return null;
    }
    return projects.value.find((project) => project.id === projectId) ?? null;
  });

  const cloneDoc = (value: PageDocumentV2): PageDocumentV2 =>
    JSON.parse(JSON.stringify(value)) as PageDocumentV2;

  const readLocalDraftMap = (): Record<string, LocalDraftEntry> => {
    const raw = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (!raw) {
      return {};
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, LocalDraftEntry>;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {};
      }
      return parsed;
    } catch {
      return {};
    }
  };

  const writeLocalDraftMap = (value: Record<string, LocalDraftEntry>) => {
    localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(value));
  };

  const saveLocalDraftSnapshot = (pageId: string, document: PageDocumentV2) => {
    const map = readLocalDraftMap();
    map[pageId] = {
      pageId,
      savedAt: new Date().toISOString(),
      document: cloneDoc(document),
    };
    writeLocalDraftMap(map);
    localDraftCandidate.value = map[pageId] ?? null;
  };

  const clearLocalDraftSnapshot = (pageId: string) => {
    const map = readLocalDraftMap();
    if (!map[pageId]) {
      return;
    }
    delete map[pageId];
    writeLocalDraftMap(map);
  };

  const syncLocalDraftCandidate = (
    pageId: string,
    serverDoc: PageDocumentV2,
  ) => {
    const map = readLocalDraftMap();
    const candidate = map[pageId];
    if (!candidate) {
      localDraftCandidate.value = null;
      return;
    }

    const localRaw = JSON.stringify(candidate.document);
    const remoteRaw = JSON.stringify(serverDoc);
    localDraftCandidate.value = localRaw === remoteRaw ? null : candidate;
  };

  const persistAuth = () => {
    if (!user.value || !tokens.value) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        user: user.value,
        tokens: tokens.value,
      }),
    );
  };

  const restoreAuth = () => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { user: User; tokens: AuthTokens };
      user.value = parsed.user;
      tokens.value = parsed.tokens;
    } catch {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const clearAuth = () => {
    user.value = null;
    tokens.value = null;
    persistAuth();
  };

  const clearAutoSaveTimer = () => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
  };

  const ensureToken = () => {
    if (!tokens.value) {
      throw new ApiError("未登录", 401, "UNAUTHORIZED");
    }

    return tokens.value.accessToken;
  };

  const isUnauthorizedError = (error: unknown): error is ApiError =>
    error instanceof ApiError && error.status === 401;

  const withRefresh = async <T>(
    action: (token: string) => Promise<T>,
  ): Promise<T> => {
    const accessToken = ensureToken();

    try {
      return await action(accessToken);
    } catch (error) {
      if (!tokens.value || !isUnauthorizedError(error)) {
        throw error;
      }

      try {
        const refreshed = await apiClient.refresh(tokens.value.refreshToken);
        tokens.value = refreshed;
        persistAuth();

        return await action(refreshed.accessToken);
      } catch (refreshError) {
        clearAuth();
        throw refreshError;
      }
    }
  };

  const resetHistory = () => {
    history.value = createHistoryState();
  };

  const touchDocument = () => {
    doc.value.updatedAt = new Date().toISOString();
    doc.value.status = "draft";
  };

  const createDraftDocumentSnapshot = (
    source: PageDocumentV2 = doc.value,
  ): PageDocumentV2 => ({
    ...cloneDoc(source),
    id: currentPageId.value || source.id,
    projectId: currentProjectId.value || source.projectId,
    status: "draft",
    updatedAt: new Date().toISOString(),
  });

  const applyDocumentState = (nextDoc: PageDocumentV2) => {
    doc.value = cloneDoc(nextDoc);
    selectedNodeId.value = doc.value.root[0]?.id ?? "";
    resetHistory();
  };

  const toPageSummary = (page: {
    id: string;
    projectId: string;
    title: string;
    status: "draft" | "published";
    version: number;
    updatedAt: string;
  }): PageSummary => ({
    id: page.id,
    projectId: page.projectId,
    title: page.title,
    status: page.status,
    version: page.version,
    updatedAt: page.updatedAt,
  });

  const ensureProjectPages = async (projectId: string): Promise<PageSummary[]> => {
    const detail = await withRefresh((token) => apiClient.getProject(token, projectId));
    if (detail.pages.length > 0) {
      return detail.pages;
    }

    const createdPage = await withRefresh((token) =>
      apiClient.createPage(token, projectId, "棣栭〉"),
    );

    return [toPageSummary(createdPage)];
  };

  const clearPendingTimers = () => {
    if (propsCommitTimer) {
      clearTimeout(propsCommitTimer);
      propsCommitTimer = null;
    }
    if (styleCommitTimer) {
      clearTimeout(styleCommitTimer);
      styleCommitTimer = null;
    }
  };

  const applyResponsiveStylePatch = (nodeId: string, patch: StyleRecord) => {
    if (styleScope.value === "desktop") {
      executeCommand(
        { doc: doc.value },
        history.value,
        createUpdateNodeStyleCommand(nodeId, patch),
      );
      touchDocument();
      queueAutoSave();
      return;
    }

    const node = findNodeById(doc.value, nodeId);
    if (!node) {
      return;
    }

    const responsiveStyle = mergeResponsiveStylePatch(
      node,
      styleScope.value,
      patch,
    );
    executeCommand(
      { doc: doc.value },
      history.value,
      createUpdateNodePropsCommand(nodeId, { responsiveStyle }),
    );
    touchDocument();
    queueAutoSave();
  };

  const flushPendingEdits = () => {
    if (isFlushingPending) {
      return;
    }

    isFlushingPending = true;
    clearPendingTimers();
    try {
      const propsEntry = pendingPropsPatch.value;
      pendingPropsPatch.value = null;
      if (propsEntry) {
        const node = findNodeById(doc.value, propsEntry.nodeId);
        if (node) {
          executeCommand(
            { doc: doc.value },
            history.value,
            createUpdateNodePropsCommand(propsEntry.nodeId, propsEntry.patch),
          );
          touchDocument();
          queueAutoSave();
        }
      }

      const styleEntry = pendingStylePatch.value;
      pendingStylePatch.value = null;
      if (styleEntry) {
        applyResponsiveStylePatch(styleEntry.nodeId, styleEntry.patch);
      }
    } finally {
      isFlushingPending = false;
    }
  };

  const queueAutoSave = () => {
    if (!currentPageId.value || !tokens.value) {
      return;
    }

    const pageId = currentPageId.value;
    const projectId = currentProjectId.value;

    clearAutoSaveTimer();

    autoSaveTimer = setTimeout(async () => {
      if (pageId !== currentPageId.value) {
        return;
      }

      try {
        saving.value = true;
        const payload = createDraftDocumentSnapshot({
          ...doc.value,
          id: pageId,
          projectId,
        });
        const saved = await withRefresh((token) =>
          apiClient.saveDraft(token, pageId, payload),
        );
        autoSaveError.value = "";
        lastSavedAt.value = saved.updatedAt;
        clearLocalDraftSnapshot(pageId);
      } catch {
        autoSaveError.value = "自动保存失败，请点击“保存”重试";
        saveLocalDraftSnapshot(pageId, doc.value);
      } finally {
        saving.value = false;
      }
    }, 800);
  };

  const applyCommand = (command: Parameters<typeof executeCommand>[2]) => {
    flushPendingEdits();
    const state: EditorState = { doc: doc.value };
    executeCommand(state, history.value, command);
    touchDocument();
    queueAutoSave();
  };

  const selectNode = (nodeId: string) => {
    flushPendingEdits();
    selectedNodeId.value = nodeId;
  };

  const selectPage = () => {
    flushPendingEdits();
    selectedNodeId.value = "";
  };

  const setDeviceMode = (mode: DeviceMode) => {
    flushPendingEdits();
    deviceMode.value = mode;
    styleScope.value = mode;
  };

  const setStyleScope = (mode: DeviceMode) => {
    flushPendingEdits();
    styleScope.value = mode;
    deviceMode.value = mode;
  };

  const login = async (username: string, password: string) => {
    const result = await apiClient.login(username, password);
    user.value = result.user;
    tokens.value = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
    persistAuth();
    await bootstrapWorkspace();
  };

  const logout = () => {
    flushPendingEdits();
    clearAutoSaveTimer();
    clearAuth();
    initialized.value = false;
    projects.value = [];
    pages.value = [];
    currentProjectId.value = "";
    currentPageId.value = "";
    doc.value = createEmptyDoc();
    selectedNodeId.value = "";
    aiPageSummary.value = "";
    aiPageError.value = "";
    aiPageGenerating.value = false;
    aiNodeSummary.value = "";
    aiNodeError.value = "";
    aiNodeGenerating.value = false;
    autoSaveError.value = "";
    lastSavedAt.value = "";
    localDraftCandidate.value = null;
    resetHistory();
  };

  const loadPage = async (pageId: string) => {
    flushPendingEdits();
    const page = await withRefresh((token) => apiClient.getPage(token, pageId));
    currentPageId.value = page.id;
    currentProjectId.value = page.projectId;
    applyDocumentState(page.document);
    autoSaveError.value = "";
    syncLocalDraftCandidate(page.id, page.document);
  };

  const switchProject = async (projectId: string) => {
    if (!projectId || projectId === currentProjectId.value) {
      return true;
    }

    flushPendingEdits();
    if (currentPageId.value) {
      const saved = await saveNow();
      if (!saved) {
        return false;
      }
    }

    const projectPages = await ensureProjectPages(projectId);
    pages.value = projectPages;
    currentProjectId.value = projectId;

    const activePage = projectPages[0];
    if (!activePage) {
      currentPageId.value = "";
      applyDocumentState(createEmptyDoc());
      return true;
    }

    await loadPage(activePage.id);
    return true;
  };

  const createProject = async (name: string): Promise<Project | null> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return null;
    }

    const created = await withRefresh((token) =>
      apiClient.createProject(token, trimmedName),
    );
    projects.value = [
      created,
      ...projects.value.filter((project) => project.id !== created.id),
    ];
    const switched = await switchProject(created.id);
    return switched ? created : null;
  };

  const renameProject = async (projectId: string, name: string): Promise<boolean> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return false;
    }

    const updated = await withRefresh((token) =>
      apiClient.updateProject(token, projectId, trimmedName),
    );
    projects.value = projects.value.map((project) =>
      project.id === projectId ? updated : project,
    );
    return true;
  };

  const deleteProject = async (projectId: string): Promise<boolean> => {
    if (!projectId) {
      return false;
    }

    flushPendingEdits();
    const deletingCurrent = currentProjectId.value === projectId;
    if (deletingCurrent && currentPageId.value) {
      const saved = await saveNow();
      if (!saved) {
        return false;
      }
    }

    await withRefresh((token) => apiClient.deleteProject(token, projectId));
    projects.value = projects.value.filter((project) => project.id !== projectId);

    if (deletingCurrent) {
      pages.value = [];
      currentProjectId.value = "";
      currentPageId.value = "";
      applyDocumentState(createEmptyDoc());
      localDraftCandidate.value = null;
    }

    if (projects.value.length === 0) {
      const created = await withRefresh((token) =>
        apiClient.createProject(token, "榛樿椤圭洰"),
      );
      projects.value = [created];
    }

    if (!currentProjectId.value || deletingCurrent) {
      const nextProject = projects.value[0];
      if (!nextProject) {
        return false;
      }
      return switchProject(nextProject.id);
    }

    return true;
  };

  const restoreLocalDraft = () => {
    flushPendingEdits();
    const candidate = localDraftCandidate.value;
    if (!candidate || candidate.pageId !== currentPageId.value) {
      return false;
    }

    applyDocumentState(createDraftDocumentSnapshot(candidate.document));
    autoSaveError.value = "宸叉仮澶嶆湰鍦拌崏绋匡紝姝ｅ湪鍚屾淇濆瓨";
    localDraftCandidate.value = null;
    queueAutoSave();
    return true;
  };

  const discardLocalDraft = () => {
    if (!currentPageId.value) {
      return;
    }
    clearLocalDraftSnapshot(currentPageId.value);
    localDraftCandidate.value = null;
  };

  const bootstrapWorkspace = async () => {
    if (!tokens.value) {
      return;
    }

    loading.value = true;
    try {
      projects.value = await withRefresh((token) =>
        apiClient.getProjects(token),
      );

      if (projects.value.length === 0) {
        const created = await withRefresh((token) =>
          apiClient.createProject(token, "榛樿椤圭洰"),
        );
        projects.value = [created];
      }

      const activeProject = projects.value[0];
      if (!activeProject) {
        return;
      }

      currentProjectId.value = activeProject.id;
      pages.value = await ensureProjectPages(activeProject.id);

      const activePage = pages.value[0];
      if (!activePage) {
        return;
      }

      await loadPage(activePage.id);
      initialized.value = true;
    } finally {
      loading.value = false;
    }
  };

  const boot = async () => {
    restoreAuth();
    if (!tokens.value) {
      return;
    }
    await bootstrapWorkspace();
  };

  const addNode = (type: NodeType, parentId: string | null, index: number) => {
    const node = createNode(type);
    applyCommand(createAddNodeCommand(node, parentId, index));
    selectNode(node.id);
  };

  const deleteNode = (nodeId: string) => {
    applyCommand(createDeleteNodeCommand(nodeId));
    if (selectedNodeId.value === nodeId) {
      selectedNodeId.value = doc.value.root[0]?.id ?? "";
    }
  };

  const duplicateNode = (nodeId: string) => {
    applyCommand(createDuplicateNodeCommand(nodeId, createNodeId));
  };

  const moveNode = (
    nodeId: string,
    toParentId: string | null,
    toIndex: number,
  ) => {
    applyCommand(createMoveNodeCommand(nodeId, toParentId, toIndex));
  };

  const updateSelectedProps = (patch: Record<string, unknown>) => {
    const node = selectedNode.value;
    if (!node) {
      return;
    }

    if (pendingPropsPatch.value?.nodeId !== node.id) {
      flushPendingEdits();
      pendingPropsPatch.value = {
        nodeId: node.id,
        patch: { ...patch },
      };
    } else {
      pendingPropsPatch.value = {
        nodeId: node.id,
        patch: {
          ...pendingPropsPatch.value.patch,
          ...patch,
        },
      };
    }

    if (propsCommitTimer) {
      clearTimeout(propsCommitTimer);
    }
    propsCommitTimer = setTimeout(() => {
      flushPendingEdits();
    }, 220);
  };

  const updateSelectedStyle = (
    patch: Record<string, string | number | boolean | null>,
  ) => {
    const node = selectedNode.value;
    if (!node) {
      return;
    }

    if (pendingStylePatch.value?.nodeId !== node.id) {
      flushPendingEdits();
      pendingStylePatch.value = {
        nodeId: node.id,
        patch: { ...patch },
      };
    } else {
      pendingStylePatch.value = {
        nodeId: node.id,
        patch: {
          ...pendingStylePatch.value.patch,
          ...patch,
        },
      };
    }

    if (styleCommitTimer) {
      clearTimeout(styleCommitTimer);
    }
    styleCommitTimer = setTimeout(() => {
      flushPendingEdits();
    }, 220);
  };

  const updatePageStyle = (patch: PageStyle) => {
    const next = {
      ...pageStyle.value,
      ...patch,
    };

    const changed = Object.keys(next).some(
      (key) => pageStyle.value[key] !== next[key],
    );

    if (!changed) {
      return;
    }

    applyCommand(
      createUpdateDocumentMetaCommand({
        pageStyle: next,
      }),
    );
  };

  const undo = () => {
    flushPendingEdits();
    const state: EditorState = { doc: doc.value };
    undoCommand(state, history.value);
    touchDocument();
    queueAutoSave();
  };

  const redo = () => {
    flushPendingEdits();
    const state: EditorState = { doc: doc.value };
    redoCommand(state, history.value);
    touchDocument();
    queueAutoSave();
  };

  const generateAIPage = async (payload: {
    instruction: string;
    pageType?: string;
    style?: string;
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    tone?: string;
    length?: string;
    complexity?: string;
    layout?: string;
    contentFocus?: string;
    audience?: string;
    industry?: string;
    sections?: string[];
    language?: string;
    keywords?: string[];
  }): Promise<boolean> => {
    flushPendingEdits();
    aiPageError.value = "";
    aiPageSummary.value = "";

    if (!currentPageId.value || !currentProjectId.value) {
      aiPageError.value = "页面上下文未初始化";
      return false;
    }

    const instruction = payload.instruction.trim();
    if (!instruction) {
      aiPageError.value = "请输入网页生成需求";
      return false;
    }

    aiPageGenerating.value = true;
    try {
      const result = await withRefresh((token) =>
        apiClient.generateAIPage(token, {
          projectId: currentProjectId.value,
          pageId: currentPageId.value,
          instruction,
          pageType: payload.pageType,
          style: payload.style,
          primaryColor: payload.primaryColor,
          secondaryColor: payload.secondaryColor,
          backgroundColor: payload.backgroundColor,
          tone: payload.tone,
          length: payload.length,
          complexity: payload.complexity,
          layout: payload.layout,
          contentFocus: payload.contentFocus,
          audience: payload.audience,
          industry: payload.industry,
          sections: payload.sections,
          language: payload.language,
          keywords: payload.keywords,
        }),
      );

      applyDocumentState(createDraftDocumentSnapshot(result.document));
      aiPageSummary.value = result.reasoningSummary || "AI 已生成智能网页";
      queueAutoSave();
      return true;
    } catch (error) {
      aiPageError.value = error instanceof Error ? error.message : "缃戦〉鐢熸垚澶辫触";
      return false;
    } finally {
      aiPageGenerating.value = false;
    }
  };

  const modifySelectedNodeWithAI = async (payload: {
    instruction: string;
    conversation?: AIChatMessage[];
    language?: string;
  }): Promise<boolean> => {
    flushPendingEdits();
    aiNodeError.value = "";
    aiNodeSummary.value = "";

    const targetNode = selectedNode.value;
    if (!targetNode) {
      aiNodeError.value = "请先选中一个元素";
      return false;
    }

    if (!currentPageId.value || !currentProjectId.value) {
      aiNodeError.value = "页面上下文未初始化";
      return false;
    }

    const instruction = payload.instruction.trim();
    if (!instruction) {
      aiNodeError.value = "请输入修改要求";
      return false;
    }

    aiNodeGenerating.value = true;
    try {
      const saved = await saveNow();
      if (!saved) {
        aiNodeError.value = autoSaveError.value || "淇濆瓨褰撳墠椤甸潰澶辫触";
        return false;
      }

      const result = await withRefresh((token) =>
        apiClient.modifyAINode(token, {
          projectId: currentProjectId.value,
          pageId: currentPageId.value,
          targetNodeId: targetNode.id,
          instruction,
          conversation: payload.conversation,
          language: payload.language,
        }),
      );

      applyCommand(createReplaceNodeCommand(targetNode.id, result.node));
      selectedNodeId.value = targetNode.id;
      aiNodeSummary.value = result.reasoningSummary || "已更新当前元素";
      return true;
    } catch (error) {
      aiNodeError.value = error instanceof Error ? error.message : "AI 淇敼澶辫触";
      return false;
    } finally {
      aiNodeGenerating.value = false;
    }
  };

  const saveNow = async (): Promise<boolean> => {
    flushPendingEdits();
    if (!currentPageId.value || !tokens.value) {
      return false;
    }

    const pageId = currentPageId.value;
    clearAutoSaveTimer();

    saving.value = true;
    try {
      const saved = await withRefresh((token) =>
        apiClient.saveDraft(token, pageId, createDraftDocumentSnapshot()),
      );
      autoSaveError.value = "";
      lastSavedAt.value = saved.updatedAt;
      clearLocalDraftSnapshot(pageId);
      localDraftCandidate.value = null;
      return true;
    } catch (error) {
      autoSaveError.value = error instanceof Error ? error.message : "淇濆瓨澶辫触";
      saveLocalDraftSnapshot(pageId, doc.value);
      return false;
    } finally {
      saving.value = false;
    }
  };

  const publish = async (): Promise<string | null> => {
    flushPendingEdits();
    if (!currentPageId.value || !tokens.value) {
      return null;
    }

    const saved = await saveNow();
    if (!saved) {
      return null;
    }

    const payload = await withRefresh((token) =>
      apiClient.publish(token, currentPageId.value),
    );
    publishPreviewUrl.value = payload.previewUrl;
    return payload.previewUrl;
  };

  const createPreview = async (): Promise<string | null> => {
    flushPendingEdits();
    if (!currentPageId.value || !tokens.value) {
      return null;
    }

    const saved = await saveNow();
    if (!saved) {
      return null;
    }

    const preview = await withRefresh((token) =>
      apiClient.createPreview(token, currentPageId.value),
    );
    publishPreviewUrl.value = preview.previewUrl;
    return preview.previewUrl;
  };

  const exportJson = async () => {
    flushPendingEdits();
    if (!currentPageId.value || !tokens.value) {
      return;
    }

    const saved = await saveNow();
    if (!saved) {
      return;
    }

    const payload = await withRefresh((token) =>
      apiClient.exportJson(token, currentPageId.value),
    );

    payload.files.forEach((file) => {
      const url = URL.createObjectURL(file.blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.fileName;
      anchor.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 0);
    });
  };

  return {
    user,
    projects,
    pages,
    currentProjectId,
    currentPageId,
    doc,
    selectedNodeId,
    selectedNode,
    currentProject,
    pageStyle,
    previewMode,
    deviceMode,
    styleScope,
    loading,
    saving,
    initialized,
    publishPreviewUrl,
    aiPageSummary,
    aiPageError,
    aiPageGenerating,
    aiNodeSummary,
    aiNodeError,
    aiNodeGenerating,
    autoSaveError,
    lastSavedAt,
    localDraftCandidate,
    hasLocalDraftCandidate,
    canUndo,
    canRedo,
    isAuthed,
    login,
    logout,
    boot,
    loadPage,
    switchProject,
    createProject,
    renameProject,
    deleteProject,
    restoreLocalDraft,
    discardLocalDraft,
    selectNode,
    selectPage,
    setDeviceMode,
    setStyleScope,
    getNodeStyleByMode,
    addNode,
    deleteNode,
    duplicateNode,
    moveNode,
    updateSelectedProps,
    updateSelectedStyle,
    updatePageStyle,
    undo,
    redo,
    generateAIPage,
    modifySelectedNodeWithAI,
    saveNow,
    publish,
    createPreview,
    exportJson,
  };
});

