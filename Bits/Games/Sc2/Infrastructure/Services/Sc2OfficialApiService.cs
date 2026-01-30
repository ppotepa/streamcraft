using Bits.Sc2.Application.Services;
using Bits.Sc2.Domain.Entities;
using Bits.Sc2.Domain.ValueObjects;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Sc2GameDataClient;
using System.Text.Json;

namespace Bits.Sc2.Infrastructure.Services;

/// <summary>
/// Implementation of the official Blizzard SC2 Community API service.
/// </summary>
public sealed class Sc2OfficialApiService : ISc2PulseApiService
{
    private readonly ISc2GameDataClient _client;
    private readonly Sc2GameDataClientOptions _options;
    private readonly ILogger<Sc2OfficialApiService> _logger;

    public Sc2OfficialApiService(
        ISc2GameDataClient client,
        IOptions<Sc2GameDataClientOptions> options,
        ILogger<Sc2OfficialApiService> logger)
    {
        _client = client ?? throw new ArgumentNullException(nameof(client));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public Task<long?> FindCharacterIdAsync(BattleTag battleTag, CancellationToken cancellationToken = default)
    {
        if (_options.ProfileId > 0)
        {
            return Task.FromResult<long?>(_options.ProfileId);
        }

        _logger.LogWarning("Official SC2 API requires ProfileId configuration to resolve player data.");
        return Task.FromResult<long?>(null);
    }

    public async Task<PlayerProfile?> FetchPlayerDataAsync(BattleTag battleTag, CancellationToken cancellationToken = default)
    {
        if (_options.ProfileId <= 0 || _options.RegionId <= 0 || _options.RealmId <= 0)
        {
            _logger.LogWarning("Official SC2 API options are incomplete (RegionId/RealmId/ProfileId required).");
            return null;
        }

        return await FetchProfileInternalAsync(battleTag, _options.ProfileId, cancellationToken).ConfigureAwait(false);
    }

    public async Task<PlayerProfile?> FetchPlayerDataByIdAsync(long characterId, CancellationToken cancellationToken = default)
    {
        if (_options.RegionId <= 0 || _options.RealmId <= 0)
        {
            _logger.LogWarning("Official SC2 API options are incomplete (RegionId/RealmId required).");
            return null;
        }

        var fallbackBattleTag = BattleTag.TryParse(_options.DefaultBattleTag);
        if (fallbackBattleTag == null)
        {
            _logger.LogWarning("Official SC2 API requires DefaultBattleTag to build player profile.");
            return null;
        }

        return await FetchProfileInternalAsync(fallbackBattleTag, characterId, cancellationToken).ConfigureAwait(false);
    }

    public Task<List<MmrHistoryPoint>> FetchMmrHistoryAsync(
        long characterId,
        Domain.ValueObjects.Race race,
        int region,
        long battleNetId,
        CancellationToken cancellationToken = default)
    {
        // Official API does not provide MMR history.
        return Task.FromResult(new List<MmrHistoryPoint>());
    }

    public Task<MatchHistory?> FetchMatchHistoryAsync(
        long characterId,
        int limit = 25,
        CancellationToken cancellationToken = default)
    {
        // Official API does not provide match history in the same format.
        return Task.FromResult<MatchHistory?>(null);
    }

    private async Task<PlayerProfile?> FetchProfileInternalAsync(BattleTag battleTag, long profileId, CancellationToken cancellationToken)
    {
        try
        {
            var profileDoc = await _client.GetProfileAsync(_options.RegionId, _options.RealmId, (int)profileId, _options.Locale, cancellationToken)
                .ConfigureAwait(false);

            var profile = BuildProfileFromProfileDoc(profileDoc, battleTag, profileId);
            if (profile == null)
            {
                return null;
            }

            try
            {
                var ladderDoc = await _client.GetLadderSummaryAsync(_options.RegionId, _options.RealmId, (int)profileId, _options.Locale, cancellationToken)
                    .ConfigureAwait(false);
                ApplyLadderSummary(profile, ladderDoc);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogDebug(ex, "Failed to fetch ladder summary for profile {ProfileId}", profileId);
            }

            return profile;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Failed to fetch profile from official SC2 API.");
            return null;
        }
    }

    private PlayerProfile? BuildProfileFromProfileDoc(JsonDocument doc, BattleTag battleTag, long profileId)
    {
        var root = doc.RootElement;
        var summary = TryGetElement(root, "summary");
        var career = TryGetElement(root, "career");

        var displayName = TryGetString(summary, "displayName") ?? battleTag.GetDisplayName();
        var primaryRace = Race.TryParse(TryGetString(career, "primaryRace"));

        var profile = PlayerProfile.Create(battleTag, displayName);
        profile.UpdateBasicInfo(profileId, primaryRace);

        var clanTag = TryGetString(summary, "clanTag");
        var clanName = TryGetString(summary, "clanName");
        if (!string.IsNullOrWhiteSpace(clanTag) || !string.IsNullOrWhiteSpace(clanName))
        {
            profile.UpdateClanInfo(clanTag, clanName);
        }

        var totalGames = TryGetInt(career, "careerTotalGames") ?? 0;
        var seasonGames = TryGetInt(career, "seasonTotalGames") ?? totalGames;
        if (totalGames > 0 || seasonGames > 0)
        {
            profile.UpdateStatistics(totalGames, seasonGames, null, null);
        }

        profile.UpdateLastPlayed(DateTime.UtcNow);

        return profile;
    }

    private void ApplyLadderSummary(PlayerProfile profile, JsonDocument doc)
    {
        var root = doc.RootElement;
        var currentSeason = TryGetElement(root, "currentSeason");
        if (currentSeason.ValueKind != JsonValueKind.Object)
        {
            return;
        }

        var ladder = TryGetElement(currentSeason, "ladder");
        if (ladder.ValueKind != JsonValueKind.Array)
        {
            return;
        }

        // Use first ladder entry if present
        if (ladder.GetArrayLength() == 0)
        {
            return;
        }

        var first = ladder[0];
        var divisionRank = TryGetInt(first, "rank");
        if (divisionRank.HasValue)
        {
            profile.UpdateRanking(null, null, divisionRank, null);
        }
    }

    private static JsonElement TryGetElement(JsonElement element, string name)
    {
        if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value))
        {
            return value;
        }

        return default;
    }

    private static string? TryGetString(JsonElement element, string name)
    {
        if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value))
        {
            return value.ValueKind == JsonValueKind.String ? value.GetString() : null;
        }

        return null;
    }

    private static int? TryGetInt(JsonElement element, string name)
    {
        if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(name, out var value))
        {
            if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number))
            {
                return number;
            }
        }

        return null;
    }
}
