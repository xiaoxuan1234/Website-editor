import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import {
  aiLogs,
  pageVersions,
  pages,
  previewTokens,
  projects,
  users,
} from "./schema";

type DatabaseBundle = {
  client: Client;
  db: ReturnType<typeof drizzle>;
};

const createSchemaSql = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    version INTEGER NOT NULL,
    draft_json TEXT NOT NULL,
    published_version_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS page_versions (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS preview_tokens (
    id TEXT PRIMARY KEY,
    page_version_id TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    expires_at TEXT,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS ai_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    target_node_id TEXT NOT NULL,
    prompt TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
];

const normalizeDbPath = (dbPath: string) => {
  if (dbPath.startsWith("file:")) {
    return dbPath;
  }
  if (dbPath === ":memory:") {
    return "file::memory:?cache=shared";
  }
  return `file:${dbPath}`;
};

export const createDatabase = async (dbPath: string): Promise<DatabaseBundle> => {
  const client = createClient({
    url: normalizeDbPath(dbPath),
  });

  for (const statement of createSchemaSql) {
    await client.execute(statement);
  }

  const db = drizzle(client, {
    schema: {
      aiLogs,
      pageVersions,
      pages,
      previewTokens,
      projects,
      users,
    },
  });

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, "admin"))
    .get();

  if (!existing) {
    await db
      .insert(users)
      .values({
        id: "user-admin",
        username: "admin",
        passwordHash: hashSync("admin123", 10),
        createdAt: new Date().toISOString(),
      })
      .run();
  }

  return { client, db };
};

export type AppDatabase = {
  client: DatabaseBundle["client"];
  db: DatabaseBundle["db"];
};
