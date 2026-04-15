import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { normalizeAIPageDocument } from "@wg/ai-core";
import {
  CreatePageRequestSchema,
  PageDocumentV2Schema,
  type PageDocumentV2,
  SaveDraftRequestSchema,
} from "@wg/schema";
import { pageVersions, pages, previewTokens } from "../db/schema";
import { renderDocumentToHtmlCss } from "../utils/export-html";
import { createId, createInitialDocument, nowISO, parseDocument } from "../utils";
import { ensurePageOwnership, ensureProjectOwnership, parseBody } from "./helpers";

const normalizeStoredDocument = (
  document: PageDocumentV2,
): PageDocumentV2 => normalizeAIPageDocument(document);

const toSafeFileNameBase = (title: string): string => {
  const sanitized = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return sanitized || "page";
};

export const registerPageRoutes = async (app: FastifyInstance) => {
  app.post(
    "/projects/:projectId/pages",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { projectId } = request.params as { projectId: string };
      if (!(await ensureProjectOwnership(request, projectId))) {
        return reply.code(404).send({ message: "Project not found" });
      }

      const body = parseBody(request, reply, CreatePageRequestSchema);
      if (!body) {
        return;
      }

      const pageId = createId("page");
      const now = nowISO();
      const doc = createInitialDocument(pageId, projectId, body.title);

      await app.services.db.db
        .insert(pages)
        .values({
          id: pageId,
          projectId,
          title: body.title,
          status: "draft",
          version: 1,
          draftJson: JSON.stringify(doc),
          publishedVersionId: null,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      return reply.code(201).send({
        id: pageId,
        projectId,
        title: body.title,
        status: "draft",
        version: 1,
        updatedAt: now,
        document: doc,
      });
    }
  );

  app.get("/pages/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const ownership = await ensurePageOwnership(request, id);
    if (!ownership) {
      return reply.code(404).send({ message: "Page not found" });
    }

    const page = await app.services.db.db
      .select({
        id: pages.id,
        projectId: pages.projectId,
        title: pages.title,
        status: pages.status,
        version: pages.version,
        draftJson: pages.draftJson,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .where(eq(pages.id, id))
      .get();

    if (!page) {
      return reply.code(404).send({ message: "Page not found" });
    }

    const parsedDocument = parseDocument(page.draftJson);
    const document = normalizeStoredDocument(parsedDocument);

    if (JSON.stringify(parsedDocument) !== JSON.stringify(document)) {
      await app.services.db.db
        .update(pages)
        .set({
          title: document.title,
          draftJson: JSON.stringify(document),
          updatedAt: page.updatedAt,
        })
        .where(eq(pages.id, id))
        .run();
    }

    return {
      id: page.id,
      projectId: page.projectId,
      title: page.title,
      status: page.status,
      version: page.version,
      updatedAt: page.updatedAt,
      document,
    };
  });

  app.put(
    "/pages/:id/draft",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const ownership = await ensurePageOwnership(request, id);
      if (!ownership) {
        return reply.code(404).send({ message: "Page not found" });
      }

      const body = parseBody(request, reply, SaveDraftRequestSchema);
      if (!body) {
        return;
      }

      const parsedDoc = PageDocumentV2Schema.safeParse(body.document);
      if (!parsedDoc.success) {
        return reply.code(400).send({ message: "Document schema validation failed" });
      }

      const now = nowISO();
      const document = {
        ...parsedDoc.data,
        id,
        projectId: ownership.projectId,
        updatedAt: now,
        status: "draft" as const,
      };

      await app.services.db.db
        .update(pages)
        .set({
          title: document.title,
          status: "draft",
          draftJson: JSON.stringify(document),
          updatedAt: now,
        })
        .where(eq(pages.id, id))
        .run();

      return { ok: true, updatedAt: now };
    }
  );

  app.post(
    "/pages/:id/publish",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const ownership = await ensurePageOwnership(request, id);
      if (!ownership) {
        return reply.code(404).send({ message: "Page not found" });
      }

      const page = await app.services.db.db
        .select({
          id: pages.id,
          title: pages.title,
          projectId: pages.projectId,
          version: pages.version,
          draftJson: pages.draftJson,
        })
        .from(pages)
        .where(eq(pages.id, id))
        .get();

      if (!page) {
        return reply.code(404).send({ message: "Page not found" });
      }

      const now = nowISO();
      const version = page.version + 1;
      const versionId = createId("version");
      const slug = createId("preview").replace("preview_", "pv-");
      const publishedDoc = normalizeStoredDocument({
        ...parseDocument(page.draftJson),
        status: "published" as const,
        version,
        updatedAt: now,
      });

      await app.services.db.db
        .insert(pageVersions)
        .values({
          id: versionId,
          pageId: id,
          version,
          snapshotJson: JSON.stringify(publishedDoc),
          createdAt: now,
        })
        .run();

      await app.services.db.db
        .insert(previewTokens)
        .values({
          id: createId("token"),
          pageVersionId: versionId,
          slug,
          expiresAt: null,
          createdAt: now,
        })
        .run();

      await app.services.db.db
        .update(pages)
        .set({
          status: "published",
          version,
          publishedVersionId: versionId,
          draftJson: JSON.stringify(publishedDoc),
          updatedAt: now,
        })
        .where(eq(pages.id, id))
        .run();

      return {
        pageId: id,
        versionId,
        slug,
        previewUrl: `${app.services.previewBaseUrl}/preview/${slug}`,
      };
    }
  );

  app.get(
    "/pages/:id/export-json",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const ownership = await ensurePageOwnership(request, id);
      if (!ownership) {
        return reply.code(404).send({ message: "Page not found" });
      }

      const page = await app.services.db.db
        .select({ draftJson: pages.draftJson, title: pages.title })
        .from(pages)
        .where(eq(pages.id, id))
        .get();

      if (!page) {
        return reply.code(404).send({ message: "Page not found" });
      }

      const fileBase = toSafeFileNameBase(page.title || "page");
      const htmlFileName = `${fileBase}.html`;
      const cssFileName = `${fileBase}.css`;
      const document = normalizeStoredDocument(parseDocument(page.draftJson));
      const rendered = renderDocumentToHtmlCss(document, {
        cssFileName,
      });

      return {
        htmlFileName,
        cssFileName,
        html: rendered.html,
        css: rendered.css,
      };
    }
  );
};
