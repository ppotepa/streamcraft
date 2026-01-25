import { createSignal, onCleanup, createEffect } from 'solid-js';
import Panel1 from './panels/Panel1';
import Panel2 from './panels/Panel2';
import Panel3 from './panels/Panel3';
import Panel4 from './panels/Panel4';
import { mapPluginStateToVM } from './viewmodel';

function App() {
    const [vm, setVm] = createSignal(null);
    const [nowMs, setNowMs] = createSignal(Date.now());

    // Fetch plugin state
    const fetchState = async () => {
        try {
            const response = await fetch('/sc2');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
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
