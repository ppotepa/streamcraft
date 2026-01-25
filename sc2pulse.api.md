# SC2 Pulse API Documentation

Based on analysis of the official SC2 Pulse web client (minified.js), extracted from https://sc2pulse.nephest.com

## Base URL
```
https://sc2pulse.nephest.com/sc2/
```

## API Endpoints

### Character Endpoints

#### Get Characters (Search)
```
GET /api/characters?query={battletag}
```
Search for characters by battle tag.

**Parameters:**
- `query` - Battle tag to search for (e.g., "Player#1234")

---

#### Get Character Suggestions
```
GET /api/characters/suggestions?query={partial}
```
Get character suggestions for autocomplete.

**Parameters:**
- `query` - Partial battle tag

---

#### Get Characters (by IDs)
```
GET /api/characters?{params}
```
Get characters by specific criteria.

**Parameters:**
- `characterId` - Character ID(s)
- Other filters available

---

#### Get Character Stats
```
GET /api/character/{characterId}/stats/full
```
Get full statistics for a character.

**Response includes:**
- Current and previous season stats
- MMR peaks
- Games played
- Race-specific stats
- League achievements

---

#### Get Character Teams
```
GET /api/character-teams?characterId={id}&season={season}
```
Get team data for a character.

**Parameters:**
- `characterId` - Character ID
- `season` - Season number (optional)
- `queue` - Queue type (optional)
- `race` - Race filter (optional)

**Response includes:**
- `teamId`
- `wins`
- `losses`
- `rating`
- `globalRank`, `regionRank`, `leagueRank`
- `members` with nested `account`, `clan`, `proPlayer`

---

#### Get Character Matches
```
GET /api/character-matches?characterId={id}&type={type}
```
Get match history for a character.

**Parameters:**
- `characterId` - Character ID (required)
- `type` - Match type (e.g., `_1V1`, `_2V2`, `_3V3`, `_4V4`)
- `before` / `after` - Cursor pagination tokens

**Response Structure:**
```json
{
  "result": [
    {
      "match": {
        "date": "2026-01-24T14:24:18Z",
        "type": "_1V1",
        "id": 600194107,
        "mapId": 53384,
        "region": "EU",
        "updated": "2026-01-24T16:37:01Z",
        "duration": 325  // in seconds
      },
      "map": {
        "id": 53384,
        "name": "White Rabbit LE"
      },
      "participants": [
        {
          "participant": {
            "matchId": 600194107,
            "playerCharacterId": 340886092,
            "teamId": 274690620,
            "teamStateDateTime": "2026-01-24T14:25:07Z",
            "decision": "WIN" | "LOSS",
            "ratingChange": -48  // can be null
          },
          "team": {
            "rating": 3364,
            "wins": 13,
            "losses": 11,
            "ties": 0,
            "id": 274690620,
            "divisionId": 2838977,
            "season": 66,
            "region": "EU",
            "league": { "type": 5, "queueType": 201, "teamType": 0 },
            "tierType": 2,
            "globalRank": 14963,
            "regionRank": 6216,
            "leagueRank": 1724,
            "members": [...]
          },
          "teamState": {
            "teamState": {
              "teamId": 274690620,
              "dateTime": "2026-01-24T14:25:07Z",
              "wins": 13,
              "games": 23,
              "rating": 3406,
              "globalRank": 13520,
              "regionRank": 5599,
              "leagueRank": 1559
            },
            "league": { ... },
            "tier": 2,
            "season": 66
          }
        }
      ]
    }
  ],
  "navigation": {
    "before": null,
    "after": "eyJ2IjoxLCJhIjpbIjIwMjYtMDEtMTZUMjE6NTM6MjJaIiwxLDUzMzg3LDJdfQ"
  }
}
```

---

#### Get Character Links
```
GET /api/character-links?characterId={id}
```
Get external links for a character (Twitch, Liquipedia, etc).

**Response includes:**
- Battle.net profile link
- Replay Stats link
- Twitch link
- Social media links

---

#### Get Character Reports
```
GET /api/character/report/list/{characterIds}
```
Get reports for character(s) (comma-separated IDs).

---

#### Get All Character Reports
```
GET /api/character/report/list
```
Get all active character reports.

---

#### Vote on Character Report
```
POST /api/character/report/vote/{reportId}/{vote}
```
Vote on a character report (requires authentication).

---

#### Create Character Report
```
POST /api/character/report/new
```
Create a new character report (requires authentication).

**Body:**
- Report details including evidence

---

### Account Endpoints

#### Get Linked External Accounts
```
GET /api/account/{accountId}/linked/external/account
```
Get linked external accounts (Discord, etc).

---

### Team Endpoints

#### Get Teams (Ladder)
```
GET /api/teams?{params}
```
Get ladder teams with filters.

**Parameters:**
- `season` - Season number
- `queue` - Queue type (201=1v1, 202=2v2, etc)
- `teamType` - ARRANGED or RANDOM
- `region` - Region filter (US, EU, KR, CN)
- `league` - League filter (0-6)
- `race` - Race filter
- `sort` - Sort parameter (e.g., `+rating`, `-rating`)
- `before` / `after` - Pagination cursors

---

#### Get Team Histories
```
GET /api/team-histories?{params}
```
Get historical data for teams.

---

#### Get Team History Summaries
```
GET /api/team-history-summaries?{params}
```
Get summarized team history.

---

#### Get Team History Common
```
GET /api/team/history/common?{params}
```
Get common team history data.

---

### Match Endpoints

#### Get Matches
```
GET /api/matches?{params}
```
Get match data with filters.

---

#### Get Versus Matches
```
GET /api/versus/matches?{params}
```
Get head-to-head match data.

---

#### Get Versus Common Data
```
GET /api/versus/common?{params}
```
Get common data for versus comparison.

---

### Season Endpoints

#### Get Seasons
```
GET /api/seasons
```
Get all available seasons.

---

#### Get Season State
```
GET /api/season/state/{season}/{period}
```
Get season state for a specific period.

**Parameters:**
- `season` - Season ID
- `period` - Period (day, week, month)

---

### Statistics Endpoints

#### Get Player Base Stats
```
GET /api/stats/player-base?{params}
```
Get player base statistics.

---

#### Get Activity Stats
```
GET /api/stats/activity?{params}
```
Get activity statistics.

---

#### Get Ladder Stats by League
```
GET /api/ladder/stats/league/{season}/{queue}/{teamType}/{regions}/{leagues}
```
Get ladder statistics by league.

**Path Parameters:**
- `season` - Season number
- `queue` - Queue type
- `teamType` - Team type
- `regions` - Comma-separated region codes
- `leagues` - Comma-separated league codes

---

#### Get Balance Reports
```
GET /api/stats/balance-reports?{params}
```
Get balance reports and statistics.

---

### Clan Endpoints

#### Search Clans
```
GET /api/clans?{params}
```
Search for clans.

**Parameters:**
- `query` - Text search (optional)
- `minActiveMembers`, `maxActiveMembers`
- `minAverageRating`, `maxAverageRating`
- `minMembers`, `maxMembers`
- Pagination cursors

---

#### Get Clan Histories
```
GET /api/clan-histories?{params}
```
Get clan historical data.

---

### User/Personal Endpoints

#### Get My Characters
```
GET /api/my/characters
```
Get authenticated user's characters.

---

#### Get My Following
```
GET /api/my/following
```
Get list of followed accounts.

---

#### Follow Account
```
POST /api/my/following/{accountId}
```
Follow an account (requires authentication).

---

#### Unfollow Account
```
DELETE /api/my/following/{accountId}
```
Unfollow an account (requires authentication).

---

#### Get My Following Ladder
```
GET /api/my/following/ladder?{params}
```
Get ladder for followed accounts.

**Parameters:**
- `season`
- `queue`
- `teamType`

---

#### Get My Common Data
```
GET /api/my/common
```
Get common user data (settings, preferences).

---

#### Unlink Discord
```
POST /api/my/discord/unlink
```
Unlink Discord account (requires authentication).

---

#### Set Discord Public
```
POST /api/my/discord/public/{boolean}
```
Set Discord connection visibility (requires authentication).

---

### Reveal (Pro Player) Endpoints

#### Reveal Player
```
POST /api/reveal/{type}/{playerId}
```
Reveal pro player identity (requires authentication).

---

#### Import Reveal Data
```
POST /api/reveal/import
```
Import pro player data (requires authentication).

---

#### Edit Pro Player
```
POST /api/reveal/player/edit
```
Edit pro player information (requires authentication).

---

#### Get Reveal Log
```
GET /api/reveal/log?{params}
```
Get reveal action log.

---

#### Check Revealer Role
```
GET /api/user/role/REVEALER
```
Check if user has revealer role.

---

### Entity/Group Endpoints

#### Get Entities
```
GET /api/entities?{params}
```
Get grouped entities (characters/teams).

---

### Stream Endpoints

#### Get Streams
```
GET /api/streams?{params}
```
Get live streams.

---

### Utility Endpoints

#### Get Patches
```
GET /api/patches?buildMin={build}
```
Get patch information.

---

#### Get CSRF Token
```
GET /api/security/csrf
```
Get CSRF token for authenticated requests.

---

#### Get Tier Thresholds
```
GET /api/tier-thresholds?{params}
```
Get MMR thresholds for tier/league boundaries.

---

## Data Models

### Team Format (Queue Type)
- `201` - 1v1 (LOTV_1V1)
- `202` - 2v2 (LOTV_2V2)
- `203` - 3v3 (LOTV_3V3)
- `204` - 4v4 (LOTV_4V4)
- `206` - Archon (LOTV_ARCHON)

### Team Type
- `ARRANGED` (0) - Premade team
- `RANDOM` (1) - Solo queue

### Region
- `US` (1)
- `EU` (2)
- `KR` (3)
- `CN` (5)

### Race
- `TERRAN` (1)
- `PROTOSS` (2)
- `ZERG` (3)
- `RANDOM` (4)

### League Type
- `0` - Bronze
- `1` - Silver
- `2` - Gold
- `3` - Platinum
- `4` - Diamond
- `5` - Master
- `6` - Grandmaster

### Tier Type
- `0` - Tier 1 (highest)
- `1` - Tier 2
- `2` - Tier 3 (lowest)

### Match Decision
- `"WIN"` - Player won
- `"LOSS"` - Player lost

---

## Pagination

Most list endpoints use **cursor-based pagination**:

- `before` - Cursor token to get previous page
- `after` - Cursor token to get next page

Response includes `navigation` object:
```json
{
  "navigation": {
    "before": "cursor_token_or_null",
    "after": "cursor_token_or_null"
  }
}
```

---

## Authentication

Authenticated endpoints require:
1. **CSRF Token**: Obtained from `/api/security/csrf`
2. **Cookie**: `SESSION` cookie from login
3. **Header**: `X-CSRF-TOKEN` header with token value

Example authenticated request:
```javascript
fetch(url, {
  method: 'POST',
  headers: {
    'X-CSRF-TOKEN': csrfToken,
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify(data)
})
```

---

## Rate Limiting

The API may implement rate limiting. Best practices:
- Cache responses when possible
- Use pagination appropriately
- Respect HTTP 429 (Too Many Requests) responses

---

## Notes

1. **Character ID vs Account ID**: 
   - `characterId` - Unique per character (region/realm/battlenet)
   - `accountId` - Unique per Battle.net account (can have multiple characters)

2. **Season Numbers**: Current season (as of Jan 2026) is 66. Check `/api/seasons` for active seasons.

3. **MMR/Rating**: Terms used interchangeably. Rating is the MMR value.

4. **Ranks**: Three rank types available:
   - `globalRank` - Rank across all regions
   - `regionRank` - Rank within region
   - `leagueRank` - Rank within league

5. **Team Counts**: Context for ranks:
   - `globalTeamCount` - Total teams globally
   - `regionTeamCount` - Total teams in region
   - `leagueTeamCount` - Total teams in league

6. **Match Duration**: Available in seconds in the `match.duration` field.

7. **Rating Change**: May be `null` for some matches; can be calculated from consecutive `teamState.rating` values.

---

## Example Usage

### Get opponent data for streaming overlay:

```javascript
// 1. Search for character
const searchResp = await fetch(
  `https://sc2pulse.nephest.com/sc2/api/characters?query=${encodeURIComponent('Player#1234')}`
);
const characters = await searchResp.json();
const characterId = characters[0].members.character.id;

// 2. Get current team stats
const teamResp = await fetch(
  `https://sc2pulse.nephest.com/sc2/api/character-teams?characterId=${characterId}&season=66&queue=201`
);
const teams = await teamResp.json();
const currentTeam = teams[0]; // { wins, losses, rating, globalRank, etc }

// 3. Get match history
const matchResp = await fetch(
  `https://sc2pulse.nephest.com/sc2/api/character-matches?characterId=${characterId}&type=_1V1`
);
const matches = await matchResp.json();
// matches.result[i].match.duration - match duration in seconds
// matches.result[i].participants[0].participant.ratingChange - MMR change
// matches.result[i].participants[0].teamState.teamState.rating - rating at match time

// 4. Calculate stats
const last24h = matches.result.filter(m => 
  new Date(m.match.date) > new Date(Date.now() - 86400000)
);
const gamesLast24h = last24h.length;
const winsLast24h = last24h.filter(m => 
  m.participants.find(p => p.participant.playerCharacterId === characterId)?.participant.decision === 'WIN'
).length;
```

---

## Implementation Checklist for StreamCraft

### ✅ Already Implemented
- [x] `GET /api/characters` - FindCharactersAsync
- [x] `GET /api/character/{id}` - GetCharacterByIdAsync (custom implementation)
- [x] `GET /api/character-teams` - GetCharacterTeamsAsync
- [x] `GET /api/character-matches` - GetCharacterMatchesAsync
- [x] `GET /api/character-links` - GetCharacterLinksAsync

### ✅ Models Verified
- [x] Match - Has `Duration` field (int, seconds)
- [x] MatchParticipant - Has `Decision` (WIN/LOSS) and `RatingChange`
- [x] LadderTeam - Has `Wins`, `Losses`
- [x] TeamState - Has `GlobalRank`, `RegionRank`, `LeagueRank`, `Rating`, `Wins`, `Games`
- [x] LadderMatchParticipant - Has `Team` and `TeamState`

### 🔧 To Implement
- [ ] Calculate MMR change 24h from match history
- [ ] Extract GlobalRank from TeamState in matches
- [ ] Extract accurate Wins/Losses from LadderTeam
- [ ] Calculate rating change per match from consecutive TeamState.Rating
- [ ] Format match duration from seconds
- [ ] Display pro player badges
- [ ] Display clan tags
