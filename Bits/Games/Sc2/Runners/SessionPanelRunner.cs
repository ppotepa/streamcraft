using Bits.Sc2.Messages;
using Bits.Sc2.Panels;
using Bits.Sc2.Parsing;
using Core.Messaging;
using Core.Runners;
using Serilog;
using System.Diagnostics;

namespace Bits.Sc2.Runners;

/// <summary>
/// Runner that detects SC2 process, scans lobby file, and updates SessionPanel via message bus.
/// </summary>
public class SessionPanelRunner : Runner<SessionPanel, SessionPanelState>
{
    private readonly TimeSpan _pollInterval;
    private readonly string? _configuredUserBattleTag;
    private readonly IMessageBus _messageBus;
    private readonly ILogger _logger;
    private DateTime? _lastFileWriteTime;
    private string? _lastToolState;
    private bool _wasLobbyPresent;

    public SessionPanelRunner(int pollIntervalMs, string? configuredUserBattleTag, IMessageBus messageBus, ILogger logger)
    {
        _pollInterval = TimeSpan.FromMilliseconds(Math.Max(50, pollIntervalMs));
        _configuredUserBattleTag = string.IsNullOrWhiteSpace(configuredUserBattleTag) ? null : configuredUserBattleTag.Trim();
        _messageBus = messageBus; _logger = logger.ForContext<SessionPanelRunner>();
    }

    protected override async Task RunAsync(CancellationToken cancellationToken)
    {
        _logger.Information("SessionPanelRunner starting with poll interval: {PollIntervalMs}ms, BattleTag: {BattleTag}",
            _pollInterval.TotalMilliseconds, _configuredUserBattleTag ?? "(none)");

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                ScanSc2AndLobby();
            }
            catch (Exception ex)
            {
                _logger.Error(ex, "Error during SC2 lobby scan");
            }

            try
            {
                await Task.Delay(_pollInterval, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.Information("SessionPanelRunner stopped");
    }

    private void ScanSc2AndLobby()
    {
        if (!IsSc2Running())
        {
            _lastFileWriteTime = null;
            _wasLobbyPresent = false;
            PublishToolState("Sc2ProcessNotFound");
            return;
        }

        _logger.Debug("SC2 process detected");

        var lobbyFilePath = GetLobbyFilePath();
        _logger.Debug("Lobby file path: {LobbyFilePath}", lobbyFilePath ?? "(null)");

        if (string.IsNullOrWhiteSpace(lobbyFilePath) || !File.Exists(lobbyFilePath))
        {
            _lastFileWriteTime = null;
            if (_wasLobbyPresent)
            {
                _logger.Debug("Lobby file disappeared - player in menus");
            }
            _wasLobbyPresent = false;
            PublishToolState("InMenus");
            return;
        }

        // Force parse on first detection (even if file is stale from previous session)
        bool isFirstDetection = !_wasLobbyPresent;
        if (isFirstDetection)
        {
            _wasLobbyPresent = true;
            _logger.Information("Lobby file detected for first time at {FilePath} - forcing initial parse", lobbyFilePath);
        }

        PublishToolState("LobbyDetected");

        var fileInfo = new FileInfo(lobbyFilePath);
        var writeTime = fileInfo.LastWriteTimeUtc;

        _logger.Debug("Lobby file times - Last: {LastWriteTime}, Current: {CurrentWriteTime}, FirstDetection: {IsFirst}",
            _lastFileWriteTime?.ToString("O") ?? "null", writeTime.ToString("O"), isFirstDetection);

        // Parse if file changed OR if this is first detection (to handle stale files from previous sessions)
        if (!isFirstDetection && _lastFileWriteTime == writeTime)
        {
            _logger.Debug("Lobby file unchanged, skipping parse");
            return;
        }

        _lastFileWriteTime = writeTime;
        string parseReason = isFirstDetection ? "initial" : "changed";
        _logger.Information("Lobby file {ParseReason}, parsing...", parseReason);

        var parsed = ParseLobbyFile(lobbyFilePath);
        if (parsed != null)
        {
            _logger.Information("Publishing LobbyParsedData - User: {UserTag}, Opponent: {OpponentTag}",
                parsed.UserBattleTag, parsed.OpponentBattleTag);
            _messageBus.Publish(Sc2MessageType.LobbyFileParsed, parsed);
        }
        else
        {
            _logger.Warning("Failed to parse lobby file at {FilePath}", lobbyFilePath);
        }
    }

    private void PublishToolState(string state)
    {
        if (string.Equals(_lastToolState, state, StringComparison.Ordinal))
        {
            return;
        }

        _lastToolState = state;
        _messageBus.Publish(Sc2MessageType.ToolStateChanged, state);
    }

    private LobbyParsedData? ParseLobbyFile(string lobbyFilePath)
    {
        var result = LobbyFileParser.ParseLobbyFile(lobbyFilePath);
        if (result == null)
        {
            return null;
        }

        var userBattleTag = result.Player1BattleTag;
        var userName = result.Player1Name;
        var opponentBattleTag = result.Player2BattleTag;
        var opponentName = result.Player2Name;

        // Swap if configured user is player 2
        if (!string.IsNullOrWhiteSpace(_configuredUserBattleTag))
        {
            var config = _configuredUserBattleTag;
            var userIsP2 = string.Equals(result.Player2BattleTag, config, StringComparison.OrdinalIgnoreCase);
            if (userIsP2 && !string.Equals(result.Player1BattleTag, config, StringComparison.OrdinalIgnoreCase))
            {
                userBattleTag = result.Player2BattleTag;
                userName = result.Player2Name;
                opponentBattleTag = result.Player1BattleTag;
                opponentName = result.Player1Name;
            }
        }

        return new LobbyParsedData
        {
            UserBattleTag = userBattleTag,
            UserName = userName,
            OpponentBattleTag = opponentBattleTag,
            OpponentName = opponentName
        };
    }

    private static bool IsSc2Running()
    {
        return Process.GetProcessesByName("SC2").Length > 0 ||
               Process.GetProcessesByName("SC2_x64").Length > 0;
    }

    private static string GetLobbyFilePath()
    {
        var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        return Path.Combine(localAppData, @"Temp\Starcraft II\TempWriteReplayP1\replay.server.battlelobby");
    }
}
