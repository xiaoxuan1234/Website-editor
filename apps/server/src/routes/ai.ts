import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
  AIContentGenerateRequestSchema,
  AIContentGenerateResponseSchema,
} from "@wg/schema";
import { aiLogs, pages, projects } from "../db/schema";
import { createId, nowISO } from "../utils";
import { getAuthUser, parseBody } from "./helpers";

export const registerAIRoutes = async (app: FastifyInstance) => {
  app.post(
    "/ai/content/generate",
    { preHandler: app.authenticate },
    async (request, reply) => {
      const authUser = getAuthUser(request);
      const body = parseBody(request, reply, AIContentGenerateRequestSchema);
      if (!body) {
        return;
      }

      const ownership = await app.services.db.db
        .select({ pageId: pages.id })
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
        return reply.code(403).send({ message: "无权访问该页面" });
      }

      const draft = await app.services.aiProvider.generateContentDraft(body);
      const validated = AIContentGenerateResponseSchema.safeParse(draft);
      if (!validated.success) {
        return reply.code(500).send({ message: "AI 输出格式无效" });
      }

      await app.services.db.db
        .insert(aiLogs)
        .values({
          id: createId("ailog"),
          userId: authUser.sub,
          projectId: body.projectId,
          pageId: body.pageId,
          targetNodeId: body.targetNodeId,
          prompt: body.instruction,
          responseJson: JSON.stringify(validated.data),
          createdAt: nowISO(),
        })
        .run();

      return validated.data;
    }
  );
};
