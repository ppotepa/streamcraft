ALTER TABLE bit_publicapisources_api_metadata
    DROP CONSTRAINT IF EXISTS bit_publicapisources_api_metadata_category_fk;

DROP TABLE IF EXISTS bit_publicapisources_api_categories;
