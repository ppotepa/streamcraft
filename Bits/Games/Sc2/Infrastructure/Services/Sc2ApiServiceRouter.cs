using Bits.Sc2.Application.Services;
using Bits.Sc2.Domain.Entities;
using Bits.Sc2.Domain.ValueObjects;
using Core.Diagnostics;
using Microsoft.Extensions.Logging;

namespace Bits.Sc2.Infrastructure.Services;

/// <summary>
/// Routes SC2 API requests to the configured provider (sc2pulse or blizzard).
/// </summary>
public sealed class Sc2ApiServiceRouter : ISc2PulseApiService
{
    private readonly Sc2PulseApiService _pulseService;
    private readonly Sc2OfficialApiService _officialService;
    private readonly ISc2RuntimeConfig _runtimeConfig;
    private readonly ILogger<Sc2ApiServiceRouter> _logger;

    public Sc2ApiServiceRouter(
        Sc2PulseApiService pulseService,
        Sc2OfficialApiService officialService,
        ISc2RuntimeConfig runtimeConfig,
        ILogger<Sc2ApiServiceRouter> logger)
    {
        if (pulseService == null) throw ExceptionFactory.ArgumentNull(nameof(pulseService));
        if (officialService == null) throw ExceptionFactory.ArgumentNull(nameof(officialService));
        if (runtimeConfig == null) throw ExceptionFactory.ArgumentNull(nameof(runtimeConfig));
        if (logger == null) throw ExceptionFactory.ArgumentNull(nameof(logger));
        _pulseService = pulseService;
        _officialService = officialService;
        _runtimeConfig = runtimeConfig;
        _logger = logger;
    }

    public Task<long?> FindCharacterIdAsync(BattleTag battleTag, CancellationToken cancellationToken = default)
        => Resolve().FindCharacterIdAsync(battleTag, cancellationToken);

    public Task<PlayerProfile?> FetchPlayerDataAsync(BattleTag battleTag, CancellationToken cancellationToken = default)
        => Resolve().FetchPlayerDataAsync(battleTag, cancellationToken);

    public Task<PlayerProfile?> FetchPlayerDataByIdAsync(long characterId, CancellationToken cancellationToken = default)
        => Resolve().FetchPlayerDataByIdAsync(characterId, cancellationToken);

    public Task<List<MmrHistoryPoint>> FetchMmrHistoryAsync(
        long characterId,
        Race? race,
        CancellationToken cancellationToken = default)
        => Resolve().FetchMmrHistoryAsync(characterId, race, cancellationToken);

    public Task<MatchHistory?> FetchMatchHistoryAsync(
        long characterId,
        int limit = 25,
        CancellationToken cancellationToken = default)
        => Resolve().FetchMatchHistoryAsync(characterId, limit, cancellationToken);

    private ISc2PulseApiService Resolve()
    {
        var provider = _runtimeConfig.ApiProvider;
        if (string.Equals(provider, Sc2ApiProviders.Blizzard, StringComparison.OrdinalIgnoreCase))
        {
            return _officialService;
        }

        if (!string.Equals(provider, Sc2ApiProviders.Sc2Pulse, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Unknown SC2 API provider '{Provider}'. Falling back to sc2pulse.", provider);
        }

        return _pulseService;
    }
}
