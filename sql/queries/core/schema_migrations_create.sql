CREATE TABLE IF NOT EXISTS core_schema_migrations (
    id TEXT PRIMARY KEY,
    applied_utc TIMESTAMP NOT NULL
);
