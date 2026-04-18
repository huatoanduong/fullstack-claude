# Plan 1 — Project Setup & Infrastructure

## A. Context
The project is a blank monorepo. Before any backend or frontend code can be written, the workspace structure, shared tooling, and Docker environment must be in place. Without this, backend and frontend agents cannot work in parallel or share a consistent dev environment. This plan scaffolds the foundation that all other plans depend on.

## B. File-Level Changes

**File:** `package.json` (repo root) — CREATE
- Yarn workspaces config pointing to `packages/*`
- Scripts: `dev`, `build`, `test` delegating to workspaces
- No runtime dependencies at root level

**File:** `packages/server/package.json` — CREATE
- Name: `@campaign/server`
- Dependencies: express, sequelize, pg, pg-hstore, jsonwebtoken, bcryptjs, zod, dotenv, cors
- DevDependencies: jest, supertest, nodemon, typescript types

**File:** `packages/client/package.json` — CREATE
- Name: `@campaign/client`
- Vite + React 18 + TypeScript
- Dependencies: react-router-dom, @tanstack/react-query, zustand, axios, tailwindcss, shadcn/ui

**File:** `packages/server/Dockerfile` — CREATE
- Base: `node:20-alpine`
- WORKDIR `/app`, copy package files, `yarn install --frozen-lockfile`
- Copy source, expose port 3000, CMD `node src/app.js`

**File:** `packages/client/Dockerfile` — CREATE
- Multi-stage: build stage with Vite, serve stage with nginx:alpine
- Build: `yarn build`, output to `/dist`
- Serve: copy dist to nginx html dir, expose port 80

**File:** `docker-compose.yml` — CREATE
- Services: `postgres` (postgres:16-alpine, volume for data persistence), `server` (build from packages/server, env vars from .env, depends_on postgres), `client` (build from packages/client, depends_on server)
- Network: `app-net` bridging all three
- Named volume: `pgdata`

**File:** `.env.example` — CREATE
- `DATABASE_URL=postgresql://postgres:postgres@postgres:5432/campaign_db`
- `JWT_SECRET=changeme`
- `PORT=3000`
- `NODE_ENV=development`

**File:** `packages/server/tsconfig.json` — CREATE (if TypeScript used server-side, else skip)
- Target ES2022, module CommonJS

**File:** `packages/client/tsconfig.json` — CREATE
- Strict mode, path aliases for `@/` → `src/`

**File:** `packages/client/vite.config.ts` — CREATE
- React plugin, server proxy `/api` → `http://server:3000`

**File:** `.gitignore` — CREATE
- `node_modules`, `dist`, `.env`, `*.log`, `.DS_Store`

## C. Documentation Update
**File:** `README.md` — CREATE
- Sections: Project Overview, Local Setup (`docker compose up`), Environment Variables table, Workspace Structure diagram
- Must document the `docker compose up` workflow per assessment submission requirements

**File:** `docs/index.md` — MODIFY
- Add entry for `README.md` under task type "project setup / local dev"

## D. Verification Steps
1. Run `docker compose up --build` from repo root
2. Confirm postgres container is healthy
3. Confirm server container starts on port 3000 (curl `http://localhost:3000/health`)
4. Confirm client container serves on port 80 (open browser)
5. Run `yarn workspaces run test` — should exit cleanly with no test failures
