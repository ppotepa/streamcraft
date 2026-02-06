import { createSignal, onCleanup } from 'solid-js';
import Panel1 from './panels/SessionPanel/Panel';
import Panel2 from './panels/VitalsPanel/Panel';
import Panel3 from './panels/OpponentPanel/Panel';
import Panel4 from './panels/VariousPanel/VariousPanel';
import { mapPluginStateToVM } from './viewmodel';
import type { PanelViewModel, Sc2BitState } from './types';
import { createSc2StateSubscription } from './services/sc2State';

function App() {
    const [vm, setVm] = createSignal < PanelViewModel | null > (null);
    const [nowMs, setNowMs] = createSignal < number > (Date.now());

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
            <Panel1 vm={vm()?.panel1} nowMs={nowMs()} />
            <Panel2 vm={vm()?.panel2} nowMs={nowMs()} />
            <Panel3 vm={vm()?.panel3} nowMs={nowMs()} />
            <Panel4 vm={vm()?.panel4} nowMs={nowMs()} />
        </div>
    );
}

export default App;
