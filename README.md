# Campaign Manager

## Project Overview

Campaign Manager is a full-stack sample application for planning and tracking **email-style campaigns**: you maintain a **recipient list**, compose **draft campaigns** (name, subject, body), attach recipients, **schedule** sends for a future time, or **send** immediately. The API models a realistic lifecycle (**draft → scheduled → sending → sent**) with per-recipient stats (sent, failed, opened) and a **simulated** send path so you can exercise the flow without a real mail provider.

The repository is a **Yarn workspaces** monorepo:

- **`packages/server`** — Express + TypeScript API, Sequelize + PostgreSQL, Zod validation, JWT access tokens and rotating refresh tokens (stored hashed in the database).
- **`packages/client`** — React 18 SPA (Vite), React Router, TanStack Query, Zustand for auth, Tailwind and shadcn-style UI primitives. The dev server proxies `/api` to the backend on port `3000`.

Design and HTTP behavior are documented under **`docs/`** (see [docs/index.md](docs/index.md)): [docs/api.md](docs/api.md) for endpoints and the campaign state machine, [docs/database.md](docs/database.md) for schema and migrations, [docs/frontend.md](docs/frontend.md) for the SPA structure and UX patterns.

## Quick Start

### Prerequisites

- **Docker Compose** (recommended): Docker Engine with Compose v2 so you can run PostgreSQL, the API, and the static client from one command.
- **Local development without Docker** (optional): Node.js **18+**, Yarn (Classic), and a reachable **PostgreSQL 16** instance.

### Run everything with Docker

1. **Clone** the repository and open a shell at the repo root.

2. **Environment file** — copy the example env file to `.env` so Compose and the server can read secrets and connection settings:
   - macOS / Linux: `cp .env.example .env`
   - Windows (PowerShell): `Copy-Item .env.example .env`

3. **Review `.env`** — at minimum, change `JWT_SECRET` and `REFRESH_SECRET` if you expose the stack beyond localhost. `docker-compose.yml` overrides `DATABASE_URL` for the server container to point at the bundled Postgres service; your `.env` still supplies signing secrets.

4. **Start the stack** (builds images on first run):

   ```bash
   docker compose up --build
   ```

5. **Initialize the database** — on container start, the API image runs migrations (and demo seed) before starting the server. On the first run this may take a few seconds; subsequent restarts are typically fast.

   After seeding, you can sign in as **demo@example.com** with password **password**, or register a new account from the UI.

6. **Open the app** — when containers are healthy and migrations have completed:
   - **Web UI**: [http://localhost:8080](http://localhost:8080) — static build served by nginx inside the client container (host **8080** avoids binding host port **80**, which often needs elevation on Windows).
   - **API**: [http://localhost:3000](http://localhost:3000) — e.g. `GET /health` for a quick check.
   - **PostgreSQL**: `localhost:5432` (user/password/database match `docker-compose.yml` / `.env.example`).

### Run locally (API + Vite, Postgres on the host)

Use this when you want hot reload on the server (`nodemon`) or the Vite dev server.

1. Install dependencies from the repo root: `yarn install`.

2. Ensure PostgreSQL is running and create a database (e.g. `campaign_db`).

3. Set **`DATABASE_URL`** in `.env` to your host Postgres (not the `postgres` hostname from the example file — use `localhost` or `127.0.0.1`), and set `JWT_SECRET`, `REFRESH_SECRET`, `PORT`, `NODE_ENV` as needed.

4. Apply schema and optional seed:

   ```bash
   yarn workspace @campaign/server db:migrate
   yarn workspace @campaign/server db:seed
   ```

5. In **two terminals** from the repo root:
   - API: `yarn workspace @campaign/server dev`
   - Client: `yarn workspace @campaign/client dev` — Vite serves the SPA and proxies `/api` to `http://localhost:3000`.

Then use the URL printed by Vite (by default **5173**) in the browser.

## Environment Variables

| Variable          | Description                                                                 |
|-------------------|------------------------------------------------------------------------------|
| `DATABASE_URL`    | PostgreSQL connection string (used by Sequelize)                             |
| `JWT_SECRET`      | Secret used to sign access JWTs (change in production)                      |
| `REFRESH_SECRET`  | Secret used to sign refresh JWTs (change in production)                    |
| `PORT`            | HTTP port for the API (default `3000`)                                     |
| `NODE_ENV`        | `development`, `production`, or `test`                                     |

## Workspace Structure

```
.
├── packages/
│   ├── server/     # Express API (TypeScript → dist/)
│   └── client/     # React SPA (Vite)
├── docker-compose.yml
└── docs/
```

## Running Tests

From the repository root:

```bash
yarn workspaces run test
```

The server package also defines **`test:docker`**, which runs Jest against a disposable Postgres defined in `docker-compose.test.yml`.

## API Reference

Endpoint documentation lives in [docs/api.md](docs/api.md).



## How I Used Claude Code

I used Claude mostly for planning and designing before actual coding. I drive them with the context given, and it sometime consult me with some edge cases that I may miss. 
I always start with the `Plan mode`, then process only if the plan meet my expectation.
For everytime it makes a new plan:
  - Need to save the plan file, no premature execution.
  - The changes need to be documented, whether in the `docs/index.md` file, or new document file (But need to be referenced back to `docs/index.md`)
But the rule of thumb is that I provide the context and modify the plan until it fit the context with no assumption.

1. **What tasks I delegated to Claude Code**
   - **Requirements and scope** — Turn the assessment brief and project docs into a concrete checklist: behaviors to support, API routes, domain states (for example the campaign lifecycle), and edge cases so nothing important was skipped.
   - **Design before code** — Reason about API contracts, error handling, and how data fits together (schema and invariants) before touching implementation, aligned with patterns already used in the monorepo.
   - **Implementation breakdown** — Propose a sensible sequence of work (for example database and migrations → API → client → tests/Docker), so each step builds on the last.
   - **Per-file change list** — Identify which files to add or touch and describe the concrete change needed in each file (keeps implementation scoped and reviewable).
   - **Out-of-scope callouts** — Explicitly flag what not to do (yet) to prevent scope creep and keep the work aligned with the assessment.
   - **Consistency checks** — Keep naming, folder layout, and validation patterns consistent with the existing server/client code (so changes feel native to the codebase).

2. **2–3 real prompts I used**

   **Prompt 1 — High-level multi-plan breakdown (with Docker)**

   ```text
   You are a senior full‑stack engineer. I will implement later (possibly using other agents).

   ## Context
   This repo is a take‑home assessment. The required tech stack and functional requirements are already defined in `assessment.md` (and any related docs in this repo). Do NOT invent a different stack—follow the assessment.

   ## Task
   Break the work into a set of HIGH‑LEVEL implementation plans that I can execute later.

   ## Requirements
   - Produce MULTIPLE separate plans (not one giant plan).
   - Keep each plan high‑level (I will request detailed, file-by-file plans later).
   - Include containerization as a first-class concern:
     - The final solution must include a `Dockerfile`
     - And a `docker-compose.yml` that runs the whole system (app + dependencies)
   - Keep plans aligned with the repo’s existing structure and constraints.

   ## Output format
   Return:
   1) A short “Assumptions / Inputs used” section listing which files you relied on (e.g., `assessment.md`, `docs/*`).
   2) Then a numbered list of plans. For each plan include:
      - Goal (1–2 sentences)
      - Scope (what’s included / excluded)
      - Key deliverables (bullets)
      - Dependencies (what must exist first)
      - Success criteria (how I know it’s done)

   Do not include detailed code, migrations, or step-by-step commands unless I ask.
   Start by reading the assessment requirements and any referenced docs in this repo, then produce the plans.
   Please ask me one question at a time, until it's clear to make a plan.
   ```

   **Prompt 2 — Docker/Compose-focused plan (high-level, production-minded)**

   ```text
   Read `README.md`, `assessment.md`, and `docs/index.md` (+ any docs it links to). Then propose a HIGH‑LEVEL plan to run the whole system with Docker Compose on Windows (Docker Desktop + Compose v2).

   Ground rules:
   - Don’t change the tech stack or invent requirements.
   - Stay high-level (describe what we should do, not the exact file contents).
   - If anything is unclear, ask me ONE question at a time and wait. Never assume.

   The plan must cover:
   - Docker build approach:
     - Do we use one Dockerfile at the repo root or one per package? Explain the trade-off.
     - Sketch a multi-stage approach (deps → build → runtime) and how you’d structure layers for good caching in a Yarn workspaces monorepo.
   - Compose stack:
     - A `docker-compose.yml` that runs end-to-end: DB + API + client (plus anything else the docs require).
     - For each service, list: build/image, ports, env vars (and where they come from: `.env` vs compose), volumes, health check, restart policy, and how it reaches other services (service DNS names vs `host.docker.internal`).
   - Boot sequence:
     - Startup order and readiness (what “healthy” means for each service).
     - Where migrations/seed run (first run vs restarts) and how we avoid race conditions.
   - Windows-specific gotchas:
     - Port conflicts, CRLF/entrypoint scripts, bind-mount performance, file watching, and why we should avoid host-mounted `node_modules`.

   Output (keep it structured):
   - A short text-only “diagram” of the architecture (include ports)
   - A checklist of deliverables (files to add/change)
   - A minimal happy-path runbook (3–6 steps; keep commands minimal)
   ```

   **Prompt 3 — Detailed Plan 1 (file-by-file implementation plan)**

   ```text
   You’re a senior full‑stack engineer working in this repo. Read `assessment.md`, `README.md`, and `docs/index.md` (+ every doc it links to). Don’t write code yet — I only want a detailed implementation plan for ONE plan. Don’t change the required tech stack or invent requirements. If anything is unclear, stop and ask me ONE question at a time (don’t assume).

   Task: pick the best “Plan 1” to implement first (based on dependencies and risk), then write the detailed plan.

   Your output must include:
   - A short Plan 1 summary (what it delivers + what’s out of scope).
   - A file-by-file change list: What file need to be changed, and what changes need to be made.
   - Update the `docs/index.md` file for what changes are made.
   ```

3. **Where Claude Code was wrong or needed correction**
   - By the first implementation, it was wrong when making the seed.ts file, but not include them in the build process.
   - For some point in time, it's eager to go to the process phase without saving the plan for me to preview first. At that time, I need to explicit ask them to save the plan file to .claude/plans folder, then I revised some points, and only process when it meets my expectation.

4. **What I would not let Claude Code do — and why**
   - I would not let it run any test script by itself, I asked them to provide me the script, I reviewed and run them in my own terminal, then provide it the output. It's for preventing any deletion or modification without asking for my concern.
   - Using MCP without any of my awareness, or commit code directly. I always review the diff of the changed files before pressing commit. It's for prevent any environment variable exposure, or any security threat may occur.  

