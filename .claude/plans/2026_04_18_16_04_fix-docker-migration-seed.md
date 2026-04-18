# Fix Docker Migration Flow + Seed

## Context
The server container crashes on startup because the `refresh_tokens` table (and all other tables) don't exist. The migration SQL files exist at `packages/server/migrations/` and there's a working `migrate.ts` script, but the Dockerfile never copies the migrations folder into the image and never runs migrations — it only starts the server directly. Additionally, after wiping volumes the DB is empty so login returns 401 — the seed must also run to create the demo user.

## Changes

### 1. `packages/server/Dockerfile`
- Copy the `migrations/` folder from the builder stage into the final image at `/app/migrations`
- Change `CMD` to run migrations, then seed, then start the server

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock* ./
COPY packages/server/package.json ./packages/server/
RUN yarn install --frozen-lockfile --production=false
COPY packages/server ./packages/server
WORKDIR /app/packages/server
RUN yarn build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/migrations ./migrations
COPY --from=builder /app/packages/server/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seed.js && node dist/server.js"]
```

**Why this works:**
- `runAllMigrations.ts` resolves migrations as `path.join(__dirname, '../../migrations')` → `/app/migrations/`
- `seed.ts` uses `findOrCreate` throughout — safe to run on every startup (idempotent)
- Seed creates demo user: `demo@example.com` / `password`

## Verification
```bash
docker compose down -v        # remove old volumes to start fresh
docker compose up --build     # rebuild image and start
curl http://localhost:3000/health           # direct backend check
curl http://localhost:8080/api/health       # via Nginx proxy
# login with demo@example.com / password
curl -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"password"}'
```

Expected: health returns `200 OK`, login returns `200` with `accessToken` and `refreshToken`.
# Fix Docker Migration Flow + Seed

## Context
The server container crashes on startup because the `refresh_tokens` table (and all other tables) don't exist. The migration SQL files exist at `packages/server/migrations/` and there's a working `migrate.ts` script, but the Dockerfile never copies the migrations folder into the image and never runs migrations — it only starts the server directly. Additionally, after wiping volumes the DB is empty so login returns 401 — the seed must also run to create the demo user.

## Changes

### 1. `packages/server/Dockerfile`
- Copy the `migrations/` folder from the builder stage into the final image at `/app/migrations`
- Change `CMD` to run migrations, then seed, then start the server

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock* ./
COPY packages/server/package.json ./packages/server/
RUN yarn install --frozen-lockfile --production=false
COPY packages/server ./packages/server
WORKDIR /app/packages/server
RUN yarn build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/migrations ./migrations
COPY --from=builder /app/packages/server/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seed.js && node dist/server.js"]
```

**Why this works:**
- `runAllMigrations.ts` resolves migrations as `path.join(__dirname, '../../migrations')` → `/app/migrations/`
- `seed.ts` uses `findOrCreate` throughout — safe to run on every startup (idempotent)
- Seed creates demo user: `demo@example.com` / `password`

## Verification
```bash
docker compose down -v        # remove old volumes to start fresh
docker compose up --build     # rebuild image and start
curl http://localhost:3000/health           # direct backend check
curl http://localhost:8080/api/health       # via Nginx proxy
# login with demo@example.com / password
curl -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@example.com","password":"password"}'
```

Expected: health returns `200 OK`, login returns `200` with `accessToken` and `refreshToken`.
