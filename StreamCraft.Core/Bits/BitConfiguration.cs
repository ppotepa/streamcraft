namespace StreamCraft.Core.Bits;

public interface IConfigurationModel
{
}

public interface IBitConfiguration<TConfigurationModel> where TConfigurationModel : IConfigurationModel
{
    TConfigurationModel Configuration { get; }
    IReadOnlyList<BitConfigurationSection> GetConfigurationSections();
}

public sealed class BitConfigurationSection
{
    public BitConfigurationSection(string id, string title, string? description, IReadOnlyList<BitConfigurationField> fields)
    {
        Id = id;
        Title = title;
        Description = description;
        Fields = fields;
    }

    public string Id { get; }
    public string Title { get; }
    public string? Description { get; }
    public IReadOnlyList<BitConfigurationField> Fields { get; }
}

public sealed class BitConfigurationField
{
    public BitConfigurationField(
        string key,
        string label,
        string type,
        string? description = null,
        string? placeholder = null,
        string? defaultValue = null,
        bool required = false,
        string? validationPattern = null)
    {
        Key = key;
        Label = label;
        Type = type;
        Description = description;
        Placeholder = placeholder;
        DefaultValue = defaultValue;
        Required = required;
        ValidationPattern = validationPattern;
    }

    public string Key { get; }
    public string Label { get; }
    public string Type { get; }
    public string? Description { get; }
    public string? Placeholder { get; }
    public string? DefaultValue { get; }
    public bool Required { get; }
    public string? ValidationPattern { get; }
}
