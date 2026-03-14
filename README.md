# 网页编辑器(毕业设计)

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
- `OPENAI_API_KEY` (optional, if missing uses fallback provider)
- `OPENAI_BASE_URL` (optional, default OpenAI endpoint)
- `OPENAI_MODEL` (optional, default `gpt-4.1-mini`)

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
- `GET /pages/:id/export-json`
- `POST /preview`
- `GET /preview/:slug`
- `POST /ai/content/generate`
