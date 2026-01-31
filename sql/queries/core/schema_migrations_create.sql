CREATE TABLE IF NOT EXISTS core_schema_migrations (
    id TEXT PRIMARY KEY,
    applied_utc TIMESTAMPTZ NOT NULL
);