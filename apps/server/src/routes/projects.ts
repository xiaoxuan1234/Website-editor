import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { CreateProjectRequestSchema, UpdateProjectRequestSchema } from "@wg/schema";
import { aiLogs, pageVersions, pages, previewTokens, projects } from "../db/schema";
import { createId, nowISO } from "../utils";
import { getAuthUser, parseBody } from "./helpers";

export const registerProjectRoutes = async (app: FastifyInstance) => {
  app.get("/projects", { preHandler: app.authenticate }, async (request) => {
    const authUser = getAuthUser(request);

    const rows = await app.services.db.db
      .select({
        id: projects.id,
        name: projects.name,
        userId: projects.userId,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(eq(projects.userId, authUser.sub))
      .orderBy(desc(projects.updatedAt))
      .all();

    return { items: rows };
  });

  app.post("/projects", { preHandler: app.authenticate }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const body = parseBody(request, reply, CreateProjectRequestSchema);
    if (!body) {
      return;
    }

    const id = createId("project");
    const now = nowISO();

    await app.services.db.db
      .insert(projects)
      .values({
        id,
        userId: authUser.sub,
        name: body.name,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return reply.code(201).send({
      id,
      userId: authUser.sub,
      name: body.name,
      createdAt: now,
      updatedAt: now,
    });
  });

  app.get("/projects/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const { id } = request.params as { id: string };

    const project = await app.services.db.db
      .select({
        id: projects.id,
        name: projects.name,
        userId: projects.userId,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, authUser.sub)))
      .get();

    if (!project) {
      return reply.code(404).send({ message: "项目不存在" });
    }

    const pageRows = await app.services.db.db
      .select({
        id: pages.id,
        projectId: pages.projectId,
        title: pages.title,
        status: pages.status,
        version: pages.version,
        updatedAt: pages.updatedAt,
      })
      .from(pages)
      .where(eq(pages.projectId, id))
      .orderBy(desc(pages.updatedAt))
      .all();

    return {
      ...project,
      pages: pageRows,
    };
  });

  app.put("/projects/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const { id } = request.params as { id: string };
    const body = parseBody(request, reply, UpdateProjectRequestSchema);
    if (!body) {
      return;
    }

    const project = await app.services.db.db
      .select({
        id: projects.id,
        userId: projects.userId,
        name: projects.name,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, authUser.sub)))
      .get();

    if (!project) {
      return reply.code(404).send({ message: "项目不存在" });
    }

    const now = nowISO();
    await app.services.db.db
      .update(projects)
      .set({
        name: body.name,
        updatedAt: now,
      })
      .where(eq(projects.id, id))
      .run();

    return {
      ...project,
      name: body.name,
      updatedAt: now,
    };
  });

  app.delete("/projects/:id", { preHandler: app.authenticate }, async (request, reply) => {
    const authUser = getAuthUser(request);
    const { id } = request.params as { id: string };

    const project = await app.services.db.db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, authUser.sub)))
      .get();

    if (!project) {
      return reply.code(404).send({ message: "项目不存在" });
    }

    const projectPages = await app.services.db.db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.projectId, id))
      .all();
    const pageIds = projectPages.map((item) => item.id);

    if (pageIds.length > 0) {
      const versions = await app.services.db.db
        .select({ id: pageVersions.id })
        .from(pageVersions)
        .where(inArray(pageVersions.pageId, pageIds))
        .all();
      const versionIds = versions.map((item) => item.id);

      if (versionIds.length > 0) {
        await app.services.db.db
          .delete(previewTokens)
          .where(inArray(previewTokens.pageVersionId, versionIds))
          .run();
      }

      await app.services.db.db
        .delete(pageVersions)
        .where(inArray(pageVersions.pageId, pageIds))
        .run();
    }

    await app.services.db.db.delete(aiLogs).where(eq(aiLogs.projectId, id)).run();
    await app.services.db.db.delete(pages).where(eq(pages.projectId, id)).run();
    await app.services.db.db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, authUser.sub)))
      .run();

    return { ok: true as const };
  });
};
