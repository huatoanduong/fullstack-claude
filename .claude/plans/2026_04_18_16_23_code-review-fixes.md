# Code Review Fix Plan — Campaign Manager

## Context
The senior-code-reviewer identified issues across security, correctness, and maintainability.
This plan addresses all findings **except C3** (refresh token multi-session scope — deferred as a larger auth redesign).
**H6 and H7** are handled via code comments only, no functional changes.

---

## Group 1 — Server startup & security hardening (C2, M1, M6)

### Files
- `packages/server/src/app.ts`
- `packages/server/package.json` (add `helmet`, `express-rate-limit`, `cookie-parser`)

### Changes
1. **Install** `helmet`, `express-rate-limit`, and `cookie-parser` as production dependencies.
2. **`app.ts`**:
   - Add `helmet()` as the first middleware.
   - Restrict `cors()` to `process.env.CLIENT_ORIGIN` (default `http://localhost:8080`).
   - Set explicit `express.json({ limit: '100kb' })`.
   - Add `express-rate-limit` on the `/auth` router only: 10 req/min per IP.
   - Add `cookieParser()` middleware.
3. **Env validation at boot** (M1, M6): In `app.ts` (before route registration), validate required env vars and throw if missing or if `JWT_SECRET === 'changeme'` in production:
   ```ts
   const requiredEnv = ['JWT_SECRET', 'REFRESH_SECRET', 'DATABASE_URL']
   for (const key of requiredEnv) {
     if (!process.env[key]) throw new Error(`Missing env var: ${key}`)
   }
   if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'changeme') {
     throw new Error('JWT_SECRET must be changed in production')
   }
   ```
   Remove the per-request secret check from `middleware/auth.ts` (M6).

---

## Group 2 — Database migrations (C4, H1)

### Files
- `packages/server/migrations/006_refresh_token_fingerprint.sql` (new)
- `packages/server/migrations/007_recipients_created_by.sql` (new)
- `packages/server/src/db/models/RefreshToken.ts`
- `packages/server/src/db/models/Recipient.ts`
- `packages/server/src/services/authService.ts`

### C4 — O(n) bcrypt scan on refresh validation
**Migration `006`**:
```sql
ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS token_fingerprint VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_fingerprint
  ON refresh_tokens(token_fingerprint);
```
**`RefreshToken` model**: add `token_fingerprint: string` field.

**`authService.ts`**:
- `saveRefreshToken`: store `sha256(token)` hex as `token_fingerprint` alongside the existing bcrypt `token_hash`.
- `validateRefreshToken`: lookup `RefreshToken.findOne({ where: { token_fingerprint: sha256(token) } })` — single indexed row lookup. Optionally verify `bcrypt.compare` as a secondary integrity check.
- `revokeRefreshToken`: lookup by `token_fingerprint` then destroy that single row.

### H1 — Recipients not tenant-scoped (PII leak)
**Migration `007`**:
```sql
ALTER TABLE recipients
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_recipients_created_by
  ON recipients(created_by);
```
(Nullable to avoid breaking existing rows; backfill via seed.)

**`Recipient` model**: add `created_by: string | null` field.

**`routes/recipients.ts`**:
- `GET /recipients`: add `WHERE created_by = req.user.userId` filter.
- `POST /recipients`: set `created_by: req.user.userId` on creation.

**`routes/campaigns.ts`**: in `POST /` validate that every `recipientId` in `recipientIds` belongs to a recipient with `created_by = userId` before associating.

**`seed.ts`**: update recipient seed entries to set `created_by` to the demo user's id.

---

## Group 3 — Auth & middleware correctness (C1, C5, C6, H4, H5, L12, M8)

### C1 — Tokens lost on page reload
**Strategy: HttpOnly cookie for refreshToken, in-memory for accessToken.**

The refresh token must never be accessible to JavaScript (XSS risk). The access token is short-lived and acceptable in memory; on page reload it is re-acquired via the cookie-backed refresh flow.

**Server-side changes** (`packages/server/src/routes/auth.ts`):
- On `POST /login` and `POST /register`: do **not** include `refreshToken` in the JSON body. Instead, call `res.cookie('refreshToken', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/api/auth', maxAge: 7 * 24 * 60 * 60 * 1000 })`.
- On `POST /refresh`: read the token from `req.cookies.refreshToken` (not `req.body`). Rotate and re-set the cookie in the response.
- On `POST /logout`: clear the cookie with `res.clearCookie('refreshToken', { path: '/api/auth' })`.

**Client-side changes** (`packages/client/src/store/authStore.ts`):
- Remove `refreshToken` field entirely from the store — it lives in the browser cookie, not JS.
- Keep `accessToken` and `user` in-memory (no persist middleware needed).
- Remove `setTokens` and `setAccessToken`; simplify to `setAuth(user, accessToken)` and `clearAuth()`.

**Client API changes** (`packages/client/src/api/client.ts`):
- Add `withCredentials: true` to the `apiClient` axios config so cookies are sent on every request.
- In the 401 interceptor, call `POST /api/auth/refresh` with `withCredentials: true` and an empty body — the browser sends the cookie automatically. Update the store with the new `accessToken` from the response.

**App init** (`packages/client/src/App.tsx` or equivalent entry):
- On mount, if `accessToken` is null, attempt a silent `POST /api/auth/refresh` call. If it succeeds, store the returned `accessToken`; if it fails (no valid cookie), stay on the login page. This restores sessions across hard reloads.

### C5 — Duplicate-send race
**File**: `packages/server/src/routes/campaigns.ts` (~line 232)

Replace the status check + `setImmediate` with an atomic conditional UPDATE before returning 202:
```ts
const [updatedCount] = await Campaign.update(
  { status: 'sending' },
  { where: { id: campaignId, status: ['draft', 'scheduled'], created_by: userId } }
)
if (updatedCount === 0) return res.status(409).json({ error: 'Campaign cannot be sent in its current state' })
setImmediate(() => { void sendService.sendAsync(campaignId).catch(console.error) })
return res.status(202).json({ message: 'Send initiated' })
```

### C6 — JWT embeds mutable email/name
**Files**: `packages/server/src/services/authService.ts`, `packages/server/src/types/index.ts`, `packages/server/src/middleware/auth.ts`

- Remove `email` and `name` from `AuthPayload`; keep only `userId`.
- `signAccessToken(userId: string)` — single param.
- Anywhere `req.user.email` / `req.user.name` was used (only in auth routes for response), fetch from DB or pass through the login response object (already present from the DB query).
- Update `AuthPayload` type: `{ userId: string }`.

### H4 — Dead `getUserId` helper
**File**: `packages/server/src/routes/campaigns.ts`

- Delete the `getUserId` function (lines 11–18).
- Define `type AuthedRequest = Request & { user: AuthPayload }` in `types/index.ts`.
- Cast `req` to `AuthedRequest` at the top of each handler or use a local `const userId = (req as AuthedRequest).user.userId`.

### H5 — Express 4 async errors not forwarded
**File**: `packages/server/src/routes/` (all route files), `packages/server/src/middleware/`

Add a single `asyncHandler` wrapper in `packages/server/src/middleware/asyncHandler.ts`:
```ts
import type { Request, Response, NextFunction, RequestHandler } from 'express'
type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>
export const asyncHandler = (fn: AsyncFn): RequestHandler =>
  (req, res, next) => { Promise.resolve(fn(req, res, next)).catch(next) }
```
Wrap every `router.get/post/patch/delete` handler in `asyncHandler(...)` across `auth.ts`, `campaigns.ts`, `recipients.ts`.

### L12 — Logout doesn't verify token belongs to user
**File**: `packages/server/src/routes/auth.ts` (~line 127)

With C1 applied, the refresh token comes from `req.cookies.refreshToken`, so this attack vector is already eliminated. Keep the ownership check as defence-in-depth:
```ts
const decoded = authService.verifyRefreshToken(req.cookies.refreshToken)
if (decoded.userId !== req.user.userId) return res.status(403).json({ error: 'Forbidden' })
await authService.revokeRefreshToken(req.cookies.refreshToken)
```

### M8 — Concurrent 401s trigger multiple refresh calls
**File**: `packages/client/src/api/client.ts`

Add a single-flight promise guard:
```ts
let refreshPromise: Promise<{ accessToken: string }> | null = null

// In the 401 interceptor:
if (!refreshPromise) {
  refreshPromise = axios.post('/api/auth/refresh', {}, { withCredentials: true })
    .then(r => r.data)
    .finally(() => { refreshPromise = null })
}
const data = await refreshPromise
```

---

## Group 4 — Route & service fixes (H2, H3, M2, M3, M4, M5)

### H2 — `updated_at` not maintained; `scheduled_at` can't be cleared
**Files**: `packages/server/src/db/models/Campaign.ts`, `packages/server/src/routes/campaigns.ts`

- Enable Sequelize timestamps on `Campaign` model:
  ```ts
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  ```
- Remove manual `updated_at: new Date()` from the PATCH handler (Sequelize handles it).
- In the PATCH Zod schema, allow `scheduled_at: z.string().datetime().nullable().optional()` so clients can clear it.
- Remove `updated_at` from PATCH body in the route.

### H3 — `getStats` doesn't enforce ownership
**Files**: `packages/server/src/services/statsService.ts`, `packages/server/src/routes/campaigns.ts`

- Add `userId: string` param to `getStats(campaignId, userId)`.
- In the raw SQL, join campaigns to verify ownership:
  ```sql
  FROM campaign_recipients cr
  JOIN campaigns c ON c.id = cr.campaign_id
  WHERE cr.campaign_id = :campaignId AND c.created_by = :userId
  ```
- Pass `userId` from the route handler.

### M2 — Correlated subquery for `recipient_count`
**File**: `packages/server/src/routes/campaigns.ts` (~line 51)

Switch to a `LEFT JOIN` with `group`:
```ts
include: [{ model: CampaignRecipient, attributes: [] }],
attributes: { include: [[fn('COUNT', col('CampaignRecipients.campaign_id')), 'recipient_count']] },
group: ['Campaign.id'],
subQuery: false,
```

### M3 — Scheduled campaigns never fire
**File**: `packages/server/src/server.ts`

Add a simple polling scheduler that fires every 60 seconds:
```ts
// NOTE: single-node in-process scheduler — replace with pg-boss or BullMQ for production
setInterval(async () => {
  const due = await Campaign.findAll({
    where: { status: 'scheduled', scheduled_at: { [Op.lte]: new Date() } },
  })
  for (const campaign of due) {
    const [updated] = await Campaign.update(
      { status: 'sending' },
      { where: { id: campaign.id, status: 'scheduled' } }
    )
    if (updated > 0) void sendService.sendAsync(campaign.id).catch(console.error)
  }
}, 60_000)
```

### M4 — `sent_at` set even on failed rows
**File**: `packages/server/src/services/sendService.ts`

Only set `sent_at` when the simulated send succeeds:
```ts
if (success) {
  await CampaignRecipient.update({ status: 'sent', sent_at: new Date() }, { where: { ... } })
} else {
  await CampaignRecipient.update({ status: 'failed' }, { where: { ... } })
}
```

### M5 — Error handler returns opaque messages
**File**: `packages/server/src/middleware/errorHandler.ts`

For `UniqueConstraintError`, extract the field name from `err.errors[0].path`:
```ts
if (err instanceof UniqueConstraintError) {
  const field = err.errors[0]?.path ?? 'field'
  return res.status(409).json({ error: `${field} already exists` })
}
```
For `ValidationError`, include `err.errors.map(e => e.message)` in `details`.

---

## Group 5 — Code quality (M7, M9, L5, L6, L7, L8, L9, L10, L11, L13)

### M7 — Express type augmentation via side-effect import
- Create `packages/server/src/types/express.d.ts`:
  ```ts
  import type { AuthPayload } from './index'
  declare global {
    namespace Express {
      interface Request { user?: AuthPayload }
    }
  }
  ```
- The existing `include: ["src/**/*"]` in tsconfig already picks it up automatically.
- Remove `import './types'` from `app.ts`.

### M9 — Remove naive email regex from client
**File**: `packages/client/src/components/EmailTagInput.tsx`

Remove `EMAIL_REGEX` constant and the `if (!EMAIL_REGEX.test(email))` block. Surface server-side 400 errors via existing `ApiError` handling.

### L5 — Magic numbers in sendService
**File**: `packages/server/src/services/sendService.ts`

```ts
const BATCH_SIZE = 10
const SIMULATED_SUCCESS_RATE = 0.8
const BATCH_DELAY_MS_MIN = 100
const BATCH_DELAY_MS_RANGE = 100
```

### L6 — Double `Number()` cast in statsService
**File**: `packages/server/src/services/statsService.ts`

Remove the outer `Number(row.total)` etc. — the SQL `::int` cast already returns numbers from pg.

### L7 — Seed uses fragile parallel array indexing
**File**: `packages/server/src/db/seed.ts`

Restructure recipient seed entries as an array of objects with `status`/`opened` inline rather than a separate `statuses` array indexed by position.

### L8 — Polling rule duplicated in CampaignDetailPage
**File**: `packages/client/src/pages/CampaignDetailPage.tsx`

Extract a `useSendingInterval(campaignId)` hook and reuse for both queries.

### L9 — Invalid UUID → 500
**File**: `packages/server/src/routes/campaigns.ts`

Add `z.string().uuid().safeParse(req.params.id)` at the top of each UUID-based handler; return 404 on failure.

### L10 — Client `Recipient.name` typed as `string` but server allows `null`
**File**: `packages/client/src/types/index.ts`

Change `name: string` → `name: string | null`. In `CampaignDetailPage.tsx` coalesce with `r.name ?? '—'`.

### L11 — Dead code: `User.findByEmail`, `setAccessToken`
- `packages/server/src/db/models/User.ts`: remove `static findByEmail`.
- `packages/client/src/store/authStore.ts`: remove `setAccessToken` (removed as part of C1 refactor).

### L13 — No graceful shutdown
**File**: `packages/server/src/server.ts`

```ts
const shutdown = () => {
  server.close(() => {
    void sequelize.close().then(() => process.exit(0))
  })
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```

---

## Group 6 — Infrastructure (L1, L2, L3, L4)

### L1 — Dockerfile runs as root; devDeps in final image
```dockerfile
RUN yarn install --production --frozen-lockfile
USER node
```

### L2 — Postgres port exposed on all interfaces
```yaml
ports:
  - "127.0.0.1:5432:5432"
```

### L3 — nginx.conf missing security headers
```nginx
add_header X-Frame-Options "DENY";
add_header X-Content-Type-Options "nosniff";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'";
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### L4 — README says migrations don't auto-run
Update README to reflect that Dockerfile CMD runs `migrate.js` on every container start.

---

## Group 7 — Comments only (H6, H7)

### H6
- `packages/server/Dockerfile`: comment before CMD warning about seed in production.
- `packages/server/src/db/seed.ts`: comment at top about unconditional run.

### H7
- `packages/server/src/db/seed.ts`: comment about server not normalizing email casing.
- `packages/server/src/routes/recipients.ts`: TODO comment about lowercasing email.

---

## Critical Files Modified

| File | Issues |
|------|--------|
| `packages/server/src/app.ts` | C2, M1, M6, M7 |
| `packages/server/src/middleware/auth.ts` | C6, M6 |
| `packages/server/src/middleware/errorHandler.ts` | M5 |
| `packages/server/src/middleware/asyncHandler.ts` *(new)* | H5 |
| `packages/server/src/routes/auth.ts` | C1, L12 |
| `packages/server/src/routes/campaigns.ts` | C5, H2, H3, H4, M2, L9 |
| `packages/server/src/routes/recipients.ts` | H1, H7 comment |
| `packages/server/src/services/authService.ts` | C4, C6 |
| `packages/server/src/services/sendService.ts` | M4, L5 |
| `packages/server/src/services/statsService.ts` | H3, L6 |
| `packages/server/src/db/models/RefreshToken.ts` | C4 |
| `packages/server/src/db/models/Recipient.ts` | H1 |
| `packages/server/src/db/models/Campaign.ts` | H2 |
| `packages/server/src/db/models/User.ts` | L11 |
| `packages/server/src/db/seed.ts` | H6 comment, H7 comment, L7 |
| `packages/server/src/server.ts` | M3, L13 |
| `packages/server/src/types/index.ts` | C6, H4 |
| `packages/server/src/types/express.d.ts` *(new)* | M7 |
| `packages/server/migrations/006_refresh_token_fingerprint.sql` *(new)* | C4 |
| `packages/server/migrations/007_recipients_created_by.sql` *(new)* | H1 |
| `packages/server/Dockerfile` | H6 comment, L1 |
| `packages/client/src/store/authStore.ts` | C1, L11 |
| `packages/client/src/api/client.ts` | C1, M8 |
| `packages/client/src/App.tsx` *(or entry point)* | C1 silent refresh on mount |
| `packages/client/src/components/EmailTagInput.tsx` | M9 |
| `packages/client/src/pages/CampaignDetailPage.tsx` | L8, L10 |
| `packages/client/src/types/index.ts` | L10 |
| `packages/client/nginx.conf` | L3 |
| `docker-compose.yml` | L2 |
| `README.md` | L4 |

---

## Verification

1. **Boot check**: `docker compose up` — server starts cleanly; `JWT_SECRET=changeme` in production crashes at boot.
2. **Auth flow**: Login → hard-reload → still logged in (C1 cookie). Double-send → second returns 409 (C5).
3. **Refresh token**: `EXPLAIN` confirms fingerprint index used for validation (C4).
4. **Recipients isolation**: User A cannot see User B's recipients (H1).
5. **Scheduled send**: Campaign with `scheduled_at` 65s in future auto-transitions within ~90s (M3).
6. **Security headers**: `curl -I http://localhost:8080` confirms `X-Frame-Options`, CSP present (L3).
7. **Rate limit**: 11th `/api/auth/login` within a minute returns 429 (C2).
8. **Graceful shutdown**: `docker compose stop` shows clean shutdown in logs (L13).
9. **Tests**: `yarn test` passes from the server package.
