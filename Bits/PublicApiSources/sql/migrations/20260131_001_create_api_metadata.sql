CREATE TABLE IF NOT EXISTS bit_publicapisources_api_metadata (
    source_id text NOT NULL,
    endpoint_path text NOT NULL,
    method text NOT NULL,
    metadata jsonb NOT NULL,
    fetched_utc timestamptz NOT NULL,
    success boolean NOT NULL,
    PRIMARY KEY (source_id, endpoint_path, method)
);

CREATE INDEX IF NOT EXISTS bit_publicapisources_api_metadata_success_idx
    ON bit_publicapisources_api_metadata (success);
