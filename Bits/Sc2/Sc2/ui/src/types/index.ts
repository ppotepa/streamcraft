// SC2 Bit State Types

export interface PlayerInfo {
    name: string;
    battleTag: string;
    mmr: string;
    rank: string;
}

export interface Performance24h {
    ratingChange?: string;
    mmrChange?: string;
    games: string;
    wins: string;
}

export interface SeasonStats {
    race: string;
    totalGames: string;
    winRate: string;
}

export interface CareerStats {
    league: string;
    peakMMR: string;
    currentStreak: string;
}

export interface MatchupWinRates {
    vsTerran: string;
    vsProtoss: string;
    vsZerg: string;
}

export interface MatchHistoryItem {
    timeAgo: string;
    vsPlayerName: string;
    vsRace: string;
    myRace?: string | null;
    pointsChange: string;
    duration: string;
    result: string;
    mapName?: string;
}

export interface MmrHistoryPoint {
    timestamp: number;
    rating: number;
}

export interface Stat {
    label: string;
    value: string;
}

export interface VitalsPanelState {
    metricValue: number | null;
    metricTimestampUtc: string | null;
}

export interface MetricPanelState {
    value: number | null;
    timestampUtc: string | null;
    units?: string;
}

export interface SessionPanelState {
    isLoading: boolean;
    loadingStatus: string;
    sessionContextTag: string | null;
    sessionOpponentName: string | null;
    sessionRankLabel: string;
    wins: number;
    games: number;
    losses: number;
    playerInfo: PlayerInfo;
    performance24h: Performance24h;
    seasonStats: SeasonStats;
    careerStats: CareerStats;
    recentItems: MatchHistoryItem[];
    userMatchHistory: MatchHistoryItem[];
    mmrHistory?: MmrHistoryPoint[];
    altSlots?: Stat[];
}

export interface OpponentPanelState {
    isLoading: boolean;
    loadingStatus: string;
    matchup?: string;
    userRace?: string;
    opponentRace?: string;
    gameTime?: number;
    opponentInfo: PlayerInfo;
    performance24h: Performance24h;
    seasonStats: SeasonStats;
    matchupWinRates: MatchupWinRates;
    matchHistory: MatchHistoryItem[];
    mmrHistory?: MmrHistoryPoint[];
    summaryLine1?: string[];
    summaryLine2?: string[];
    summaryLine3?: string[];
}

export interface VariousPanelState {
    title?: string;
    badge?: string;
    lines?: string[];
}

export interface Sc2BitState {
    panels: {
        metric?: MetricPanelState;
        session?: SessionPanelState;
        opponent?: OpponentPanelState;
        map?: VariousPanelState;
    };
    timestamp: string;
}

export interface PanelViewModel {
    vitalsPanel?: VitalsPanelState;
    sessionPanel?: SessionPanelState;
    opponentPanel?: OpponentPanelState;
    variousPanel?: VariousPanelState;
}
