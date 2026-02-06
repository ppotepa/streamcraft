SELECT
    id,
    type_name,
    message_type_category,
    message_type_name,
    effect_ids,
    filter_json,
    description,
    enabled,
    created_utc,
    updated_utc
FROM core_event_triggers
ORDER BY id;