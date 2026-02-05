using StreamCraft.Core.Data.DuckDb;
using StreamCraft.Core.Data.Sql;
using DuckDB.NET.Data;

namespace StreamCraft.Core.Media.Cache;

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
    private readonly ISqlQueryStore _queries;

    public MediaCacheStore(IDuckDbConnectionFactory connectionFactory, ISqlQueryStore queries)
    {
        _connectionFactory = connectionFactory;
        _queries = queries ?? throw new ArgumentNullException(nameof(queries));
        EnsureSchema();
    }

    public int GetImageCount(string source)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("media/images_count");
        command.Parameters.Add(new DuckDBParameter { Value = source });
        return Convert.ToInt32(command.ExecuteScalar());
    }

    public int GetVideoCount(string source, MediaVideoFilter? filter = null)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        var filters = BuildVideoFilters(command, source, filter);
        command.CommandText = ApplyWhere(_queries.Get("media/videos_count"), filters);
        return Convert.ToInt32(command.ExecuteScalar());
    }

    public MediaImage? GetRandomImage(string source)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("media/image_random");
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
        command.CommandText = ApplyWhere(_queries.Get("media/video_random"), filters);
        using var reader = command.ExecuteReader();
        if (!reader.Read()) return null;
        return ReadVideo(reader);
    }

    public MediaImage? GetImageById(string source, string id)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("media/image_by_id");
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
        command.CommandText = ApplyWhere(_queries.Get("media/video_by_id"), filters);
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
        command.CommandText = ApplyWhere(_queries.Get("media/video_exists"), filters);
        using var reader = command.ExecuteReader();
        return reader.Read();
    }

    public IReadOnlyList<MediaImage> ListImages(string source, int limit = 100)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("media/images_list");
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
        command.CommandText = ApplyWhere(_queries.Get("media/videos_list"), filters);
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
        command.CommandText = _queries.Get("media/image_upsert");
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
        command.CommandText = _queries.Get("media/video_upsert");
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
        command.CommandText = _queries.Get("media/images_delete_source");
        command.Parameters.Add(new DuckDBParameter { Value = source });
        var images = command.ExecuteNonQuery();
        command.CommandText = _queries.Get("media/videos_delete_source");
        command.Parameters.Clear();
        command.Parameters.Add(new DuckDBParameter { Value = source });
        var videos = command.ExecuteNonQuery();
        return (images, videos);
    }

    public (int Images, int Videos) ClearAll()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("media/images_delete_all");
        var images = command.ExecuteNonQuery();
        command.CommandText = _queries.Get("media/videos_delete_all");
        var videos = command.ExecuteNonQuery();
        return (images, videos);
    }

    private void EnsureSchema()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("media/schema");
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

    private static string ApplyWhere(string sql, List<string> filters)
    {
        var where = string.Join(" AND ", filters);
        return sql.Replace("{{where}}", where, StringComparison.OrdinalIgnoreCase);
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



