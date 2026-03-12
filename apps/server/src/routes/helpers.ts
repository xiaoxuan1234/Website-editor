import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { pages, projects } from "../db/schema";

export type AuthUser = {
  sub: string;
  username: string;
  tokenType: "access" | "refresh";
};

export const getAuthUser = (request: FastifyRequest): AuthUser =>
  request.user as AuthUser;

export const parseBody = <T>(
  request: FastifyRequest,
  reply: FastifyReply,
  parser: {
    safeParse: (input: unknown) =>
      | { success: true; data: T }
      | { success: false; error: { issues: unknown } };
  }
): T | null => {
  const parsed = parser.safeParse(request.body);
  if (!parsed.success) {
    reply
      .code(400)
      .send({ code: "BAD_REQUEST", message: "Invalid request body", issues: parsed.error.issues });
    return null;
  }
  return parsed.data;
};

export const ensurePageOwnership = async (
  request: FastifyRequest,
  pageId: string
): Promise<{ pageId: string; projectId: string } | null> => {
  const authUser = getAuthUser(request);

  const row = await request.server.services.db.db
    .select({ pageId: pages.id, projectId: pages.projectId, userId: projects.userId })
    .from(pages)
    .innerJoin(projects, eq(projects.id, pages.projectId))
    .where(and(eq(pages.id, pageId), eq(projects.userId, authUser.sub)))
    .get();

  if (!row) {
    return null;
  }

  return { pageId: row.pageId, projectId: row.projectId };
};

export const ensureProjectOwnership = async (
  request: FastifyRequest,
  projectId: string
): Promise<boolean> => {
  const authUser = getAuthUser(request);

  const row = await request.server.services.db.db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, authUser.sub)))
    .get();

  return Boolean(row);
};
