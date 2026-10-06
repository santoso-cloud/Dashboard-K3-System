CREATE TABLE IF NOT EXISTS settings(
 id BIGSERIAL PRIMARY KEY,
 setting_key VARCHAR(100) NOT NULL UNIQUE,
 setting_value JSONB NOT NULL DEFAULT 'null'::jsonb,
 description TEXT,
 updated_by BIGINT,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key);