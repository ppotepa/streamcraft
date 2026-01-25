using System.Text;
using System.Text.RegularExpressions;

namespace StreamCraft.Bits.Sc2;

public class LobbyTagExtractor
{
    // Pattern: 1-12 alphanumeric/underscore + # + 3-5 digits, with word boundaries
    private static readonly Regex BattleTagRegex = new(
        @"(?<![A-Za-z0-9_])[A-Za-z0-9_]{1,12}#[0-9]{3,5}(?![A-Za-z0-9_])",
        RegexOptions.Compiled);

    public record ExtractionResult(
        string? UserBattleTag,
        string? UserName,
        string? OpponentBattleTag,
        string? OpponentName);

    /// <summary>
    /// Extracts battle tags from lobby file and correlates them with game player names.
    /// </summary>
    /// <param name="lobbyFilePath">Path to replay.server.battlelobby file</param>
    /// <param name="configuredUserBattleTag">User's configured battle tag from config</param>
    /// <param name="gamePlayerNames">Player names from /game endpoint (null if not available)</param>
    public static ExtractionResult ExtractTags(
        string lobbyFilePath,
        string configuredUserBattleTag,
        string[]? gamePlayerNames = null)
    {
        if (!File.Exists(lobbyFilePath))
        {
            return new ExtractionResult(null, null, null, null);
        }

        try
        {
            // Read lobby file as bytes and convert to safe ASCII
            var bytes = File.ReadAllBytes(lobbyFilePath);
            var safeString = ConvertToSafeAscii(bytes);

            // Extract all battle tags
            var matches = BattleTagRegex.Matches(safeString);
            var allTags = matches.Select(m => m.Value).Distinct().ToList();

            if (allTags.Count == 0)
            {
                return new ExtractionResult(null, null, null, null);
            }

            // Partition into handle candidates (match game names) and battle tag candidates
            var handleCandidates = new List<string>();
            var battleTagCandidates = new List<string>();

            if (gamePlayerNames != null && gamePlayerNames.Length > 0)
            {
                foreach (var tag in allTags)
                {
                    var namePrefix = tag.Split('#')[0];
                    if (gamePlayerNames.Any(n => n.Equals(namePrefix, StringComparison.OrdinalIgnoreCase)))
                    {
                        handleCandidates.Add(tag);
                    }
                    else
                    {
                        battleTagCandidates.Add(tag);
                    }
                }
            }
            else
            {
                // No game names yet, treat all as potential battle tags
                battleTagCandidates = allTags;
            }

            // Identify user
            string? userBattleTag = null;
            string? userName = null;

            if (!string.IsNullOrEmpty(configuredUserBattleTag) &&
                battleTagCandidates.Contains(configuredUserBattleTag, StringComparer.OrdinalIgnoreCase))
            {
                userBattleTag = configuredUserBattleTag;

                // Find corresponding user name from game
                if (gamePlayerNames != null)
                {
                    var userPrefix = userBattleTag.Split('#')[0];
                    userName = gamePlayerNames.FirstOrDefault(n =>
                        n.Equals(userPrefix, StringComparison.OrdinalIgnoreCase));
                }
            }

            // Identify opponent
            string? opponentBattleTag = battleTagCandidates
                .FirstOrDefault(tag => !tag.Equals(userBattleTag, StringComparison.OrdinalIgnoreCase));

            string? opponentName = null;
            if (opponentBattleTag != null && gamePlayerNames != null)
            {
                var opponentPrefix = opponentBattleTag.Split('#')[0];
                opponentName = gamePlayerNames.FirstOrDefault(n =>
                    n.Equals(opponentPrefix, StringComparison.OrdinalIgnoreCase) &&
                    !n.Equals(userName, StringComparison.OrdinalIgnoreCase));
            }

            return new ExtractionResult(userBattleTag, userName, opponentBattleTag, opponentName);
        }
        catch
        {
            return new ExtractionResult(null, null, null, null);
        }
    }

    private static string ConvertToSafeAscii(byte[] bytes)
    {
        var sb = new StringBuilder(bytes.Length);

        foreach (var b in bytes)
        {
            if (b >= 32 && b <= 126) // Printable ASCII
            {
                sb.Append((char)b);
            }
            else
            {
                sb.Append(' '); // Replace non-printable with space
            }
        }

        return sb.ToString();
    }
}
