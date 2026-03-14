import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import {
  createFallbackProvider,
  createOpenAICompatibleProvider,
} from "@wg/ai-core";
import { createDatabase } from "./db/client";
import { registerAIRoutes } from "./routes/ai";
import { registerAuthRoutes } from "./routes/auth";
import { registerPageRoutes } from "./routes/pages";
import { registerPreviewRoutes } from "./routes/preview";
import { registerProjectRoutes } from "./routes/projects";

export type CreateServerOptions = {
  dbPath?: string;
  jwtSecret?: string;
  previewBaseUrl?: string;
  /** OpenAI 兼容 API，也用于 DeepSeek */
  openAIApiKey?: string;
  openAIBaseUrl?: string;
  openAIModel?: string;
  /** DeepSeek：若设置则优先于 OPENAI_*，用于 AI 网页生成 */
  deepseekApiKey?: string;
  deepseekBaseUrl?: string;
  deepseekModel?: string;
  bodyLimitBytes?: number;
};

export const createServer = async (
  options: CreateServerOptions = {}
): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: true,
    bodyLimit: options.bodyLimitBytes ?? 20 * 1024 * 1024,
  });
  const db = await createDatabase(options.dbPath ?? "./data/app.db");
  const aiProvider =
    options.deepseekApiKey
      ? createOpenAICompatibleProvider({
          apiKey: options.deepseekApiKey,
          baseUrl: options.deepseekBaseUrl ?? "https://api.deepseek.com",
          model: options.deepseekModel ?? "deepseek-chat",
        })
      : options.openAIApiKey
        ? createOpenAICompatibleProvider({
            apiKey: options.openAIApiKey,
            baseUrl: options.openAIBaseUrl,
            model: options.openAIModel,
          })
        : createFallbackProvider();

  app.decorate("services", {
    db,
    aiProvider,
    previewBaseUrl: options.previewBaseUrl ?? "http://localhost:5173",
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    maxAge: 86400,
  });

  await app.register(jwt, {
    secret: options.jwtSecret ?? "dev-secret-change-me",
  });

  app.decorate("authenticate", async (request) => {
    await request.jwtVerify();
    const authUser = request.user as {
      tokenType?: "access" | "refresh";
    };
    if (authUser.tokenType !== "access") {
      throw Object.assign(new Error("Access token required"), { statusCode: 401 });
    }
  });

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      code: "NOT_FOUND",
      message: `Route ${request.method} ${request.url} not found`,
    });
  });

  app.setErrorHandler((error, _request, reply) => {
    if (reply.sent) {
      return;
    }

    const fastifyCode = (error as { code?: string }).code;
    let statusCode =
      typeof (error as { statusCode?: unknown }).statusCode === "number"
        ? Number((error as { statusCode?: number }).statusCode)
        : 500;
    let code = fastifyCode ?? "SERVER_ERROR";
    const rawMessage = error instanceof Error ? error.message : "";
    let message = rawMessage || "服务器错误";

    if (fastifyCode === "FST_ERR_CTP_BODY_TOO_LARGE") {
      statusCode = 413;
      code = "BODY_TOO_LARGE";
      message = "请求体过大，请压缩图片后重试";
    }

    if (fastifyCode === "FST_JWT_NO_AUTHORIZATION_IN_HEADER") {
      statusCode = 401;
      code = "UNAUTHORIZED";
      message = "未登录或登录已失效";
    }

    if (statusCode < 400 || statusCode > 599) {
      statusCode = 500;
    }

    reply.code(statusCode).send({ code, message });
  });

  await registerAuthRoutes(app);
  await registerProjectRoutes(app);
  await registerPageRoutes(app);
  await registerPreviewRoutes(app);
  await registerAIRoutes(app);

  app.get("/health", async () => ({ ok: true, timestamp: Date.now() }));

  return app;
};
