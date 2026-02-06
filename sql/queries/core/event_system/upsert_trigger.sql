INSERT INTO core_event_triggers (
    id,
    type_name,
    message_type_category,
    message_type_name,
    effect_ids,
    filter_json,
    description,
    enabled,
    updated_utc
) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
) ON CONFLICT(id) DO UPDATE SET
    type_name = excluded.type_name,
    message_type_category = excluded.message_type_category,
    message_type_name = excluded.message_type_name,
    effect_ids = excluded.effect_ids,
    filter_json = excluded.filter_json,
    description = excluded.description,
    enabled = excluded.enabled,
    updated_utc = CURRENT_TIMESTAMP;