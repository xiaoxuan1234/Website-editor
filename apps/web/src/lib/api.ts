import {
  AuthLoginResponseSchema,
  type AIPageGenerateRequest,
  type AIPageGenerateResponse,
  type AIChatMessage,
  type AINodeModifyRequest,
  type AINodeModifyResponse,
  type PageDocumentV2,
  type PageSummary,
  type Project,
} from "@wg/schema";

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type ErrorPayload = {
  message?: string;
  code?: string;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";
const NETWORK_ERROR_MESSAGE = "无法连接到服务，请检查后端是否运行";
const REQUEST_TOO_LARGE_MESSAGE = "请求体过大，请精简输入或压缩图片后重试";

const jsonHeaders = {
  "Content-Type": "application/json",
};

const buildHeaders = (options: RequestInit, accessToken?: string) => {
  const headers = new Headers(options.headers ?? {});

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
};

const parseErrorPayload = (text: string): ErrorPayload | null => {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as ErrorPayload;
  } catch {
    return null;
  }
};

const createApiError = async (response: Response): Promise<ApiError> => {
  const text = await response.text();
  const parsed = parseErrorPayload(text);
  const status = response.status;

  return new ApiError(
    parsed?.message ||
      (text && !parsed ? text : "") ||
      (status === 413 ? REQUEST_TOO_LARGE_MESSAGE : "") ||
      `请求失败(${status})`,
    status,
    parsed?.code,
  );
};

const fetchApi = async (
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<Response> => {
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: buildHeaders(options, accessToken),
    });
  } catch {
    throw new ApiError(NETWORK_ERROR_MESSAGE, 0, "NETWORK_ERROR");
  }
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> => {
  const response = await fetchApi(path, options, accessToken);
  if (!response.ok) {
    throw await createApiError(response);
  }

  return (await response.json()) as T;
};

const trimConversation = (conversation?: AIChatMessage[]) => {
  if (!conversation || conversation.length === 0) {
    return undefined;
  }

  return conversation
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-8);
};

export const apiClient = {
  baseUrl: API_BASE,

  async login(username: string, password: string) {
    const payload = await request<{
      accessToken: string;
      refreshToken: string;
      user: unknown;
    }>("/auth/login", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ username, password }),
    });

    return AuthLoginResponseSchema.parse(payload);
  },

  async refresh(refreshToken: string) {
    return request<{ accessToken: string; refreshToken: string }>(
      "/auth/refresh",
      {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ refreshToken }),
      },
    );
  },

  async getProjects(accessToken: string) {
    const payload = await request<{ items: Project[] }>(
      "/projects",
      {},
      accessToken,
    );
    return payload.items;
  },

  async createProject(accessToken: string, name: string) {
    return request<Project>(
      "/projects",
      {
        method: "POST",
        body: JSON.stringify({ name }),
      },
      accessToken,
    );
  },

  async updateProject(accessToken: string, id: string, name: string) {
    return request<Project>(
      `/projects/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({ name }),
      },
      accessToken,
    );
  },

  async deleteProject(accessToken: string, id: string) {
    return request<{ ok: true }>(
      `/projects/${id}`,
      {
        method: "DELETE",
      },
      accessToken,
    );
  },

  async getProject(accessToken: string, id: string) {
    return request<Project & { pages: PageSummary[] }>(
      `/projects/${id}`,
      {},
      accessToken,
    );
  },

  async createPage(accessToken: string, projectId: string, title: string) {
    return request<{
      id: string;
      projectId: string;
      title: string;
      status: "draft" | "published";
      version: number;
      updatedAt: string;
      document: PageDocumentV2;
    }>(
      `/projects/${projectId}/pages`,
      {
        method: "POST",
        body: JSON.stringify({ title }),
      },
      accessToken,
    );
  },

  async getPage(accessToken: string, pageId: string) {
    return request<{
      id: string;
      projectId: string;
      title: string;
      status: "draft" | "published";
      version: number;
      updatedAt: string;
      document: PageDocumentV2;
    }>(`/pages/${pageId}`, {}, accessToken);
  },

  async saveDraft(accessToken: string, pageId: string, document: PageDocumentV2) {
    return request<{ ok: boolean; updatedAt: string }>(
      `/pages/${pageId}/draft`,
      {
        method: "PUT",
        body: JSON.stringify({ document }),
      },
      accessToken,
    );
  },

  async publish(accessToken: string, pageId: string) {
    return request<{
      pageId: string;
      versionId: string;
      slug: string;
      previewUrl: string;
    }>(
      `/pages/${pageId}/publish`,
      {
        method: "POST",
      },
      accessToken,
    );
  },

  async exportJson(accessToken: string, pageId: string) {
    const payload = await request<{
      htmlFileName: string;
      cssFileName: string;
      html: string;
      css: string;
    }>(
      `/pages/${pageId}/export-json`,
      {},
      accessToken,
    );

    return {
      files: [
        {
          blob: new Blob([payload.html], { type: "text/html;charset=utf-8" }),
          fileName: payload.htmlFileName || "page.html",
        },
        {
          blob: new Blob([payload.css], { type: "text/css;charset=utf-8" }),
          fileName: payload.cssFileName || "styles.css",
        },
      ],
    };
  },

  async createPreview(accessToken: string, pageId: string) {
    return request<{ slug: string; previewUrl: string }>(
      "/preview",
      {
        method: "POST",
        body: JSON.stringify({ pageId }),
      },
      accessToken,
    );
  },

  async getPreview(slug: string) {
    return request<{ pageId: string; versionId: string; document: PageDocumentV2 }>(
      `/preview/${slug}`,
    );
  },

  async generateAIPage(
    accessToken: string,
    payload: AIPageGenerateRequest,
  ): Promise<AIPageGenerateResponse> {
    return request<AIPageGenerateResponse>(
      "/ai/page/generate",
      {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          instruction: payload.instruction.trim(),
        }),
      },
      accessToken,
    );
  },

  async modifyAINode(
    accessToken: string,
    payload: AINodeModifyRequest,
  ): Promise<AINodeModifyResponse> {
    return request<AINodeModifyResponse>(
      "/ai/node/modify",
      {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          instruction: payload.instruction.trim(),
          conversation: trimConversation(payload.conversation),
        }),
      },
      accessToken,
    );
  },
};
