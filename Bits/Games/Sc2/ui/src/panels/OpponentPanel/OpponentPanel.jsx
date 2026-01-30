import { createMemo, Show } from 'solid-js';
import LoadingScreen from './screens/LoadingScreen';
import OpponentStatsScreen from './screens/OpponentStatsScreen';
import MatchHistoryScreen from './screens/MatchHistoryScreen';
import MmrScreen from './screens/MmrScreen';

const ROTATION_INTERVAL_MS = 8000; // 8 seconds per screen

function Panel3(props) {
    const screenIndex = createMemo(() => {
        return Math.floor((props.nowMs / ROTATION_INTERVAL_MS) % 3);
    });

    const vm = () => props.vm;
    const isLoading = createMemo(() => vm()?.isLoading ?? true);
    const loadingStatus = createMemo(() => vm()?.loadingStatus ?? 'Waiting for match data');
    const isProcessMissing = createMemo(() =>
        loadingStatus().toLowerCase().includes('sc2 process')
    );

    const loadingLines = createMemo(() => {
        if (isProcessMissing()) {
            return [
                "STREAMCRAFT v2.0.0",
                "ERROR ALERT :: SC2 PROCESS NOT DETECTED",
                "TRACE: SC2.exe => NULL",
                "Launch SC2 to continue"
            ];
        }

        return [
            "STREAMCRAFT v2.0.0",
            "Initializing overlay system..",
            loadingStatus(),
            "Loading opponent data"
        ];
    });

    return (
        <div class="panel">
            <Show when={isLoading()} fallback={
                <>
                    <div class="panel-title">OPPONENT</div>

                    <Show when={screenIndex() === 0}>
                        <OpponentStatsScreen vm={vm()} />
                    </Show>

                    <Show when={screenIndex() === 1}>
                        <MatchHistoryScreen vm={vm()} />
                    </Show>

                    <Show when={screenIndex() === 2}>
                        <MmrScreen vm={vm()} />
                    </Show>
                </>
            }>
                {/* Console Loading Screen */}
                <LoadingScreen
                    title={isProcessMissing() ? "ERROR ALERT" : "SC2 CONSOLE"}
                    variant={isProcessMissing() ? "error" : undefined}
                    lines={loadingLines()}
                />
            </Show>
        </div>
    );
}

export default Panel3;
