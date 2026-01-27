using System.Text.Json.Serialization;

namespace Sc2Pulse.Models
{
    /// <summary>
    /// Represents team history data with static metadata and historical rating/timestamp data.
    /// </summary>
    public sealed class TeamHistory
    {
        [JsonPropertyName("staticData")]
        public TeamHistoryStaticData? StaticData { get; set; }

        [JsonPropertyName("history")]
        public TeamHistoryData? History { get; set; }
    }

    /// <summary>
    /// Static data for team history (e.g., legacy ID).
    /// </summary>
    public sealed class TeamHistoryStaticData
    {
        [JsonPropertyName("LEGACY_ID")]
        public string? LegacyId { get; set; }
    }

    /// <summary>
    /// Historical data containing parallel arrays of timestamps and ratings.
    /// </summary>
    public sealed class TeamHistoryData
    {
        [JsonPropertyName("TIMESTAMP")]
        public List<long> Timestamp { get; set; } = new();

        [JsonPropertyName("RATING")]
        public List<int> Rating { get; set; } = new();
    }
}
