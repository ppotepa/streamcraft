CREATE TABLE IF NOT EXISTS bit_publicapisources_api_metadata (
    source_id TEXT NOT NULL,
    endpoint_path TEXT NOT NULL,
    method TEXT NOT NULL,
    metadata JSON NOT NULL,
    fetched_utc TIMESTAMP,
    success BOOLEAN,
    category_id TEXT,
    PRIMARY KEY (source_id, endpoint_path, method)
);



