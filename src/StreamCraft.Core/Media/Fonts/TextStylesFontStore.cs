using System.Text.Json;
using StreamCraft.Core.Data.DuckDb;
using StreamCraft.Core.Data.Sql;
using DuckDB.NET.Data;

namespace StreamCraft.Core.Media.Fonts;

public sealed class TextStylesFontStore
{
    private readonly IDuckDbConnectionFactory _connectionFactory;
    private readonly ISqlQueryStore _queries;

    public TextStylesFontStore(IDuckDbConnectionFactory connectionFactory, ISqlQueryStore queries)
    {
        _connectionFactory = connectionFactory;
        _queries = queries ?? throw new ArgumentNullException(nameof(queries));
        EnsureSchema();
    }

    public int GetFamilyCount()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("textstyles/family_count_all");
        return Convert.ToInt32(command.ExecuteScalar());
    }

    public CachedFontFamily? GetFamily(string family)
    {
        if (string.IsNullOrWhiteSpace(family)) return null;
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("textstyles/family_read");
        command.Parameters.Add(new DuckDBParameter { Value = family.Trim() });
        using var reader = command.ExecuteReader();
        if (!reader.Read()) return null;
        return ReadFamily(reader);
    }

    public IReadOnlyList<CachedFontFamily> ListFamilies(string? query, string? category, int limit)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        var filters = BuildFilters(command, query, category);
        command.CommandText = ApplyWhere(_queries.Get("textstyles/family_list"), filters);
        command.Parameters.Add(new DuckDBParameter { Value = limit });

        using var reader = command.ExecuteReader();
        var results = new List<CachedFontFamily>();
        while (reader.Read())
        {
            results.Add(ReadFamily(reader));
        }
        return results;
    }

    public int CountFamilies(string? query, string? category)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        var filters = BuildFilters(command, query, category);
        command.CommandText = ApplyWhere(_queries.Get("textstyles/family_count"), filters);
        return Convert.ToInt32(command.ExecuteScalar());
    }

    public CachedFontFile? GetFontFile(string family, string variant)
    {
        if (string.IsNullOrWhiteSpace(family) || string.IsNullOrWhiteSpace(variant)) return null;
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("textstyles/fontfile_read");
        command.Parameters.Add(new DuckDBParameter { Value = family.Trim() });
        command.Parameters.Add(new DuckDBParameter { Value = variant.Trim() });
        using var reader = command.ExecuteReader();
        if (!reader.Read()) return null;
        return new CachedFontFile(
            reader.GetString(0),
            reader.GetString(1),
            reader.IsDBNull(2) ? string.Empty : reader.GetString(2),
            reader.IsDBNull(3) ? "font/ttf" : reader.GetString(3),
            ReadBlob(reader, 4) ?? Array.Empty<byte>()
        );
    }

    public void UpsertFamilies(IReadOnlyList<GoogleFontFamily> families)
    {
        if (families.Count == 0) return;

        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("textstyles/family_upsert");

        var familyParam = new DuckDBParameter();
        var categoryParam = new DuckDBParameter();
        var variantsParam = new DuckDBParameter();
        var subsetsParam = new DuckDBParameter();
        var filesParam = new DuckDBParameter();
        var versionParam = new DuckDBParameter();
        var lastModifiedParam = new DuckDBParameter();
        var rankParam = new DuckDBParameter();

        command.Parameters.Add(familyParam);
        command.Parameters.Add(categoryParam);
        command.Parameters.Add(variantsParam);
        command.Parameters.Add(subsetsParam);
        command.Parameters.Add(filesParam);
        command.Parameters.Add(versionParam);
        command.Parameters.Add(lastModifiedParam);
        command.Parameters.Add(rankParam);

        var rank = 1;
        foreach (var family in families)
        {
            familyParam.Value = family.Family;
            categoryParam.Value = family.Category;
            variantsParam.Value = SerializeJson(family.Variants);
            subsetsParam.Value = SerializeJson(family.Subsets);
            filesParam.Value = SerializeJson(family.Files);
            versionParam.Value = family.Version ?? string.Empty;
            lastModifiedParam.Value = family.LastModified ?? string.Empty;
            rankParam.Value = rank++;
            command.ExecuteNonQuery();
        }
    }

    public void UpsertFontFile(CachedFontFile file)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("textstyles/fontfile_upsert");
        command.Parameters.Add(new DuckDBParameter { Value = file.Family });
        command.Parameters.Add(new DuckDBParameter { Value = file.Variant });
        command.Parameters.Add(new DuckDBParameter { Value = file.SourceUrl });
        command.Parameters.Add(new DuckDBParameter { Value = file.ContentType });
        command.Parameters.Add(new DuckDBParameter { Value = file.Bytes });
        command.ExecuteNonQuery();
    }

    private void EnsureSchema()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = _queries.Get("textstyles/schema");
        command.ExecuteNonQuery();
    }

    private static CachedFontFamily ReadFamily(DuckDBDataReader reader)
    {
        var family = reader.GetString(0);
        var category = reader.IsDBNull(1) ? string.Empty : reader.GetString(1);
        var variants = DeserializeArray(reader.IsDBNull(2) ? null : reader.GetString(2));
        var subsets = DeserializeArray(reader.IsDBNull(3) ? null : reader.GetString(3));
        var files = DeserializeDictionary(reader.IsDBNull(4) ? null : reader.GetString(4));
        var version = reader.IsDBNull(5) ? null : reader.GetString(5);
        var lastModified = reader.IsDBNull(6) ? null : reader.GetString(6);
        var rank = reader.IsDBNull(7) ? 0 : reader.GetInt32(7);
        return new CachedFontFamily(family, category, variants, subsets, version, lastModified, rank, files);
    }

    private static string SerializeJson<T>(T value)
    {
        return JsonSerializer.Serialize(value);
    }

    private static string[] DeserializeArray(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Array.Empty<string>();
        try
        {
            return JsonSerializer.Deserialize<string[]>(json) ?? Array.Empty<string>();
        }
        catch
        {
            return Array.Empty<string>();
        }
    }

    private static Dictionary<string, string> DeserializeDictionary(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var parsed = JsonSerializer.Deserialize<Dictionary<string, string>>(json);
            return parsed == null
                ? new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, string>(parsed, StringComparer.OrdinalIgnoreCase);
        }
        catch
        {
            return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        }
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

    private static List<string> BuildFilters(DuckDBCommand command, string? query, string? category)
    {
        var filters = new List<string>();
        if (!string.IsNullOrWhiteSpace(query))
        {
            filters.Add("LOWER(family) LIKE ?");
            command.Parameters.Add(new DuckDBParameter { Value = $"%{query.Trim().ToLowerInvariant()}%" });
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            filters.Add("LOWER(category) = ?");
            command.Parameters.Add(new DuckDBParameter { Value = category.Trim().ToLowerInvariant() });
        }

        return filters;
    }

    private static string ApplyWhere(string sql, List<string> filters)
    {
        var where = filters.Count > 0 ? $"WHERE {string.Join(" AND ", filters)}" : string.Empty;
        return sql.Replace("{{where}}", where, StringComparison.OrdinalIgnoreCase);
    }
}

public sealed record CachedFontFamily(
    string Family,
    string Category,
    string[] Variants,
    string[] Subsets,
    string? Version,
    string? LastModified,
    int PopularityRank,
    IReadOnlyDictionary<string, string> Files);

public sealed record CachedFontFile(
    string Family,
    string Variant,
    string SourceUrl,
    string ContentType,
    byte[] Bytes);




