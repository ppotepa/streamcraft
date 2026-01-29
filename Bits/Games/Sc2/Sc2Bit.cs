using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Bits.Sc2.Messages;
using Bits.Sc2.Panels;
using Bits.Sc2.Runners;
using Bits.Sc2.Application.Services;
using Bits.Sc2.Infrastructure.Services;
using Bits.Sc2.Infrastructure.Repositories;
using Core.Bits;
using Core.Messaging;
using Core.Panels;
using Core.Runners;
using System.Text.Json;
using Sc2Pulse;

namespace Bits.Sc2;

[BitRoute("/sc2")]
[HasUserInterface]
[RequiresConfiguration]
public class Sc2Bit : ConfigurableBit<Sc2BitState, Sc2BitConfig>
{
    public override string Name => "SC2";
    public override string Description => "StarCraft II overlay and statistics";

    private readonly object _initLock = new();
    private IMessageBus? _messageBus;
    private PanelRegistry? _panelRegistry;
    private RunnerRegistry? _runnerRegistry;
    private bool _runtimeInitialized;
    private SessionPanel? _sessionPanel;
    private ISSPanel? _issPanel;
    // VitalsRunner removed - now using VitalsBackgroundService via DI

    public override IReadOnlyList<BitConfigurationSection> GetConfigurationSections()
    {
        return new[]
        {
            new BitConfigurationSection(
                id: "general",
                title: "General Settings",
                description: "Configure your StarCraft II integration",
                fields: new[]
                {
                    new BitConfigurationField(
                        key: "BattleTag",
                        label: "Battle Tag",
                        type: "text",
                        description: "Your Battle.net BattleTag (e.g., Player#1234)",
                        placeholder: "Player#1234",
                        required: true,
                        validationPattern: @"^[A-Za-z0-9]{3,16}#\d{4,5}$"
                    ),
                    new BitConfigurationField(
                        key: "PollIntervalMs",
                        label: "Poll Interval (ms)",
                        type: "number",
                        description: "How often to check lobby file for changes",
                        defaultValue: "250",
                        required: false
                    )
                })
        };
    }

    protected override async Task HandleBitRequestAsync(HttpContext httpContext)
    {
        EnsureRuntimeInitialized();

        // Get panels from registry
        var panels = _panelRegistry!.GetCompositeSnapshot() as Dictionary<string, object> ?? new Dictionary<string, object>();

        // Add vitals/metric panel from State
        panels["metric"] = new
        {
            value = State.HeartRate,
            timestampUtc = State.HeartRateTimestamp?.ToString("O"),
            units = "bpm"
        };

        var stateSnapshot = new
        {
            panels = panels,
            timestamp = DateTime.UtcNow
        };

        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync(JsonSerializer.Serialize(stateSnapshot, new JsonSerializerOptions { WriteIndented = true }));
    }

    protected override IReadOnlyDictionary<string, object?> BuildConfigurationValueMap()
    {
        return new Dictionary<string, object?>
        {
            ["BattleTag"] = Configuration.BattleTag,
            ["PollIntervalMs"] = Configuration.PollIntervalMs
        };
    }

    protected override Task<bool> OnConfigurationUpdateAsync(JsonElement root)
    {
        var updated = false;

        if (root.TryGetProperty("BattleTag", out var battleTag) && battleTag.ValueKind == JsonValueKind.String)
        {
            Configuration.BattleTag = battleTag.GetString();
            updated = true;
        }

        if (root.TryGetProperty("PollIntervalMs", out var pollIntervalMs))
        {
            var interval = TryParseInt(pollIntervalMs);
            if (interval.HasValue)
            {
                Configuration.PollIntervalMs = interval.Value;
                updated = true;
            }
        }

        return Task.FromResult(updated);
    }

    protected override Task OnConfigurationPersistedAsync()
    {
        ReconfigureRunners();
        return Task.CompletedTask;
    }

    protected override void OnInitialize()
    {
        base.OnInitialize();

        // Get shared services from context
        _messageBus = Context!.MessageBus;
        _panelRegistry = new PanelRegistry();
        _runnerRegistry = new RunnerRegistry();

        // Initialize state service for DI
        // TODO: Replace with proper DI when IBitContext includes IServiceProvider
        Sc2BitStateService.InitializeStatic(State);

        EnsureRuntimeInitialized();
    }

    private void EnsureRuntimeInitialized()
    {
        if (_runtimeInitialized)
        {
            return;
        }

        lock (_initLock)
        {
            if (_runtimeInitialized)
            {
                return;
            }

            InitializePanels();
            InitializeRunners();
            _runtimeInitialized = true;
        }
    }

    private void InitializePanels()
    {
        _sessionPanel = new SessionPanel();
        _sessionPanel.Initialize(_messageBus!);
        _panelRegistry!.RegisterPanel(_sessionPanel);

        var opponentPanel = new OpponentPanel();
        opponentPanel.Initialize(_messageBus!);
        _panelRegistry.RegisterPanel(opponentPanel);

        var metricPanel = new MetricPanel();
        metricPanel.Initialize(_messageBus!);
        _panelRegistry.RegisterPanel(metricPanel);

        _issPanel = new ISSPanel();
        _issPanel.Initialize(_messageBus!);
        _panelRegistry.RegisterPanel(_issPanel);

    }

    private void InitializeRunners()
    {
        if (_sessionPanel == null)
        {
            return;
        }

        var sessionRunner = new SessionPanelRunner(
            Configuration.PollIntervalMs,
            Configuration.GetEffectiveBattleTag(),
            _messageBus!,
            Context!.Logger);

        sessionRunner.Initialize(_sessionPanel);
        _runnerRegistry!.RegisterRunner(sessionRunner);
        sessionRunner.Start();

        // Add game data runner to fetch race information from SC2 Client API
        var gameDataRunner = new GameDataRunner(Configuration.PollIntervalMs, _messageBus!);
        gameDataRunner.Start();

        // Add opponent data runner (not a traditional runner, just start it)
        var opponentDataRunner = new OpponentDataRunner(_messageBus!);
        opponentDataRunner.Start();

        // Add player data runner (fetches current user's stats)
        // TODO Phase 5: Convert to DI-managed background service
        // For now, manually instantiate required dependencies
        var pulseClient = new Sc2PulseClient();

        // Create services using LoggerFactory from DI
        var loggerFactory = Context!.ServiceProvider.GetService(typeof(Microsoft.Extensions.Logging.ILoggerFactory))
            as Microsoft.Extensions.Logging.ILoggerFactory;

        if (loggerFactory == null)
        {
            Context.Logger.Error("Could not get ILoggerFactory from ServiceProvider");
            return;
        }

        var logger = loggerFactory.CreateLogger<PlayerDataRunner>();
        var apiLogger = loggerFactory.CreateLogger<Sc2PulseApiService>();
        var profileLogger = loggerFactory.CreateLogger<PlayerProfileService>();

        var repository = new InMemoryPlayerProfileRepository();
        var apiService = new Sc2PulseApiService(pulseClient, apiLogger);
        var profileService = new PlayerProfileService(repository, apiService, profileLogger);

        var battleTag = Configuration.GetEffectiveBattleTag();
        Context.Logger.Information("Initializing PlayerDataRunner with BattleTag: {BattleTag}", battleTag ?? "(none)");

        var playerDataRunner = new PlayerDataRunner(
            _messageBus!,
            profileService,
            logger,
            battleTag);
        playerDataRunner.Start();

        // Add ISS panel runner (fetches ISS position and crew data)
        if (_issPanel != null)
        {
            var issRunner = new ISSPanelRunner(_messageBus!, new HttpClient());
            issRunner.Initialize(_issPanel);
            _runnerRegistry.RegisterRunner(issRunner);
        }

        // VitalsRunner removed - now using VitalsBackgroundService via DI
        // The background service automatically starts and monitors heart rate

        _runnerRegistry.StartAll();
    }

    private void ReconfigureRunners()
    {
        EnsureRuntimeInitialized();
        lock (_initLock)
        {
            // Stop and clear existing runners
            _runnerRegistry!.StopAll();
            _runnerRegistry.Clear();

            // Reinitialize runners with new configuration
            InitializeRunners();
        }
    }
}
