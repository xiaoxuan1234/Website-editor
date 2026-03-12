import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const pages = sqliteTable("pages", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull(),
  version: integer("version").notNull(),
  draftJson: text("draft_json").notNull(),
  publishedVersionId: text("published_version_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const pageVersions = sqliteTable("page_versions", {
  id: text("id").primaryKey(),
  pageId: text("page_id").notNull(),
  version: integer("version").notNull(),
  snapshotJson: text("snapshot_json").notNull(),
  createdAt: text("created_at").notNull(),
});

export const previewTokens = sqliteTable("preview_tokens", {
  id: text("id").primaryKey(),
  pageVersionId: text("page_version_id").notNull(),
  slug: text("slug").notNull().unique(),
  expiresAt: text("expires_at"),
  createdAt: text("created_at").notNull(),
});

export const aiLogs = sqliteTable("ai_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  projectId: text("project_id").notNull(),
  pageId: text("page_id").notNull(),
  targetNodeId: text("target_node_id").notNull(),
  prompt: text("prompt").notNull(),
  responseJson: text("response_json").notNull(),
  createdAt: text("created_at").notNull(),
});
