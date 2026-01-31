using Bits.Sc2.Messages;
using Bits.Sc2.Application.Services;
using Core.Messaging;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using Core.Diagnostics;

namespace Bits.Sc2.Application.BackgroundServices;

public sealed class GameDataBackgroundService : BackgroundService
{
    private readonly IMessageBus _messageBus;
    private readonly ISc2RuntimeConfig _runtimeConfig;
    private readonly ILogger<GameDataBackgroundService> _logger;
    private readonly HttpClient _httpClient;
    private bool _gameInProgress;
    private string? _lastOpponentBattleTag;
    private Guid _toolStateSubscriptionId;
    private Guid _lobbyParsedSubscriptionId;

    public GameDataBackgroundService(
        IMessageBus messageBus,
        ISc2RuntimeConfig runtimeConfig,
        ILogger<GameDataBackgroundService> logger)
    {
        _messageBus = messageBus;
        _runtimeConfig = runtimeConfig;
        _logger = logger;
        _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };

        _toolStateSubscriptionId = _messageBus.Subscribe<ToolStateChanged>(Sc2MessageType.ToolStateChanged, OnToolStateChanged);
        _lobbyParsedSubscriptionId = _messageBus.Subscribe<LobbyParsedData>(Sc2MessageType.LobbyFileParsed, OnLobbyParsed);
    }

    public override Task StopAsync(CancellationToken cancellationToken)
    {
        _messageBus.Unsubscribe(_toolStateSubscriptionId);
        _messageBus.Unsubscribe(_lobbyParsedSubscriptionId);
        _httpClient.Dispose();
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
                    await FetchAndPublishGameData(stoppingToken);
                }
            }
            catch (OperationCanceledException ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogDebug(ex, "Game data request timed out.");
                ExceptionFactory.Report(ex, ExceptionSeverity.Warning, source: "GameDataBackgroundService");
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogDebug(ex, "Error fetching game data.");
                ExceptionFactory.Report(ex, ExceptionSeverity.Error, source: "GameDataBackgroundService");
            }

            try
            {
                var intervalMs = Math.Max(500, _runtimeConfig.PollIntervalMs);
                await Task.Delay(TimeSpan.FromMilliseconds(intervalMs), stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private void OnToolStateChanged(ToolStateChanged state)
    {
        _gameInProgress = state.State == Sc2ToolState.LobbyDetected;
    }

    private void OnLobbyParsed(LobbyParsedData data)
    {
        _lastOpponentBattleTag = data.OpponentBattleTag;
    }

    private async Task FetchAndPublishGameData(CancellationToken stoppingToken)
    {
        HttpResponseMessage response;
        try
        {
            response = await _httpClient.GetAsync("http://localhost:6119/game", stoppingToken);
        }
        catch (TaskCanceledException ex) when (!stoppingToken.IsCancellationRequested)
        {
            _logger.LogDebug(ex, "Game data request timed out.");
            ExceptionFactory.Report(ex, ExceptionSeverity.Warning, source: "GameDataBackgroundService");
            return;
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            return;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogDebug(ex, "Game data request failed.");
            ExceptionFactory.Report(ex, ExceptionSeverity.Warning, source: "GameDataBackgroundService");
            return;
        }

        if (!response.IsSuccessStatusCode)
        {
            return;
        }

        GameDataResponse? gameData;
        try
        {
            var json = await response.Content.ReadAsStringAsync(stoppingToken);
            gameData = JsonSerializer.Deserialize<GameDataResponse>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch (JsonException ex)
        {
            _logger.LogDebug(ex, "Invalid game data payload.");
            ExceptionFactory.Report(ex, ExceptionSeverity.Warning, source: "GameDataBackgroundService");
            return;
        }

        if (gameData?.Players == null || gameData.Players.Length < 2)
        {
            return;
        }

        var opponent = gameData.Players.FirstOrDefault(p =>
            !string.IsNullOrWhiteSpace(_lastOpponentBattleTag) &&
            p.Name?.Contains(_lastOpponentBattleTag.Split('#')[0], StringComparison.OrdinalIgnoreCase) == true);

        var user = gameData.Players.FirstOrDefault(p => p.Id != opponent?.Id);

        if (opponent == null || user == null)
        {
            user = gameData.Players[0];
            opponent = gameData.Players[1];
        }

        var enrichedData = new LobbyParsedData
        {
            UserBattleTag = _lastOpponentBattleTag,
            UserRace = NormalizeRace(user.Race),
            OpponentRace = NormalizeRace(opponent.Race),
            OpponentName = opponent.Name,
            GameTime = gameData.DisplayTime
        };

        _messageBus.Publish(Sc2MessageType.GameDataReceived, enrichedData);
    }

    private static string? NormalizeRace(string? race)
    {
        if (string.IsNullOrWhiteSpace(race))
            return null;

        return race.ToUpperInvariant() switch
        {
            "TERR" => "TERRAN",
            "PROT" => "PROTOSS",
            _ => race.ToUpperInvariant()
        };
    }

    private class GameDataResponse
    {
        public bool IsReplay { get; set; }
        public double DisplayTime { get; set; }
        public PlayerInfo[]? Players { get; set; }
    }

    private class PlayerInfo
    {
        public int Id { get; set; }
        public string? Name { get; set; }
        public string? Type { get; set; }
        public string? Race { get; set; }
        public string? Result { get; set; }
    }
}
