# Plan 3 — Backend API (Detailed)

## A. Context

Implements all 11 REST endpoints for the Mini Campaign Manager using **TypeScript**, Express, Sequelize, JWT (1h access + 7d refresh tokens), and Zod validation. Campaign status transitions follow a strict state machine: `draft → scheduled → sending → sent`. The async send simulation uses batch processing with 100–200ms delays. Tests run against a **real PostgreSQL database via Docker** using a dedicated `docker-compose.test.yml`. This plan builds on Plan 1 (project scaffold) and Plan 2 (Sequelize models).

---

## B. Sub-Agent Focus Areas

### Sub-Agent 1 — App Entry Point & Middleware

**Files to create:**

#### `packages/server/src/types/index.ts` — NEW
Augments Express `Request` with `user` field and defines shared response types.
```ts
import { Request } from 'express';

export interface AuthPayload {
  userId: string;
  email: string;
  name: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
}
```

#### `packages/server/src/app.ts` — NEW
Express application factory (exported separately from server entry point so tests can import it cleanly).
- Import: `express`, `cors`, `dotenv`
- Apply middleware in order: `cors()`, `express.json()`
- Mount routes: `GET /health` → `{ status: 'ok', timestamp }`, `/auth` → authRouter, `/campaigns` → campaignsRouter, `/recipients` → recipientsRouter
- Register `errorHandler` as the last middleware
- Export `app` (do NOT call `app.listen()` here)

#### `packages/server/src/server.ts` — NEW
Entry point that starts the HTTP server.
```ts
import app from './app';
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

#### `packages/server/src/middleware/auth.ts` — NEW
`requireAuth` middleware:
1. Read `Authorization` header; expect `Bearer <token>`
2. If missing or malformed → `res.status(401).json({ error: 'Missing or invalid token' })`
3. Call `jwt.verify(token, process.env.JWT_SECRET!)` in try/catch
4. On success: cast payload to `AuthPayload`, attach to `req.user`, call `next()`
5. On failure: `res.status(401).json({ error: 'Token expired or invalid' })`

#### `packages/server/src/middleware/validate.ts` — NEW
Higher-order middleware factory that wraps Zod schema validation:
```ts
import { ZodSchema } from 'zod';
export const validate = (schema: ZodSchema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Validation failed', details: result.error.flatten() });
  }
  req.body = result.data; // replace with parsed/coerced data
  next();
};
```

#### `packages/server/src/middleware/errorHandler.ts` — NEW
Express error handler (4-argument signature):
- Map known error names: `SequelizeUniqueConstraintError` → 409, `SequelizeValidationError` → 400
- Catch-all: `res.status(500).json({ error: 'Internal server error' })`
- Always log `err` to `console.error` in non-test environments

---

### Sub-Agent 2 — Auth Routes & JWT Service

**Files to create:**

#### `packages/server/src/services/authService.ts` — NEW
Centralises all JWT and refresh token logic.

**Access token:**
- `signAccessToken(payload: AuthPayload): string` — `jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' })`
- `verifyAccessToken(token: string): AuthPayload` — `jwt.verify(token, JWT_SECRET) as AuthPayload`

**Refresh token:**
- `signRefreshToken(userId: string): string` — `jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: '7d' })`
- `verifyRefreshToken(token: string): { userId: string }` — verify with REFRESH_SECRET

**DB-backed refresh token storage** (uses a new `RefreshToken` Sequelize model — see below):
- `saveRefreshToken(userId: string, token: string): Promise<void>` — hash token with bcrypt cost 8, upsert into `refresh_tokens`
- `revokeRefreshToken(token: string): Promise<void>` — find by token hash, delete
- `validateRefreshToken(token: string): Promise<boolean>` — compare against stored hash

#### `packages/server/src/db/models/RefreshToken.ts` — NEW
Add to the models directory alongside Plan 2 models.
```ts
// Fields: id (UUID PK), user_id (FK → users), token_hash (string), expires_at (Date), created_at
```
- Belongs to User (`User.hasMany(RefreshToken)`)
- Index on `token_hash` for lookup speed

**Note:** This model requires a new migration file `005_create_refresh_tokens.sql` (append to Plan 2's migrations).

#### `packages/server/src/routes/auth.ts` — NEW

**Zod schemas:**
```ts
const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});
const RefreshSchema = z.object({
  refreshToken: z.string(),
});
```

**`POST /auth/register`** — `validate(RegisterSchema)`:
1. Check `User.findOne({ where: { email } })`; if exists → 409 `{ error: 'Email already registered' }`
2. Hash password: `bcrypt.hash(password, 12)`
3. Create user: `User.create({ id: uuidv4(), email, name, password_hash })`
4. Generate access + refresh tokens via `authService`
5. Save refresh token via `authService.saveRefreshToken`
6. Return 201 `{ user: { id, email, name }, accessToken, refreshToken }`

**`POST /auth/login`** — `validate(LoginSchema)`:
1. `User.findOne({ where: { email } })` → if not found → 401
2. `bcrypt.compare(password, user.password_hash)` → if false → 401
3. Generate both tokens, save refresh token
4. Return 200 `{ user: { id, email, name }, accessToken, refreshToken }`

**`POST /auth/refresh`** — `validate(RefreshSchema)`:
1. `authService.verifyRefreshToken(refreshToken)` → get `userId`
2. `authService.validateRefreshToken(refreshToken)` → if false → 401
3. Load user from DB
4. Revoke old refresh token, generate new pair, save new refresh token
5. Return 200 `{ accessToken, refreshToken }`

**`POST /auth/logout`** — `requireAuth`:
1. Read `refreshToken` from body
2. `authService.revokeRefreshToken(refreshToken)`
3. Return 204

---

### Sub-Agent 3 — Campaign Routes

**Files to create:**

#### `packages/server/src/routes/campaigns.ts` — NEW

**Zod schemas:**
```ts
const CreateCampaignSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(255),
  body: z.string().min(1),
  recipientIds: z.array(z.string().uuid()).optional(),
});
const UpdateCampaignSchema = CreateCampaignSchema.partial();
const ScheduleSchema = z.object({
  scheduled_at: z.string().datetime(), // ISO 8601
});
```

All routes use `requireAuth` middleware.

**`GET /campaigns`** — Paginated list:
1. Parse `page` (default 1) and `limit` (default 10, max 100) from query params
2. `Campaign.findAndCountAll({ where: { created_by: req.user.userId }, limit, offset: (page-1)*limit, order: [['created_at', 'DESC']] })`
3. Return `{ data: campaigns, pagination: { page, limit, total, totalPages } }`

**`POST /campaigns`** — `validate(CreateCampaignSchema)`:
1. Create campaign: `Campaign.create({ id: uuidv4(), ...body, status: 'draft', created_by: req.user.userId })`
2. If `recipientIds` provided: bulk create `CampaignRecipient` rows with `status: 'pending'`
3. Return 201 with the created campaign

**`GET /campaigns/:id`**:
1. `Campaign.findOne({ where: { id, created_by: req.user.userId }, include: [{ model: Recipient }] })`
2. If not found → 404 `{ error: 'Campaign not found' }`
3. Return 200 with campaign + recipients array

**`PATCH /campaigns/:id`** — `validate(UpdateCampaignSchema)`:
1. Load campaign (scoped to `req.user.userId`); 404 if missing
2. If `campaign.status !== 'draft'` → 409 `{ error: 'Only draft campaigns can be edited' }`
3. `await campaign.update(req.body)` (only whitelisted fields: name, subject, body)
4. Return 200 with updated campaign

**`DELETE /campaigns/:id`**:
1. Load campaign; 404 if missing
2. If `campaign.status !== 'draft'` → 409 `{ error: 'Only draft campaigns can be deleted' }`
3. Delete associated `CampaignRecipient` rows first (Sequelize cascade or manual)
4. `await campaign.destroy()`
5. Return 204

**`POST /campaigns/:id/schedule`** — `validate(ScheduleSchema)`:
1. Load campaign; 404 if missing
2. If `campaign.status !== 'draft'` → 409 `{ error: 'Only draft campaigns can be scheduled' }`
3. Parse `scheduled_at`; if `new Date(scheduled_at) <= new Date()` → 400 `{ error: 'scheduled_at must be a future date' }`
4. `await campaign.update({ status: 'scheduled', scheduled_at })`
5. Return 200 with updated campaign

**`POST /campaigns/:id/send`**:
1. Load campaign; 404 if missing
2. If `campaign.status !== 'draft' && campaign.status !== 'scheduled'` → 409
3. Call `sendService.sendAsync(campaign.id)` (non-blocking — do NOT await)
4. Return 202 `{ message: 'Send initiated' }`

**`GET /campaigns/:id/stats`**:
1. Load campaign; 404 if missing
2. Call `statsService.getStats(campaign.id)`
3. Return 200 with stats object

---

### Sub-Agent 4 — Recipients Routes

**Files to create:**

#### `packages/server/src/routes/recipients.ts` — NEW

**Zod schema:**
```ts
const CreateRecipientSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
});
```

Both routes use `requireAuth` middleware.

**`GET /recipients`**:
1. `Recipient.findAll({ order: [['created_at', 'DESC']] })`
2. Return 200 `{ data: recipients }`

**`POST /recipient`** — `validate(CreateRecipientSchema)`:
1. Check `Recipient.findOne({ where: { email } })`; if exists → 409 `{ error: 'Email already exists' }`
2. `Recipient.create({ id: uuidv4(), email, name })`
3. Return 201 with created recipient

---

### Sub-Agent 5 — Services (Send & Stats)

**Files to create:**

#### `packages/server/src/services/sendService.ts` — NEW

```ts
export async function sendAsync(campaignId: string): Promise<void> {
  // 1. Immediately set campaign status = 'sending'
  await Campaign.update({ status: 'sending' }, { where: { id: campaignId } });

  // 2. Load all pending recipients
  const recipients = await CampaignRecipient.findAll({
    where: { campaign_id: campaignId, status: 'pending' }
  });

  // 3. Process in batches of 10 with 100-200ms delay between batches
  const BATCH_SIZE = 10;
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (r) => {
      const success = Math.random() < 0.8; // 80% sent, 20% failed
      await r.update({
        status: success ? 'sent' : 'failed',
        sent_at: new Date(),
      });
    }));
    if (i + BATCH_SIZE < recipients.length) {
      await delay(100 + Math.random() * 100); // 100-200ms
    }
  }

  // 4. Mark campaign as sent
  await Campaign.update({ status: 'sent' }, { where: { id: campaignId } });
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

Call `sendAsync` wrapped in `setImmediate` in the route to ensure HTTP response is sent first:
```ts
// In route handler:
setImmediate(() => sendService.sendAsync(campaign.id).catch(console.error));
res.status(202).json({ message: 'Send initiated' });
```

#### `packages/server/src/services/statsService.ts` — NEW

Uses a single Sequelize raw query for efficiency:
```ts
export async function getStats(campaignId: string) {
  const [result] = await sequelize.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'sent') AS sent,
      COUNT(*) FILTER (WHERE status = 'failed') AS failed,
      COUNT(*) FILTER (WHERE opened_at IS NOT NULL) AS opened
    FROM campaign_recipients
    WHERE campaign_id = :campaignId
  `, { replacements: { campaignId }, type: QueryTypes.SELECT });

  const { total, sent, failed, opened } = result as any;
  return {
    total: Number(total),
    sent: Number(sent),
    failed: Number(failed),
    opened: Number(opened),
    open_rate: Number(sent) > 0 ? Number(opened) / Number(sent) : 0,
    send_rate: Number(total) > 0 ? Number(sent) / Number(total) : 0,
  };
}
```

---

### Sub-Agent 6 — Tests & Docker Test Setup

**Files to create:**

#### `docker-compose.test.yml` — NEW (project root)
Isolated test environment with a separate DB:
```yaml
version: '3.9'
services:
  postgres-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: campaign_test
    ports:
      - "5433:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 5s
      timeout: 3s
      retries: 10

  server-test:
    build:
      context: ./packages/server
      dockerfile: Dockerfile.test
    environment:
      DATABASE_URL: postgres://test:test@postgres-test:5432/campaign_test
      JWT_SECRET: test-jwt-secret
      REFRESH_SECRET: test-refresh-secret
      NODE_ENV: test
    depends_on:
      postgres-test:
        condition: service_healthy
    command: yarn test
```

#### `packages/server/Dockerfile.test` — NEW
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
CMD ["yarn", "test"]
```

#### `packages/server/jest.config.ts` — NEW (or update existing)
```ts
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globalSetup: './tests/setup/globalSetup.ts',
  globalTeardown: './tests/setup/globalTeardown.ts',
  setupFilesAfterEach: ['./tests/setup/testSetup.ts'],
};
```

#### `packages/server/tests/setup/globalSetup.ts` — NEW
- Connect to test DB using `DATABASE_URL`
- Run all migrations (execute each SQL file in `migrations/` in order)
- Create test user and seed minimal data

#### `packages/server/tests/setup/globalTeardown.ts` — NEW
- Drop all tables / truncate test DB

#### `packages/server/tests/helpers/createTestUser.ts` — NEW
Helper that registers a user via the API and returns `{ accessToken, refreshToken, userId }`.

#### `packages/server/tests/campaign.status.test.ts` — NEW
Uses `supertest(app)`:
- **Test 1:** PATCH on a campaign with `status='scheduled'` returns 409
- **Test 2:** DELETE on a campaign with `status='sending'` returns 409
- **Test 3:** PATCH on a `draft` campaign returns 200

#### `packages/server/tests/schedule.validation.test.ts` — NEW
- **Test 4:** `POST /campaigns/:id/schedule` with `scheduled_at` = 1 minute ago → 400 `{ error: '...' }`
- **Test 5:** `POST /campaigns/:id/schedule` with `scheduled_at` = 1 hour from now → 200

#### `packages/server/tests/send.simulation.test.ts` — NEW
- **Test 6:** `POST /campaigns/:id/send` returns 202 immediately; `GET /campaigns/:id` shows `status: 'sending'`
- **Test 7:** Wait for async send to complete (poll or short sleep); all `campaign_recipients` have `sent_at` non-null; campaign `status = 'sent'`

#### `packages/server/tests/auth.test.ts` — NEW
- **Test 8:** `POST /auth/register` creates user and returns both tokens
- **Test 9:** `POST /auth/refresh` with valid refresh token returns new access token
- **Test 10:** `POST /auth/refresh` with revoked/invalid token returns 401

---

### Sub-Agent 7 — Documentation

#### `docs/api.md` — NEW

Sections:
1. **Authentication** — Bearer token header format, token expiry, refresh flow diagram
2. **Endpoint Reference Table** — columns: Method, Path, Auth Required, Request Body Schema, Success Response, Error Codes
3. **Status State Machine** — ASCII diagram:
   ```
   draft ──schedule──▶ scheduled ──send──▶ sending ──(async)──▶ sent
     │                     │
     └──send──▶ sending    └──(direct send)
   ```
4. **Business Rules** — only draft can be edited/deleted; scheduled_at must be future; once sending starts it cannot be undone
5. **Stats Shape** — definition of each field (total, sent, failed, opened, open_rate, send_rate)

#### `docs/index.md` — MODIFY
Add entry: `- [api.md](api.md) — Relevant for: adding endpoints, modifying business rules, auth changes, stats calculation`

---

## C. Additional Migration File

#### `packages/server/migrations/005_create_refresh_tokens.sql` — NEW
```sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
```

---

## D. Environment Variables Required

Add to `.env.example`:
```
JWT_SECRET=your-jwt-secret-here
REFRESH_SECRET=your-refresh-secret-here
```

---

## E. Package.json Script Updates

Add to `packages/server/package.json`:
```json
"test:docker": "docker compose -f ../../docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from server-test"
```

---

## F. Verification Steps

1. `docker compose up server postgres` — server starts, `GET /health` returns 200
2. `POST /auth/register` → receive `{ accessToken, refreshToken }`
3. `POST /auth/refresh` with the refresh token → receive new token pair
4. `POST /campaigns` with Bearer token → `{ status: 'draft' }`
5. `PATCH /campaigns/:id` on draft → 200; manually set status=`scheduled` in DB → `PATCH` → 409
6. `POST /campaigns/:id/schedule` with past date → 400; with future date → 200
7. `POST /campaigns/:id/send` → 202; poll `GET /campaigns/:id` until `status: 'sent'`
8. `GET /campaigns/:id/stats` → all fields present, `open_rate` and `send_rate` are 0–1
9. `docker compose -f docker-compose.test.yml up --build` → all 10 tests pass
