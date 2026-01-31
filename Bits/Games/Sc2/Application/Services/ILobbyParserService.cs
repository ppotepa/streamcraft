using Bits.Sc2.Messages;

namespace Bits.Sc2.Application.Services;

public interface ILobbyParserService
{
    LobbyParsedData? Parse(string lobbyFilePath);
}
