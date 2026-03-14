# Web Generator V2 (Monorepo)

This repository now uses a `pnpm` workspace with a frontend app, backend API, and shared packages for schema/editor/AI logic.

## Structure

- `apps/web`: Vue 3 + Vite editor UI
- `apps/server`: Fastify + TypeScript API
- `packages/schema`: shared zod schemas and TS types
- `packages/editor-core`: command model, history stack, tree operations
- `packages/ai-core`: AI provider abstraction and OpenAI-compatible adapter

## Requirements

- Node.js 20+
- pnpm 10+

## Install

```bash
pnpm install
```

## Run in development

```bash
# run web + server in parallel
pnpm dev

# run only web
pnpm dev:web

# run only server
pnpm dev:server
```

- Web default: `http://localhost:5173`
- Server default: `http://localhost:8787`

## Default login

- username: `admin`
- password: `admin123`

The admin user is auto-seeded on first server start.

## Build and test

```bash
pnpm -r build
pnpm -r test
```

## E2E (Playwright)

```bash
# install browser once
pnpm exec playwright install chromium

# run e2e suite
pnpm test:e2e
```

## Server environment variables

- `PORT` (default `8787`)
- `HOST` (default `0.0.0.0`)
- `DB_PATH` (default `./data/app.db`)
- `JWT_SECRET` (default `dev-secret-change-me`)
- `WEB_PREVIEW_BASE_URL` (default `http://localhost:5173`)
- **AI 网页生成**（二选一，DeepSeek 优先）：
  - `DEEPSEEK_API_KEY`（推荐）：设置后使用 DeepSeek 生成，无需再配 base/model）
  - `DEEPSEEK_BASE_URL`（可选，默认 `https://api.deepseek.com`）
  - `DEEPSEEK_MODEL`（可选，默认 `deepseek-chat`）
  - 或使用 OpenAI：`OPENAI_API_KEY`、`OPENAI_BASE_URL`、`OPENAI_MODEL`
- 未配置任何 API Key 时使用内置模板回退。

在 `apps/server` 下复制 `.env.example` 为 `.env` 并填入 Key 即可（不要提交 `.env`）。

## Key API endpoints

- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /projects`
- `POST /projects`
- `GET /projects/:id`
- `POST /projects/:projectId/pages`
- `GET /pages/:id`
- `PUT /pages/:id/draft`
- `POST /pages/:id/publish`
- `GET /pages/:id/export-zip`
- `POST /preview`
- `GET /preview/:slug`
- `POST /ai/page/generate`
