CREATE TABLE IF NOT EXISTS media_images (
    source TEXT,
    external_id TEXT,
    description TEXT,
    author TEXT,
    width INTEGER,
    height INTEGER,
    content_type TEXT,
    source_url TEXT,
    bytes BLOB,
    created_utc TIMESTAMP,
    PRIMARY KEY (source, external_id)
);

CREATE TABLE IF NOT EXISTS media_videos (
    source TEXT,
    external_id TEXT,
    description TEXT,
    width INTEGER,
    height INTEGER,
    duration INTEGER,
    content_type TEXT,
    source_url TEXT,
    bytes BLOB,
    preview_image TEXT,
    created_utc TIMESTAMP,
    PRIMARY KEY (source, external_id)
);



