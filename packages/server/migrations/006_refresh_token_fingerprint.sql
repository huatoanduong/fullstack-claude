ALTER TABLE refresh_tokens
  ADD COLUMN IF NOT EXISTS token_fingerprint VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS idx_refresh_tokens_fingerprint
  ON refresh_tokens(token_fingerprint);
