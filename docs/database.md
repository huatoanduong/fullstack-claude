# Database

PostgreSQL stores users, recipients, campaigns, and per-recipient send state. Migrations are raw SQL executed in filename order; Sequelize models mirror the schema for the API layer.

## Schema (ERD)

```
users (id)
  |
  | 1:N created_by
  v
campaigns (id)
  |
  | M:N via campaign_recipients
  v
recipients (id)

users (id)
  |
  | 1:N
  v
refresh_tokens (user_id)
```

- `users` owns campaigns through `campaigns.created_by` (cascade delete removes campaigns when a user is removed).
- `campaign_recipients` is the junction table between `campaigns` and `recipients` (composite primary key, cascade on both parents).
- `refresh_tokens` stores bcrypt-hashed **SHA-256 fingerprints** of refresh JWTs for rotation and logout (cascade delete with user).

## Tables

### `users`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `UUID` | PK, default `uuid_generate_v4()` |
| `email` | `VARCHAR(255)` | NOT NULL, unique |
| `name` | `VARCHAR(255)` | NOT NULL |
| `password_hash` | `VARCHAR(255)` | NOT NULL |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `NOW()` |

### `recipients`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `UUID` | PK, default `uuid_generate_v4()` |
| `email` | `VARCHAR(255)` | NOT NULL, unique |
| `name` | `VARCHAR(255)` | nullable |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `NOW()` |

### `campaigns`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `UUID` | PK, default `uuid_generate_v4()` |
| `name` | `VARCHAR(255)` | NOT NULL |
| `subject` | `VARCHAR(255)` | NOT NULL |
| `body` | `TEXT` | NOT NULL |
| `status` | `campaign_status` | NOT NULL, default `draft` |
| `scheduled_at` | `TIMESTAMPTZ` | nullable |
| `created_by` | `UUID` | NOT NULL, FK → `users(id)` ON DELETE CASCADE |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `NOW()` |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, default `NOW()` |

### `refresh_tokens`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `UUID` | PK, default `uuid_generate_v4()` |
| `user_id` | `UUID` | NOT NULL, FK → `users(id)` ON DELETE CASCADE |
| `token_hash` | `VARCHAR(255)` | NOT NULL, bcrypt of SHA-256 hex digest of refresh JWT |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, default `NOW()` |

### `campaign_recipients`

| Column | Type | Notes |
|--------|------|--------|
| `campaign_id` | `UUID` | PK (composite), FK → `campaigns(id)` ON DELETE CASCADE |
| `recipient_id` | `UUID` | PK (composite), FK → `recipients(id)` ON DELETE CASCADE |
| `status` | `cr_status` | NOT NULL, default `pending` |
| `sent_at` | `TIMESTAMPTZ` | nullable |
| `opened_at` | `TIMESTAMPTZ` | nullable |

## Enum types

| Name | Values |
|------|--------|
| `campaign_status` | `draft`, `scheduled`, `sending`, `sent` |
| `cr_status` | `pending`, `sent`, `failed` |

Enums are created in SQL migrations with an idempotent `DO $$ … EXCEPTION WHEN duplicate_object` block so re-running migration files does not fail if the type already exists.

## Indexes and rationale

| Index | Table | Serves |
|-------|--------|--------|
| `idx_users_email` | `users` | Login and uniqueness checks by email |
| `idx_recipients_email` | `recipients` | Lookup and deduplication by email |
| `idx_campaigns_created_by` | `campaigns` | Listing or filtering campaigns by owner (`WHERE created_by = ?`) |
| `idx_campaigns_status` | `campaigns` | Filtering by workflow state (queue, dashboard) |
| `idx_cr_campaign_id` | `campaign_recipients` | Loading all rows for a campaign |
| `idx_cr_status` | `campaign_recipients` | Filtering sends by outcome (`pending` / `sent` / `failed`) |
| `idx_refresh_tokens_token_hash` | `refresh_tokens` | Lookup during refresh validation |
| `idx_refresh_tokens_user_id` | `refresh_tokens` | Clearing tokens per user on rotation |

## Migration order

| File | Purpose |
|------|---------|
| `001_create_users.sql` | Enables `uuid-ossp` and creates `users` (campaigns FK depends on this) |
| `002_create_recipients.sql` | Creates `recipients` (junction FK depends on this) |
| `003_create_campaigns.sql` | Creates `campaign_status` enum and `campaigns` |
| `004_create_campaign_recipients.sql` | Creates `cr_status` enum and `campaign_recipients` |
| `005_create_refresh_tokens.sql` | Creates `refresh_tokens` for JWT refresh rotation |

Order is enforced by lexicographic sort of filenames in `packages/server/migrations/`.

## Local commands

From the repository root (with PostgreSQL running and `DATABASE_URL` set, for example in `.env`):

When you run `db:migrate` / `db:seed` on the host machine against Docker Compose, use `127.0.0.1` (or `localhost`) as the database host. The `postgres` hostname in `.env.example` is intended for containers on the Compose network.

- `yarn workspace @campaign/server db:migrate` — run all `.sql` files in order, each in a transaction.
- `yarn workspace @campaign/server db:seed` — idempotent demo data (`findOrCreate`).

## Adding models or columns

1. Add a new numbered SQL file under `packages/server/migrations/`.
2. Add or update the Sequelize model under `packages/server/src/db/models/` and wire associations in `associations.ts`.
3. Re-export the model from `packages/server/src/db/index.ts` if the API should import it from there.
4. Update this document (tables, enums, indexes, migration order) so `docs/index.md` routing stays accurate.
