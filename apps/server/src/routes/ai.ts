import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
  AIPageGenerateRequestSchema,
  AIPageGenerateResponseSchema,
} from "@wg/schema";
import { aiLogs, pages, projects } from "../db/schema";
import { createId, nowISO } from "../utils";
import { getAuthUser, parseBody } from "./helpers";

export const registerAIRoutes = async (app: FastifyInstance) => {
  app.post(
    "/ai/page/generate",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const body = parseBody(request, reply, AIPageGenerateRequestSchema);
      if (!body) {
        return;
      }

      const ownership = await app.services.db.db
        .select({ pageId: pages.id, version: pages.version })
        .from(pages)
        .innerJoin(projects, eq(projects.id, pages.projectId))
        .where(
          and(
            eq(pages.id, body.pageId),
            eq(projects.id, body.projectId),
            eq(projects.userId, authUser.sub)
          )
        )
        .get();

      if (!ownership) {
        return reply.code(403).send({ message: "No access to this page" });
      }

      const draft = await app.services.aiProvider.generatePageDraft(body);
      const validated = AIPageGenerateResponseSchema.safeParse(draft);
      if (!validated.success) {
        return reply.code(500).send({ message: "AI page output format invalid" });
      }

      const now = nowISO();
      const normalizedDocument = {
        ...validated.data.document,
        id: body.pageId,
        projectId: body.projectId,
        status: "draft" as const,
        version: ownership.version,
        updatedAt: now,
      };

      await app.services.db.db
        .insert(aiLogs)
        .values({
          id: createId("ailog"),
          userId: authUser.sub,
          projectId: body.projectId,
          pageId: body.pageId,
          targetNodeId: "__page__",
          prompt: body.instruction,
          responseJson: JSON.stringify({
            ...validated.data,
            document: normalizedDocument,
          }),
          createdAt: now,
        })
        .run();

      return {
        ...validated.data,
        document: normalizedDocument,
      };
    }
  );
};
