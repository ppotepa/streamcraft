namespace StreamCraft.Core.Ui.Extensions;

public interface IDesignerUiExtensionRegistry
{
    IReadOnlyList<DesignerUiExtensionDefinition> GetAll();
    void Register(DesignerUiExtensionDefinition extension);
    void RegisterRange(IEnumerable<DesignerUiExtensionDefinition> extensions);
    void UpdateData(string idOrGroup, IReadOnlyDictionary<string, object?> data, bool merge = true);
}

public sealed class DesignerUiExtensionRegistry : IDesignerUiExtensionRegistry
{
    private readonly List<DesignerUiExtensionDefinition> _extensions = new();

    public IReadOnlyList<DesignerUiExtensionDefinition> GetAll() => _extensions.AsReadOnly();

    public void Register(DesignerUiExtensionDefinition extension)
    {
        if (extension == null) return;
        if (string.IsNullOrWhiteSpace(extension.Id)) return;
        if (_extensions.Any(existing => string.Equals(existing.Id, extension.Id, StringComparison.OrdinalIgnoreCase)))
        {
            return;
        }

        _extensions.Add(extension);
    }

    public void RegisterRange(IEnumerable<DesignerUiExtensionDefinition> extensions)
    {
        if (extensions == null) return;
        foreach (var extension in extensions)
        {
            Register(extension);
        }
    }

    public void UpdateData(string idOrGroup, IReadOnlyDictionary<string, object?> data, bool merge = true)
    {
        if (string.IsNullOrWhiteSpace(idOrGroup) || data == null) return;
        var key = idOrGroup.Trim();
        for (var index = 0; index < _extensions.Count; index++)
        {
            var existing = _extensions[index];
            if (!string.Equals(existing.Id, key, StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(existing.Group, key, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            object? nextData = data;
            if (merge && existing.Data is IReadOnlyDictionary<string, object?> existingMap)
            {
                var merged = new Dictionary<string, object?>(existingMap, StringComparer.OrdinalIgnoreCase);
                foreach (var entry in data)
                {
                    merged[entry.Key] = entry.Value;
                }
                nextData = merged;
            }

            _extensions[index] = existing with { Data = nextData };
        }
    }
}




