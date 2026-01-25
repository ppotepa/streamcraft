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
        return delta > 0 ? `+${delta}` : `${delta}`;
    };

    const visibleItems = createMemo(() => {
        const items = vm()?.recentItems ?? [];
        return items.slice(0, 7); // Max 7 rows
    });

    return (
        <div class="panel">
            <div class="panel-title">OPPONENT</div>

            <Show when={screenIndex() === 0}>
                {/* Screen A: Summary */}
                <div class="strip strip-3col">
                    <span>{vm()?.summaryLine1?.[0] ?? '--'}</span>
                    <span>{vm()?.summaryLine1?.[1] ?? '--'}</span>
                    <span>{vm()?.summaryLine1?.[2] ?? '--'}</span>
                </div>

                <div class="strip strip-3col">
                    <span>{vm()?.summaryLine2?.[0] ?? '--'}</span>
                    <span>{vm()?.summaryLine2?.[1] ?? '--'}</span>
                    <span>{vm()?.summaryLine2?.[2] ?? '--'}</span>
                </div>

                <div class="strip strip-3col">
                    <span>{vm()?.summaryLine3?.[0] ?? '--'}</span>
                    <span>{vm()?.summaryLine3?.[1] ?? '--'}</span>
                    <span>{vm()?.summaryLine3?.[2] ?? '--'}</span>
                </div>
            </Show>

            <Show when={screenIndex() === 1}>
                {/* Screen B: History */}
                <div class="strip">RECENT HISTORY</div>

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
        </div>
    );
}

export default Panel3;
