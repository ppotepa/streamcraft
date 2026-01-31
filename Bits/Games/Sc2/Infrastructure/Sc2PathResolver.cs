using Bits.Sc2.Configuration;
using Microsoft.Extensions.Options;

namespace Bits.Sc2.Infrastructure;

public sealed class Sc2PathResolver : ISc2PathResolver
{
    private readonly Sc2RuntimeOptions _options;

    public Sc2PathResolver(IOptions<Sc2RuntimeOptions> options)
    {
        _options = options?.Value ?? new Sc2RuntimeOptions();
    }

    public string GetLobbyRoot()
    {
        var expanded = Environment.ExpandEnvironmentVariables(_options.LobbyRoot);
        return Path.GetFullPath(expanded);
    }

    public string GetLobbyFilePath()
    {
        return Path.Combine(GetLobbyRoot(), _options.LobbySubdirectory, _options.LobbyFileName);
    }
}
