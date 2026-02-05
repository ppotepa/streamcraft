using System.Text.Json;

namespace Sc2GameDataClient;

public interface ISc2GameDataClient
{
    Uri BaseAddress { get; }

    Task<JsonDocument> GetProfileAsync(int regionId, int realmId, int profileId, string? locale = null, CancellationToken cancellationToken = default);
    Task<JsonDocument> GetProfileMetadataAsync(int regionId, int realmId, int profileId, string? locale = null, CancellationToken cancellationToken = default);
    Task<JsonDocument> GetLadderSummaryAsync(int regionId, int realmId, int profileId, string? locale = null, CancellationToken cancellationToken = default);
    Task<JsonDocument> GetPlayerAsync(long accountId, string? locale = null, CancellationToken cancellationToken = default);
}
