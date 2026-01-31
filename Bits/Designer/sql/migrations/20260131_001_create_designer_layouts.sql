CREATE TABLE IF NOT EXISTS bit_designer_layouts (
    layout_id TEXT PRIMARY KEY,
    layout_json JSONB NOT NULL,
    updated_utc TIMESTAMPTZ NOT NULL
);
