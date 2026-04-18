# Detailed Plan 1 — Project Setup & Infrastructure

## Context
The project is a blank monorepo. This plan creates the entire scaffolding: Yarn workspaces, TypeScript configs, Docker services, and root scripts. All subsequent plans (DB, API, Frontend) depend on this foundation being in place. Backend will be TypeScript compiled via tsc for production (ts-node for dev).

---

## Decisions Made
- **Backend language:** TypeScript (compiled via tsc → dist/)
- **Package manager:** Yarn Workspaces
- **Server runtime in Docker:** `node dist/app.js` (tsc compiled)
- **shadcn/ui:** deferred to Plan 4

---

## Files to Create / Modify

### 1. `package.json` (repo root) — CREATE
```json
{
  "name": "campaign-manager",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "yarn workspaces run dev",
    "build": "yarn workspaces run build",
    "test": "yarn workspaces run test"
  }
}
```

---

### 2. `packages/server/package.json` — CREATE
```json
{
  "name": "@campaign/server",
  "version": "1.0.0",
  "private": true,
  "main": "dist/app.js",
  "scripts": {
    "dev": "nodemon --watch src --ext ts --exec ts-node src/app.ts",
    "build": "tsc",
    "start": "node dist/app.js",
    "test": "jest --runInBand",
    "db:migrate": "ts-node src/db/migrate.ts",
    "db:seed": "ts-node src/db/seed.ts"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "pg": "^8.11.0",
    "pg-hstore": "^2.3.4",
    "sequelize": "^6.35.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.6",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.0",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.0.0",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "nodemon": "^3.0.0",
    "supertest": "^6.3.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.3.0"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.ts"]
  }
}
```

---

### 3. `packages/server/tsconfig.json` — CREATE
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

### 4. `packages/client/package.json` — CREATE
```json
{
  "name": "@campaign/client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "echo 'No client tests' && exit 0"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}
```

---

### 5. `packages/client/tsconfig.json` — CREATE
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 5b. `packages/client/tsconfig.node.json` — CREATE
```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

---

### 6. `packages/client/vite.config.ts` — CREATE
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
```

---

### 7. `packages/client/tailwind.config.ts` — CREATE
```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
```

---

### 8. `packages/client/postcss.config.js` — CREATE
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

---

### 9. `packages/client/index.html` — CREATE
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Campaign Manager</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### 10. `packages/client/src/index.css` — CREATE
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

### 11. `packages/server/Dockerfile` — CREATE
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
COPY --from=builder /app/packages/server/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/app.js"]
```

---

### 12. `packages/client/Dockerfile` — CREATE
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock* ./
COPY packages/client/package.json ./packages/client/
RUN yarn install --frozen-lockfile
COPY packages/client ./packages/client
WORKDIR /app/packages/client
RUN yarn build

FROM nginx:alpine
COPY --from=builder /app/packages/client/dist /usr/share/nginx/html
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

### 13. `packages/client/nginx.conf` — CREATE
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://server:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

### 14. `docker-compose.yml` — CREATE
```yaml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: campaign_db
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - app-net

  server:
    build:
      context: .
      dockerfile: packages/server/Dockerfile
    env_file: .env
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/campaign_db
      NODE_ENV: production
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - app-net

  client:
    build:
      context: .
      dockerfile: packages/client/Dockerfile
    ports:
      - "80:80"
    depends_on:
      - server
    networks:
      - app-net

volumes:
  pgdata:

networks:
  app-net:
    driver: bridge
```

---

### 15. `.env.example` — CREATE
```
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/campaign_db
JWT_SECRET=changeme
PORT=3000
NODE_ENV=development
```

---

### 16. `.env` — CREATE (local only, not committed)
Same content as `.env.example`. Required so `env_file: .env` in docker-compose works.

---

### 17. `.gitignore` — CREATE
```
node_modules/
dist/
.env
*.log
.DS_Store
coverage/
.yarn/cache
```

---

### 18. `README.md` — CREATE
Sections:
- **Project Overview** — Campaign manager monorepo (Node.js + React)
- **Quick Start** — `cp .env.example .env && docker compose up --build`
- **Environment Variables** — table of `DATABASE_URL`, `JWT_SECRET`, `PORT`, `NODE_ENV`
- **Workspace Structure** — ASCII tree showing `packages/server` and `packages/client`
- **Running Tests** — `yarn workspaces run test`
- **API Reference** — link to `docs/api.md`

---

### 19. `docs/index.md` — MODIFY
Add entries:
- `README.md` — project overview, local dev setup
- `docs/database.md` — schema, migrations (added by Plan 2)
- `docs/api.md` — endpoint reference (added by Plan 3)
- `docs/frontend.md` — component tree, routing (added by Plan 4)

---

### 20. Minimal stub files (makes packages valid before Plans 2–4 fill them in)

**`packages/server/src/app.ts`** — CREATE
```ts
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const PORT = process.env.PORT ?? 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
```

**`packages/client/src/main.tsx`** — CREATE
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div>Campaign Manager — coming soon</div>
  </React.StrictMode>
)
```

---

## Verification Steps
1. `cp .env.example .env`
2. `docker compose up --build` — all three containers start without errors
3. Postgres healthcheck passes (visible in `docker compose logs postgres`)
4. `curl http://localhost:3000/health` → `{"status":"ok"}`
5. Open `http://localhost` in browser → "Campaign Manager — coming soon"
6. `yarn workspaces run test` → exits 0

---

## Critical File Paths Summary
| File | Action |
|------|--------|
| `package.json` | CREATE |
| `.gitignore` | CREATE |
| `.env.example` | CREATE |
| `.env` | CREATE (local) |
| `docker-compose.yml` | CREATE |
| `README.md` | CREATE |
| `docs/index.md` | MODIFY |
| `packages/server/package.json` | CREATE |
| `packages/server/tsconfig.json` | CREATE |
| `packages/server/Dockerfile` | CREATE |
| `packages/server/src/app.ts` | CREATE (stub) |
| `packages/client/package.json` | CREATE |
| `packages/client/tsconfig.json` | CREATE |
| `packages/client/tsconfig.node.json` | CREATE |
| `packages/client/vite.config.ts` | CREATE |
| `packages/client/tailwind.config.ts` | CREATE |
| `packages/client/postcss.config.js` | CREATE |
| `packages/client/index.html` | CREATE |
| `packages/client/nginx.conf` | CREATE |
| `packages/client/Dockerfile` | CREATE |
| `packages/client/src/index.css` | CREATE |
| `packages/client/src/main.tsx` | CREATE (stub) |