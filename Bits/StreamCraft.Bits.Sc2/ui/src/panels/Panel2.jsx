import { createMemo, For, Show } from 'solid-js';

const ROTATION_INTERVAL_MS = 8000; // 8 seconds per screen

function Panel2(props) {
    const screenIndex = createMemo(() => {
        return Math.floor((props.nowMs / ROTATION_INTERVAL_MS) % 2);
    });

    const vm = () => props.vm;

    const formatDate = (dateUtc) => {
        const date = new Date(dateUtc);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}.${month}`;
    };

    const formatDelta = (delta) => {
        if (delta === null || delta === undefined) return '--';
        return delta > 0 ? `+${delta}` : `${delta}`;
    };

    const visibleItems = createMemo(() => {
        const items = vm()?.recentItems ?? [];
        return items.slice(0, 7); // Max 7 rows
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
                                    <div class="list-row-col">{formatDate(item.dateUtc)}</div>
                                    <div class="list-row-col">[{item.tag}]</div>
                                    <div class="list-row-col">{formatDelta(item.delta)}</div>
                                    <div class="list-row-col">{item.duration ?? '--'}</div>
                                </div>
                            )}
                        </For>
                    </Show>
                </div>
            </Show>

            <Show when={screenIndex() === 1}>
                {/* Screen B: Secondary Stats */}
                <div class="strip">SESSION (ALT)</div>

                <div class="strip">
                    <strong>{vm()?.altSlots?.stat1Label ?? 'Stat 1'}:</strong> {vm()?.altSlots?.stat1Value ?? '--'}
                </div>

                <div class="strip">
                    <strong>{vm()?.altSlots?.stat2Label ?? 'Stat 2'}:</strong> {vm()?.altSlots?.stat2Value ?? '--'}
                </div>

                <div class="strip">
                    <strong>{vm()?.altSlots?.stat3Label ?? 'Stat 3'}:</strong> {vm()?.altSlots?.stat3Value ?? '--'}
                </div>
            </Show>
        </div>
    );
}

export default Panel2;
