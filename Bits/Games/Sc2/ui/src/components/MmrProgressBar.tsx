import { createEffect, createSignal } from 'solid-js';
import './MmrProgressBar.css';

interface MmrProgressBarProps {
    currentMMR?: number;
}

export function MmrProgressBar(props: MmrProgressBarProps) {
    const [progress, setProgress] = createSignal(0);

    createEffect(() => {
        const mmr = props.currentMMR || 0;
        if (mmr > 0) {
            const { base, target } = getMMRRange(mmr);
            const newProgress = ((mmr - base) / (target - base)) * 100;
            setProgress(Math.min(100, Math.max(0, newProgress)));
        } else {
            setProgress(0);
        }
    });

    const getMMRRange = (mmr: number) => {
        const base = Math.floor(mmr / 1000) * 1000;
        const target = base + 1000;
        return { base, target };
    };

    const currentMMR = () => props.currentMMR || 0;

    if (currentMMR() === 0) {
        return null;
    }

    const { base, target } = getMMRRange(currentMMR());
    const isNearComplete = () => progress() >= 90;

    return (
        <div class="sc2-bar" style={{ '--p': progress() }}>
            <div class="sc2-track">
                <div class={`sc2-fill ${isNearComplete() ? 'near-complete' : ''}`}></div>
            </div>
            <div class="progress-bar-text">
                {currentMMR()} / {target} MMR
            </div>
        </div>
    );
}
