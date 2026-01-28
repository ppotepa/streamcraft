import { createSignal, onCleanup, type Accessor } from 'solid-js';
import Panel1 from './panels/SessionPanel/Panel';
import Panel2 from './panels/VitalsPanel/Panel';
import Panel3 from './panels/OpponentPanel/Panel';
import Panel4 from './panels/VariousPanel/VariousPanel';
import { mapPluginStateToVM } from './viewmodel';
import type { PanelViewModel, Sc2BitState } from './types';

function App() {
    const [vm, setVm] = createSignal < PanelViewModel | null > (null);
    const [nowMs, setNowMs] = createSignal < number > (Date.now());

    // Fetch plugin state
    const fetchState = async (): Promise<void> => {
        try {
            const response = await fetch('/sc2');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data: Sc2BitState = await response.json();
            const mappedVm = mapPluginStateToVM(data);
            setVm(mappedVm);
        } catch (err) {
            console.error('Error fetching SC2 state:', err);
        }
    };

    // Ticker for live updates (freshness, rotation)
    const ticker = setInterval(() => setNowMs(Date.now()), 250);
    onCleanup(() => clearInterval(ticker));

    // Polling for state updates
    const poller = setInterval(fetchState, 2000);
    onCleanup(() => clearInterval(poller));

    // Initial fetch
    fetchState();

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
