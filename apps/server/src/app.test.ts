import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { FastifyInstance } from "fastify";
import { createServer } from "./app";

let app: FastifyInstance;
let accessToken = "";
let projectId = "";
let pageId = "";

describe("server basic flow", () => {
  beforeAll(async () => {
    app = await createServer({
      dbPath: ":memory:",
      jwtSecret: "test-secret",
      previewBaseUrl: "http://localhost:5173",
    });
  });

  afterAll(async () => {
    await app.close();
  });

  test("login", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        username: "admin",
        password: "admin123",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    accessToken = body.accessToken;
    expect(accessToken).toBeTruthy();
  });

  test("create project and page", async () => {
    const createProject = await app.inject({
      method: "POST",
      url: "/projects",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: "Demo Project",
      },
    });

    expect(createProject.statusCode).toBe(201);
    projectId = createProject.json().id;

    const createPage = await app.inject({
      method: "POST",
      url: `/projects/${projectId}/pages`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        title: "Landing Page",
      },
    });

    expect(createPage.statusCode).toBe(201);
    pageId = createPage.json().id;
  });

  test("load page and publish", async () => {
    const getPage = await app.inject({
      method: "GET",
      url: `/pages/${pageId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(getPage.statusCode).toBe(200);

    const publish = await app.inject({
      method: "POST",
      url: `/pages/${pageId}/publish`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(publish.statusCode).toBe(200);
    expect(publish.json().slug).toBeTruthy();
  });

  test("preview should read latest draft", async () => {
    const getPage = await app.inject({
      method: "GET",
      url: `/pages/${pageId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(getPage.statusCode).toBe(200);
    const pagePayload = getPage.json() as {
      document: {
        id: string;
        projectId: string;
        title: string;
        status: "draft" | "published";
        version: number;
        updatedAt: string;
        root: unknown[];
        meta: Record<string, unknown>;
      };
    };

    const draftTitle = "Draft Preview Should Match";
    const saveDraft = await app.inject({
      method: "PUT",
      url: `/pages/${pageId}/draft`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        document: {
          ...pagePayload.document,
          title: draftTitle,
        },
      },
    });

    expect(saveDraft.statusCode).toBe(200);

    const createPreview = await app.inject({
      method: "POST",
      url: "/preview",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        pageId,
      },
    });

    expect(createPreview.statusCode).toBe(200);
    const slug = (createPreview.json() as { slug: string }).slug;
    expect(slug).toBeTruthy();

    const getPreview = await app.inject({
      method: "GET",
      url: `/preview/${slug}`,
    });

    expect(getPreview.statusCode).toBe(200);
    const previewPayload = getPreview.json() as { document: { title: string } };
    expect(previewPayload.document.title).toBe(draftTitle);
  });

  test("save draft invalid body should return structured error", async () => {
    const response = await app.inject({
      method: "PUT",
      url: `/pages/${pageId}/draft`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        wrong: true,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json() as { code?: string; message?: string };
    expect(body.code).toBe("BAD_REQUEST");
    expect(body.message).toBeTruthy();
  });

  test("body too large should return 413 with structured code", async () => {
    const smallLimitApp = await createServer({
      dbPath: ":memory:",
      jwtSecret: "test-secret-2",
      previewBaseUrl: "http://localhost:5173",
      bodyLimitBytes: 256,
    });

    try {
      const response = await smallLimitApp.inject({
        method: "POST",
        url: "/auth/login",
        payload: {
          username: "admin",
          password: `admin123-${"x".repeat(1024)}`,
        },
      });

      expect(response.statusCode).toBe(413);
      const body = response.json() as { code?: string; message?: string };
      expect(body.code).toBe("BODY_TOO_LARGE");
      expect(body.message).toContain("请求体过大");
    } finally {
      await smallLimitApp.close();
    }
  });
});
