import { createSignal, onCleanup } from 'solid-js';
import { MmrProgressBar } from '../components/MmrProgressBar';
import '../components/MmrProgressBar.css';
import { createSc2StateSubscription } from '../services/sc2State';

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

    const stop = createSc2StateSubscription((data: SessionData) => {
        const mmrString = data?.panels?.session?.playerInfo?.mmr;

        if (mmrString) {
            const mmr = parseInt(mmrString.replace('MMR: ', ''), 10);
            if (!isNaN(mmr) && mmr > 0) {
                setCurrentMMR(mmr);
                setLoading(false);
                setError(null);
                return;
            }
        }

        if (loading()) {
            setLoading(false);
        }
    });

    onCleanup(() => stop());

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
