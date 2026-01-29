namespace Core.Bits.Templates;

/// <summary>
/// Defines a template for creating dynamic bits through UI builder
/// Templates provide pre-configured behavior that can be customized
/// </summary>
public interface IBitTemplate
{
    /// <summary>
    /// Unique identifier for this template
    /// </summary>
    string TemplateId { get; }

    /// <summary>
    /// Display name shown in UI builder
    /// </summary>
    string TemplateName { get; }

    /// <summary>
    /// Description of what this template does
    /// </summary>
    string TemplateDescription { get; }

    /// <summary>
    /// Category for organizing templates (e.g., "API", "System", "Data")
    /// </summary>
    string Category { get; }

    /// <summary>
    /// Icon identifier for UI display
    /// </summary>
    string Icon { get; }

    /// <summary>
    /// Configuration schema defining what users can customize
    /// </summary>
    IReadOnlyList<BitConfigurationSection> GetConfigurationSchema();

    /// <summary>
    /// Creates a dynamic bit instance from user configuration
    /// </summary>
    IBit CreateBit(BitDefinition definition);

    /// <summary>
    /// Validates that a bit definition is compatible with this template
    /// </summary>
    ValidationResult Validate(BitDefinition definition);
}

/// <summary>
/// Stores the user-defined configuration for a dynamic bit
/// </summary>
public class BitDefinition
{
    public required string Id { get; init; }
    public required string TemplateId { get; init; }
    public required string Name { get; init; }
    public required string Description { get; init; }
    public required string Route { get; init; }
    public bool HasUserInterface { get; init; }
    public Dictionary<string, object?> Configuration { get; init; } = new();
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public bool IsEnabled { get; set; } = true;
}

public class ValidationResult
{
    public bool IsValid { get; init; }
    public List<string> Errors { get; init; } = new();

    public static ValidationResult Success() => new() { IsValid = true };
    public static ValidationResult Failure(params string[] errors) => new()
    {
        IsValid = false,
        Errors = errors.ToList()
    };
}
