using Bits.Sc2.Application.BackgroundServices;
using Bits.Sc2.Application.Services;
using Bits.Sc2.Domain.Repositories;
using Bits.Sc2.Domain.Services;
using Bits.Sc2.Infrastructure.Repositories;
using Bits.Sc2.Infrastructure.Services;
using Microsoft.Extensions.DependencyInjection;
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
    public static IServiceCollection AddSc2Services(this IServiceCollection services)
    {
        // External API Client (singleton - reuses HttpClient)
        services.AddSingleton<Sc2PulseClient>();

        // Infrastructure - Repositories (singleton for in-memory storage)
        services.AddSingleton<IVitalsRepository, InMemoryVitalsRepository>();
        services.AddSingleton<IPlayerProfileRepository, InMemoryPlayerProfileRepository>();
        services.AddSingleton<IMatchHistoryRepository, InMemoryMatchHistoryRepository>();

        // Domain Services (transient - stateless logic)
        services.AddTransient<HeartRateAnalysisService>();

        // Application - Services (scoped for proper lifetime management)
        services.AddScoped<IVitalsService, VitalsService>();
        services.AddScoped<ISc2PulseApiService, Sc2PulseApiService>();
        services.AddScoped<IPlayerProfileService, PlayerProfileService>();

        // Bit state service (singleton - will be initialized by bit)
        services.AddSingleton<ISc2BitStateService, Sc2BitStateService>();
        services.AddSingleton<Sc2BitStateService>(); // Also register concrete type for initialization

        // Application - Background Services (singleton hosted services)
        services.AddHostedService<VitalsBackgroundService>();

        return services;
    }
}
