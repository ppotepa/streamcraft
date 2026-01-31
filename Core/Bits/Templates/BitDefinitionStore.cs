using System.Text.Json;
using Core.Diagnostics;

namespace Core.Bits.Templates;

/// <summary>
/// Stores and retrieves user-created bit definitions
/// Currently file-based, can be replaced with database later
/// </summary>
public class BitDefinitionStore
{
    private readonly string _storePath;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly Serilog.ILogger? _logger;

    public BitDefinitionStore(string? storePath = null, Serilog.ILogger? logger = null)
    {
        _storePath = storePath ?? Path.Combine(AppContext.BaseDirectory, "bits-definitions.json");
        _jsonOptions = new JsonSerializerOptions
        {
            WriteIndented = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        _logger = logger;
    }

    public async Task<List<BitDefinition>> LoadAllAsync()
    {
        if (!File.Exists(_storePath))
        {
            return new List<BitDefinition>();
        }

        try
        {
            var json = await File.ReadAllTextAsync(_storePath);
            return JsonSerializer.Deserialize<List<BitDefinition>>(json, _jsonOptions)
                   ?? new List<BitDefinition>();
        }
        catch (Exception ex)
        {
            _logger?.Error(ex, "Failed to load bit definitions from {StorePath}", _storePath);
            ExceptionFactory.Report(ex, ExceptionSeverity.Error, source: "BitDefinitionStore",
                context: new Dictionary<string, string?> { ["StorePath"] = _storePath });
            throw;
        }
    }

    public async Task SaveAsync(BitDefinition definition)
    {
        var definitions = await LoadAllAsync();

        var existing = definitions.FindIndex(d => d.Id == definition.Id);
        if (existing >= 0)
        {
            definition.UpdatedAt = DateTime.UtcNow;
            definitions[existing] = definition;
        }
        else
        {
            definitions.Add(definition);
        }

        await SaveAllAsync(definitions);
    }

    public async Task DeleteAsync(string id)
    {
        var definitions = await LoadAllAsync();
        definitions.RemoveAll(d => d.Id == id);
        await SaveAllAsync(definitions);
    }

    public async Task<BitDefinition?> GetByIdAsync(string id)
    {
        var definitions = await LoadAllAsync();
        return definitions.FirstOrDefault(d => d.Id == id);
    }

    private async Task SaveAllAsync(List<BitDefinition> definitions)
    {
        var json = JsonSerializer.Serialize(definitions, _jsonOptions);
        var directory = Path.GetDirectoryName(_storePath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var tempPath = $"{_storePath}.{Guid.NewGuid():N}.tmp";
        await File.WriteAllTextAsync(tempPath, json);
        File.Move(tempPath, _storePath, true);
    }
}
