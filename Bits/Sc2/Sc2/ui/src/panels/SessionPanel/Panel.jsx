import { createMemo, Show } from 'solid-js';
import PrimaryScreen from './screens/PrimaryScreen';
import SecondaryScreen from './screens/SecondaryScreen.tsx';
import UserMatchHistoryScreen from './screens/UserMatchHistoryScreen';

const ROTATION_INTERVAL_MS = 8000; // 8 seconds per screen

function Panel2(props) {
    const screenIndex = createMemo(() => {
        return Math.floor((props.nowMs / ROTATION_INTERVAL_MS) % 3);
    });

    return (
        <div class="panel">
            <div class="panel-title">SESSION</div>

            <Show when={screenIndex() === 0}>
                <PrimaryScreen vm={props.vm} />
            </Show>

            <Show when={screenIndex() === 1}>
                <UserMatchHistoryScreen vm={props.vm} />
            </Show>

            <Show when={screenIndex() === 2}>
                <SecondaryScreen vm={props.vm} />
            </Show>
        </div>
    );
}

export default Panel2;
