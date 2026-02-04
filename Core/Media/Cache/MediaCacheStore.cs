using Core.Data.DuckDb;
using DuckDB.NET.Data;

namespace Core.Media.Cache;

public sealed record MediaSize(int Width, int Height);

public sealed record MediaVideoFilter(IReadOnlyList<MediaSize> AllowedSizes)
{
    public static MediaVideoFilter ForSizes(params MediaSize[] sizes)
    {
        return new MediaVideoFilter(sizes?.Length > 0 ? sizes : Array.Empty<MediaSize>());
    }
}

public sealed class MediaCacheStore
{
    private readonly IDuckDbConnectionFactory _connectionFactory;

    public MediaCacheStore(IDuckDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
        EnsureSchema();
    }

    public int GetImageCount(string source)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM media_images WHERE source = ?;";
        command.Parameters.Add(new DuckDBParameter { Value = source });
        return Convert.ToInt32(command.ExecuteScalar());
    }

    public int GetVideoCount(string source, MediaVideoFilter? filter = null)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        var filters = BuildVideoFilters(command, source, filter);
        command.CommandText = $"SELECT COUNT(*) FROM media_videos WHERE {string.Join(" AND ", filters)};";
        return Convert.ToInt32(command.ExecuteScalar());
    }

    public MediaImage? GetRandomImage(string source)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = @"
SELECT source, external_id, description, author, width, height, content_type, source_url, bytes
FROM media_images
WHERE source = ?
ORDER BY random()
LIMIT 1;";
        command.Parameters.Add(new DuckDBParameter { Value = source });
        using var reader = command.ExecuteReader();
        if (!reader.Read()) return null;
        return ReadImage(reader);
    }

    public MediaVideo? GetRandomVideo(string source, MediaVideoFilter? filter = null)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        var filters = BuildVideoFilters(command, source, filter);
        command.CommandText = $@"
SELECT source, external_id, description, width, height, duration, content_type, source_url, bytes, preview_image
FROM media_videos
WHERE {string.Join(" AND ", filters)}
ORDER BY random()
LIMIT 1;";
        using var reader = command.ExecuteReader();
        if (!reader.Read()) return null;
        return ReadVideo(reader);
    }

    public MediaImage? GetImageById(string source, string id)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = @"
SELECT source, external_id, description, author, width, height, content_type, source_url, bytes
FROM media_images
WHERE source = ? AND external_id = ?;";
        command.Parameters.Add(new DuckDBParameter { Value = source });
        command.Parameters.Add(new DuckDBParameter { Value = id });
        using var reader = command.ExecuteReader();
        if (!reader.Read()) return null;
        return ReadImage(reader);
    }

    public MediaVideo? GetVideoById(string source, string id, MediaVideoFilter? filter = null)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        var filters = BuildVideoFilters(command, source, filter);
        filters.Add("external_id = ?");
        command.Parameters.Add(new DuckDBParameter { Value = id });
        command.CommandText = $@"
SELECT source, external_id, description, width, height, duration, content_type, source_url, bytes, preview_image
FROM media_videos
WHERE {string.Join(" AND ", filters)};";
        using var reader = command.ExecuteReader();
        if (!reader.Read()) return null;
        return ReadVideo(reader);
    }

    public bool HasVideo(string source, string id, MediaVideoFilter? filter = null)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        var filters = BuildVideoFilters(command, source, filter);
        filters.Add("external_id = ?");
        command.Parameters.Add(new DuckDBParameter { Value = id });
        command.CommandText = $"SELECT 1 FROM media_videos WHERE {string.Join(" AND ", filters)} LIMIT 1;";
        using var reader = command.ExecuteReader();
        return reader.Read();
    }

    public IReadOnlyList<MediaImage> ListImages(string source, int limit = 100)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = @"
SELECT source, external_id, description, author, width, height, content_type, source_url, bytes
FROM media_images
WHERE source = ?
LIMIT ?;";
        command.Parameters.Add(new DuckDBParameter { Value = source });
        command.Parameters.Add(new DuckDBParameter { Value = limit });
        using var reader = command.ExecuteReader();
        var results = new List<MediaImage>();
        while (reader.Read())
        {
            results.Add(ReadImage(reader));
        }
        return results;
    }

    public IReadOnlyList<MediaVideo> ListVideos(string source, int limit = 50, MediaVideoFilter? filter = null)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        var filters = BuildVideoFilters(command, source, filter);
        command.CommandText = $@"
SELECT source, external_id, description, width, height, duration, content_type, source_url, bytes, preview_image
FROM media_videos
WHERE {string.Join(" AND ", filters)}
LIMIT ?;";
        command.Parameters.Add(new DuckDBParameter { Value = limit });
        using var reader = command.ExecuteReader();
        var results = new List<MediaVideo>();
        while (reader.Read())
        {
            results.Add(ReadVideo(reader));
        }
        return results;
    }

    public void UpsertImage(MediaImage image)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = @"
INSERT OR REPLACE INTO media_images (source, external_id, description, author, width, height, content_type, source_url, bytes, created_utc)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp);";
        command.Parameters.Add(new DuckDBParameter { Value = image.Source });
        command.Parameters.Add(new DuckDBParameter { Value = image.ExternalId });
        command.Parameters.Add(new DuckDBParameter { Value = image.Description });
        command.Parameters.Add(new DuckDBParameter { Value = image.Author });
        command.Parameters.Add(new DuckDBParameter { Value = image.Width });
        command.Parameters.Add(new DuckDBParameter { Value = image.Height });
        command.Parameters.Add(new DuckDBParameter { Value = image.ContentType });
        command.Parameters.Add(new DuckDBParameter { Value = image.SourceUrl });
        command.Parameters.Add(new DuckDBParameter { Value = image.Bytes });
        command.ExecuteNonQuery();
    }

    public void UpsertVideo(MediaVideo video)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = @"
INSERT OR REPLACE INTO media_videos (source, external_id, description, width, height, duration, content_type, source_url, bytes, preview_image, created_utc)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp);";
        command.Parameters.Add(new DuckDBParameter { Value = video.Source });
        command.Parameters.Add(new DuckDBParameter { Value = video.ExternalId });
        command.Parameters.Add(new DuckDBParameter { Value = video.Description });
        command.Parameters.Add(new DuckDBParameter { Value = video.Width });
        command.Parameters.Add(new DuckDBParameter { Value = video.Height });
        command.Parameters.Add(new DuckDBParameter { Value = video.Duration });
        command.Parameters.Add(new DuckDBParameter { Value = video.ContentType });
        command.Parameters.Add(new DuckDBParameter { Value = video.SourceUrl });
        command.Parameters.Add(new DuckDBParameter { Value = video.Bytes });
        command.Parameters.Add(new DuckDBParameter { Value = video.PreviewImage });
        command.ExecuteNonQuery();
    }

    public (int Images, int Videos) ClearSource(string source)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM media_images WHERE source = ?;";
        command.Parameters.Add(new DuckDBParameter { Value = source });
        var images = command.ExecuteNonQuery();
        command.CommandText = "DELETE FROM media_videos WHERE source = ?;";
        command.Parameters.Clear();
        command.Parameters.Add(new DuckDBParameter { Value = source });
        var videos = command.ExecuteNonQuery();
        return (images, videos);
    }

    public (int Images, int Videos) ClearAll()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM media_images;";
        var images = command.ExecuteNonQuery();
        command.CommandText = "DELETE FROM media_videos;";
        var videos = command.ExecuteNonQuery();
        return (images, videos);
    }

    private void EnsureSchema()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = @"
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
);";
        command.ExecuteNonQuery();
    }

    private static MediaImage ReadImage(DuckDBDataReader reader)
    {
        return new MediaImage(
            reader.GetString(0),
            reader.GetString(1),
            reader.IsDBNull(2) ? "" : reader.GetString(2),
            reader.IsDBNull(3) ? "" : reader.GetString(3),
            reader.GetInt32(4),
            reader.GetInt32(5),
            reader.IsDBNull(6) ? "image/jpeg" : reader.GetString(6),
            reader.IsDBNull(7) ? "" : reader.GetString(7),
            ReadBlob(reader, 8) ?? Array.Empty<byte>());
    }

    private static MediaVideo ReadVideo(DuckDBDataReader reader)
    {
        return new MediaVideo(
            reader.GetString(0),
            reader.GetString(1),
            reader.IsDBNull(2) ? "" : reader.GetString(2),
            reader.GetInt32(3),
            reader.GetInt32(4),
            reader.GetInt32(5),
            reader.IsDBNull(6) ? "video/mp4" : reader.GetString(6),
            reader.IsDBNull(7) ? "" : reader.GetString(7),
            ReadBlob(reader, 8) ?? Array.Empty<byte>(),
            reader.IsDBNull(9) ? "" : reader.GetString(9));
    }

    private static byte[]? ReadBlob(DuckDBDataReader reader, int index)
    {
        if (reader.IsDBNull(index)) return null;
        var raw = reader.GetValue(index);
        if (raw is byte[] bytes) return bytes;
        if (raw is Stream stream)
        {
            using var buffer = new MemoryStream();
            stream.CopyTo(buffer);
            return buffer.ToArray();
        }
        return null;
    }

    private static List<string> BuildVideoFilters(DuckDBCommand command, string source, MediaVideoFilter? filter)
    {
        var filters = new List<string> { "source = ?" };
        command.Parameters.Add(new DuckDBParameter { Value = source });

        if (filter?.AllowedSizes != null && filter.AllowedSizes.Count > 0)
        {
            var sizeFilters = new List<string>();
            foreach (var size in filter.AllowedSizes)
            {
                sizeFilters.Add("(width = ? AND height = ?)");
                command.Parameters.Add(new DuckDBParameter { Value = size.Width });
                command.Parameters.Add(new DuckDBParameter { Value = size.Height });
            }

            filters.Add($"({string.Join(" OR ", sizeFilters)})");
        }

        return filters;
    }
}

public sealed record MediaImage(
    string Source,
    string ExternalId,
    string Description,
    string Author,
    int Width,
    int Height,
    string ContentType,
    string SourceUrl,
    byte[] Bytes);

public sealed record MediaVideo(
    string Source,
    string ExternalId,
    string Description,
    int Width,
    int Height,
    int Duration,
    string ContentType,
    string SourceUrl,
    byte[] Bytes,
    string PreviewImage);
