INSERT INTO core_bit_configs (bit_id, json, is_configured, created_utc, updated_utc)
VALUES (@id, @json, TRUE, @utc, @utc)
ON CONFLICT(bit_id) DO UPDATE SET
    json = excluded.json,
    is_configured = excluded.is_configured,
    updated_utc = excluded.updated_utc;