CREATE TABLE IF NOT EXISTS bit_designer_autosave (
    session_id text PRIMARY KEY,
    layout_json jsonb NOT NULL,
    project_name text NULL,
    updated_utc timestamptz NOT NULL
);
