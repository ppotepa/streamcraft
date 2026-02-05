CREATE TABLE IF NOT EXISTS textstyles_fonts (
    family TEXT PRIMARY KEY,
    category TEXT,
    variants_json TEXT,
    subsets_json TEXT,
    files_json TEXT,
    version TEXT,
    last_modified TEXT,
    popularity_rank INTEGER,
    updated_utc TIMESTAMP
);

CREATE TABLE IF NOT EXISTS textstyles_font_files (
    family TEXT,
    variant TEXT,
    source_url TEXT,
    content_type TEXT,
    bytes BLOB,
    fetched_utc TIMESTAMP,
    PRIMARY KEY (family, variant)
);



