import type { FastifyRequest } from "fastify";
import type { AIProvider } from "@wg/ai-core";
import type { AppDatabase } from "./db/client";

declare module "fastify" {
  interface FastifyInstance {
    services: {
      db: AppDatabase;
      aiProvider: AIProvider;
      previewBaseUrl: string;
    };
    authenticate: (request: FastifyRequest) => Promise<void>;
  }

  interface FastifyRequest {
    user: {
      sub: string;
      username: string;
      tokenType: "access" | "refresh";
    };
  }
}
