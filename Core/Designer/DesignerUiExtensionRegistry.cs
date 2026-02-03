namespace Core.Designer;

public interface IDesignerUiExtensionRegistry
{
    IReadOnlyList<DesignerUiExtensionDefinition> GetAll();
    void Register(DesignerUiExtensionDefinition extension);
    void RegisterRange(IEnumerable<DesignerUiExtensionDefinition> extensions);
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
}
