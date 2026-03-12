import { compareSync } from "bcryptjs";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
  AuthLoginRequestSchema,
  AuthRefreshRequestSchema,
  type AuthLoginResponse,
} from "@wg/schema";
import { users } from "../db/schema";
import { parseBody } from "./helpers";

const issueTokens = async (app: FastifyInstance, user: { id: string; username: string }) => {
  const accessToken = await app.jwt.sign(
    {
      sub: user.id,
      username: user.username,
      tokenType: "access",
    },
    { expiresIn: "1h" }
  );

  const refreshToken = await app.jwt.sign(
    {
      sub: user.id,
      username: user.username,
      tokenType: "refresh",
    },
    { expiresIn: "7d" }
  );

  return { accessToken, refreshToken };
};

export const registerAuthRoutes = async (app: FastifyInstance) => {
  app.post("/auth/login", async (request, reply) => {
    const body = parseBody(request, reply, AuthLoginRequestSchema);
    if (!body) {
      return;
    }

    const userRow = await app.services.db.db
      .select({ id: users.id, username: users.username, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.username, body.username))
      .get();

    if (!userRow || !compareSync(body.password, userRow.passwordHash)) {
      return reply.code(401).send({ message: "用户名或密码错误" });
    }

    const tokens = await issueTokens(app, { id: userRow.id, username: userRow.username });
    const payload: AuthLoginResponse = {
      ...tokens,
      user: {
        id: userRow.id,
        username: userRow.username,
      },
    };

    return reply.send(payload);
  });

  app.post("/auth/refresh", async (request, reply) => {
    const body = parseBody(request, reply, AuthRefreshRequestSchema);
    if (!body) {
      return;
    }

    try {
      const payload = await app.jwt.verify<{
        sub: string;
        username: string;
        tokenType: "access" | "refresh";
      }>(body.refreshToken);

      if (payload.tokenType !== "refresh") {
        return reply.code(401).send({ message: "无效 refresh token" });
      }

      const tokens = await issueTokens(app, {
        id: payload.sub,
        username: payload.username,
      });

      return reply.send(tokens);
    } catch {
      return reply.code(401).send({ message: "refresh token 已失效" });
    }
  });

  app.post("/auth/logout", async (_request, reply) => {
    return reply.send({ ok: true });
  });
};
