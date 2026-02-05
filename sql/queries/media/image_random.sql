SELECT source, external_id, description, author, width, height, content_type, source_url, bytes
FROM media_images
WHERE source = ?
ORDER BY random()
LIMIT 1;



