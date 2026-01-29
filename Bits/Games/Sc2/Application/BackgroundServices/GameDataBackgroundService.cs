using Bits.Sc2.Application.Options;
using Bits.Sc2.Messages;
using Core.Messaging;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net.Http;
using System.Text.Json;

namespace Bits.Sc2.Application.BackgroundServices;

/// <summary>
/// Background service that fetches game data from SC2 Client API (localhost:6119/game)
/// to enrich lobby data with race information.
/// </summary>
public class GameDataBackgroundService : BackgroundService
{
    private readonly TimeSpan _pollInterval;
    private readonly IMessageBus _messageBus;
    private readonly HttpClient _httpClient;
    private readonly ILogger<GameDataBackgroundService> _logger;
    private bool _gameInProgress = false;
    private string? _lastOpponentBattleTag;

    public GameDataBackgroundService(
        IMessageBus messageBus,
        IOptions<Sc2Options> options,
        ILogger<GameDataBackgroundService> logger)
    {
        _messageBus = messageBus ?? throw new ArgumentNullException(nameof(messageBus));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        var pollIntervalMs = options?.Value?.PollIntervalMs ?? 1000;
        _pollInterval = TimeSpan.FromMilliseconds(Math.Max(500, pollIntervalMs));

        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(2)
        };

        // Subscribe to tool state changes to know when games start/end
        _messageBus.Subscribe<string>(Sc2MessageType.ToolStateChanged, OnToolStateChanged);
        _messageBus.Subscribe<LobbyParsedData>(Sc2MessageType.LobbyFileParsed, OnLobbyParsed);
    }

    public override Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("GameDataBackgroundService starting...");
        return base.StartAsync(cancellationToken);
    }

    public override Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("GameDataBackgroundService stopping...");
        return base.StopAsync(cancellationToken);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("GameDataBackgroundService is running.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (_gameInProgress)
                {
                    await FetchAndPublishGameData();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GameDataBackgroundService");
                await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                continue;
            }

            try
            {
                await Task.Delay(_pollInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private void OnToolStateChanged(string state)
    {
        _gameInProgress = state == "LobbyDetected";
        if (_gameInProgress)
        {
            _logger.LogDebug("Game detected - starting to poll for game data");
        }
    }

    private void OnLobbyParsed(LobbyParsedData data)
    {
        _lastOpponentBattleTag = data.OpponentBattleTag;
        _logger.LogDebug("Lobby parsed - opponent: {OpponentBattleTag}", _lastOpponentBattleTag);
    }

    private async Task FetchAndPublishGameData()
    {
        try
        {
            var response = await _httpClient.GetAsync("http://localhost:6119/game");
            if (!response.IsSuccessStatusCode)
                return;

            var json = await response.Content.ReadAsStringAsync();
            var gameData = JsonSerializer.Deserialize<GameDataResponse>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (gameData?.Players == null || gameData.Players.Length < 2)
                return;

            // Find which player is the opponent
            var opponent = gameData.Players.FirstOrDefault(p =>
                !string.IsNullOrWhiteSpace(_lastOpponentBattleTag) &&
                p.Name?.Contains(_lastOpponentBattleTag.Split('#')[0], StringComparison.OrdinalIgnoreCase) == true);

            var user = gameData.Players.FirstOrDefault(p => p.Id != opponent?.Id);

            if (opponent == null || user == null)
            {
                // Fall back to assuming player 1 is one and player 2 is the other
                user = gameData.Players[0];
                opponent = gameData.Players[1];
            }

            // Publish enriched lobby data with race information
            var enrichedData = new LobbyParsedData
            {
                UserBattleTag = _lastOpponentBattleTag, // This will be fixed by SessionPanelRunner
                UserRace = NormalizeRace(user.Race),
                OpponentRace = NormalizeRace(opponent.Race),
                OpponentName = opponent.Name,
                GameTime = gameData.DisplayTime
            };

            _messageBus.Publish(Sc2MessageType.GameDataReceived, enrichedData);

            _logger.LogTrace("Published game data - User: {UserRace}, Opponent: {OpponentName} ({OpponentRace})",
                enrichedData.UserRace, enrichedData.OpponentName, enrichedData.OpponentRace);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogTrace("SC2 Client API not available: {Message}", ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error fetching game data");
        }
    }

    private static string? NormalizeRace(string? race)
    {
        if (string.IsNullOrWhiteSpace(race))
            return null;

        // SC2 Client API returns "Terr", "Prot", "Zerg"
        return race.ToUpperInvariant() switch
        {
            "TERR" => "TERRAN",
            "PROT" => "PROTOSS",
            _ => race.ToUpperInvariant()
        };
    }

    public override void Dispose()
    {
        _httpClient?.Dispose();
        base.Dispose();
    }
}

// Response models for SC2 Client API
file class GameDataResponse
{
    public bool IsReplay { get; set; }
    public double DisplayTime { get; set; }
    public PlayerInfo[]? Players { get; set; }
}

file class PlayerInfo
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Type { get; set; }
    public string? Race { get; set; }
    public string? Result { get; set; }
}
