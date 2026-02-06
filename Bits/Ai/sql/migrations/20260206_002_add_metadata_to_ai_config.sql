-- Add metadata column to bit_ai_config for provider-specific configuration
ALTER TABLE bit_ai_config ADD COLUMN metadata TEXT;
