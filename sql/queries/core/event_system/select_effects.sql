SELECT
    id,
    type_name,
    description,
    configuration_json,
    enabled,
    created_utc,
    updated_utc
FROM core_event_effects
ORDER BY id;