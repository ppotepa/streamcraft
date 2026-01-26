import { createMemo, For, Show } from 'solid-js';
import SecondaryScreen from './screens/SecondaryScreen.tsx';

const ROTATION_INTERVAL_MS = 8000; // 8 seconds per screen

function Panel2(props) {
    const screenIndex = createMemo(() => {
        return Math.floor((props.nowMs / ROTATION_INTERVAL_MS) % 2);
    });

    const vm = () => props.vm;

    const visibleItems = createMemo(() => {
        const items = vm()?.recentItems ?? [];
        return items.slice(0, 6); // Max 6 rows to match opponent panel
    });

    return (
        <div class="panel">
            <div class="panel-title">SESSION</div>

            <Show when={screenIndex() === 0}>
                {/* Screen A: Primary Session */}
                <div class="strip strip-header">
                    <span>[{vm()?.sessionContextTag ?? '--'}] vs {vm()?.sessionOpponentName ?? 'Unknown'}</span>
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
            </Show>

            <Show when={screenIndex() === 1}>
                <SecondaryScreen vm={vm()} />
            </Show>
        </div>
    );
}

export default Panel2;
