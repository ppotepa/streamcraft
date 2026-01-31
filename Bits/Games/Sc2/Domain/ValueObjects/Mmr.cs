using Core.Diagnostics;

namespace Bits.Sc2.Domain.ValueObjects;

/// <summary>
/// Value object representing StarCraft II MMR (Match Making Rating) with tier calculation.
/// </summary>
public record Mmr
{
    public int Rating { get; }
    public League League { get; }
    public MmrTier Tier { get; }

    public Mmr(int rating)
    {
        if (rating < 0)
            throw ExceptionFactory.Argument("MMR cannot be negative.", nameof(rating));

        if (rating > 7000)
            throw ExceptionFactory.Argument("MMR cannot exceed 7000.", nameof(rating));

        Rating = rating;
        League = CalculateLeague(rating);
        Tier = CalculateTier(rating, League);
    }

    private static League CalculateLeague(int rating)
    {
        return rating switch
        {
            < 1800 => League.Bronze,
            < 2400 => League.Silver,
            < 2800 => League.Gold,
            < 3400 => League.Platinum,
            < 4100 => League.Diamond,
            < 5100 => League.Master,
            _ => League.Grandmaster
        };
    }

    private static MmrTier CalculateTier(int rating, League league)
    {
        if (league == League.Grandmaster)
            return MmrTier.None; // GM doesn't have tiers

        var leagueRanges = league switch
        {
            League.Bronze => (min: 0, max: 1800),
            League.Silver => (min: 1800, max: 2400),
            League.Gold => (min: 2400, max: 2800),
            League.Platinum => (min: 2800, max: 3400),
            League.Diamond => (min: 3400, max: 4100),
            League.Master => (min: 4100, max: 5100),
            _ => (min: 0, max: 0)
        };

        var leagueSpan = leagueRanges.max - leagueRanges.min;
        var relativePosition = (double)(rating - leagueRanges.min) / leagueSpan;

        // Divide into 3 tiers (1 = highest, 3 = lowest)
        return relativePosition switch
        {
            >= 0.67 => MmrTier.One,
            >= 0.33 => MmrTier.Two,
            _ => MmrTier.Three
        };
    }

    /// <summary>
    /// Gets the formatted league with tier (e.g., "Diamond 2", "Master 1", "Grandmaster").
    /// </summary>
    public string GetFormattedLeague()
    {
        if (League == League.Grandmaster || Tier == MmrTier.None)
            return League.ToString();

        return $"{League} {(int)Tier}";
    }

    /// <summary>
    /// Gets the percentile rank (0-100) based on rating distribution.
    /// Approximation based on typical SC2 MMR distribution.
    /// </summary>
    public double GetPercentile()
    {
        return Rating switch
        {
            < 1000 => 1.0,
            < 1800 => 5.0 + (Rating - 1000) * 15.0 / 800,    // Bronze: 5-20%
            < 2400 => 20.0 + (Rating - 1800) * 20.0 / 600,   // Silver: 20-40%
            < 2800 => 40.0 + (Rating - 2400) * 15.0 / 400,   // Gold: 40-55%
            < 3400 => 55.0 + (Rating - 2800) * 20.0 / 600,   // Platinum: 55-75%
            < 4100 => 75.0 + (Rating - 3400) * 15.0 / 700,   // Diamond: 75-90%
            < 5100 => 90.0 + (Rating - 4100) * 7.0 / 1000,   // Master: 90-97%
            _ => 97.0 + Math.Min(3.0, (Rating - 5100) * 3.0 / 2000) // GM: 97-100%
        };
    }

    /// <summary>
    /// Calculates the difference between this MMR and another.
    /// </summary>
    public int DifferenceTo(Mmr other) => Rating - other.Rating;

    /// <summary>
    /// Checks if this MMR is higher than another.
    /// </summary>
    public bool IsHigherThan(Mmr other) => Rating > other.Rating;

    /// <summary>
    /// Checks if this MMR is within a range of another.
    /// </summary>
    public bool IsWithinRange(Mmr other, int range) => Math.Abs(Rating - other.Rating) <= range;

    public override string ToString() => $"{Rating} ({GetFormattedLeague()})";

    // Implicit conversion to int for convenience
    public static implicit operator int(Mmr mmr) => mmr.Rating;

    // Comparison operators
    public static bool operator >(Mmr left, Mmr right) => left.Rating > right.Rating;
    public static bool operator <(Mmr left, Mmr right) => left.Rating < right.Rating;
    public static bool operator >=(Mmr left, Mmr right) => left.Rating >= right.Rating;
    public static bool operator <=(Mmr left, Mmr right) => left.Rating <= right.Rating;
}

/// <summary>
/// StarCraft II league enumeration.
/// </summary>
public enum League
{
    Bronze = 0,
    Silver = 1,
    Gold = 2,
    Platinum = 3,
    Diamond = 4,
    Master = 5,
    Grandmaster = 6
}

/// <summary>
/// League tier enumeration (1 = highest, 3 = lowest).
/// </summary>
public enum MmrTier
{
    None = 0,  // For Grandmaster
    One = 1,
    Two = 2,
    Three = 3
}
