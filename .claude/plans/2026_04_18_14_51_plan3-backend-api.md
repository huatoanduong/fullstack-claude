# Plan 3 — Backend API

## A. Context
The assessment specifies 11 REST endpoints with JWT auth, Zod validation, and specific business rules around campaign status transitions. Sending is asynchronous (status transitions through `sending` → `sent`). Stats are aggregated from `campaign_recipients`. At least 3 meaningful tests are required. This plan covers the full Express API implementation.

## B. File-Level Changes

**File:** `packages/server/src/app.js` — CREATE
- Express app: CORS, JSON body parser, routes mounted, error handler last
- Health check: `GET /health` → 200

**File:** `packages/server/src/middleware/auth.js` — CREATE
- `requireAuth` middleware: extract Bearer token, verify JWT, attach `req.user`
- Returns 401 if missing/invalid token

**File:** `packages/server/src/middleware/validate.js` — CREATE
- `validate(schema)` HOF wrapping Zod `.safeParse()`, returns 400 with error details on failure

**File:** `packages/server/src/middleware/errorHandler.js` — CREATE
- Central error handler: maps known error types to HTTP codes, returns `{ error: message }` shape

**File:** `packages/server/src/routes/auth.js` — CREATE
- `POST /auth/register` — Zod schema (email, name, password), hash with bcrypt, create User, return JWT
- `POST /auth/login` — find by email, compare hash, return JWT or 401

**File:** `packages/server/src/routes/campaigns.js` — CREATE
- `GET /campaigns` — paginated list (page, limit query params), auth required
- `POST /campaigns` — create with status=draft, attach recipients if provided
- `GET /campaigns/:id` — campaign + stats inline
- `PATCH /campaigns/:id` — guard: isDraft() or 409; partial update
- `DELETE /campaigns/:id` — guard: isDraft() or 409
- `POST /campaigns/:id/schedule` — validate scheduled_at is future; set status=scheduled
- `POST /campaigns/:id/send` — call sendService.sendAsync(), return 202
- `GET /campaigns/:id/stats` — return `{ total, sent, failed, opened, open_rate, send_rate }`

**File:** `packages/server/src/routes/recipients.js` — CREATE
- `GET /recipients` — list all recipients, auth required
- `POST /recipient` — create recipient (email, name), unique email enforced

**File:** `packages/server/src/services/sendService.js` — CREATE
- `sendAsync(campaignId)`: immediately sets campaign status=`sending`, then iterates recipients with a small async delay per batch, randomly marking each `sent` (80%) or `failed` (20%), records `sent_at`
- After all recipients processed, sets campaign status=`sent`
- Uses `setImmediate` to not block the HTTP response

**File:** `packages/server/src/services/statsService.js` — CREATE
- `getStats(campaignId)`: single SQL aggregate query for counts, computes `open_rate = opened/sent`, `send_rate = sent/total`

**File:** `packages/server/tests/campaign.status.test.js` — CREATE
- Test 1: PATCH on non-draft campaign returns 409
- Test 2: DELETE on non-draft campaign returns 409

**File:** `packages/server/tests/schedule.validation.test.js` — CREATE
- Test 3: POST /campaigns/:id/schedule with past timestamp returns 400
- Test 4: POST /campaigns/:id/schedule with future timestamp returns 200

**File:** `packages/server/tests/send.simulation.test.js` — CREATE
- Test 5: POST /campaigns/:id/send returns 202 and campaign status becomes `sending` immediately
- Test 6: After async send completes, all campaign_recipients have `sent_at` set and status is `sent` or `failed`

## C. Documentation Update
**File:** `docs/api.md` — CREATE
- Full endpoint reference table (method, path, auth required, request body schema, response shape, possible error codes)
- Business rules section: status state machine diagram (draft → scheduled → sending → sent), validation rules

**File:** `docs/index.md` — MODIFY
- Add entry: `docs/api.md` — relevant for "adding endpoints", "modifying business rules", "auth changes"

## D. Verification Steps
1. Start: `docker compose up server postgres`
2. `POST /auth/register` → receive JWT
3. `POST /campaigns` → verify response has `status: "draft"`
4. `PATCH /campaigns/:id` → 200; manually set status=scheduled in DB → `PATCH` → 409
5. `POST /campaigns/:id/schedule` with past date → 400; with future date → 200
6. `POST /campaigns/:id/send` → 202; poll `GET /campaigns/:id` until `status: "sent"`
7. `GET /campaigns/:id/stats` → `open_rate` and `send_rate` are numbers between 0 and 1
8. Run `yarn test` — all 6 tests pass