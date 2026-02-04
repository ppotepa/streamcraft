using System.Security.Cryptography;
using System.Text;
using Core.Data.DuckDb;
using Core.Utilities;
using DuckDB.NET.Data;
using Microsoft.Extensions.Logging;

namespace Core.Security.KeyVault;

public sealed class KeyVaultStore : IKeyVault
{
    private readonly IDuckDbConnectionFactory _connectionFactory;
    private readonly ILogger<KeyVaultStore> _logger;

    public KeyVaultStore(IDuckDbConnectionFactory connectionFactory, ILogger<KeyVaultStore> logger)
    {
        _connectionFactory = connectionFactory;
        _logger = logger;
        EnsureSchema();
    }

    public Task<IReadOnlyList<string>> ListAsync(CancellationToken cancellationToken = default)
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT name FROM keyvault_keys ORDER BY name;";
        using var reader = command.ExecuteReader();
        var results = new List<string>();
        while (reader.Read())
        {
            results.Add(reader.GetString(0));
        }
        return Task.FromResult<IReadOnlyList<string>>(results);
    }

    public Task<string?> GetAsync(string name, KeyVaultEnvironment environment, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(name)) return Task.FromResult<string?>(null);
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT dev, test, live FROM keyvault_keys WHERE name = ?;";
        command.Parameters.Add(new DuckDBParameter { Value = name.Trim() });
        using var reader = command.ExecuteReader();
        if (!reader.Read()) return Task.FromResult<string?>(null);
        var index = environment switch
        {
            KeyVaultEnvironment.Dev => 0,
            KeyVaultEnvironment.Test => 1,
            KeyVaultEnvironment.Live => 2,
            _ => 0
        };
        if (reader.IsDBNull(index)) return Task.FromResult<string?>(null);
        var encrypted = ReadBlob(reader, index);
        return Task.FromResult(Decrypt(encrypted));
    }

    public Task SetAsync(string name, string dev, string test, string live, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(name)) return Task.CompletedTask;
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = @"
INSERT OR REPLACE INTO keyvault_keys (name, dev, test, live)
VALUES (?, ?, ?, ?);";
        command.Parameters.Add(new DuckDBParameter { Value = name.Trim() });
        command.Parameters.Add(new DuckDBParameter { Value = Encrypt(dev) });
        command.Parameters.Add(new DuckDBParameter { Value = Encrypt(test) });
        command.Parameters.Add(new DuckDBParameter { Value = Encrypt(live) });
        command.ExecuteNonQuery();
        return Task.CompletedTask;
    }

    private void EnsureSchema()
    {
        using var connection = _connectionFactory.OpenConnection();
        using var command = connection.CreateCommand();
        command.CommandText = @"
CREATE TABLE IF NOT EXISTS keyvault_keys (
    name TEXT PRIMARY KEY,
    dev BLOB,
    test BLOB,
    live BLOB
);";
        command.ExecuteNonQuery();
    }

    private static byte[]? Encrypt(string? value)
    {
        if (string.IsNullOrEmpty(value)) return null;
        var bytes = Encoding.UTF8.GetBytes(value);
        try
        {
            return ProtectedData.Protect(bytes, null, DataProtectionScope.CurrentUser);
        }
        catch
        {
            return bytes;
        }
    }

    private static string? Decrypt(byte[]? value)
    {
        if (value == null || value.Length == 0) return null;
        try
        {
            var decrypted = ProtectedData.Unprotect(value, null, DataProtectionScope.CurrentUser);
            return Encoding.UTF8.GetString(decrypted);
        }
        catch
        {
            return Encoding.UTF8.GetString(value);
        }
    }

    private static byte[]? ReadBlob(DuckDBDataReader reader, int index)
    {
        var raw = reader.GetValue(index);
        if (raw is byte[] bytes)
        {
            return bytes;
        }

        if (raw is Stream stream)
        {
            using var buffer = new MemoryStream();
            stream.CopyTo(buffer);
            return buffer.ToArray();
        }

        return null;
    }
}

