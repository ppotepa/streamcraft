import type { OpponentPanelState } from '../../../types';

interface OpponentStatsScreenProps {
    vm?: OpponentPanelState;
}

function OpponentStatsScreen(props: OpponentStatsScreenProps) {
    const vm = () => props.vm;

    return (
        <>
            <div class="strip strip-header">
                <span class="name-bold">{vm()?.opponentInfo?.name ?? 'Unknown'}</span>
                <span>{vm()?.opponentInfo?.battleTag ?? '--'}</span>
            </div>

            <div class="stat-grid">
                <div class="stat-cell">
                    <div class="stat-cell-label">MMR</div>
                    <div class="stat-cell-value">{vm()?.opponentInfo?.mmr ?? '--'}</div>
                </div>
                <div class="stat-cell">
                    <div class="stat-cell-label">Rank</div>
                    <div class="stat-cell-value">{vm()?.opponentInfo?.rank ?? '--'}</div>
                </div>
                <div class="stat-cell">
                    <div class="stat-cell-label">MMR 24h</div>
                    <div class="stat-cell-value">{vm()?.performance24h?.mmrChange ?? '--'}</div>
                </div>
                <div class="stat-cell">
                    <div class="stat-cell-label">Games 24h</div>
                    <div class="stat-cell-value">{vm()?.performance24h?.games ?? '--'}</div>
                </div>
                <div class="stat-cell">
                    <div class="stat-cell-label">Wins 24h</div>
                    <div class="stat-cell-value">{vm()?.performance24h?.wins ?? '--'}</div>
                </div>
                <div class="stat-cell">
                    <div class="stat-cell-label">Race</div>
                    <div class="stat-cell-value">{vm()?.seasonStats?.race ?? '--'}</div>
                </div>
                <div class="stat-cell">
                    <div class="stat-cell-label">Games</div>
                    <div class="stat-cell-value">{vm()?.seasonStats?.totalGames ?? '--'}</div>
                </div>
                <div class="stat-cell">
                    <div class="stat-cell-label">Win Rate</div>
                    <div class="stat-cell-value">{vm()?.seasonStats?.winRate ?? '--'}</div>
                </div>
                <div class="stat-cell">
                    <div class="stat-cell-label">vs Terran</div>
                    <div class="stat-cell-value">{vm()?.matchupWinRates?.vsTerran ?? '--'}</div>
                </div>
                <div class="stat-cell">
                    <div class="stat-cell-label">vs Protoss</div>
                    <div class="stat-cell-value">{vm()?.matchupWinRates?.vsProtoss ?? '--'}</div>
                </div>
                <div class="stat-cell">
                    <div class="stat-cell-label">vs Zerg</div>
                    <div class="stat-cell-value">{vm()?.matchupWinRates?.vsZerg ?? '--'}</div>
                </div>
            </div>
        </>
    );
}

export default OpponentStatsScreen;
