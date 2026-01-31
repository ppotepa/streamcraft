using Core.Diagnostics;

namespace Bits.Sc2.Domain.ValueObjects;

/// <summary>
/// Value object representing a StarCraft II race with validation.
/// </summary>
public record Race
{
    private static readonly HashSet<string> ValidRaces = new(StringComparer.OrdinalIgnoreCase)
    {
        "Terran", "Protoss", "Zerg", "Random"
    };

    public string Name { get; }
    public RaceType Type { get; }

    public Race(string race)
    {
        if (string.IsNullOrWhiteSpace(race))
            throw ExceptionFactory.Argument("Race cannot be null or empty.", nameof(race));

        var normalized = NormalizeRaceName(race);

        if (!ValidRaces.Contains(normalized))
            throw ExceptionFactory.Argument(
                $"Invalid race: '{race}'. Valid races: Terran, Protoss, Zerg, Random.",
                nameof(race));

        Name = normalized;
        Type = ParseRaceType(normalized);
    }

    private static string NormalizeRaceName(string race)
    {
        var trimmed = race.Trim();

        // Handle common abbreviations and API variations
        return trimmed.ToUpperInvariant() switch
        {
            "T" or "TERR" => "Terran",
            "P" or "PROT" => "Protoss",
            "Z" => "Zerg",
            "R" or "RAND" => "Random",
            _ => char.ToUpperInvariant(trimmed[0]) + trimmed[1..].ToLowerInvariant()
        };
    }

    private static RaceType ParseRaceType(string race)
    {
        return race.ToUpperInvariant() switch
        {
            "TERRAN" => RaceType.Terran,
            "PROTOSS" => RaceType.Protoss,
            "ZERG" => RaceType.Zerg,
            "RANDOM" => RaceType.Random,
            _ => throw ExceptionFactory.Argument($"Unknown race: {race}")
        };
    }

    /// <summary>
    /// Tries to parse a race string. Returns null if invalid.
    /// </summary>
    public static Race? TryParse(string? race)
    {
        if (string.IsNullOrWhiteSpace(race))
            return null;

        try
        {
            return new Race(race);
        }
        catch (ArgumentException)
        {
            return null;
        }
    }

    /// <summary>
    /// Checks if a string is a valid race without throwing.
    /// </summary>
    public static bool IsValid(string? race)
    {
        if (string.IsNullOrWhiteSpace(race))
            return false;

        try
        {
            var normalized = NormalizeRaceName(race);
            return ValidRaces.Contains(normalized);
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Gets the race icon/emoji representation.
    /// </summary>
    public string GetIcon() => Type switch
    {
        RaceType.Terran => "🔧",
        RaceType.Protoss => "⚡",
        RaceType.Zerg => "🦎",
        RaceType.Random => "🎲",
        _ => "❓"
    };

    /// <summary>
    /// Gets the race color (for UI representation).
    /// </summary>
    public string GetColor() => Type switch
    {
        RaceType.Terran => "#0042FF",   // Blue
        RaceType.Protoss => "#FFD700",  // Gold
        RaceType.Zerg => "#8B008B",     // Purple
        RaceType.Random => "#808080",   // Gray
        _ => "#FFFFFF"
    };

    /// <summary>
    /// Checks if this race has an advantage against another (rock-paper-scissors style).
    /// Note: This is subjective and based on meta/balance.
    /// </summary>
    public bool HasAdvantageAgainst(Race other)
    {
        // Simplified advantage matrix (this would be updated based on current meta)
        return (Type, other.Type) switch
        {
            (RaceType.Terran, RaceType.Protoss) => false,
            (RaceType.Terran, RaceType.Zerg) => true,
            (RaceType.Protoss, RaceType.Terran) => true,
            (RaceType.Protoss, RaceType.Zerg) => false,
            (RaceType.Zerg, RaceType.Terran) => false,
            (RaceType.Zerg, RaceType.Protoss) => true,
            _ => false // Same race or Random
        };
    }

    public override string ToString() => Name;

    // Implicit conversion to string for convenience
    public static implicit operator string(Race race) => race.Name;

    // Predefined race instances
    public static Race Terran => new("Terran");
    public static Race Protoss => new("Protoss");
    public static Race Zerg => new("Zerg");
    public static Race Random => new("Random");
}

/// <summary>
/// Race type enumeration.
/// </summary>
public enum RaceType
{
    Terran = 0,
    Protoss = 1,
    Zerg = 2,
    Random = 3
}
