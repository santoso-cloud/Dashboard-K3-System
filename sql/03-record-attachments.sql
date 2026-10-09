CREATE TABLE IF NOT EXISTS record_attachments (
  id BIGSERIAL PRIMARY KEY,
  entity_type VARCHAR(80) NOT NULL,
  record_id BIGINT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  file_data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, record_id)
);
