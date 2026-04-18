CREATE TABLE IF NOT EXISTS recipients (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email      VARCHAR(255) NOT NULL,
  name       VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_recipients_email UNIQUE (email)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recipients_email ON recipients(email);
