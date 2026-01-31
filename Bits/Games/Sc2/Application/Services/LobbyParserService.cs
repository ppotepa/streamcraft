using Bits.Sc2.Messages;
using Bits.Sc2.Parsing;

namespace Bits.Sc2.Application.Services;

public sealed class LobbyParserService : ILobbyParserService
{
    private readonly string? _configuredUserBattleTag;

    public LobbyParserService(ISc2RuntimeConfig runtimeConfig)
    {
        _configuredUserBattleTag = runtimeConfig?.BattleTag;
    }

    public LobbyParsedData? Parse(string lobbyFilePath)
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
}
