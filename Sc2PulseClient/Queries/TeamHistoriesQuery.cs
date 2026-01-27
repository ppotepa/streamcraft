using System.Text;

namespace Sc2Pulse.Queries
{
    /// <summary>
    /// Query builder for /api/team-histories endpoint.
    /// Retrieves MMR history for teams based on legacy UIDs.
    /// Race order in responses: TERRAN (1), PROTOSS (2), ZERG (3), RANDOM (4).
    /// </summary>
    public sealed class TeamHistoriesQuery
    {
        /// <summary>
        /// List of team legacy UIDs to query (e.g., "201-0-2-1.3141896.1" for TERRAN).
        /// Format: region-realmId-queueType-teamType.accountId.raceId
        /// Race IDs: 1=TERRAN, 2=PROTOSS, 3=ZERG, 4=RANDOM
        /// </summary>
        public List<string> TeamLegacyUids { get; set; } = new();

        /// <summary>
        /// Grouping parameter (e.g., "LEGACY_UID").
        /// </summary>
        public string? GroupBy { get; set; }

        /// <summary>
        /// Static fields to include (e.g., "LEGACY_ID").
        /// </summary>
        public List<string> Static { get; set; } = new();

        /// <summary>
        /// History fields to include (e.g., "TIMESTAMP", "RATING").
        /// </summary>
        public List<string> History { get; set; } = new();

        public string ToQueryString()
        {
            var sb = new StringBuilder("?");
            bool needAmpersand = false;

            foreach (var uid in TeamLegacyUids)
            {
                if (needAmpersand) sb.Append('&');
                sb.Append($"teamLegacyUid={Uri.EscapeDataString(uid)}");
                needAmpersand = true;
            }

            if (!string.IsNullOrEmpty(GroupBy))
            {
                if (needAmpersand) sb.Append('&');
                sb.Append($"groupBy={Uri.EscapeDataString(GroupBy)}");
                needAmpersand = true;
            }

            foreach (var stat in Static)
            {
                if (needAmpersand) sb.Append('&');
                sb.Append($"static={Uri.EscapeDataString(stat)}");
                needAmpersand = true;
            }

            foreach (var hist in History)
            {
                if (needAmpersand) sb.Append('&');
                sb.Append($"history={Uri.EscapeDataString(hist)}");
                needAmpersand = true;
            }

            return sb.ToString();
        }
    }
}
