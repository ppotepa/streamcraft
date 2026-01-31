CREATE TABLE IF NOT EXISTS core_bit_configs (
    bit_id TEXT PRIMARY KEY,
    json JSONB NOT NULL,
    is_configured BOOLEAN NOT NULL DEFAULT FALSE,
    created_utc TIMESTAMPTZ NOT NULL,
    updated_utc TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_core_bit_configs_configured
    ON core_bit_configs (is_configured);
