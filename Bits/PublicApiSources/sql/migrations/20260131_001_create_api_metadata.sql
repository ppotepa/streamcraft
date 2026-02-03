CREATE TABLE IF NOT EXISTS bit_publicapisources_api_metadata (
    source_id TEXT NOT NULL,
    endpoint_path TEXT NOT NULL,
    method TEXT NOT NULL,
    metadata JSON NOT NULL,
    fetched_utc TIMESTAMP NOT NULL,
    success BOOLEAN NOT NULL,
    category_id TEXT NULL,
    PRIMARY KEY (source_id, endpoint_path, method)
);

CREATE INDEX IF NOT EXISTS bit_publicapisources_api_metadata_success_idx
    ON bit_publicapisources_api_metadata (success);
