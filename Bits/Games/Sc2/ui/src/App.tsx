import { createSignal, onCleanup } from 'solid-js';
import VitalsPanel from './panels/VitalsPanel/VitalsPanel';
import SessionPanel from './panels/SessionPanel/SessionPanel';
import OpponentPanel from './panels/OpponentPanel/OpponentPanel';
import VariousPanel from './panels/VariousPanel/VariousPanel';
import { mapPluginStateToVM } from './viewmodel';
import type { PanelViewModel, Sc2BitState } from './types';
import { createSc2StateSubscription } from './services/sc2State';

function App() {
    const [vm, setVm] = createSignal<PanelViewModel | null>(null);
    const [nowMs, setNowMs] = createSignal<number>(Date.now());

    // Ticker for live updates (freshness, rotation)
    const ticker = setInterval(() => setNowMs(Date.now()), 250);
    onCleanup(() => clearInterval(ticker));

    const stop = createSc2StateSubscription((state: Sc2BitState) => {
        const mappedVm = mapPluginStateToVM(state);
        setVm(mappedVm);
    });
    onCleanup(() => stop());

    return (
        <div class="overlay-canvas">
            <VitalsPanel vm={vm()?.vitalsPanel} nowMs={nowMs()} />
            <SessionPanel vm={vm()?.sessionPanel} nowMs={nowMs()} />
            <OpponentPanel vm={vm()?.opponentPanel} nowMs={nowMs()} />
            <VariousPanel vm={vm()?.variousPanel} nowMs={nowMs()} />
        </div>
    );
}

export default App;
