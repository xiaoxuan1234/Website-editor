import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { PreviewCreateRequestSchema } from "@wg/schema";
import { pageVersions, pages, previewTokens, projects } from "../db/schema";
import { createId, nowISO, parseDocument } from "../utils";
import { getAuthUser, parseBody } from "./helpers";

export const registerPreviewRoutes = async (app: FastifyInstance) => {
  app.post("/preview", { preHandler: app.authenticate }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const body = parseBody(request, reply, PreviewCreateRequestSchema);
    if (!body) {
      return;
    }

    const pageRow = await app.services.db.db
      .select({
        pageId: pages.id,
        projectId: pages.projectId,
        userId: projects.userId,
        draftJson: pages.draftJson,
        version: pages.version,
      })
      .from(pages)
      .innerJoin(projects, eq(projects.id, pages.projectId))
      .where(and(eq(pages.id, body.pageId), eq(projects.userId, authUser.sub)))
      .get();

    if (!pageRow) {
      return reply.code(404).send({ message: "页面不存在" });
    }

    const now = nowISO();
    const versionId = createId("version");
    await app.services.db.db
      .insert(pageVersions)
      .values({
        id: versionId,
        pageId: pageRow.pageId,
        version: pageRow.version,
        snapshotJson: pageRow.draftJson,
        createdAt: now,
      })
      .run();

    const slug = createId("preview").replace("preview_", "pv-");
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

    return {
      slug,
      previewUrl: `${app.services.previewBaseUrl}/preview/${slug}`,
    };
  });

  app.get("/preview/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const row = await app.services.db.db
      .select({
        pageId: pageVersions.pageId,
        versionId: pageVersions.id,
        snapshotJson: pageVersions.snapshotJson,
      })
      .from(previewTokens)
      .innerJoin(pageVersions, eq(pageVersions.id, previewTokens.pageVersionId))
      .where(eq(previewTokens.slug, slug))
      .get();

    if (!row) {
      return reply.code(404).send({ message: "预览不存在" });
    }

    return {
      pageId: row.pageId,
      versionId: row.versionId,
      document: parseDocument(row.snapshotJson),
    };
  });
};
