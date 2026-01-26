import { createSignal, onCleanup, type Accessor } from 'solid-js';
import VitalsPanel from './panels/VitalsPanel/VitalsPanel';
import SessionPanel from './panels/SessionPanel/SessionPanel';
import OpponentPanel from './panels/OpponentPanel/OpponentPanel';
import VariousPanel from './panels/VariousPanel/VariousPanel';
import { mapPluginStateToVM } from './viewmodel';
import type { PanelViewModel, Sc2BitState } from './types';

function App() {
    const [vm, setVm] = createSignal<PanelViewModel | null>(null);
    const [nowMs, setNowMs] = createSignal<number>(Date.now());

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
            <VitalsPanel vm={vm()?.vitalsPanel} nowMs={nowMs()} />
            <SessionPanel vm={vm()?.sessionPanel} nowMs={nowMs()} />
            <OpponentPanel vm={vm()?.opponentPanel} nowMs={nowMs()} />
            <VariousPanel vm={vm()?.variousPanel} nowMs={nowMs()} />
        </div>
    );
}

export default App;
