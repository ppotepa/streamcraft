CREATE TABLE IF NOT EXISTS bit_designer_autosave (
    session_id TEXT PRIMARY KEY,
    autosave_json JSON NOT NULL,
    project_name TEXT,
    updated_utc TIMESTAMP NOT NULL
);



