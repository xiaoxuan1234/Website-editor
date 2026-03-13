import {
  AuthLoginResponseSchema,
  type AIPageGenerateRequest,
  type AIPageGenerateResponse,
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

const jsonHeaders = {
  "Content-Type": "application/json",
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<T> => {
  const headers = new Headers(options.headers ?? {});
  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError("无法连接到服务，请检查后端是否运行", 0, "NETWORK_ERROR");
  }

  if (!response.ok) {
    const text = await response.text();
    let parsed: ErrorPayload | null = null;

    if (text) {
      try {
        parsed = JSON.parse(text) as ErrorPayload;
      } catch {
        parsed = null;
      }
    }

    const status = response.status;
    const code = parsed?.code;
    const message =
      parsed?.message ||
      (text && !parsed ? text : "") ||
      (status === 413 ? "请求体过大，请压缩图片后重试" : "") ||
      `请求失败(${status})`;

    throw new ApiError(message, status, code);
  }

  return (await response.json()) as T;
};

const parseDownloadFileName = (contentDisposition: string | null): string | null => {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return null;
    }
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1]?.trim() || null;
};

const requestBlob = async (
  path: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<{ blob: Blob; fileName: string }> => {
  const headers = new Headers(options.headers ?? {});
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new ApiError("无法连接到服务，请检查后端是否运行", 0, "NETWORK_ERROR");
  }

  if (!response.ok) {
    const text = await response.text();
    let parsed: ErrorPayload | null = null;

    if (text) {
      try {
        parsed = JSON.parse(text) as ErrorPayload;
      } catch {
        parsed = null;
      }
    }

    const status = response.status;
    const code = parsed?.code;
    const message =
      parsed?.message ||
      (text && !parsed ? text : "") ||
      (status === 413 ? "请求体过大，请压缩图片后重试" : "") ||
      `请求失败(${status})`;

    throw new ApiError(message, status, code);
  }

  const fileName =
    parseDownloadFileName(response.headers.get("Content-Disposition")) || "page-export.zip";
  const blob = await response.blob();
  return { blob, fileName };
};

export const apiClient = {
  baseUrl: API_BASE,

  async login(username: string, password: string) {
    const payload = await request<{ accessToken: string; refreshToken: string; user: any }>(
      "/auth/login",
      {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ username, password }),
      }
    );

    return AuthLoginResponseSchema.parse(payload);
  },

  async refresh(refreshToken: string) {
    return request<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ refreshToken }),
    });
  },

  async getProjects(accessToken: string) {
    const payload = await request<{ items: Project[] }>("/projects", {}, accessToken);
    return payload.items;
  },

  async createProject(accessToken: string, name: string) {
    return request<Project>(
      "/projects",
      {
        method: "POST",
        body: JSON.stringify({ name }),
      },
      accessToken
    );
  },

  async getProject(accessToken: string, id: string) {
    return request<Project & { pages: PageSummary[] }>(`/projects/${id}`, {}, accessToken);
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
      accessToken
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
      accessToken
    );
  },

  async publish(accessToken: string, pageId: string) {
    return request<{ pageId: string; versionId: string; slug: string; previewUrl: string }>(
      `/pages/${pageId}/publish`,
      {
        method: "POST",
      },
      accessToken
    );
  },

  async exportJson(accessToken: string, pageId: string) {
    return requestBlob(`/pages/${pageId}/export-zip`, {}, accessToken);
  },

  async createPreview(accessToken: string, pageId: string) {
    return request<{ slug: string; previewUrl: string }>(
      "/preview",
      {
        method: "POST",
        body: JSON.stringify({ pageId }),
      },
      accessToken
    );
  },

  async getPreview(slug: string) {
    return request<{ pageId: string; versionId: string; document: PageDocumentV2 }>(
      `/preview/${slug}`
    );
  },

  async generateAIPage(
    accessToken: string,
    payload: AIPageGenerateRequest
  ): Promise<AIPageGenerateResponse> {
    return request<AIPageGenerateResponse>(
      "/ai/page/generate",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      accessToken
    );
  },
};
