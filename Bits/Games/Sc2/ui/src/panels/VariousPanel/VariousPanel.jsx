import { createMemo } from 'solid-js';
import ISSTrackerScreen from './screens/ISSTrackerScreen';
import ISSCameraScreen from './screens/ISSCameraScreen';

const ROTATION_INTERVAL_MS = 10000; // 10 seconds per screen

function Panel4(props) {
    const screenIndex = createMemo(() => {
        return Math.floor((props.nowMs / ROTATION_INTERVAL_MS) % 2);
    });

    const vm = () => props.vm;

    return (
        <div class="panel">
            <div class={screenIndex() === 0 ? 'screen-active' : 'screen-hidden'}>
                <ISSTrackerScreen vm={vm()} />
            </div>

            <div class={screenIndex() === 1 ? 'screen-active' : 'screen-hidden'}>
                <ISSCameraScreen />
            </div>
        </div>
    );
}

export default Panel4;
