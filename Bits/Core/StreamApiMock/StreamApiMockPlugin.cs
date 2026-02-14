using System.Linq;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StreamCraft.Core.Plugins;

namespace StreamCraft.Bits.StreamApiMock;

public sealed class StreamApiMockPlugin : IStreamCraftBit
{
    public void ConfigureServices(IServiceCollection services, BitContext context)
    {
        services.AddOptions<StreamApiMockOptions>().Configure(options =>
        {
            BindIfExists(context.Configuration.GetSection($"StreamCraft:{context.BitId}"), options);
            BindIfExists(context.Configuration.GetSection("StreamCraft:StreamApiMock"), options);
            BindIfExists(context.Configuration.GetSection("StreamApiMock"), options);
        });

        services.AddSingleton<IStreamApiMockScenarioRegistry, StreamApiMockScenarioRegistry>();
        services.AddSingleton(provider => StreamApiMockDataset.Load(context.BitDirectory));
        services.AddSingleton<StreamApiMockHistory>();
        services.AddSingleton<StreamApiMockStatistics>();

        if (StreamApiMockDefaults.IsDevelopmentEnvironment())
        {
            services.AddHostedService<StreamApiMockDataSourceBootstrapper>();
            services.AddHostedService<StreamApiMockBackgroundService>();
        }
    }

    public void MapEndpoints(IEndpointRouteBuilder endpoints, BitContext context)
    {
        if (!StreamApiMockDefaults.IsDevelopmentEnvironment())
        {
            return;
        }

        endpoints.MapGet("/stream-api-mock/history", (StreamApiMockHistory history) => Results.Json(history.Snapshot()))
            .WithDisplayName("StreamApiMockHistory");

        endpoints.MapGet("/stream-api-mock/scenarios", (IStreamApiMockScenarioRegistry registry) =>
        {
            var summaries = registry.List()
                .Select(s => new StreamApiMockScenarioSummary(s.Id, s.Name, s.Category, s.Description, s.MessageType.ToString()))
                .ToArray();
            return Results.Json(summaries);
        }).WithDisplayName("StreamApiMockScenarios");
    }

    private static void BindIfExists(IConfiguration section, StreamApiMockOptions options)
    {
        if (section is IConfigurationSection concrete && concrete.Exists())
        {
            concrete.Bind(options);
        }
    }
}
