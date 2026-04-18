ALTER TABLE recipients
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_recipients_created_by
  ON recipients(created_by);
