# Documentation Index

This file is the routing layer for all project documentation. Before starting any implementation task, read this file first, then follow its routing to load only the docs relevant to your task.

## Global Mandatory Files
Always read these regardless of task type:

| File | Purpose |
|------|---------|
| `.claude/CLAUDE.md` | Always-on project rules (doc sync, stack, skill references) |
| `.claude/skills/planning/SKILL.md` | Planning and interrogation workflow |
| `.claude/skills/dry-utils/SKILL.md` | Utility reuse enforcement |
| `.claude/skills/docs-routing/SKILL.md` | This routing skill itself |

## Task Routing

| Task Type | Read These Files | Code Areas Typically Touched |
|-----------|-----------------|------------------------------|
| Any implementation task | `.claude/skills/planning/SKILL.md` | `.claude/plans/` |
| Frontend tasks | `docs/frontend.md` | `packages/client/src/` |
| Writing a utility function | `.claude/skills/dry-utils/SKILL.md` | `server/utils/`, `server/docs/utils.md` |
| Any task (always) | `docs/index.md` (this file) | — |

## Project Documentation

| File | Purpose |
|------|---------|
| [README.md](../README.md) | Project overview, local and Docker setup |
| [Database schema](database.md) | Schema changes, models, migrations, seeding, query optimization |
| [docs/api.md](api.md) | HTTP API reference — endpoints, auth and refresh flow, campaign state machine, stats |
| [docs/frontend.md](frontend.md) | React SPA architecture, routing, auth flow, component tree, polling, infinite scroll |

## Feature documentation

| File | Covers |
|------|--------|
| `docs/frontend.md` | React SPA architecture, routing, auth flow, component tree, polling, infinite scroll |

> **Note:** This index grows as features and documentation are added. Update it whenever a new `.md` doc file is created or an existing one is removed or renamed.

## How to Use This File

1. Read the **Global Mandatory Files** table — load all of them before any task.
2. Find your task type in **Task Routing** — load only the listed files for that row.
3. Follow the skill workflows defined in the loaded files.
4. After completing your task, update this index if you created or modified any `.md` file.
