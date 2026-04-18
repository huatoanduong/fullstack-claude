# Plan 2 — Database Schema & Migrations

## A. Context
The assessment requires a specific PostgreSQL schema with 4 tables, FK relationships, indexes, and seed data. Sequelize is specified as the ORM (assessment Part 1, Section 4). Migrations must be versioned and runnable via a single command. Seed data is required for the demo and local setup. This plan covers everything database-related before the API layer can be built.

## B. File-Level Changes

**File:** `packages/server/src/db/index.js` — CREATE
- Sequelize instance initialized from `DATABASE_URL` env var
- Export sequelize instance and all models
- Call `sequelize.authenticate()` on startup

**File:** `packages/server/src/db/models/User.js` — CREATE
- Fields: id (UUID, PK, default UUIDV4), email (STRING, unique, not null), name (STRING, not null), password_hash (STRING, not null), created_at
- Class method: `findByEmail(email)`

**File:** `packages/server/src/db/models/Campaign.js` — CREATE
- Fields: id (UUID, PK), name, subject, body (TEXT), status (ENUM: draft/scheduled/sending/sent), scheduled_at (DATE, nullable), created_by (UUID, FK → users.id), created_at, updated_at
- Instance method: `isDraft()`, `canEdit()`

**File:** `packages/server/src/db/models/Recipient.js` — CREATE
- Fields: id (UUID, PK), email (STRING, unique, not null), name, created_at

**File:** `packages/server/src/db/models/CampaignRecipient.js` — CREATE
- Fields: campaign_id (UUID, FK), recipient_id (UUID, FK), sent_at (nullable), opened_at (nullable), status (ENUM: pending/sent/failed)
- Composite PK: (campaign_id, recipient_id)

**File:** `packages/server/src/db/models/index.js` — CREATE
- Define associations: User hasMany Campaign (created_by), Campaign belongsToMany Recipient through CampaignRecipient
- Export all models

**File:** `packages/server/migrations/001_create_users.sql` — CREATE
- `CREATE TABLE users` with UUID PK, email unique, name, password_hash, created_at
- `CREATE UNIQUE INDEX idx_users_email ON users(email)`

**File:** `packages/server/migrations/002_create_recipients.sql` — CREATE
- Table + `CREATE UNIQUE INDEX idx_recipients_email ON recipients(email)`

**File:** `packages/server/migrations/003_create_campaigns.sql` — CREATE
- Table + `CREATE INDEX idx_campaigns_created_by ON campaigns(created_by)`
- `CREATE INDEX idx_campaigns_status ON campaigns(status)`

**File:** `packages/server/migrations/004_create_campaign_recipients.sql` — CREATE
- Table with composite PK (campaign_id, recipient_id)
- `CREATE INDEX idx_cr_campaign_id ON campaign_recipients(campaign_id)`
- `CREATE INDEX idx_cr_status ON campaign_recipients(status)`

**File:** `packages/server/src/db/seed.js` — CREATE
- Creates 1 demo user (email: `demo@example.com`, password: `password`)
- Creates 3 campaigns (one per status: draft, scheduled, sent)
- Creates 5 recipients
- Attaches recipients to the sent campaign with mixed statuses

**File:** `packages/server/package.json` — MODIFY
- Add scripts: `db:migrate` (run SQL migrations in order), `db:seed` (run seed.js)

## C. Documentation Update
**File:** `docs/database.md` — CREATE
- Schema diagram (text-based ERD), index rationale table, migration run order
- Explains why each index was chosen (query patterns it serves)

**File:** `docs/index.md` — MODIFY
- Add entry: `docs/database.md` — relevant for "schema changes", "adding models", "query optimization"

## D. Verification Steps
1. Run `docker compose up postgres` to start DB only
2. Run `yarn db:migrate` — all 4 tables created, no errors
3. Run `yarn db:seed` — demo data inserted
4. Connect via psql, verify row counts and FK constraints
5. Run `EXPLAIN SELECT * FROM campaigns WHERE created_by = $1` — confirm index scan
