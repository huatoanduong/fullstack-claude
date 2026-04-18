# Detailed Plan 2 — Database Schema & Migrations

## Context
Plan 1 scaffolds the monorepo. This plan creates all database models, raw SQL migrations, and seed data. The API (Plan 3) depends on all models and associations being in place. Sequelize is the ORM with ES6 class-based TypeScript models. Migrations run via a custom `ts-node` runner script.

---

## Decisions Made
- **Migrations:** Raw SQL files executed in order by `src/db/migrate.ts`
- **UUID generation:** PostgreSQL `uuid-ossp` extension (`uuid_generate_v4()` as DB default)
- **Model style:** ES6 class extending `Model` with TypeScript attribute interfaces
- **Seed safety:** Idempotent via `findOrCreate` — safe to re-run

---

## Files to Create / Modify

---

### 1. `packages/server/migrations/001_create_users.sql` — CREATE
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email        VARCHAR(255) NOT NULL,
  name         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

---

### 2. `packages/server/migrations/002_create_recipients.sql` — CREATE
```sql
CREATE TABLE IF NOT EXISTS recipients (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      VARCHAR(255) NOT NULL,
  name       VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_recipients_email UNIQUE (email)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recipients_email ON recipients(email);
```

---

### 3. `packages/server/migrations/003_create_campaigns.sql` — CREATE
```sql
CREATE TYPE IF NOT EXISTS campaign_status AS ENUM (
  'draft', 'scheduled', 'sending', 'sent'
);

CREATE TABLE IF NOT EXISTS campaigns (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         VARCHAR(255) NOT NULL,
  subject      VARCHAR(255) NOT NULL,
  body         TEXT NOT NULL,
  status       campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  created_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
```

---

### 4. `packages/server/migrations/004_create_campaign_recipients.sql` — CREATE
```sql
CREATE TYPE IF NOT EXISTS cr_status AS ENUM ('pending', 'sent', 'failed');

CREATE TABLE IF NOT EXISTS campaign_recipients (
  campaign_id  UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
  status       cr_status NOT NULL DEFAULT 'pending',
  sent_at      TIMESTAMPTZ,
  opened_at    TIMESTAMPTZ,
  PRIMARY KEY (campaign_id, recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_cr_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_cr_status ON campaign_recipients(status);
```

---

### 5. `packages/server/src/db/migrate.ts` — CREATE
Reads all `.sql` files from `migrations/` in alphabetical order and executes each in a transaction.

```ts
import fs from 'fs'
import path from 'path'
import { sequelize } from './index'

async function migrate() {
  const migrationsDir = path.join(__dirname, '../../migrations')
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    console.log(`Running migration: ${file}`)
    await sequelize.query(sql)
  }

  console.log('All migrations complete.')
  await sequelize.close()
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
```

---

### 6. `packages/server/src/db/index.ts` — CREATE
Sequelize instance initialized from `DATABASE_URL`. Imports and syncs all models.

```ts
import { Sequelize } from 'sequelize'
import dotenv from 'dotenv'

dotenv.config()

export const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
})

export { User } from './models/User'
export { Campaign } from './models/Campaign'
export { Recipient } from './models/Recipient'
export { CampaignRecipient } from './models/CampaignRecipient'

// Initialize associations after all models are loaded
import './models/associations'
```

---

### 7. `packages/server/src/db/models/User.ts` — CREATE

```ts
import {
  Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional
} from 'sequelize'
import { sequelize } from '../index'

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<string>
  declare email: string
  declare name: string
  declare password_hash: string
  declare created_at: CreationOptional<Date>

  static findByEmail(email: string) {
    return User.findOne({ where: { email } })
  }
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: false,
  }
)
```

---

### 8. `packages/server/src/db/models/Campaign.ts` — CREATE

```ts
import {
  Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional
} from 'sequelize'
import { sequelize } from '../index'

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent'

export class Campaign extends Model<
  InferAttributes<Campaign>,
  InferCreationAttributes<Campaign>
> {
  declare id: CreationOptional<string>
  declare name: string
  declare subject: string
  declare body: string
  declare status: CreationOptional<CampaignStatus>
  declare scheduled_at: Date | null
  declare created_by: string
  declare created_at: CreationOptional<Date>
  declare updated_at: CreationOptional<Date>

  isDraft() { return this.status === 'draft' }
  canEdit() { return this.status === 'draft' }
}

Campaign.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    subject: { type: DataTypes.STRING, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.ENUM('draft', 'scheduled', 'sending', 'sent'),
      defaultValue: 'draft',
    },
    scheduled_at: { type: DataTypes.DATE, allowNull: true },
    created_by: { type: DataTypes.UUID, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'campaigns',
    timestamps: false,
  }
)
```

---

### 9. `packages/server/src/db/models/Recipient.ts` — CREATE

```ts
import {
  Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional
} from 'sequelize'
import { sequelize } from '../index'

export class Recipient extends Model<
  InferAttributes<Recipient>,
  InferCreationAttributes<Recipient>
> {
  declare id: CreationOptional<string>
  declare email: string
  declare name: string | null
  declare created_at: CreationOptional<Date>
}

Recipient.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'recipients',
    timestamps: false,
  }
)
```

---

### 10. `packages/server/src/db/models/CampaignRecipient.ts` — CREATE

```ts
import {
  Model, DataTypes, InferAttributes, InferCreationAttributes, CreationOptional
} from 'sequelize'
import { sequelize } from '../index'

export type CRStatus = 'pending' | 'sent' | 'failed'

export class CampaignRecipient extends Model<
  InferAttributes<CampaignRecipient>,
  InferCreationAttributes<CampaignRecipient>
> {
  declare campaign_id: string
  declare recipient_id: string
  declare status: CreationOptional<CRStatus>
  declare sent_at: Date | null
  declare opened_at: Date | null
}

CampaignRecipient.init(
  {
    campaign_id: { type: DataTypes.UUID, allowNull: false },
    recipient_id: { type: DataTypes.UUID, allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'sent', 'failed'),
      defaultValue: 'pending',
    },
    sent_at: { type: DataTypes.DATE, allowNull: true },
    opened_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: 'campaign_recipients',
    timestamps: false,
  }
)
```

---

### 11. `packages/server/src/db/models/associations.ts` — CREATE
Defines all FK relationships after all models are loaded. Kept in a separate file to avoid circular imports.

```ts
import { User } from './User'
import { Campaign } from './Campaign'
import { Recipient } from './Recipient'
import { CampaignRecipient } from './CampaignRecipient'

// User → Campaign (one-to-many via created_by)
User.hasMany(Campaign, { foreignKey: 'created_by', as: 'campaigns' })
Campaign.belongsTo(User, { foreignKey: 'created_by', as: 'creator' })

// Campaign ↔ Recipient (many-to-many through campaign_recipients)
Campaign.belongsToMany(Recipient, {
  through: CampaignRecipient,
  foreignKey: 'campaign_id',
  otherKey: 'recipient_id',
  as: 'recipients',
})
Recipient.belongsToMany(Campaign, {
  through: CampaignRecipient,
  foreignKey: 'recipient_id',
  otherKey: 'campaign_id',
  as: 'campaigns',
})
```

---

### 12. `packages/server/src/db/seed.ts` — CREATE
Idempotent seed: uses `findOrCreate` throughout.

```ts
import { sequelize, User, Campaign, Recipient, CampaignRecipient } from './index'
import bcrypt from 'bcryptjs'

async function seed() {
  await sequelize.authenticate()

  // Demo user
  const [user] = await User.findOrCreate({
    where: { email: 'demo@example.com' },
    defaults: {
      name: 'Demo User',
      password_hash: await bcrypt.hash('password', 10),
    },
  })

  // Campaigns
  const [draft] = await Campaign.findOrCreate({
    where: { name: 'Draft Campaign', created_by: user.id },
    defaults: { subject: 'Draft Subject', body: 'Draft body.', status: 'draft' },
  })

  const [scheduled] = await Campaign.findOrCreate({
    where: { name: 'Scheduled Campaign', created_by: user.id },
    defaults: {
      subject: 'Scheduled Subject',
      body: 'Scheduled body.',
      status: 'scheduled',
      scheduled_at: new Date(Date.now() + 86400000), // tomorrow
    },
  })

  const [sent] = await Campaign.findOrCreate({
    where: { name: 'Sent Campaign', created_by: user.id },
    defaults: { subject: 'Sent Subject', body: 'Sent body.', status: 'sent' },
  })

  // Recipients
  const recipientData = [
    { email: 'alice@example.com', name: 'Alice' },
    { email: 'bob@example.com', name: 'Bob' },
    { email: 'carol@example.com', name: 'Carol' },
    { email: 'dave@example.com', name: 'Dave' },
    { email: 'eve@example.com', name: 'Eve' },
  ]

  const recipients = await Promise.all(
    recipientData.map(r => Recipient.findOrCreate({ where: { email: r.email }, defaults: r }))
  )

  // Attach recipients to sent campaign with mixed statuses
  const statuses: Array<'sent' | 'failed'> = ['sent', 'sent', 'sent', 'failed', 'sent']
  await Promise.all(
    recipients.map(([r], i) =>
      CampaignRecipient.findOrCreate({
        where: { campaign_id: sent.id, recipient_id: r.id },
        defaults: {
          status: statuses[i],
          sent_at: statuses[i] === 'sent' ? new Date() : null,
          opened_at: i === 0 ? new Date() : null,
        },
      })
    )
  )

  console.log('Seed complete.')
  await sequelize.close()
}

seed().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
```

---

### 13. `packages/server/package.json` — MODIFY (scripts only)
Add to existing scripts from Plan 1:
```json
"db:migrate": "ts-node src/db/migrate.ts",
"db:seed": "ts-node src/db/seed.ts"
```
> These were already included in Plan 1's `package.json`. No change needed if Plan 1 is implemented first.

---

### 14. `docs/database.md` — CREATE

Sections:
- **Schema diagram** (text-based ERD showing tables and FK relationships)
- **Table definitions** (columns, types, constraints per table)
- **Index rationale table** — which query each index serves
- **Migration run order** — 001 → 004, reason for ordering
- **Enum types** — `campaign_status` and `cr_status` values

---

### 15. `docs/index.md` — MODIFY
Add entry:
```
- [Database Schema](database.md) — schema changes, adding models, query optimization
```

---

## Verification Steps
1. `docker compose up postgres -d` — start DB only
2. `yarn workspace @campaign/server db:migrate` — 4 tables created, no errors
3. `yarn workspace @campaign/server db:seed` — demo data inserted
4. Connect via psql: `psql postgresql://postgres:postgres@localhost:5432/campaign_db`
   - `SELECT COUNT(*) FROM users;` → 1
   - `SELECT COUNT(*) FROM campaigns;` → 3
   - `SELECT COUNT(*) FROM recipients;` → 5
   - `SELECT COUNT(*) FROM campaign_recipients;` → 5
5. `EXPLAIN SELECT * FROM campaigns WHERE created_by = 'some-uuid';` → confirm `Index Scan` on `idx_campaigns_created_by`
6. Re-run seed: `yarn workspace @campaign/server db:seed` — no duplicate errors

---

## Critical File Paths Summary
| File | Action |
|------|--------|
| `packages/server/migrations/001_create_users.sql` | CREATE |
| `packages/server/migrations/002_create_recipients.sql` | CREATE |
| `packages/server/migrations/003_create_campaigns.sql` | CREATE |
| `packages/server/migrations/004_create_campaign_recipients.sql` | CREATE |
| `packages/server/src/db/migrate.ts` | CREATE |
| `packages/server/src/db/index.ts` | CREATE |
| `packages/server/src/db/models/User.ts` | CREATE |
| `packages/server/src/db/models/Campaign.ts` | CREATE |
| `packages/server/src/db/models/Recipient.ts` | CREATE |
| `packages/server/src/db/models/CampaignRecipient.ts` | CREATE |
| `packages/server/src/db/models/associations.ts` | CREATE |
| `packages/server/src/db/seed.ts` | CREATE |
| `packages/server/package.json` | MODIFY (scripts — already in Plan 1) |
| `docs/database.md` | CREATE |
| `docs/index.md` | MODIFY |
