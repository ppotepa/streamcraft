using Bits.Sc2.Application.BackgroundServices;
using Bits.Sc2.Application.Services;
using Bits.Sc2.Domain.Repositories;
using Bits.Sc2.Domain.Services;
using Bits.Sc2.Infrastructure.Repositories;
using Bits.Sc2.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;
using Sc2GameDataClient;
using Sc2Pulse;

namespace Bits.Sc2.Extensions;

/// <summary>
/// Extension methods for registering Sc2 bit services with dependency injection.
/// </summary>
public static class Sc2ServiceCollectionExtensions
{
    /// <summary>
    /// Registers all Sc2 bit services, repositories, domain services, and background services.
    /// </summary>
    public static IServiceCollection AddSc2Services(this IServiceCollection services, Microsoft.Extensions.Configuration.IConfiguration configuration)
    {
        // External API Client (singleton - reuses HttpClient)
        services.AddSingleton<ISc2PulseClient, Sc2PulseClient>();
        services.AddSingleton<Sc2PulseClient>();

        services.Configure<Sc2GameDataClientOptions>(configuration.GetSection("StreamCraft:Sc2:Blizzard"));
        services.AddSingleton<ISc2GameDataClient, Sc2GameDataClient.Sc2GameDataClient>();

        // Infrastructure - Repositories (singleton for in-memory storage)
        services.AddSingleton<IVitalsRepository, InMemoryVitalsRepository>();
        services.AddSingleton<IPlayerProfileRepository, InMemoryPlayerProfileRepository>();
        services.AddSingleton<IMatchHistoryRepository, InMemoryMatchHistoryRepository>();

        // Domain Services (transient - stateless logic)
        services.AddTransient<HeartRateAnalysisService>();

        // Application - Services (scoped for proper lifetime management)
        services.AddScoped<IVitalsService, VitalsService>();
        services.AddScoped<Sc2PulseApiService>();
        services.AddScoped<Sc2OfficialApiService>();
        services.AddScoped<ISc2PulseApiService, Sc2ApiServiceRouter>();
        services.AddScoped<IPlayerProfileService, PlayerProfileService>();

        // Runtime config shared with background services
        services.AddSingleton<ISc2RuntimeConfig, Sc2RuntimeConfig>();

        // Application - Background Services (singleton hosted services)
        services.AddHostedService<VitalsBackgroundService>();
        services.AddHostedService<GameDataBackgroundService>();
        services.AddHostedService<OpponentDataBackgroundService>();
        services.AddHostedService<PlayerDataBackgroundService>();

        return services;
    }
}
