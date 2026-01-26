import { createSignal, onCleanup } from 'solid-js';

// Import all panel components
import NormalScreen from './panels/VitalsPanel/screens/NormalScreen';
import PrimaryScreen from './panels/SessionPanel/screens/PrimaryScreen';
import UserMatchHistoryScreen from './panels/SessionPanel/screens/UserMatchHistoryScreen';
import SecondaryScreen from './panels/SessionPanel/screens/SecondaryScreen.tsx';
import LoadingScreen from './panels/OpponentPanel/screens/LoadingScreen';
import OpponentStatsScreen from './panels/OpponentPanel/screens/OpponentStatsScreen.tsx';
import MatchHistoryScreen from './panels/OpponentPanel/screens/MatchHistoryScreen';
import ReservedScreen from './panels/VariousPanel/screens/ReservedScreen';

import { mapPluginStateToVM } from './viewmodel';

function Screens() {
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

    // Ticker for live updates
    const ticker = setInterval(() => setNowMs(Date.now()), 250);
    onCleanup(() => clearInterval(ticker));

    // Polling for state updates
    const poller = setInterval(fetchState, 2000);
    onCleanup(() => clearInterval(poller));

    // Initial fetch
    fetchState();

    return (
        <div style={{ padding: '20px', background: '#000', display: 'flex', 'flex-direction': 'column', gap: '40px', 'min-height': '100vh', width: '100%', 'box-sizing': 'border-box' }}>
            <h1 style={{ color: '#D7FEEB', 'font-family': 'Eurostile', 'margin-bottom': '0' }}>
                All Panel Screens Preview
            </h1>

            {/* VitalsPanel Screens */}
            <section>
                <h2 style={{ color: '#54BF8D', 'font-family': 'Eurostile', 'margin-bottom': '20px' }}>
                    VitalsPanel - Heart Rate
                </h2>
                <div style={{ display: 'flex', gap: '20px', 'overflow-x': 'auto' }}>
                    <div class="panel">
                        <NormalScreen vm={vm()?.vitalsPanel} nowMs={nowMs()} />
                    </div>
                </div>
            </section>

            {/* SessionPanel Screens */}
            <section>
                <h2 style={{ color: '#54BF8D', 'font-family': 'Eurostile', 'margin-bottom': '20px' }}>
                    SessionPanel - Session
                </h2>
                <div style={{ display: 'flex', gap: '20px', 'overflow-x': 'auto' }}>
                    <div class="panel">
                        <div class="panel-title">SESSION - Primary</div>
                        <PrimaryScreen vm={vm()?.sessionPanel} />
                    </div>
                    <div class="panel">
                        <div class="panel-title">SESSION - User Match History</div>
                        <UserMatchHistoryScreen vm={vm()?.sessionPanel} />
                    </div>
                    <div class="panel">
                        <div class="panel-title">SESSION - Stats</div>
                        <SecondaryScreen vm={vm()?.sessionPanel} />
                    </div>
                </div>
            </section>

            {/* OpponentPanel Screens */}
            <section>
                <h2 style={{ color: '#54BF8D', 'font-family': 'Eurostile', 'margin-bottom': '20px' }}>
                    OpponentPanel - Opponent
                </h2>
                <div style={{ display: 'flex', gap: '20px', 'overflow-x': 'auto' }}>
                    <div class="panel">
                        <div class="panel-title">OPPONENT - Loading</div>
                        <LoadingScreen lines={[
                            "STREAMCRAFT v2.0.0",
                            "Initializing overlay system..",
                            "Waiting for match data..",
                            "Loading opponent data"
                        ]} />
                    </div>
                    <div class="panel">
                        <div class="panel-title">OPPONENT - Stats</div>
                        <OpponentStatsScreen vm={vm()?.opponentPanel} />
                    </div>
                    <div class="panel">
                        <div class="panel-title">OPPONENT - Match History</div>
                        <MatchHistoryScreen vm={vm()?.opponentPanel} />
                    </div>
                </div>
            </section>

            {/* VariousPanel Screens */}
            <section>
                <h2 style={{ color: '#54BF8D', 'font-family': 'Eurostile', 'margin-bottom': '20px' }}>
                    VariousPanel - Reserved
                </h2>
                <div style={{ display: 'flex', gap: '20px', 'overflow-x': 'auto' }}>
                    <div class="panel">
                        <div class="panel-title">{vm()?.variousPanel?.title ?? 'RESERVED'}</div>
                        <div class="strip">{vm()?.variousPanel?.title ?? 'Coming soon'}</div>
                        <ReservedScreen vm={vm()?.variousPanel} />
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Screens;
