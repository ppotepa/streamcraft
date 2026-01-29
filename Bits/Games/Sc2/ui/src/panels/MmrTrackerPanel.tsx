import { createSignal, onMount, onCleanup } from 'solid-js';
import { MmrProgressBar } from '../components/MmrProgressBar';
import '../components/MmrProgressBar.css';

interface SessionData {
    panels?: {
        session?: {
            playerInfo?: {
                mmr?: string;
            };
        };
    };
}

export function MmrTrackerPanel() {
    const [currentMMR, setCurrentMMR] = createSignal(0);
    const [loading, setLoading] = createSignal(true);
    const [error, setError] = createSignal<string | null>(null);

    const fetchData = async () => {
        try {
            const response = await fetch('/sc2');
            const data: SessionData = await response.json();

            const mmrString = data?.panels?.session?.playerInfo?.mmr;

            if (mmrString) {
                // Parse "MMR: 3987" to get 3987 as integer
                const mmr = parseInt(mmrString.replace('MMR: ', ''), 10);

                if (!isNaN(mmr) && mmr > 0) {
                    setCurrentMMR(mmr);
                    setLoading(false);
                    setError(null);
                }
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load MMR data. Make sure the SC2 overlay is running.');
            setLoading(false);
        }
    };

    onMount(() => {
        fetchData();
        const interval = setInterval(fetchData, 2000);
        onCleanup(() => clearInterval(interval));
    });

    return (
        <>
            {error() && (
                <div style={{
                    background: 'rgba(255, 0, 0, 0.1)',
                    border: '1px solid rgba(255, 0, 0, 0.3)',
                    padding: '20px',
                    'border-radius': '10px',
                    color: '#ff6b6b',
                    'text-align': 'center',
                    'font-size': '10px'
                }}>
                    {error()}
                </div>
            )}
            
            {loading() && !error() && (
                <div style={{
                    'text-align': 'center',
                    padding: '40px',
                    color: '#888',
                    'font-size': '12px',
                    'font-family': "'Press Start 2P', 'Courier New', monospace"
                }}>
                    Waiting for game data...
                </div>
            )}

            {!loading() && !error() && <MmrProgressBar currentMMR={currentMMR()} />}
        </>
    );
}
