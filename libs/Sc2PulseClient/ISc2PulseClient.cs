using Sc2Pulse.Models;
using Sc2Pulse.Queries;
using System.Text.Json;

namespace Sc2Pulse;

/// <summary>
/// Abstraction for the SC2 Pulse API client.
/// </summary>
public interface ISc2PulseClient
{
    Uri BaseAddress { get; }

    Task<JsonDocument> GetCharactersAsync(CharactersQuery? query = null, CancellationToken cancellationToken = default);
    Task<List<LadderDistinctCharacter>?> GetCharacterByIdAsync(long characterId, CancellationToken cancellationToken = default);
    Task<List<LadderDistinctCharacter>?> FindCharactersAsync(CharacterFindQuery query, CancellationToken cancellationToken = default);
    Task<List<IdProjectionLong>?> GetCharacterIdsAsync(CharacterIdsQuery query, CancellationToken cancellationToken = default);
    Task<List<string>?> GetCharacterSuggestionsAsync(CharacterSuggestionsQuery query, CancellationToken cancellationToken = default);
    Task<List<LadderTeam>?> GetCharacterTeamsAsync(CharacterTeamsQuery? query = null, CancellationToken cancellationToken = default);
    Task<CursorNavigableResultList<LadderMatch>?> GetCharacterMatchesAsync(CharacterMatchesQuery? query = null, CancellationToken cancellationToken = default);
    Task<List<ExternalLinkResolveResult>?> GetCharacterLinksAsync(CharacterLinksQuery? query = null, CancellationToken cancellationToken = default);
    Task<List<TeamHistory>?> GetTeamHistoriesAsync(TeamHistoriesQuery? query = null, CancellationToken cancellationToken = default);
}
