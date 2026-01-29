using System.Text.RegularExpressions;

namespace Bits.Sc2.Domain.ValueObjects;

/// <summary>
/// Value object representing a Battle.net BattleTag with validation.
/// Format: Name#1234 (3-16 alphanumeric characters, followed by # and 4-5 digits)
/// </summary>
public record BattleTag
{
    private static readonly Regex ValidationPattern = new(@"^[A-Za-z0-9]{3,16}#\d{4,5}$", RegexOptions.Compiled);

    public string Name { get; }
    public string Discriminator { get; }
    public string FullTag { get; }

    public BattleTag(string battleTag)
    {
        if (string.IsNullOrWhiteSpace(battleTag))
            throw new ArgumentException("BattleTag cannot be null or empty.", nameof(battleTag));

        var trimmed = battleTag.Trim();

        if (!ValidationPattern.IsMatch(trimmed))
            throw new ArgumentException(
                $"Invalid BattleTag format: '{battleTag}'. Expected format: Name#1234 (3-16 alphanumeric characters, # and 4-5 digits).",
                nameof(battleTag));

        var parts = trimmed.Split('#');
        Name = parts[0];
        Discriminator = parts[1];
        FullTag = trimmed;
    }

    /// <summary>
    /// Creates a BattleTag from separate name and discriminator.
    /// </summary>
    public static BattleTag From(string name, string discriminator)
    {
        return new BattleTag($"{name}#{discriminator}");
    }

    /// <summary>
    /// Tries to parse a BattleTag string. Returns null if invalid.
    /// </summary>
    public static BattleTag? TryParse(string? battleTag)
    {
        if (string.IsNullOrWhiteSpace(battleTag))
            return null;

        try
        {
            return new BattleTag(battleTag);
        }
        catch (ArgumentException)
        {
            return null;
        }
    }

    /// <summary>
    /// Checks if a string is a valid BattleTag format without throwing.
    /// </summary>
    public static bool IsValid(string? battleTag)
    {
        return !string.IsNullOrWhiteSpace(battleTag) && ValidationPattern.IsMatch(battleTag.Trim());
    }

    /// <summary>
    /// Gets the display name (without discriminator).
    /// </summary>
    public string GetDisplayName() => Name;

    public override string ToString() => FullTag;

    // Implicit conversion to string for convenience
    public static implicit operator string(BattleTag battleTag) => battleTag.FullTag;
}
