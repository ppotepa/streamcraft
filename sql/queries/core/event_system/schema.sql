-- Ensures event system tables exist (idempotent)
CREATE TABLE IF NOT EXISTS core_event_effects (
    id TEXT PRIMARY KEY,
    type_name TEXT NOT NULL,
    description TEXT NULL,
    configuration_json TEXT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_utc TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_utc TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE core_event_effects ADD COLUMN IF NOT EXISTS type_name TEXT;
ALTER TABLE core_event_effects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE core_event_effects ADD COLUMN IF NOT EXISTS configuration_json TEXT;
ALTER TABLE core_event_effects ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE core_event_effects ADD COLUMN IF NOT EXISTS created_utc TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE core_event_effects ADD COLUMN IF NOT EXISTS updated_utc TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS core_event_triggers (
    id TEXT PRIMARY KEY,
    type_name TEXT NULL,
    message_type_category TEXT NOT NULL,
    message_type_name TEXT NOT NULL,
    effect_ids TEXT NOT NULL,
    filter_json TEXT NULL,
    description TEXT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_utc TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_utc TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE core_event_triggers ADD COLUMN IF NOT EXISTS type_name TEXT;
ALTER TABLE core_event_triggers ADD COLUMN IF NOT EXISTS message_type_category TEXT;
ALTER TABLE core_event_triggers ADD COLUMN IF NOT EXISTS message_type_name TEXT;
ALTER TABLE core_event_triggers ADD COLUMN IF NOT EXISTS effect_ids TEXT;
ALTER TABLE core_event_triggers ADD COLUMN IF NOT EXISTS filter_json TEXT;
ALTER TABLE core_event_triggers ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE core_event_triggers ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE core_event_triggers ADD COLUMN IF NOT EXISTS created_utc TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE core_event_triggers ADD COLUMN IF NOT EXISTS updated_utc TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
