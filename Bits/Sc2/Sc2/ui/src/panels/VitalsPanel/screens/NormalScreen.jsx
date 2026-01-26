import { createMemo } from 'solid-js';

const FRESHNESS_THRESHOLD_MS = 10000; // 10 seconds

function NormalScreen(props) {
    const isFresh = createMemo(() => {
        const vm = props.vm;
        const nowMs = props.nowMs;
        if (!vm?.metricTimestampUtc) return false;
        const timestampMs = new Date(vm.metricTimestampUtc).getTime();
        const ageMs = nowMs - timestampMs;
        return ageMs <= FRESHNESS_THRESHOLD_MS;
    });

    const displayValue = createMemo(() => {
        const vm = props.vm;
        if (!vm || vm.metricValue === null || !isFresh()) return '--';
        return vm.metricValue;
    });

    const statusLabel = createMemo(() => {
        return isFresh() ? 'CONNECTED' : 'DISCONNECTED';
    });

    const ageText = createMemo(() => {
        const vm = props.vm;
        if (!vm?.metricTimestampUtc) return 'No data';
        const timestampMs = new Date(vm.metricTimestampUtc).getTime();
        const ageMs = props.nowMs - timestampMs;
        const ageSec = Math.floor(ageMs / 1000);
        if (ageSec < 60) return `${ageSec}s ago`;
        const ageMin = Math.floor(ageSec / 60);
        return `${ageMin}m ago`;
    });

    return (
        <>
            <div class="panel-title">HEART RATE</div>

            <div class="big-value">
                {displayValue()}
            </div>

            <div class="status-strip">
                <div class={`status-dot ${isFresh() ? 'connected' : ''}`}></div>
                <div class="status-label">{statusLabel()}</div>
            </div>

            <div class="meta-line">Last update: {ageText()}</div>
        </>
    );
}

export default NormalScreen;
