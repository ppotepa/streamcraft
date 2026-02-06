INSERT INTO core_event_effects (
    id,
    type_name,
    description,
    configuration_json,
    enabled,
    updated_utc
) VALUES (
    ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
    type_name = excluded.type_name,
    description = excluded.description,
    configuration_json = excluded.configuration_json,
    enabled = excluded.enabled,
    updated_utc = CURRENT_TIMESTAMP;