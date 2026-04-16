import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { normalizeAIPageDocument } from "@wg/ai-core";
import {
  AINodeModifyRequestSchema,
  AINodeModifyResponseSchema,
  AIPageGenerateRequestSchema,
  AIPageGenerateResponseSchema,
  PageDocumentV2Schema,
  type EditorNode,
} from "@wg/schema";
import { aiLogs, pages, projects } from "../db/schema";
import { createId, nowISO } from "../utils";
import { getAuthUser, parseBody } from "./helpers";

const findNodeById = (
  nodes: EditorNode[],
  nodeId: string,
): EditorNode | null => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    const nested = findNodeById(node.children, nodeId);
    if (nested) {
      return nested;
    }
  }

  return null;
};

export const registerAIRoutes = async (app: FastifyInstance) => {
  // Test endpoint for AI API connection
  app.get("/ai/test", async (request, reply) => {
    try {
      // Check if OpenAI API key is set
      const openAIApiKey = process.env.OPENAI_API_KEY;
      if (!openAIApiKey) {
        return reply.code(500).send({ success: false, message: "OpenAI API key not set" });
      }
      
      // Check if OpenAI base URL is set
      const openAIBaseUrl = process.env.OPENAI_BASE_URL;
      if (!openAIBaseUrl) {
        return reply.code(500).send({ success: false, message: "OpenAI base URL not set" });
      }
      
      // Check if OpenAI model is set
      const openAIModel = process.env.OPENAI_MODEL;
      if (!openAIModel) {
        return reply.code(500).send({ success: false, message: "OpenAI model not set" });
      }
      
      return { 
        success: true, 
        message: "AI API configuration test successful",
        config: {
          openAIApiKey: openAIApiKey.substring(0, 4) + "****" + openAIApiKey.substring(openAIApiKey.length - 4),
          openAIBaseUrl,
          openAIModel
        }
      };
    } catch (error) {
      return reply.code(500).send({ success: false, message: "AI API configuration test failed", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post(
    "/ai/page/generate",
    { preHandler: app.authenticate },
    async (request, reply) => {
      try {
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
              eq(projects.userId, authUser.sub),
            ),
          )
          .get();

        if (!ownership) {
          return reply.code(403).send({ message: "No access to this page" });
        }

        app.log.info("Generating AI page draft...");
        const draft = await app.services.aiProvider.generatePageDraft(body);
        app.log.info("AI draft generated successfully");

        const validated = AIPageGenerateResponseSchema.safeParse(draft);
        if (!validated.success) {
          app.log.error(
            { err: validated.error },
            "AI page output validation failed",
          );
          return reply
            .code(500)
            .send({ message: "AI page output format invalid" });
        }

        const now = nowISO();
        const normalizedDocument = normalizeAIPageDocument({
          ...validated.data.document,
          id: body.pageId,
          projectId: body.projectId,
          status: "draft" as const,
          version: ownership.version,
          updatedAt: now,
        });

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
      } catch (error) {
        app.log.error({ err: error }, "AI page generation failed");
        return reply.code(500).send({
          message: "AI page generation failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  app.post(
    "/ai/node/modify",
    { preHandler: app.authenticate },
    async (request, reply) => {
      try {
        const authUser = getAuthUser(request);
        const body = parseBody(request, reply, AINodeModifyRequestSchema);
        if (!body) {
          return;
        }

        const ownership = await app.services.db.db
          .select({
            pageId: pages.id,
            version: pages.version,
            title: pages.title,
            draftJson: pages.draftJson,
          })
          .from(pages)
          .innerJoin(projects, eq(projects.id, pages.projectId))
          .where(
            and(
              eq(pages.id, body.pageId),
              eq(projects.id, body.projectId),
              eq(projects.userId, authUser.sub),
            ),
          )
          .get();

        if (!ownership) {
          return reply.code(403).send({ message: "No access to this page" });
        }

        let document;
        try {
          document = PageDocumentV2Schema.parse(JSON.parse(ownership.draftJson));
        } catch (error) {
          app.log.error({ err: error }, "Stored page draft is invalid");
          return reply.code(500).send({ message: "Stored page draft invalid" });
        }

        const targetNode = findNodeById(document.root, body.targetNodeId);
        if (!targetNode) {
          return reply.code(404).send({ message: "Target node not found" });
        }

        const modified = await app.services.aiProvider.modifyNodeDraft({
          ...body,
          pageTitle: document.title || ownership.title,
          targetNode,
        });

        const validated = AINodeModifyResponseSchema.safeParse(modified);
        if (!validated.success) {
          app.log.error(
            { err: validated.error },
            "AI node output validation failed",
          );
          return reply
            .code(500)
            .send({ message: "AI node output format invalid" });
        }

        const now = nowISO();
        const normalizedNode = {
          ...validated.data.node,
          id: body.targetNodeId,
          aiMeta: {
            ...validated.data.node.aiMeta,
            lastAppliedAt: now,
            lastPrompt: body.instruction,
          },
        };

        await app.services.db.db
          .insert(aiLogs)
          .values({
            id: createId("ailog"),
            userId: authUser.sub,
            projectId: body.projectId,
            pageId: body.pageId,
            targetNodeId: body.targetNodeId,
            prompt: body.instruction,
            responseJson: JSON.stringify({
              ...validated.data,
              node: normalizedNode,
            }),
            createdAt: now,
          })
          .run();

        return {
          ...validated.data,
          node: normalizedNode,
        };
      } catch (error) {
        app.log.error({ err: error }, "AI node modification failed");
        return reply.code(500).send({
          message: "AI node modification failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
};
