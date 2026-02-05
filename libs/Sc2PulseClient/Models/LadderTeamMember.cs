using System.Text.Json.Serialization;

namespace Sc2Pulse.Models
{
    public sealed class LadderTeamMember
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("character")]
        public PlayerCharacter? Character { get; set; }

        [JsonPropertyName("teamSlot")]
        public int TeamSlot { get; set; }

        [JsonPropertyName("teamStateId")]
        public long? TeamStateId { get; set; }

        // Race-specific games played
        [JsonPropertyName("protossGamesPlayed")]
        public int? ProtossGamesPlayed { get; set; }

        [JsonPropertyName("terranGamesPlayed")]
        public int? TerranGamesPlayed { get; set; }

        [JsonPropertyName("zergGamesPlayed")]
        public int? ZergGamesPlayed { get; set; }

        // Account information
        [JsonPropertyName("account")]
        public Account? Account { get; set; }

        // Clan information
        [JsonPropertyName("clan")]
        public Clan? Clan { get; set; }

        // Pro player information
        [JsonPropertyName("proId")]
        public long? ProId { get; set; }

        [JsonPropertyName("proNickname")]
        public string? ProNickname { get; set; }

        [JsonPropertyName("proTeam")]
        public string? ProTeam { get; set; }

        [JsonPropertyName("proPlayer")]
        public ProPlayerInfo? ProPlayer { get; set; }

        // Race games breakdown
        [JsonPropertyName("raceGames")]
        public Dictionary<string, int>? RaceGames { get; set; }
    }

    public sealed class Account
    {
        [JsonPropertyName("battleTag")]
        public string? BattleTag { get; set; }

        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("partition")]
        public string? Partition { get; set; }

        [JsonPropertyName("hidden")]
        public bool? Hidden { get; set; }

        [JsonPropertyName("tag")]
        public string? Tag { get; set; }

        [JsonPropertyName("discriminator")]
        public int? Discriminator { get; set; }
    }

    public sealed class Clan
    {
        [JsonPropertyName("tag")]
        public string? Tag { get; set; }

        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("region")]
        public string? Region { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("members")]
        public int? Members { get; set; }

        [JsonPropertyName("activeMembers")]
        public int? ActiveMembers { get; set; }

        [JsonPropertyName("avgRating")]
        public int? AvgRating { get; set; }

        [JsonPropertyName("avgLeagueType")]
        public int? AvgLeagueType { get; set; }

        [JsonPropertyName("games")]
        public int? Games { get; set; }
    }

    public sealed class ProPlayerInfo
    {
        [JsonPropertyName("proPlayer")]
        public ProPlayer? ProPlayer { get; set; }

        [JsonPropertyName("proTeam")]
        public ProTeam? ProTeam { get; set; }

        [JsonPropertyName("links")]
        public List<object>? Links { get; set; }
    }

    public sealed class ProPlayer
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("aligulacId")]
        public long? AligulacId { get; set; }

        [JsonPropertyName("nickname")]
        public string? Nickname { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("country")]
        public string? Country { get; set; }

        [JsonPropertyName("birthday")]
        public DateTime? Birthday { get; set; }

        [JsonPropertyName("earnings")]
        public decimal? Earnings { get; set; }

        [JsonPropertyName("updated")]
        public DateTime? Updated { get; set; }

        [JsonPropertyName("version")]
        public string? Version { get; set; }
    }

    public sealed class ProTeam
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("shortName")]
        public string? ShortName { get; set; }

        [JsonPropertyName("id")]
        public long? Id { get; set; }

        [JsonPropertyName("aligulacId")]
        public long? AligulacId { get; set; }

        [JsonPropertyName("updated")]
        public DateTime? Updated { get; set; }
    }
}