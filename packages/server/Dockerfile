FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock* ./
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/
RUN yarn install --frozen-lockfile --production=false
COPY packages/server ./packages/server
WORKDIR /app/packages/server
RUN yarn build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/packages/server/dist ./dist
COPY --from=builder /app/packages/server/migrations ./migrations
COPY package.json yarn.lock* ./
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/
RUN yarn install --production --frozen-lockfile
COPY --from=builder /app/packages/server/package.json ./
EXPOSE 3000
USER node
# WARNING: This container runs seed unconditionally; gate it for production use.
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seed.js && node dist/server.js"]
