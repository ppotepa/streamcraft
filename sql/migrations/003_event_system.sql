-- Event system persisted definitions
CREATE TABLE IF NOT EXISTS core_event_effects (
    id TEXT PRIMARY KEY,
    type_name TEXT NOT NULL,
    description TEXT NULL,
    configuration_json TEXT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_utc TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_utc TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE INDEX IF NOT EXISTS idx_core_event_triggers_message_type
    ON core_event_triggers (message_type_category, message_type_name);

CREATE INDEX IF NOT EXISTS idx_core_event_effects_enabled
    ON core_event_effects (enabled);

CREATE INDEX IF NOT EXISTS idx_core_event_triggers_enabled
    ON core_event_triggers (enabled);
