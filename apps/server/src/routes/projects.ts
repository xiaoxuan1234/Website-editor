import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { CreateProjectRequestSchema } from "@wg/schema";
import { pages, projects } from "../db/schema";
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
};
