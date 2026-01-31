using Bits.Sc2.Messages;
using Bits.Sc2.Panels;
using Bits.Sc2.Parsing;
using Core.Diagnostics;
using Core.IO;
using Core.Messaging;
using Core.Runners;
using Serilog;
using Core.Diagnostics.ProcessEvents;
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
    private readonly object _scanLock = new();
    private DateTime? _lastFileWriteTime;
    private string? _lastToolState;
    private bool _wasLobbyPresent;
    private bool _isSc2Running;

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

        _isSc2Running = IsSc2Running();
        if (_isSc2Running)
        {
            HandleSc2Started();
        }
        else
        {
            PublishToolState(Sc2ToolState.Sc2ProcessNotFound);
        }

        DirectoryEventScanner? scanner = null;
        try
        {
            scanner = CreateScanner();
        }
        catch (Exception ex)
        {
            _logger.Warning(ex, "Directory watcher unavailable; falling back to polling.");
        }

        var processTask = MonitorProcessAsync(cancellationToken);
        var eventTask = scanner != null
            ? ConsumeEventsAsync(scanner, cancellationToken)
            : PollLobbyAsync(cancellationToken);

        await Task.WhenAll(processTask, eventTask);

        _logger.Information("SessionPanelRunner stopped");
    }

    private async Task MonitorProcessAsync(CancellationToken cancellationToken)
    {
        await using var hub = new ProcessEventHub("SC2", _pollInterval);
        await using var hub64 = new ProcessEventHub("SC2_x64", _pollInterval);
        hub.Start();
        hub64.Start();

        var tasks = new[]
        {
            ConsumeProcessEventsAsync(hub, cancellationToken),
            ConsumeProcessEventsAsync(hub64, cancellationToken)
        };

        await Task.WhenAll(tasks);
    }

    private async Task ConsumeProcessEventsAsync(ProcessEventHub hub, CancellationToken cancellationToken)
    {
        await foreach (var change in hub.WatchAsync(cancellationToken))
        {
            if (change.Kind == ProcessChangeKind.Started)
            {
                _isSc2Running = true;
                HandleSc2Started();
            }
            else
            {
                _isSc2Running = false;
                HandleSc2Stopped();
            }
        }
    }

    private async Task ConsumeEventsAsync(DirectoryEventScanner scanner, CancellationToken cancellationToken)
    {
        await using (scanner.ConfigureAwait(false))
        {
            await foreach (var change in scanner.WatchAsync(cancellationToken))
            {
                if (change.Kind == FileChangeKind.Overflow)
                {
                    HandleOverflow();
                    continue;
                }

                if (IsLobbyFile(change.Path))
                {
                    if (change.Kind == FileChangeKind.Deleted)
                    {
                        HandleLobbyMissing();
                        continue;
                    }

                    if (change.Kind == FileChangeKind.Renamed &&
                        !string.IsNullOrWhiteSpace(change.OldPath) &&
                        IsLobbyFile(change.OldPath) &&
                        !IsLobbyFile(change.Path))
                    {
                        HandleLobbyMissing();
                        continue;
                    }

                    HandleLobbyFileChanged(change.Path);
                }
            }
        }
    }

    private async Task PollLobbyAsync(CancellationToken cancellationToken)
    {
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
    }

    private void ScanSc2AndLobby()
    {
        if (!IsSc2Running())
        {
            HandleSc2Stopped();
            return;
        }

        _logger.Debug("SC2 process detected");

        var lobbyFilePath = GetLobbyFilePath();
        _logger.Debug("Lobby file path: {LobbyFilePath}", lobbyFilePath ?? "(null)");

        if (string.IsNullOrWhiteSpace(lobbyFilePath) || !File.Exists(lobbyFilePath))
        {
            HandleLobbyMissing();
            return;
        }

        // Force parse on first detection (even if file is stale from previous session)
        bool isFirstDetection = !_wasLobbyPresent;
        if (isFirstDetection)
        {
            _wasLobbyPresent = true;
            _logger.Information("Lobby file detected for first time at {FilePath} - forcing initial parse", lobbyFilePath);
        }

        PublishToolState(Sc2ToolState.LobbyDetected);

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

    private void HandleSc2Started()
    {
        _logger.Debug("SC2 process detected");
        var lobbyFilePath = GetLobbyFilePath();
        if (File.Exists(lobbyFilePath))
        {
            HandleLobbyFileChanged(lobbyFilePath);
        }
        else
        {
            PublishToolState(Sc2ToolState.InMenus);
        }
    }

    private void HandleSc2Stopped()
    {
        lock (_scanLock)
        {
            _lastFileWriteTime = null;
            _wasLobbyPresent = false;
        }
        PublishToolState(Sc2ToolState.Sc2ProcessNotFound);
    }

    private void HandleLobbyMissing()
    {
        lock (_scanLock)
        {
            _lastFileWriteTime = null;
            if (_wasLobbyPresent)
            {
                _logger.Debug("Lobby file disappeared - player in menus");
            }
            _wasLobbyPresent = false;
        }
        PublishToolState(Sc2ToolState.InMenus);
    }

    private void HandleOverflow()
    {
        _logger.Warning("Lobby directory watcher overflow; reconciling state.");
        var lobbyFilePath = GetLobbyFilePath();
        if (File.Exists(lobbyFilePath))
        {
            HandleLobbyFileChanged(lobbyFilePath);
        }
        else
        {
            HandleLobbyMissing();
        }
    }

    private void HandleLobbyFileChanged(string lobbyFilePath)
    {
        if (!_isSc2Running)
        {
            return;
        }

        if (!File.Exists(lobbyFilePath))
        {
            HandleLobbyMissing();
            return;
        }

        lock (_scanLock)
        {
            var fileInfo = new FileInfo(lobbyFilePath);
            var writeTime = fileInfo.LastWriteTimeUtc;
            if (_lastFileWriteTime == writeTime)
            {
                return;
            }

            _lastFileWriteTime = writeTime;

            bool isFirstDetection = !_wasLobbyPresent;
            if (isFirstDetection)
            {
                _wasLobbyPresent = true;
                _logger.Information("Lobby file detected for first time at {FilePath} - forcing initial parse", lobbyFilePath);
            }

            PublishToolState(Sc2ToolState.LobbyDetected);

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
    }

    private void ReconcileLobbyPresence()
    {
        var lobbyFilePath = GetLobbyFilePath();
        if (File.Exists(lobbyFilePath))
        {
            if (!_wasLobbyPresent)
            {
                HandleLobbyFileChanged(lobbyFilePath);
            }
            return;
        }

        if (_wasLobbyPresent)
        {
            HandleLobbyMissing();
        }
    }

    private void PublishToolState(Sc2ToolState state)
    {
        var stateName = state.ToString();
        if (string.Equals(_lastToolState, stateName, StringComparison.Ordinal))
        {
            return;
        }

        _lastToolState = stateName;
        _messageBus.Publish(Sc2MessageType.ToolStateChanged, new ToolStateChanged(state));
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

    private static string GetLobbyRootPath()
    {
        var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        return Path.Combine(localAppData, "Temp", "Starcraft II");
    }

    private static bool IsLobbyFile(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return false;
        }

        return string.Equals(path, GetLobbyFilePath(), StringComparison.OrdinalIgnoreCase);
    }

    private DirectoryEventScanner CreateScanner()
    {
        var rootPath = GetLobbyRootPath();
        if (!Directory.Exists(rootPath))
        {
            throw ExceptionFactory.DirectoryNotFound($"Lobby root directory not found: {rootPath}");
        }

        return new DirectoryEventScanner(
            rootPath: rootPath,
            includeSubdirectories: true,
            filter: "replay.server.battlelobby",
            debounceWindow: _pollInterval,
            internalBufferSizeBytes: 256 * 1024);
    }
}
