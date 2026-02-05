using System.Text.Json.Serialization;

namespace Sc2Pulse.Models
{
    public sealed class SC2Map
    {
        [JsonPropertyName("mapStatsFilmSpecId")]
        public long? MapStatsFilmSpecId { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }
    }

    public sealed class Match
    {
        [JsonPropertyName("date")]
        public DateTime? Date { get; set; }

        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("id")]
        public long? Id { get; set; }

        [JsonPropertyName("matchId")]
        public long? MatchId { get; set; }

        [JsonPropertyName("mapId")]
        public int? MapId { get; set; }

        [JsonPropertyName("region")]
        public string? Region { get; set; }

        [JsonPropertyName("updated")]
        public DateTime? Updated { get; set; }

        [JsonPropertyName("duration")]
        public int? Duration { get; set; }

        [JsonPropertyName("participants")]
        public List<MatchParticipant>? Participants { get; set; }
    }

    public sealed class MatchParticipant
    {
        [JsonPropertyName("playerCharacterId")]
        public long PlayerCharacterId { get; set; }

        [JsonPropertyName("team")]
        public long? Team { get; set; }

        [JsonPropertyName("teamSlot")]
        public int? TeamSlot { get; set; }

        [JsonPropertyName("race")]
        public string? Race { get; set; }

        [JsonPropertyName("decision")]
        public string? Decision { get; set; }

        [JsonPropertyName("ratingChange")]
        public int? RatingChange { get; set; }
    }
}