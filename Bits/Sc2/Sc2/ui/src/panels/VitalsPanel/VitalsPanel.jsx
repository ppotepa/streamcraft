import { createMemo } from 'solid-js';

const FRESHNESS_THRESHOLD_MS = 10000; // 10 seconds

function Panel1(props) {
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

    return (
        <div class="panel">
            <div class="panel-title">HEART RATE</div>

            <div class="hr-bpm-main">
                <div class={`hr-bpm-value ${!isFresh() ? 'disconnected' : ''}`}>
                    {displayValue()}
                </div>
                <div class="hr-bpm-label">BPM</div>
            </div>

            <div class="hr-status">
                {isFresh() && <span class="rec-dot"></span>}
                {statusLabel()}
            </div>
        </div>
    );
}

export default Panel1;