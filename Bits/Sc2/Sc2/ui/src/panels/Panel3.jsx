import { createMemo, For, Show } from 'solid-js';

const ROTATION_INTERVAL_MS = 8000; // 8 seconds per screen

function Panel3(props) {
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
        if (typeof delta === 'string' && delta.includes('--')) return '--';
        return delta;
    };

    const visibleHistoryItems = createMemo(() => {
        const items = vm()?.matchHistory ?? [];
        return items.slice(0, 6); // Max 6 rows for match history
    });

    const visibleLegacyItems = createMemo(() => {
        const items = vm()?.recentItems ?? [];
        return items.slice(0, 7); // Max 7 rows for legacy format
    });

    return (
        <div class="panel">
            <div class="panel-title">OPPONENT</div>

            <Show when={screenIndex() === 0}>
                {/* Screen A: New 4-Row Layout */}
                <div class="strip strip-4col">
                    <span class="name-bold">{vm()?.row1?.[0] ?? '--'}</span>
                    <span>{vm()?.row1?.[1] ?? '--'}</span>
                    <span>{vm()?.row1?.[2] ?? '--'}</span>
                    <span>{vm()?.row1?.[3] ?? '--'}</span>
                </div>

                <div class="strip strip-3col">
                    <span>{vm()?.row2?.[0] ?? '--'}</span>
                    <span>{vm()?.row2?.[1] ?? '--'}</span>
                    <span>{vm()?.row2?.[2] ?? '--'}</span>
                </div>

                <div class="strip strip-3col">
                    <span>{vm()?.row3?.[0] ?? '--'}</span>
                    <span>{vm()?.row3?.[1] ?? '--'}</span>
                    <span>{vm()?.row3?.[2] ?? '--'}</span>
                </div>

                <div class="strip strip-3col">
                    <span>{vm()?.row4?.[0] ?? '--'}</span>
                    <span>{vm()?.row4?.[1] ?? '--'}</span>
                    <span>{vm()?.row4?.[2] ?? '--'}</span>
                </div>
            </Show>

            <Show when={screenIndex() === 1}>
                {/* Screen B: Enhanced Match History */}
                <div class="strip">RECENT MATCHES</div>

                <div class="list-container">
                    <Show when={visibleHistoryItems().length > 0} fallback={
                        <div class="list-empty">No matches yet</div>
                    }>
                        <For each={visibleHistoryItems()}>
                            {(match) => (
                                <div class="list-row">
                                    <div class="list-row-col time">{match.timeAgo}</div>
                                    <div class="list-row-col player">vs {match.vsPlayerName}</div>
                                    <div class="list-row-col race">({match.vsRace})</div>
                                    <div class="list-row-col points">{match.pointsChange}</div>
                                    <div class="list-row-col duration">{match.duration}</div>
                                    <div class={`list-row-col result ${match.result.toLowerCase()}`}>
                                        {match.result}
                                    </div>
                                </div>
                            )}
                        </For>
                    </Show>
                </div>
            </Show>
        </div>
    );
}

export default Panel3;
