INSERT INTO bit_ai_config (id, provider, access_token, target_model, created_utc, updated_utc)
VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
    provider = excluded.provider,
    access_token = excluded.access_token,
    target_model = excluded.target_model,
    updated_utc = excluded.updated_utc;



