CREATE TABLE IF NOT EXISTS bit_ai_config (
    id INTEGER PRIMARY KEY,
    provider TEXT NOT NULL,
    access_token TEXT,
    target_model TEXT,
    metadata TEXT,
    created_utc TIMESTAMP NOT NULL,
    updated_utc TIMESTAMP NOT NULL
);
