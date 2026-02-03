using Core.Data.DuckDb;
using DuckDB.NET.Data;
using System.IO;

namespace StreamCraft.Bits.PexelsMedia;

public sealed class PexelsMediaCacheStore
{
    private readonly IDuckDbConnectionFactory _connectionFactory;
    private const string VideoSizeFilter = "(width = 1920 AND height = 1080) OR (width = 3840 AND height = 2160)";

    public PexelsMediaCacheStore(IDuckDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
        EnsureSchema();
    }

    public int GetImageCount()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM pexels_images;";
        return Convert.ToInt32(command.ExecuteScalar());
    }

    public int GetVideoCount()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = $"SELECT COUNT(*) FROM pexels_videos WHERE {VideoSizeFilter};";
        return Convert.ToInt32(command.ExecuteScalar());
    }

    public CachedImage? GetRandomImage()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT id, description, photographer, width, height, content_type, source_url, bytes FROM pexels_images ORDER BY random() LIMIT 1;";
        using var reader = command.ExecuteReader();
        if (!reader.Read()) return null;
        return new CachedImage(
            reader.GetString(0),
            reader.IsDBNull(1) ? "" : reader.GetString(1),
            reader.IsDBNull(2) ? "" : reader.GetString(2),
            reader.GetInt32(3),
            reader.GetInt32(4),
            reader.IsDBNull(5) ? "image/jpeg" : reader.GetString(5),
            reader.IsDBNull(6) ? "" : reader.GetString(6),
            ReadBlob(reader, 7) ?? Array.Empty<byte>()
        );
    }

    public CachedVideo? GetRandomVideo()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = $"SELECT id, description, width, height, duration, content_type, source_url, bytes, preview_image FROM pexels_videos WHERE {VideoSizeFilter} ORDER BY random() LIMIT 1;";
        using var reader = command.ExecuteReader();
        if (!reader.Read()) return null;
        return new CachedVideo(
            reader.GetString(0),
            reader.IsDBNull(1) ? "" : reader.GetString(1),
            reader.GetInt32(2),
            reader.GetInt32(3),
            reader.GetInt32(4),
            reader.IsDBNull(5) ? "video/mp4" : reader.GetString(5),
            reader.IsDBNull(6) ? "" : reader.GetString(6),
            ReadBlob(reader, 7) ?? Array.Empty<byte>(),
            reader.IsDBNull(8) ? "" : reader.GetString(8)
        );
    }

    public CachedImage? GetImageById(string id)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT id, description, photographer, width, height, content_type, source_url, bytes FROM pexels_images WHERE id = ?;";
        command.Parameters.Add(new DuckDBParameter { Value = id });
        using var reader = command.ExecuteReader();
        if (!reader.Read()) return null;
        return new CachedImage(
            reader.GetString(0),
            reader.IsDBNull(1) ? "" : reader.GetString(1),
            reader.IsDBNull(2) ? "" : reader.GetString(2),
            reader.GetInt32(3),
            reader.GetInt32(4),
            reader.IsDBNull(5) ? "image/jpeg" : reader.GetString(5),
            reader.IsDBNull(6) ? "" : reader.GetString(6),
            ReadBlob(reader, 7) ?? Array.Empty<byte>()
        );
    }

    public CachedVideo? GetVideoById(string id)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT id, description, width, height, duration, content_type, source_url, bytes, preview_image FROM pexels_videos WHERE id = ?;";
        command.Parameters.Add(new DuckDBParameter { Value = id });
        using var reader = command.ExecuteReader();
        if (!reader.Read()) return null;
        return new CachedVideo(
            reader.GetString(0),
            reader.IsDBNull(1) ? "" : reader.GetString(1),
            reader.GetInt32(2),
            reader.GetInt32(3),
            reader.GetInt32(4),
            reader.IsDBNull(5) ? "video/mp4" : reader.GetString(5),
            reader.IsDBNull(6) ? "" : reader.GetString(6),
            ReadBlob(reader, 7) ?? Array.Empty<byte>(),
            reader.IsDBNull(8) ? "" : reader.GetString(8)
        );
    }

    public bool HasVideo(string id)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = $"SELECT 1 FROM pexels_videos WHERE id = ? AND ({VideoSizeFilter}) LIMIT 1;";
        command.Parameters.Add(new DuckDBParameter { Value = id });
        using var reader = command.ExecuteReader();
        return reader.Read();
    }

    public IReadOnlyList<CachedImage> ListImages(int limit = 100)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT id, description, photographer, width, height, content_type, source_url, bytes FROM pexels_images LIMIT ?;";
        command.Parameters.Add(new DuckDBParameter { Value = limit });
        using var reader = command.ExecuteReader();
        var results = new List<CachedImage>();
        while (reader.Read())
        {
            results.Add(new CachedImage(
                reader.GetString(0),
                reader.IsDBNull(1) ? "" : reader.GetString(1),
                reader.IsDBNull(2) ? "" : reader.GetString(2),
                reader.GetInt32(3),
                reader.GetInt32(4),
                reader.IsDBNull(5) ? "image/jpeg" : reader.GetString(5),
                reader.IsDBNull(6) ? "" : reader.GetString(6),
                ReadBlob(reader, 7) ?? Array.Empty<byte>()
            ));
        }
        return results;
    }

    public IReadOnlyList<CachedVideo> ListVideos(int limit = 50)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = $"SELECT id, description, width, height, duration, content_type, source_url, bytes, preview_image FROM pexels_videos WHERE {VideoSizeFilter} LIMIT ?;";
        command.Parameters.Add(new DuckDBParameter { Value = limit });
        using var reader = command.ExecuteReader();
        var results = new List<CachedVideo>();
        while (reader.Read())
        {
            results.Add(new CachedVideo(
                reader.GetString(0),
                reader.IsDBNull(1) ? "" : reader.GetString(1),
                reader.GetInt32(2),
                reader.GetInt32(3),
                reader.GetInt32(4),
                reader.IsDBNull(5) ? "video/mp4" : reader.GetString(5),
                reader.IsDBNull(6) ? "" : reader.GetString(6),
                ReadBlob(reader, 7) ?? Array.Empty<byte>(),
                reader.IsDBNull(8) ? "" : reader.GetString(8)
            ));
        }
        return results;
    }

    public void InsertImage(CachedImage image)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = @"
INSERT OR REPLACE INTO pexels_images (id, description, photographer, width, height, content_type, source_url, bytes, created_utc)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, current_timestamp);";
        command.Parameters.Add(new DuckDBParameter { Value = image.Id });
        command.Parameters.Add(new DuckDBParameter { Value = image.Description });
        command.Parameters.Add(new DuckDBParameter { Value = image.Photographer });
        command.Parameters.Add(new DuckDBParameter { Value = image.Width });
        command.Parameters.Add(new DuckDBParameter { Value = image.Height });
        command.Parameters.Add(new DuckDBParameter { Value = image.ContentType });
        command.Parameters.Add(new DuckDBParameter { Value = image.SourceUrl });
        command.Parameters.Add(new DuckDBParameter { Value = image.Bytes });
        command.ExecuteNonQuery();
    }

    public void InsertVideo(CachedVideo video)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = @"
INSERT OR REPLACE INTO pexels_videos (id, description, width, height, duration, content_type, source_url, bytes, preview_image, created_utc)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, current_timestamp);";
        command.Parameters.Add(new DuckDBParameter { Value = video.Id });
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

    public (int Images, int Videos) ClearAll()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM pexels_images;";
        var images = command.ExecuteNonQuery();
        command.CommandText = "DELETE FROM pexels_videos;";
        var videos = command.ExecuteNonQuery();
        return (images, videos);
    }

    private void EnsureSchema()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = @"
CREATE TABLE IF NOT EXISTS pexels_images (
    id TEXT PRIMARY KEY,
    description TEXT,
    photographer TEXT,
    width INTEGER,
    height INTEGER,
    content_type TEXT,
    source_url TEXT,
    bytes BLOB,
    created_utc TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pexels_videos (
    id TEXT PRIMARY KEY,
    description TEXT,
    width INTEGER,
    height INTEGER,
    duration INTEGER,
    content_type TEXT,
    source_url TEXT,
    bytes BLOB,
    preview_image TEXT,
    created_utc TIMESTAMP
);";
        command.ExecuteNonQuery();
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
}

public sealed record CachedImage(
    string Id,
    string Description,
    string Photographer,
    int Width,
    int Height,
    string ContentType,
    string SourceUrl,
    byte[] Bytes);

public sealed record CachedVideo(
    string Id,
    string Description,
    int Width,
    int Height,
    int Duration,
    string ContentType,
    string SourceUrl,
    byte[] Bytes,
    string PreviewImage);
