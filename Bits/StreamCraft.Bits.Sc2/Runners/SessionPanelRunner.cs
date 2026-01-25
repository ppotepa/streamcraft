using StreamCraft.Core.Runners;
using System.Text.Json;

namespace StreamCraft.Bits.Sc2.Runners;

/// <summary>
/// Runner that monitors lobby file and updates SessionPanel state
/// </summary>
public class SessionPanelRunner : Runner<SessionPanel, SessionPanelState>
{
    private readonly string _lobbyFilePath;
    private readonly TimeSpan _pollInterval;
    private DateTime? _lastFileWriteTime;

    public SessionPanelRunner(string lobbyFilePath, int pollIntervalMs)
    {
        _lobbyFilePath = lobbyFilePath;
        _pollInterval = TimeSpan.FromMilliseconds(Math.Max(50, pollIntervalMs));
    }

    protected override async Task RunAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                await CheckLobbyFileAsync();
            }
            catch
            {
                // Swallow errors to keep runner alive
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

    private async Task CheckLobbyFileAsync()
    {
        if (string.IsNullOrWhiteSpace(_lobbyFilePath) || !File.Exists(_lobbyFilePath))
        {
            if (_lastFileWriteTime != null)
            {
                // File disappeared, clear state
                _lastFileWriteTime = null;
                ClearSessionData();
            }
            return;
        }

        var fileInfo = new FileInfo(_lobbyFilePath);
        var writeTime = fileInfo.LastWriteTimeUtc;

        // Only process if file changed
        if (_lastFileWriteTime == writeTime)
        {
            return;
        }

        _lastFileWriteTime = writeTime;

        // Parse lobby file
        try
        {
            var content = await File.ReadAllTextAsync(_lobbyFilePath);
            var lobbyData = ParseLobbyFile(content);

            if (lobbyData != null)
            {
                UpdatePanelState(state =>
                {
                    if (!string.IsNullOrWhiteSpace(lobbyData.UserBattleTag))
                    {
                        state.UserBattleTag = lobbyData.UserBattleTag;
                    }

                    if (!string.IsNullOrWhiteSpace(lobbyData.UserName))
                    {
                        state.UserName = lobbyData.UserName;
                    }
                });
            }
        }
        catch
        {
            // Ignore parse errors
        }
    }

    private void ClearSessionData()
    {
        UpdatePanelState(state =>
        {
            state.UserBattleTag = null;
            state.UserName = null;
        });
    }

    private LobbyData? ParseLobbyFile(string content)
    {
        try
        {
            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            string? userBattleTag = null;
            string? userName = null;

            // Extract player data from lobby file structure
            if (root.TryGetProperty("players", out var playersElement))
            {
                foreach (var player in playersElement.EnumerateArray())
                {
                    if (player.TryGetProperty("battleTag", out var battleTagElement))
                    {
                        userBattleTag = battleTagElement.GetString();
                    }

                    if (player.TryGetProperty("name", out var nameElement))
                    {
                        userName = nameElement.GetString();
                    }

                    // Take first player for now
                    if (!string.IsNullOrWhiteSpace(userBattleTag))
                    {
                        break;
                    }
                }
            }

            // Alternative structure: direct properties
            if (string.IsNullOrWhiteSpace(userBattleTag) && root.TryGetProperty("userBattleTag", out var btElement))
            {
                userBattleTag = btElement.GetString();
            }

            if (string.IsNullOrWhiteSpace(userName) && root.TryGetProperty("userName", out var unElement))
            {
                userName = unElement.GetString();
            }

            if (!string.IsNullOrWhiteSpace(userBattleTag) || !string.IsNullOrWhiteSpace(userName))
            {
                return new LobbyData
                {
                    UserBattleTag = userBattleTag,
                    UserName = userName
                };
            }
        }
        catch
        {
            // Not valid JSON or structure doesn't match
        }

        return null;
    }

    private class LobbyData
    {
        public string? UserBattleTag { get; set; }
        public string? UserName { get; set; }
    }
}
