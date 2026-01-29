import { createMemo, For, Show } from 'solid-js';

function PrimaryScreen(props) {
    const vm = () => props.vm;

    const visibleItems = createMemo(() => {
        const items = vm()?.recentItems ?? [];
        return items.slice(0, 6); // Max 6 rows to match opponent panel
    });

    const formatMatchupDisplay = () => {
        const matchup = vm()?.sessionContextTag ?? '--';
        const name = vm()?.sessionOpponentName ?? 'Unknown';
        return `[${matchup}] vs ${name}`;
    };

    return (
        <>
            <div class="strip strip-header">
                <span>{formatMatchupDisplay()}</span>
                <span>{vm()?.sessionRankLabel ?? '--'}</span>
            </div>

            <div class="stat-cards">
                <div class="stat-card">
                    <div class="stat-card-label">Wins</div>
                    <div class="stat-card-value">{vm()?.wins ?? 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">Games</div>
                    <div class="stat-card-value">{vm()?.games ?? 0}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-label">Losses</div>
                    <div class="stat-card-value">{vm()?.losses ?? 0}</div>
                </div>
            </div>

            <div class="list-container">
                <Show when={visibleItems().length > 0} fallback={
                    <div class="list-empty">No history yet</div>
                }>
                    <For each={visibleItems()}>
                        {(item) => (
                            <div class="list-row">
                                <div class="list-row-col time">{item.timeAgo ?? '--'}</div>
                                <div class="list-row-col player">vs {item.vsPlayerName ?? 'Unknown'}</div>
                                <div class="list-row-col race">({item.vsRace ?? '--'})</div>
                                <div class="list-row-col points">{item.pointsChange ?? '--'}</div>
                                <div class="list-row-col duration">{item.duration ?? '--'}</div>
                                <div class={`list-row-col result ${item.result?.toLowerCase() ?? ''}`}>
                                    {item.result ?? '--'}
                                </div>
                            </div>
                        )}
                    </For>
                </Show>
            </div>
        </>
    );
}

export default PrimaryScreen;
