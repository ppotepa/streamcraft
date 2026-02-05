CREATE TABLE IF NOT EXISTS bit_designer_layouts (
    layout_id TEXT PRIMARY KEY,
    layout_json JSON NOT NULL,
    updated_utc TIMESTAMP NOT NULL
);



