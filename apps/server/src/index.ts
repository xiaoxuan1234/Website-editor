import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createServer } from "./app";

const start = async () => {
  const dbPath = process.env.DB_PATH ?? "./data/app.db";
  mkdirSync(dirname(dbPath), { recursive: true });
  const parsedBodyLimit =
    process.env.BODY_LIMIT_BYTES !== undefined
      ? Number(process.env.BODY_LIMIT_BYTES)
      : undefined;
  const bodyLimitBytes =
    typeof parsedBodyLimit === "number" && Number.isFinite(parsedBodyLimit) && parsedBodyLimit > 0
      ? parsedBodyLimit
      : undefined;

  const app = await createServer({
    dbPath,
    jwtSecret: process.env.JWT_SECRET,
    previewBaseUrl: process.env.WEB_PREVIEW_BASE_URL,
    openAIApiKey: process.env.OPENAI_API_KEY,
    openAIBaseUrl: process.env.OPENAI_BASE_URL,
    openAIModel: process.env.OPENAI_MODEL,
    bodyLimitBytes,
  });

  const port = Number(process.env.PORT ?? 8787);
  const host = process.env.HOST ?? "0.0.0.0";

  try {
    await app.listen({ port, host });
    app.log.info(`server running at http://${host}:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
