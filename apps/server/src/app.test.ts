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

  test("update and delete project", async () => {
    const createProject = await app.inject({
      method: "POST",
      url: "/projects",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: "Project For Update/Delete",
      },
    });

    expect(createProject.statusCode).toBe(201);
    const anotherProjectId = (createProject.json() as { id: string }).id;

    const updateProject = await app.inject({
      method: "PUT",
      url: `/projects/${anotherProjectId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        name: "Project Renamed",
      },
    });

    expect(updateProject.statusCode).toBe(200);
    const updatePayload = updateProject.json() as { name: string };
    expect(updatePayload.name).toBe("Project Renamed");

    const deleteProject = await app.inject({
      method: "DELETE",
      url: `/projects/${anotherProjectId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(deleteProject.statusCode).toBe(200);
    expect((deleteProject.json() as { ok: boolean }).ok).toBe(true);

    const getDeletedProject = await app.inject({
      method: "GET",
      url: `/projects/${anotherProjectId}`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(getDeletedProject.statusCode).toBe(404);
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

  test("export should return html and css content", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/pages/${pageId}/export-json`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const payload = response.json() as {
      htmlFileName: string;
      cssFileName: string;
      html: string;
      css: string;
    };

    expect(payload.htmlFileName.endsWith(".html")).toBe(true);
    expect(payload.cssFileName.endsWith(".css")).toBe(true);
    expect(payload.html).toContain(`<link rel="stylesheet" href="${payload.cssFileName}"`);
    expect(payload.css).toContain(".wg-page");
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

  test("AI page generation should handle long prompts", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/ai/page/generate",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        projectId,
        pageId,
        instruction: `Create a product landing page ${"fast reliable scalable ".repeat(300)}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      document: { root: unknown[] };
      reasoningSummary: string;
    };
    expect(body.document.root.length).toBeGreaterThan(0);
    expect(body.reasoningSummary).toBeTruthy();
  });

  test("AI node modify should update selected node", async () => {
    const targetNodeId = "node_target_paragraph";
    const saveDraft = await app.inject({
      method: "PUT",
      url: `/pages/${pageId}/draft`,
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        document: {
          id: pageId,
          projectId,
          title: "Landing Page",
          status: "draft",
          version: 1,
          updatedAt: new Date().toISOString(),
          root: [
            {
              id: targetNodeId,
              type: "paragraph",
              props: { content: "Old content" },
              style: {},
              children: [],
              aiMeta: {},
            },
          ],
          meta: {},
        },
      },
    });

    expect(saveDraft.statusCode).toBe(200);

    const response = await app.inject({
      method: "POST",
      url: "/ai/node/modify",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      payload: {
        projectId,
        pageId,
        targetNodeId,
        instruction: "Rewrite this paragraph to emphasize speed and reliability",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      node: {
        id: string;
        type: string;
        props: { content?: string };
        aiMeta: { lastPrompt?: string };
      };
      reasoningSummary: string;
    };

    expect(body.node.id).toBe(targetNodeId);
    expect(body.node.type).toBe("paragraph");
    expect(body.node.props.content).toContain("speed");
    expect(body.node.aiMeta.lastPrompt).toContain("speed");
    expect(body.reasoningSummary).toBeTruthy();
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
