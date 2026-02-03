ALTER TABLE bit_designer_autosave
    ADD COLUMN IF NOT EXISTS project_name text;

UPDATE bit_designer_autosave
SET project_name = COALESCE(project_name, layout_json->>'projectName', layout_json->>'overlayName')
WHERE project_name IS NULL;

CREATE INDEX IF NOT EXISTS ix_bit_designer_autosave_project_name
    ON bit_designer_autosave (project_name);
